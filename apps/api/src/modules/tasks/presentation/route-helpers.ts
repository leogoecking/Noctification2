import type Database from "better-sqlite3";
import type { TaskStatus } from "../../../types";
import {
  isTaskTerminal,
  parseLimit,
  parseOptionalUserId,
  parsePage,
  parseTaskPriority,
  parseTaskStatus,
  toNullableString
} from "../domain/domain";
import {
  createTaskComment,
  listTaskTimeline,
  logTaskAudit,
  normalizeTaskRow,
  taskSelectSql,
  type TaskRow
} from "../application/service";

export const TASK_ORDER_BY = `
  ORDER BY
    CASE WHEN t.due_at IS NULL THEN 1 ELSE 0 END ASC,
    t.due_at ASC,
    t.created_at DESC,
    t.id DESC
`;

const TASK_STATUS_SEARCH_TERMS: Record<TaskStatus, string[]> = {
  new: ["new", "nova"],
  assumed: ["assumed", "assumida"],
  in_progress: ["in_progress", "in progress", "em andamento", "em_andamento", "andamento"],
  blocked: ["blocked", "bloqueada", "bloqueado"],
  waiting_external: ["waiting_external", "waiting external", "aguardando externo", "externo"],
  done: ["done", "concluida", "concluido", "finalizada", "finalizado"],
  cancelled: ["cancelled", "cancelada", "cancelado"]
};

const findTaskStatusesBySearch = (search: string): TaskStatus[] => {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) {
    return [];
  }

  return (Object.entries(TASK_STATUS_SEARCH_TERMS) as Array<[TaskStatus, string[]]>)
    .filter(([, terms]) =>
      terms.some((term) => term.includes(normalizedSearch) || normalizedSearch.includes(term))
    )
    .map(([status]) => status);
};

export const parseTaskIdParam = (value: string): number | null => {
  const taskId = Number(value);
  return Number.isInteger(taskId) && taskId > 0 ? taskId : null;
};

export const buildTaskListParams = (
  query: Record<string, unknown>,
  options: {
    defaultLimit: number;
    maxLimit: number;
    scopeUserId?: number;
    includeAssigneeSearch?: boolean;
  }
):
  | {
      error: string;
    }
  | {
      conditions: string[];
      values: Array<string | number>;
      page: number;
      limit: number;
    } => {
  const limit = parseLimit(query.limit, options.defaultLimit, options.maxLimit);
  const page = parsePage(query.page, 1);
  const status = toNullableString(query.status);
  const priority = toNullableString(query.priority);
  const dueBefore = toNullableString(query.due_before);
  const dueAfter = toNullableString(query.due_after);
  const search = toNullableString(query.search);
  const assigneeUserId = parseOptionalUserId(query.assignee_user_id);
  const creatorUserId = parseOptionalUserId(query.creator_user_id);
  const includeArchived = String(query.include_archived ?? "").toLowerCase() === "true";

  if (status && !parseTaskStatus(status)) {
    return { error: "status invalido" };
  }

  if (priority && !parseTaskPriority(priority)) {
    return { error: "priority invalida" };
  }

  if (query.assignee_user_id !== undefined && assigneeUserId === undefined) {
    return { error: "assignee_user_id invalido" };
  }

  if (query.creator_user_id !== undefined && creatorUserId === undefined) {
    return { error: "creator_user_id invalido" };
  }

  const conditions: string[] = [];
  const values: Array<string | number> = [];

  if (options.scopeUserId !== undefined) {
    if (
      assigneeUserId !== undefined &&
      assigneeUserId !== null &&
      assigneeUserId !== options.scopeUserId
    ) {
      return { error: "assignee_user_id invalido para o escopo do usuario" };
    }

    if (
      creatorUserId !== undefined &&
      creatorUserId !== null &&
      creatorUserId !== options.scopeUserId
    ) {
      return { error: "creator_user_id invalido para o escopo do usuario" };
    }

    conditions.push("(t.creator_user_id = ? OR t.assignee_user_id = ?)");
    values.push(options.scopeUserId, options.scopeUserId);
  }

  if (!includeArchived) {
    conditions.push("t.archived_at IS NULL");
  }

  if (status) {
    conditions.push("t.status = ?");
    values.push(status);
  }

  if (priority) {
    conditions.push("t.priority = ?");
    values.push(priority);
  }

  if (creatorUserId !== undefined) {
    if (creatorUserId === null) {
      conditions.push("t.creator_user_id IS NULL");
    } else {
      conditions.push("t.creator_user_id = ?");
      values.push(creatorUserId);
    }
  }

  if (assigneeUserId !== undefined) {
    if (assigneeUserId === null) {
      conditions.push("t.assignee_user_id IS NULL");
    } else {
      conditions.push("t.assignee_user_id = ?");
      values.push(assigneeUserId);
    }
  }

  if (dueAfter) {
    conditions.push("t.due_at IS NOT NULL AND t.due_at >= ?");
    values.push(dueAfter);
  }

  if (dueBefore) {
    conditions.push("t.due_at IS NOT NULL AND t.due_at <= ?");
    values.push(dueBefore);
  }

  if (search) {
    const normalizedSearch = `%${search.trim().toLowerCase()}%`;
    const matchedStatuses = findTaskStatusesBySearch(search);
    const searchConditions = [
      "LOWER(t.title) LIKE ?",
      "LOWER(COALESCE(t.description, '')) LIKE ?"
    ];
    values.push(normalizedSearch, normalizedSearch);

    if (options.includeAssigneeSearch) {
      searchConditions.push("LOWER(COALESCE(assignee.name, '')) LIKE ?");
      searchConditions.push("LOWER(COALESCE(assignee.login, '')) LIKE ?");
      values.push(normalizedSearch, normalizedSearch);
    }

    if (matchedStatuses.length > 0) {
      searchConditions.push(`t.status IN (${matchedStatuses.map(() => "?").join(", ")})`);
      values.push(...matchedStatuses);
    }

    conditions.push(`(${searchConditions.join(" OR ")})`);
  }

  return {
    conditions,
    values,
    page,
    limit
  };
};

export const getTaskForRoute = <T extends { archivedAt: string | null }>(
  taskIdParam: string,
  fetchTask: (taskId: number) => T | undefined
):
  | { error: string; status: number }
  | { taskId: number; task: T } => {
  const taskId = parseTaskIdParam(taskIdParam);
  if (!taskId) {
    return { error: "ID invalido", status: 400 };
  }

  const task = fetchTask(taskId);
  if (!task || task.archivedAt) {
    return { error: "Tarefa nao encontrada", status: 404 };
  }

  return { taskId, task };
};

export const validateTaskEditableForRoute = (status: TaskRow["status"]) => {
  if (isTaskTerminal(status)) {
    return { error: "Tarefa concluida ou cancelada nao pode ser editada", status: 409 };
  }

  return null;
};

export const validateTaskTerminalTransitionForRoute = (
  status: TaskRow["status"],
  targetStatus: "done" | "cancelled"
) => {
  if (targetStatus === "done") {
    if (status === "done") {
      return { error: "Tarefa ja concluida", status: 409 };
    }

    if (status === "cancelled") {
      return { error: "Tarefa cancelada nao pode ser concluida", status: 409 };
    }

    return null;
  }

  if (status === "cancelled") {
    return { error: "Tarefa ja cancelada", status: 409 };
  }

  if (status === "done") {
    return { error: "Tarefa concluida nao pode ser cancelada", status: 409 };
  }

  return null;
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
