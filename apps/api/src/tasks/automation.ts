import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import { logAudit, nowIso, sanitizeMetadata } from "../db";
import type { AppConfig } from "../config";
import { createTaskLinkedNotification, dispatchTaskLinkedNotification } from "./notifications";
import { logTaskEvent } from "./service";
import type { NotificationPriority, TaskRepeatType, TaskStatus } from "../types";

export const DEFAULT_TASK_AUTOMATION_DUE_SOON_MINUTES = 120;
export const DEFAULT_TASK_AUTOMATION_STALE_HOURS = 24;

export type TaskAutomationType = "due_soon" | "overdue" | "stale_task" | "recurring_task";

interface TaskAutomationCandidateRow {
  id: number;
  title: string;
  status: TaskStatus;
  priority: NotificationPriority;
  creatorUserId: number;
  assigneeUserId: number | null;
  dueAt: string | null;
  repeatType: TaskRepeatType;
  repeatWeekdaysJson: string;
  updatedAt: string;
  staleSince: string | null;
  completedAt: string | null;
}

export interface TaskAutomationLogRow {
  id: number;
  taskId: number;
  taskTitle: string;
  automationType: TaskAutomationType;
  dedupeKey: string;
  notificationId: number | null;
  metadataJson: string | null;
  createdAt: string;
}

export interface TaskAutomationHealthStats {
  schedulerEnabled: boolean;
  dueSoonWindowMinutes: number;
  staleWindowHours: number;
  activeTasks: number;
  dueSoonEligible: number;
  overdueEligible: number;
  staleEligible: number;
  recurringEligible: number;
  dueSoonSentToday: number;
  overdueSentToday: number;
  staleSentToday: number;
  recurringCreatedToday: number;
}

interface TaskAutomationCycleOptions {
  now?: () => Date;
}

const NON_TERMINAL_TASK_STATUS_FILTER = "('new', 'in_progress', 'waiting')";

const toTaskAutomationDueSoonMinutes = (config: AppConfig): number =>
  config.taskAutomationDueSoonMinutes ?? DEFAULT_TASK_AUTOMATION_DUE_SOON_MINUTES;

const toTaskAutomationStaleHours = (config: AppConfig): number =>
  config.taskAutomationStaleHours ?? DEFAULT_TASK_AUTOMATION_STALE_HOURS;

const resolveAutomationActorUserId = (
  db: Database.Database,
  fallbackUserId: number
): number => {
  const admin = db
    .prepare(
      `
        SELECT id
        FROM users
        WHERE role = 'admin'
          AND is_active = 1
        ORDER BY id ASC
        LIMIT 1
      `
    )
    .get() as { id: number } | undefined;

  return admin?.id ?? fallbackUserId;
};

const toRecipients = (task: TaskAutomationCandidateRow): number[] =>
  Array.from(
    new Set(
      [task.creatorUserId, task.assigneeUserId]
        .filter((value): value is number => typeof value === "number" && Number.isInteger(value) && value > 0)
    )
  );

const toDueSoonPriority = (priority: NotificationPriority): NotificationPriority => {
  if (priority === "high" || priority === "critical") {
    return priority;
  }

  return "normal";
};

const toOverduePriority = (priority: NotificationPriority): NotificationPriority => {
  if (priority === "critical") {
    return "critical";
  }

  return "high";
};

const toStalePriority = (priority: NotificationPriority): NotificationPriority => {
  if (priority === "critical" || priority === "high") {
    return priority;
  }

  return "normal";
};

const buildDueSoonMessage = (task: TaskAutomationCandidateRow): string =>
  `A tarefa "${task.title}" esta perto do prazo. Vencimento atual: ${task.dueAt}.`;

const buildOverdueMessage = (task: TaskAutomationCandidateRow): string =>
  `A tarefa "${task.title}" esta atrasada desde ${task.dueAt}.`;

const buildStaleTaskMessage = (task: TaskAutomationCandidateRow): string =>
  `A tarefa "${task.title}" esta sem atualizacao recente desde ${task.staleSince ?? task.updatedAt}.`;

const buildRecurringTaskMessage = (taskTitle: string, dueAt: string | null): string => {
  const dueSuffix = dueAt ? ` Novo prazo: ${dueAt}.` : "";
  return `Uma nova recorrencia da tarefa "${taskTitle}" foi criada.${dueSuffix}`;
};

const parseWeekdaysJson = (value: string): number[] => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item >= 0 && item <= 6)
      : [];
  } catch {
    return [];
  }
};

const addUtcDays = (date: Date, amount: number): Date => {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
};

const addUtcMonths = (date: Date, amount: number): Date => {
  const next = new Date(date.getTime());
  next.setUTCMonth(next.getUTCMonth() + amount);
  return next;
};

const nextWeeklyUtcDate = (date: Date, weekdays: number[]): Date => {
  const allowed = weekdays.length > 0 ? weekdays : [date.getUTCDay()];
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = addUtcDays(date, offset);
    if (allowed.includes(candidate.getUTCDay())) {
      return candidate;
    }
  }

  return addUtcDays(date, 7);
};

const nextWeekdayUtcDate = (date: Date): Date => {
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = addUtcDays(date, offset);
    const day = candidate.getUTCDay();
    if (day >= 1 && day <= 5) {
      return candidate;
    }
  }

  return addUtcDays(date, 1);
};

const computeNextRecurringDueAt = (task: TaskAutomationCandidateRow): string | null => {
  if (task.repeatType === "none") {
    return null;
  }

  const anchorValue = task.dueAt ?? task.completedAt;
  if (!anchorValue) {
    return null;
  }

  const anchor = new Date(anchorValue);
  if (Number.isNaN(anchor.getTime())) {
    return null;
  }

  switch (task.repeatType) {
    case "daily":
      return addUtcDays(anchor, 1).toISOString();
    case "weekly":
      return nextWeeklyUtcDate(anchor, parseWeekdaysJson(task.repeatWeekdaysJson)).toISOString();
    case "monthly":
      return addUtcMonths(anchor, 1).toISOString();
    case "weekdays":
      return nextWeekdayUtcDate(anchor).toISOString();
    default:
      return null;
  }
};

const insertTaskAutomationLog = (
  db: Database.Database,
  params: {
    taskId: number;
    automationType: TaskAutomationType;
    dedupeKey: string;
    notificationId?: number | null;
    metadata?: Record<string, unknown>;
    createdAt: string;
  }
) => {
  db.prepare(
    `
      INSERT INTO task_automation_logs (
        task_id,
        automation_type,
        dedupe_key,
        notification_id,
        metadata_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(
    params.taskId,
    params.automationType,
    params.dedupeKey,
    params.notificationId ?? null,
    sanitizeMetadata(params.metadata),
    params.createdAt
  );
};

const fetchDueSoonCandidates = (
  db: Database.Database,
  nowTimestamp: string,
  windowEnd: string
): TaskAutomationCandidateRow[] =>
  db
    .prepare(
      `
        SELECT
          t.id,
          t.title,
          t.status,
          t.priority,
          t.creator_user_id AS creatorUserId,
          t.assignee_user_id AS assigneeUserId,
          t.due_at AS dueAt,
          t.repeat_type AS repeatType,
          t.repeat_weekdays_json AS repeatWeekdaysJson,
          t.updated_at AS updatedAt,
          t.updated_at AS staleSince,
          t.completed_at AS completedAt
        FROM tasks t
        WHERE t.archived_at IS NULL
          AND t.status IN ${NON_TERMINAL_TASK_STATUS_FILTER}
          AND t.due_at IS NOT NULL
          AND t.due_at > ?
          AND t.due_at <= ?
          AND NOT EXISTS (
            SELECT 1
            FROM task_automation_logs tal
            WHERE tal.task_id = t.id
              AND tal.automation_type = 'due_soon'
              AND tal.dedupe_key = ('due_soon:' || t.due_at)
          )
        ORDER BY t.due_at ASC, t.id ASC
      `
    )
    .all(nowTimestamp, windowEnd) as TaskAutomationCandidateRow[];

const fetchOverdueCandidates = (db: Database.Database, nowTimestamp: string): TaskAutomationCandidateRow[] =>
  db
    .prepare(
      `
        SELECT
          t.id,
          t.title,
          t.status,
          t.priority,
          t.creator_user_id AS creatorUserId,
          t.assignee_user_id AS assigneeUserId,
          t.due_at AS dueAt,
          t.repeat_type AS repeatType,
          t.repeat_weekdays_json AS repeatWeekdaysJson,
          t.updated_at AS updatedAt,
          t.updated_at AS staleSince,
          t.completed_at AS completedAt
        FROM tasks t
        WHERE t.archived_at IS NULL
          AND t.status IN ${NON_TERMINAL_TASK_STATUS_FILTER}
          AND t.due_at IS NOT NULL
          AND t.due_at <= ?
          AND NOT EXISTS (
            SELECT 1
            FROM task_automation_logs tal
            WHERE tal.task_id = t.id
              AND tal.automation_type = 'overdue'
              AND tal.dedupe_key = ('overdue:' || t.due_at)
          )
        ORDER BY t.due_at ASC, t.id ASC
      `
    )
    .all(nowTimestamp) as TaskAutomationCandidateRow[];

const fetchStaleCandidates = (
  db: Database.Database,
  staleCutoff: string,
  dueSoonWindowEnd: string
): TaskAutomationCandidateRow[] =>
  db
    .prepare(
      `
        SELECT
          t.id,
          t.title,
          t.status,
          t.priority,
          t.creator_user_id AS creatorUserId,
          t.assignee_user_id AS assigneeUserId,
          t.due_at AS dueAt,
          t.repeat_type AS repeatType,
          t.repeat_weekdays_json AS repeatWeekdaysJson,
          t.updated_at AS updatedAt,
          t.updated_at AS staleSince,
          t.completed_at AS completedAt
        FROM tasks t
        WHERE t.archived_at IS NULL
          AND t.status IN ${NON_TERMINAL_TASK_STATUS_FILTER}
          AND t.updated_at <= ?
          AND (t.due_at IS NULL OR t.due_at > ?)
          AND NOT EXISTS (
            SELECT 1
            FROM task_automation_logs tal
            WHERE tal.task_id = t.id
              AND tal.automation_type = 'stale_task'
              AND tal.dedupe_key = ('stale_task:' || t.updated_at)
          )
        ORDER BY t.updated_at ASC, t.id ASC
      `
    )
    .all(staleCutoff, dueSoonWindowEnd) as TaskAutomationCandidateRow[];

const fetchRecurringCandidates = (db: Database.Database): TaskAutomationCandidateRow[] =>
  db
    .prepare(
      `
        SELECT
          t.id,
          t.title,
          t.status,
          t.priority,
          t.creator_user_id AS creatorUserId,
          t.assignee_user_id AS assigneeUserId,
          t.due_at AS dueAt,
          t.repeat_type AS repeatType,
          t.repeat_weekdays_json AS repeatWeekdaysJson,
          t.updated_at AS updatedAt,
          t.updated_at AS staleSince,
          t.completed_at AS completedAt
        FROM tasks t
        WHERE t.archived_at IS NULL
          AND t.status = 'done'
          AND t.repeat_type <> 'none'
          AND t.completed_at IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM task_automation_logs tal
            WHERE tal.task_id = t.id
              AND tal.automation_type = 'recurring_task'
              AND tal.dedupe_key = ('recurring_task:' || t.completed_at)
          )
        ORDER BY t.completed_at ASC, t.id ASC
      `
    )
    .all() as TaskAutomationCandidateRow[];

const createAutomationNotification = (
  db: Database.Database,
  task: TaskAutomationCandidateRow,
  params: {
    automationType: TaskAutomationType;
    title: string;
    message: string;
    priority: NotificationPriority;
    dedupeKey: string;
    createdAt: string;
  }
) => {
  const recipientIds = toRecipients(task);
  if (recipientIds.length === 0) {
    return null;
  }

  const actorUserId = resolveAutomationActorUserId(db, task.creatorUserId);
  const notification = createTaskLinkedNotification(db, {
    actorUserId,
    sourceTaskId: task.id,
    title: params.title,
    message: params.message,
    priority: params.priority,
    recipientIds,
    auditEventType: `task.automation.notification.${params.automationType}`,
    auditMetadata: {
      automationType: params.automationType,
      dedupeKey: params.dedupeKey
    },
    createdAt: params.createdAt
  });

  if (!notification) {
    return null;
  }

  const notificationId = notification.pushPayload.id;
  insertTaskAutomationLog(db, {
    taskId: task.id,
    automationType: params.automationType,
    dedupeKey: params.dedupeKey,
    notificationId,
    metadata: {
      automationType: params.automationType,
      recipientIds,
      dueAt: task.dueAt,
      updatedAt: task.updatedAt
    },
    createdAt: params.createdAt
  });

  logTaskEvent(db, {
    taskId: task.id,
    actorUserId: null,
    eventType:
      params.automationType === "due_soon"
        ? "automation_due_soon"
        : params.automationType === "overdue"
          ? "automation_overdue"
          : "automation_stale_task",
    metadata: {
      notificationId,
      dedupeKey: params.dedupeKey
    },
    createdAt: params.createdAt
  });

  logAudit(db, {
    eventType: `task.automation.${params.automationType}`,
    targetType: "task",
    targetId: task.id,
    metadata: {
      notificationId,
      dedupeKey: params.dedupeKey
    }
  });

  return notification;
};

const createRecurringTaskAutomation = (
  db: Database.Database,
  task: TaskAutomationCandidateRow,
  createdAt: string
) => {
  const nextDueAt = computeNextRecurringDueAt(task);
  if (!nextDueAt || !task.completedAt) {
    return null;
  }

  const taskInsert = db
    .prepare(
      `
        INSERT INTO tasks (
          title,
          description,
          status,
          priority,
          creator_user_id,
          assignee_user_id,
          due_at,
          repeat_type,
          repeat_weekdays_json,
          recurrence_source_task_id,
          created_at,
          updated_at
        )
        SELECT
          title,
          description,
          'new',
          priority,
          creator_user_id,
          assignee_user_id,
          ?,
          repeat_type,
          repeat_weekdays_json,
          id,
          ?,
          ?
        FROM tasks
        WHERE id = ?
      `
    )
    .run(nextDueAt, createdAt, createdAt, task.id);

  const generatedTaskId = Number(taskInsert.lastInsertRowid);
  const dedupeKey = `recurring_task:${task.completedAt}`;
  const recipientIds = toRecipients(task);
  const actorUserId = resolveAutomationActorUserId(db, task.creatorUserId);
  const notification =
    recipientIds.length > 0
      ? createTaskLinkedNotification(db, {
          actorUserId,
          sourceTaskId: generatedTaskId,
          title: `Nova tarefa recorrente: ${task.title}`,
          message: buildRecurringTaskMessage(task.title, nextDueAt),
          priority: task.priority,
          recipientIds,
          auditEventType: "task.automation.notification.recurring_task",
          auditMetadata: {
            automationType: "recurring_task",
            sourceTaskId: task.id,
            generatedTaskId,
            dedupeKey
          },
          createdAt
        })
      : null;

  insertTaskAutomationLog(db, {
    taskId: task.id,
    automationType: "recurring_task",
    dedupeKey,
    notificationId: notification?.pushPayload.id ?? null,
    metadata: {
      generatedTaskId,
      nextDueAt,
      repeatType: task.repeatType,
      repeatWeekdays: parseWeekdaysJson(task.repeatWeekdaysJson)
    },
    createdAt
  });

  logTaskEvent(db, {
    taskId: generatedTaskId,
    actorUserId: null,
    eventType: "created",
    toStatus: "new",
    metadata: {
      trigger: "task.automation.recurring_task",
      recurrenceSourceTaskId: task.id,
      dueAt: nextDueAt
    },
    createdAt
  });

  logTaskEvent(db, {
    taskId: task.id,
    actorUserId: null,
    eventType: "automation_recurring_task",
    metadata: {
      generatedTaskId,
      nextDueAt,
      dedupeKey
    },
    createdAt
  });

  logAudit(db, {
    eventType: "task.automation.recurring_task",
    targetType: "task",
    targetId: task.id,
    metadata: {
      generatedTaskId,
      nextDueAt,
      dedupeKey
    }
  });

  return notification;
};

export const runTaskAutomationCycle = (
  db: Database.Database,
  io: Server,
  config: AppConfig,
  options: TaskAutomationCycleOptions = {}
) => {
  if (!config.enableTaskAutomationScheduler) {
    return;
  }

  const now = options.now ? options.now() : new Date();
  const nowTimestamp = now.toISOString();
  const dueSoonWindowMinutes = toTaskAutomationDueSoonMinutes(config);
  const staleWindowHours = toTaskAutomationStaleHours(config);
  const dueSoonWindowEnd = new Date(now.getTime() + dueSoonWindowMinutes * 60_000).toISOString();
  const staleCutoff = new Date(now.getTime() - staleWindowHours * 60 * 60_000).toISOString();
  const dispatches: Array<ReturnType<typeof createTaskLinkedNotification>> = [];

  db.transaction(() => {
    const dueSoonCandidates = fetchDueSoonCandidates(db, nowTimestamp, dueSoonWindowEnd);
    for (const task of dueSoonCandidates) {
      const notification = createAutomationNotification(db, task, {
        automationType: "due_soon",
        title: `Prazo proximo: ${task.title}`,
        message: buildDueSoonMessage(task),
        priority: toDueSoonPriority(task.priority),
        dedupeKey: `due_soon:${task.dueAt}`,
        createdAt: nowTimestamp
      });
      if (notification) {
        dispatches.push(notification);
      }
    }

    const overdueCandidates = fetchOverdueCandidates(db, nowTimestamp);
    for (const task of overdueCandidates) {
      const notification = createAutomationNotification(db, task, {
        automationType: "overdue",
        title: `Tarefa atrasada: ${task.title}`,
        message: buildOverdueMessage(task),
        priority: toOverduePriority(task.priority),
        dedupeKey: `overdue:${task.dueAt}`,
        createdAt: nowTimestamp
      });
      if (notification) {
        dispatches.push(notification);
      }
    }

    const staleCandidates = fetchStaleCandidates(db, staleCutoff, dueSoonWindowEnd);
    for (const task of staleCandidates) {
      const notification = createAutomationNotification(db, task, {
        automationType: "stale_task",
        title: `Tarefa parada: ${task.title}`,
        message: buildStaleTaskMessage(task),
        priority: toStalePriority(task.priority),
        dedupeKey: `stale_task:${task.updatedAt}`,
        createdAt: nowTimestamp
      });
      if (notification) {
        dispatches.push(notification);
      }
    }

    const recurringCandidates = fetchRecurringCandidates(db);
    for (const task of recurringCandidates) {
      const notification = createRecurringTaskAutomation(db, task, nowTimestamp);
      if (notification) {
        dispatches.push(notification);
      }
    }
  })();

  for (const dispatch of dispatches) {
    if (dispatch) {
      dispatchTaskLinkedNotification(io, dispatch);
    }
  }
};

const countActiveTasks = (db: Database.Database): number =>
  (
    db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM tasks
          WHERE archived_at IS NULL
            AND status IN ${NON_TERMINAL_TASK_STATUS_FILTER}
        `
      )
      .get() as { total: number }
  ).total;

const countAutomationSentToday = (
  db: Database.Database,
  automationType: TaskAutomationType
): number =>
  (
    db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM task_automation_logs
          WHERE automation_type = ?
            AND date(datetime(created_at, 'localtime')) = date('now', 'localtime')
        `
      )
      .get(automationType) as { total: number }
  ).total;

export const buildTaskAutomationHealth = (
  db: Database.Database,
  config: AppConfig,
  now = new Date()
): TaskAutomationHealthStats => {
  const dueSoonWindowMinutes = toTaskAutomationDueSoonMinutes(config);
  const staleWindowHours = toTaskAutomationStaleHours(config);
  const nowTimestamp = now.toISOString();
  const dueSoonWindowEnd = new Date(now.getTime() + dueSoonWindowMinutes * 60_000).toISOString();
  const staleCutoff = new Date(now.getTime() - staleWindowHours * 60 * 60_000).toISOString();

  return {
    schedulerEnabled: Boolean(config.enableTaskAutomationScheduler),
    dueSoonWindowMinutes,
    staleWindowHours,
    activeTasks: countActiveTasks(db),
    dueSoonEligible: fetchDueSoonCandidates(db, nowTimestamp, dueSoonWindowEnd).length,
    overdueEligible: fetchOverdueCandidates(db, nowTimestamp).length,
    staleEligible: fetchStaleCandidates(db, staleCutoff, dueSoonWindowEnd).length,
    recurringEligible: fetchRecurringCandidates(db).length,
    dueSoonSentToday: countAutomationSentToday(db, "due_soon"),
    overdueSentToday: countAutomationSentToday(db, "overdue"),
    staleSentToday: countAutomationSentToday(db, "stale_task"),
    recurringCreatedToday: countAutomationSentToday(db, "recurring_task")
  };
};

export const listTaskAutomationLogs = (
  db: Database.Database,
  params: {
    automationType?: TaskAutomationType | "";
    taskId?: number | null;
    limit: number;
  }
) =>
  db
    .prepare(
      `
        SELECT
          tal.id,
          tal.task_id AS taskId,
          t.title AS taskTitle,
          tal.automation_type AS automationType,
          tal.dedupe_key AS dedupeKey,
          tal.notification_id AS notificationId,
          tal.metadata_json AS metadataJson,
          tal.created_at AS createdAt
        FROM task_automation_logs tal
        INNER JOIN tasks t ON t.id = tal.task_id
        WHERE (? = '' OR tal.automation_type = ?)
          AND (? IS NULL OR tal.task_id = ?)
        ORDER BY tal.created_at DESC, tal.id DESC
        LIMIT ?
      `
    )
    .all(
      params.automationType ?? "",
      params.automationType ?? "",
      params.taskId ?? null,
      params.taskId ?? null,
      params.limit
    ) as TaskAutomationLogRow[];
