import type Database from "better-sqlite3";
import {
  createTaskComment,
  listTaskTimeline,
  logTaskAudit,
  normalizeTaskRow,
  taskSelectSql,
  type TaskRow
} from "./service";

export const TASK_ORDER_BY = `
  ORDER BY
    CASE WHEN t.due_at IS NULL THEN 1 ELSE 0 END ASC,
    t.due_at ASC,
    t.created_at DESC,
    t.id DESC
`;

export const parseTaskIdParam = (value: string): number | null => {
  const taskId = Number(value);
  return Number.isInteger(taskId) && taskId > 0 ? taskId : null;
};

export const buildTaskListResponse = (
  db: Database.Database,
  params: {
    conditions: string[];
    values: Array<string | number>;
    page: number;
    limit: number;
  }
) => {
  const whereClause = params.conditions.length > 0 ? `WHERE ${params.conditions.join(" AND ")}` : "";
  const total = (
    db.prepare(`SELECT COUNT(*) AS total FROM tasks t ${whereClause}`).get(...params.values) as {
      total: number;
    }
  ).total;

  const rows = db
    .prepare(
      `${taskSelectSql}
       ${whereClause}
       ${TASK_ORDER_BY}
       LIMIT ?
       OFFSET ?`
    )
    .all(...params.values, params.limit, (params.page - 1) * params.limit) as TaskRow[];

  return {
    tasks: rows.map(normalizeTaskRow),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: total === 0 ? 1 : Math.ceil(total / params.limit)
    }
  };
};

export const buildTaskDetailResponse = (db: Database.Database, task: TaskRow) => ({
  task: normalizeTaskRow(task),
  timeline: listTaskTimeline(db, task.id)
});

export const createTaskCommentResponse = (
  db: Database.Database,
  params: {
    taskId: number;
    authorUserId: number;
    body: string;
    auditEventType: string;
  }
) => {
  const comment = createTaskComment(db, {
    taskId: params.taskId,
    authorUserId: params.authorUserId,
    body: params.body
  });

  logTaskAudit(db, {
    actorUserId: params.authorUserId,
    taskId: params.taskId,
    eventType: params.auditEventType,
    metadata: {
      commentId: comment.id
    }
  });

  return {
    comment
  };
};
