import type Database from "better-sqlite3";
import { logAudit, nowIso, sanitizeMetadata } from "../db";
import type { TaskEventType, TaskPriority, TaskRepeatType, TaskStatus } from "../types";

export const TASK_PRIORITIES: TaskPriority[] = ["low", "normal", "high", "critical"];
export const TASK_STATUSES: TaskStatus[] = ["new", "in_progress", "waiting", "done", "cancelled"];
export const TASK_REPEAT_TYPES: TaskRepeatType[] = ["none", "daily", "weekly", "monthly", "weekdays"];
export const NON_TERMINAL_TASK_STATUSES: TaskStatus[] = ["new", "in_progress", "waiting"];
const WEEKDAY_VALUES = new Set([0, 1, 2, 3, 4, 5, 6]);

export interface TaskRow {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  creatorUserId: number;
  creatorName: string;
  creatorLogin: string;
  assigneeUserId: number | null;
  assigneeName: string | null;
  assigneeLogin: string | null;
  dueAt: string | null;
  repeatType: TaskRepeatType;
  repeatWeekdaysJson: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  recurrenceSourceTaskId: number | null;
  sourceNotificationId: number | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface TaskEventRow {
  id: number;
  taskId: number;
  actorUserId: number | null;
  actorName: string | null;
  actorLogin: string | null;
  eventType: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  metadataJson: string | null;
  createdAt: string;
}

export const taskSelectSql = `
  SELECT
    t.id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.creator_user_id AS creatorUserId,
    creator.name AS creatorName,
    creator.login AS creatorLogin,
    t.assignee_user_id AS assigneeUserId,
    assignee.name AS assigneeName,
    assignee.login AS assigneeLogin,
    t.due_at AS dueAt,
    t.repeat_type AS repeatType,
    t.repeat_weekdays_json AS repeatWeekdaysJson,
    t.started_at AS startedAt,
    t.completed_at AS completedAt,
    t.cancelled_at AS cancelledAt,
    t.recurrence_source_task_id AS recurrenceSourceTaskId,
    t.source_notification_id AS sourceNotificationId,
    t.created_at AS createdAt,
    t.updated_at AS updatedAt,
    t.archived_at AS archivedAt
  FROM tasks t
  INNER JOIN users creator ON creator.id = t.creator_user_id
  LEFT JOIN users assignee ON assignee.id = t.assignee_user_id
`;

const taskEventsSelectSql = `
  SELECT
    e.id,
    e.task_id AS taskId,
    e.actor_user_id AS actorUserId,
    actor.name AS actorName,
    actor.login AS actorLogin,
    e.event_type AS eventType,
    e.from_status AS fromStatus,
    e.to_status AS toStatus,
    e.metadata_json AS metadataJson,
    e.created_at AS createdAt
  FROM task_events e
  LEFT JOIN users actor ON actor.id = e.actor_user_id
`;

const parseMetadata = (value: string | null): Record<string, unknown> | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const parseTaskWeekdaysJson = (value: string): number[] => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed
          .map((item) => Number(item))
          .filter((item) => Number.isInteger(item) && WEEKDAY_VALUES.has(item))
      : [];
  } catch {
    return [];
  }
};

export const normalizeTaskRow = (row: TaskRow) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  status: row.status,
  priority: row.priority,
  creatorUserId: row.creatorUserId,
  creatorName: row.creatorName,
  creatorLogin: row.creatorLogin,
  assigneeUserId: row.assigneeUserId,
  assigneeName: row.assigneeName,
  assigneeLogin: row.assigneeLogin,
  dueAt: row.dueAt,
  repeatType: row.repeatType,
  repeatWeekdays: parseTaskWeekdaysJson(row.repeatWeekdaysJson),
  startedAt: row.startedAt,
  completedAt: row.completedAt,
  cancelledAt: row.cancelledAt,
  recurrenceSourceTaskId: row.recurrenceSourceTaskId,
  sourceNotificationId: row.sourceNotificationId,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  archivedAt: row.archivedAt
});

export const normalizeTaskEventRow = (row: TaskEventRow) => ({
  id: row.id,
  taskId: row.taskId,
  actorUserId: row.actorUserId,
  actorName: row.actorName,
  actorLogin: row.actorLogin,
  eventType: row.eventType,
  fromStatus: row.fromStatus,
  toStatus: row.toStatus,
  metadata: parseMetadata(row.metadataJson),
  createdAt: row.createdAt
});

export const toNullableString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const parseLimit = (value: unknown, fallback: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
};

export const parsePage = (value: unknown, fallback = 1): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

export const parseTaskPriority = (value: unknown): TaskPriority | null => {
  if (value === "low" || value === "normal" || value === "high" || value === "critical") {
    return value;
  }

  return null;
};

export const parseTaskStatus = (value: unknown): TaskStatus | null => {
  if (
    value === "new" ||
    value === "in_progress" ||
    value === "waiting" ||
    value === "done" ||
    value === "cancelled"
  ) {
    return value;
  }

  return null;
};

export const parseTaskRepeatType = (value: unknown): TaskRepeatType | null => {
  if (
    value === "none" ||
    value === "daily" ||
    value === "weekly" ||
    value === "monthly" ||
    value === "weekdays"
  ) {
    return value;
  }

  return null;
};

export const parseTaskWeekdays = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && WEEKDAY_VALUES.has(item))
    )
  ).sort((a, b) => a - b);
};

export const stringifyTaskWeekdays = (weekdays: number[]): string => JSON.stringify(weekdays);

export const parseNonTerminalTaskStatus = (value: unknown): TaskStatus | null => {
  if (value === "new" || value === "in_progress" || value === "waiting") {
    return value;
  }

  return null;
};

export const isTaskTerminal = (status: TaskStatus): boolean =>
  status === "done" || status === "cancelled";

export const parseOptionalUserId = (value: unknown): number | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
};

export const parseOptionalDueAt = (
  value: unknown
): { provided: boolean; value: string | null; error?: string } => {
  if (value === undefined) {
    return { provided: false, value: null };
  }

  if (value === null || value === "") {
    return { provided: true, value: null };
  }

  if (typeof value !== "string") {
    return { provided: true, value: null, error: "due_at deve ser uma data ISO valida ou null" };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { provided: true, value: null, error: "due_at deve ser uma data ISO valida ou null" };
  }

  return { provided: true, value: parsed.toISOString() };
};

export const validateTaskRecurrence = (
  repeatType: TaskRepeatType,
  weekdays: number[]
): string | null => {
  if (repeatType === "weekly" && weekdays.length === 0) {
    return "weekdays e obrigatorio para recorrencia semanal";
  }

  return null;
};

export const validateTaskTitle = (value: unknown): string | null => {
  const title = toNullableString(value);
  if (!title || title.length > 200) {
    return null;
  }

  return title;
};

export const validateTaskDescription = (value: unknown): string => {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, 4000);
};

export const activeUserExists = (db: Database.Database, userId: number): boolean => {
  const row = db.prepare("SELECT id FROM users WHERE id = ? AND is_active = 1").get(userId) as
    | { id: number }
    | undefined;

  return Boolean(row);
};

export const fetchTaskById = (db: Database.Database, taskId: number): TaskRow | undefined =>
  db.prepare(`${taskSelectSql} WHERE t.id = ?`).get(taskId) as TaskRow | undefined;

export const fetchTaskForUser = (
  db: Database.Database,
  taskId: number,
  userId: number
): TaskRow | undefined =>
  db
    .prepare(
      `${taskSelectSql}
       WHERE t.id = ?
         AND (t.creator_user_id = ? OR t.assignee_user_id = ?)`
    )
    .get(taskId, userId, userId) as TaskRow | undefined;

export const listTaskEvents = (db: Database.Database, taskId: number) =>
  (
    db
      .prepare(
        `${taskEventsSelectSql}
         WHERE e.task_id = ?
         ORDER BY e.created_at DESC, e.id DESC`
      )
      .all(taskId) as TaskEventRow[]
  ).map(normalizeTaskEventRow);

export const logTaskEvent = (
  db: Database.Database,
  params: {
    taskId: number;
    actorUserId?: number | null;
    eventType: TaskEventType;
    fromStatus?: TaskStatus | null;
    toStatus?: TaskStatus | null;
    metadata?: Record<string, unknown>;
    createdAt?: string;
  }
): void => {
  db.prepare(
    `
      INSERT INTO task_events (
        task_id,
        actor_user_id,
        event_type,
        from_status,
        to_status,
        metadata_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    params.taskId,
    params.actorUserId ?? null,
    params.eventType,
    params.fromStatus ?? null,
    params.toStatus ?? null,
    sanitizeMetadata(params.metadata),
    params.createdAt ?? nowIso()
  );
};

export const logTaskAudit = (
  db: Database.Database,
  params: {
    actorUserId: number;
    taskId: number;
    eventType: string;
    metadata?: Record<string, unknown>;
  }
): void => {
  logAudit(db, {
    actorUserId: params.actorUserId,
    eventType: params.eventType,
    targetType: "task",
    targetId: params.taskId,
    metadata: params.metadata
  });
};
