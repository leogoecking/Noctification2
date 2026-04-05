import type { TaskCommentRow, TaskEventRow, TaskRow } from "./service-types";

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
