import type Database from "better-sqlite3";
import { logAudit, sanitizeMetadata } from "../../../db";
import {
  createTaskLinkedNotification,
  type TaskLinkedNotificationDispatch
} from "./notifications";
import { logTaskEvent } from "./service";
import type { NotificationPriority } from "../../../types";
import { computeNextRecurringDueAt, parseRecurringWeekdaysJson } from "./automation-recurrence";
import type { TaskAutomationCandidateRow, TaskAutomationType } from "../domain/automation-types";

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

export const toDueSoonPriority = (priority: NotificationPriority): NotificationPriority => {
  if (priority === "high" || priority === "critical") {
    return priority;
  }

  return "normal";
};

export const toOverduePriority = (priority: NotificationPriority): NotificationPriority => {
  if (priority === "critical") {
    return "critical";
  }

  return "high";
};

export const toStalePriority = (priority: NotificationPriority): NotificationPriority => {
  if (priority === "critical" || priority === "high") {
    return priority;
  }

  return "normal";
};

export const buildDueSoonMessage = (task: TaskAutomationCandidateRow): string =>
  `A tarefa "${task.title}" esta perto do prazo. Vencimento atual: ${task.dueAt}.`;

export const buildOverdueMessage = (task: TaskAutomationCandidateRow): string =>
  `A tarefa "${task.title}" esta atrasada desde ${task.dueAt}.`;

export const buildStaleTaskMessage = (task: TaskAutomationCandidateRow): string =>
  `A tarefa "${task.title}" esta sem atualizacao recente desde ${task.staleSince ?? task.updatedAt}.`;

const buildRecurringTaskMessage = (taskTitle: string, dueAt: string | null): string => {
  const dueSuffix = dueAt ? ` Novo prazo: ${dueAt}.` : "";
  return `Uma nova recorrencia da tarefa "${taskTitle}" foi criada.${dueSuffix}`;
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

export const createAutomationNotification = (
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
): TaskLinkedNotificationDispatch | null => {
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

export const createRecurringTaskAutomation = (
  db: Database.Database,
  task: TaskAutomationCandidateRow,
  createdAt: string
): TaskLinkedNotificationDispatch | null => {
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
      repeatWeekdays: parseRecurringWeekdaysJson(task.repeatWeekdaysJson)
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
