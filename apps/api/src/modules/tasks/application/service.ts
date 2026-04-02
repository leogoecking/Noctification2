import type Database from "better-sqlite3";
import { logAudit, nowIso, sanitizeMetadata } from "../../../db";
import type { TaskEventType, TaskPriority, TaskRepeatType, TaskStatus } from "../../../types";

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

export interface TaskCommentRow {
  id: number;
  taskId: number;
  authorUserId: number;
  authorName: string;
  authorLogin: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskTimelineItem {
  id: string;
  kind: "event" | "comment";
  taskId: number;
  actorUserId: number | null;
  actorName: string | null;
  actorLogin: string | null;
  eventType: string | null;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  body: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string | null;
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

const taskCommentsSelectSql = `
  SELECT
    c.id,
    c.task_id AS taskId,
    c.author_user_id AS authorUserId,
    author.name AS authorName,
    author.login AS authorLogin,
    c.body,
    c.created_at AS createdAt,
    c.updated_at AS updatedAt
  FROM task_comments c
  INNER JOIN users author ON author.id = c.author_user_id
`;

const TASK_ROW_WEEKDAY_VALUES = new Set([0, 1, 2, 3, 4, 5, 6]);

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
          .filter((item) => Number.isInteger(item) && TASK_ROW_WEEKDAY_VALUES.has(item))
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

export const normalizeTaskCommentRow = (row: TaskCommentRow) => ({
  id: row.id,
  taskId: row.taskId,
  authorUserId: row.authorUserId,
  authorName: row.authorName,
  authorLogin: row.authorLogin,
  body: row.body,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

export const activeUserExists = (db: Database.Database, userId: number): boolean => {
  const row = db.prepare("SELECT id FROM users WHERE id = ? AND is_active = 1").get(userId) as
    | { id: number }
    | undefined;

  return Boolean(row);
};

export const getActiveTaskAssigneeValidationError = (
  db: Database.Database,
  nextAssigneeUserId: number | null
): string | null =>
  nextAssigneeUserId !== null && !activeUserExists(db, nextAssigneeUserId)
    ? "assignee_user_id deve referenciar um usuario ativo"
    : null;

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

export const listTaskComments = (db: Database.Database, taskId: number) =>
  (
    db
      .prepare(
        `${taskCommentsSelectSql}
         WHERE c.task_id = ?
         ORDER BY c.created_at DESC, c.id DESC`
      )
      .all(taskId) as TaskCommentRow[]
  ).map(normalizeTaskCommentRow);

export const createTaskComment = (
  db: Database.Database,
  params: {
    taskId: number;
    authorUserId: number;
    body: string;
    createdAt?: string;
  }
) => {
  const timestamp = params.createdAt ?? nowIso();
  const result = db
    .prepare(
      `
        INSERT INTO task_comments (
          task_id,
          author_user_id,
          body,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?)
      `
    )
    .run(params.taskId, params.authorUserId, params.body, timestamp, timestamp);

  return db
    .prepare(
      `${taskCommentsSelectSql}
       WHERE c.id = ?`
    )
    .get(Number(result.lastInsertRowid)) as TaskCommentRow;
};

export const listTaskTimeline = (db: Database.Database, taskId: number): TaskTimelineItem[] => {
  const events = listTaskEvents(db, taskId).map((event) => ({
    id: `event:${event.id}`,
    kind: "event" as const,
    taskId: event.taskId,
    actorUserId: event.actorUserId,
    actorName: event.actorName ?? null,
    actorLogin: event.actorLogin ?? null,
    eventType: event.eventType,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    body: null,
    metadata: event.metadata,
    createdAt: event.createdAt,
    updatedAt: null
  }));
  const comments = listTaskComments(db, taskId).map((comment) => ({
    id: `comment:${comment.id}`,
    kind: "comment" as const,
    taskId: comment.taskId,
    actorUserId: comment.authorUserId,
    actorName: comment.authorName,
    actorLogin: comment.authorLogin,
    eventType: null,
    fromStatus: null,
    toStatus: null,
    body: comment.body,
    metadata: null,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt
  }));

  return [...events, ...comments].sort((left, right) => {
    const createdAtCompare = right.createdAt.localeCompare(left.createdAt);
    if (createdAtCompare !== 0) {
      return createdAtCompare;
    }

    return right.id.localeCompare(left.id);
  });
};

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
