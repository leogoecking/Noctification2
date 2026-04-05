import type Database from "better-sqlite3";
import {
  createTaskComment,
  listTaskTimeline,
  logTaskAudit,
  normalizeTaskRow,
  taskSelectSql,
  type TaskRow
} from "../application/service";
import { TASK_ORDER_BY } from "./route-query-helpers";

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
    db.prepare(
      `
        SELECT COUNT(*) AS total
        FROM (
          ${taskSelectSql}
          ${whereClause}
        ) task_list
      `
    ).get(...params.values) as {
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
