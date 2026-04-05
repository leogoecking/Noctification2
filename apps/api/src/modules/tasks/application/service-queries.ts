import type Database from "better-sqlite3";
import { nowIso } from "../../../db";
import {
  taskCommentsSelectSql,
  taskEventsSelectSql,
  taskSelectSql,
  type TaskCommentRow,
  type TaskEventRow,
  type TaskRow
} from "./service-types";
import { normalizeTaskCommentRow, normalizeTaskEventRow } from "./service-normalizers";

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
