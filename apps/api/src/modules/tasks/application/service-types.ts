import type { TaskPriority, TaskRepeatType, TaskStatus } from "../../../types";

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

export const taskEventsSelectSql = `
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

export const taskCommentsSelectSql = `
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
