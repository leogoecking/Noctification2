import { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../config";
import { nowIso } from "../db";
import { authenticate, requireRole } from "../middleware/auth";
import { buildTaskAutomationHealth, listTaskAutomationLogs } from "../tasks/automation";
import {
  isTaskTerminal,
  parseLimit,
  parseOptionalUserId,
  parsePage,
  parseTaskPriority,
  parseTaskStatus,
  toNullableString,
  validateTaskCommentBody
} from "../tasks/domain";
import { dispatchTaskLinkedNotificationIfPresent } from "../tasks/notifications";
import {
  prepareTaskCreateInput,
  runTaskCreateMutation,
  runTaskTerminalTransition,
  runTaskUpdateMutation
} from "../tasks/task-mutations";
import {
  buildTaskDetailResponse,
  buildTaskListResponse,
  createTaskCommentResponse,
  parseTaskIdParam
} from "../tasks/route-helpers";
import {
  activeUserExists,
  fetchTaskById,
  normalizeTaskRow,
  type TaskRow
} from "../tasks/service";

export const createTaskAdminRouter = (db: Database.Database, config: AppConfig): Router => {
  return createTaskAdminRouterWithIo(db, null, config);
};

export const createTaskAdminRouterWithIo = (
  db: Database.Database,
  io: Server | null,
  config: AppConfig
): Router => {
  const router = Router();

  router.use(authenticate(db, config), requireRole("admin"));

  router.get("/tasks/health", (_req, res) => {
    res.json({
      health: buildTaskAutomationHealth(db, config)
    });
  });

  router.get("/tasks/automation-logs", (req, res) => {
    const automationTypeRaw = toNullableString(req.query.automation_type);
    const automationType =
      automationTypeRaw === "due_soon" ||
      automationTypeRaw === "overdue" ||
      automationTypeRaw === "stale_task" ||
      automationTypeRaw === "recurring_task"
        ? automationTypeRaw
        : automationTypeRaw === null
          ? ""
          : null;
    const taskIdRaw = Number(req.query.task_id);
    const taskId = Number.isInteger(taskIdRaw) && taskIdRaw > 0 ? taskIdRaw : null;
    const limit = parseLimit(req.query.limit, 100, 300);

    if (automationTypeRaw && !automationType) {
      res.status(400).json({ error: "automation_type invalido" });
      return;
    }

    const logs = listTaskAutomationLogs(db, {
      automationType: automationType ?? "",
      taskId,
      limit
    }).map((item) => ({
      ...item,
      metadata: item.metadataJson ? JSON.parse(item.metadataJson) : null
    }));

    res.json({ logs });
  });

  router.get("/tasks", (req, res) => {
    const limit = parseLimit(req.query.limit, 100, 500);
    const page = parsePage(req.query.page, 1);
    const status = toNullableString(req.query.status);
    const priority = toNullableString(req.query.priority);
    const dueBefore = toNullableString(req.query.due_before);
    const dueAfter = toNullableString(req.query.due_after);
    const assigneeUserId = parseOptionalUserId(req.query.assignee_user_id);
    const creatorUserId = parseOptionalUserId(req.query.creator_user_id);
    const includeArchived = String(req.query.include_archived ?? "").toLowerCase() === "true";

    if (status && !parseTaskStatus(status)) {
      res.status(400).json({ error: "status invalido" });
      return;
    }

    if (priority && !parseTaskPriority(priority)) {
      res.status(400).json({ error: "priority invalida" });
      return;
    }

    if (req.query.assignee_user_id !== undefined && assigneeUserId === undefined) {
      res.status(400).json({ error: "assignee_user_id invalido" });
      return;
    }

    if (req.query.creator_user_id !== undefined && creatorUserId === undefined) {
      res.status(400).json({ error: "creator_user_id invalido" });
      return;
    }

    const conditions: string[] = [];
    const values: Array<string | number> = [];

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

    res.json(
      buildTaskListResponse(db, {
        conditions,
        values,
        page,
        limit
      })
    );
  });

  router.get("/tasks/:id", (req, res) => {
    const taskId = parseTaskIdParam(req.params.id);
    if (!taskId) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const task = fetchTaskById(db, taskId);
    if (!task || task.archivedAt) {
      res.status(404).json({ error: "Tarefa nao encontrada" });
      return;
    }

    res.json(buildTaskDetailResponse(db, task as TaskRow));
  });

  router.post("/tasks/:id/comments", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const taskId = parseTaskIdParam(req.params.id);
    if (!taskId) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const task = fetchTaskById(db, taskId);
    if (!task || task.archivedAt) {
      res.status(404).json({ error: "Tarefa nao encontrada" });
      return;
    }

    const body = validateTaskCommentBody(req.body?.body);
    if (!body) {
      res.status(400).json({ error: "body e obrigatorio e deve ter ate 4000 caracteres" });
      return;
    }

    res.status(201).json(
      createTaskCommentResponse(db, {
        taskId: task.id,
        authorUserId: req.authUser.id,
        body,
        auditEventType: "task.comment.created"
      })
    );
  });

  router.post("/tasks", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const parsedCreate = prepareTaskCreateInput(req.body as Record<string, unknown>, {
      actorUserId: req.authUser.id,
      validateAssignee: ({ nextAssigneeUserId }) =>
        nextAssigneeUserId !== null && !activeUserExists(db, nextAssigneeUserId)
          ? "assignee_user_id deve referenciar um usuario ativo"
          : null
    });

    if (parsedCreate.error) {
      res.status(400).json({ error: parsedCreate.error });
      return;
    }

    const timestamp = nowIso();
    const { taskId, assignmentNotification } = runTaskCreateMutation({
      db,
      body: req.body as Record<string, unknown>,
      actorUserId: req.authUser.id,
      actorName: req.authUser.name,
      timestamp,
      policy: {
        auditEventType: "admin.task.create",
        notificationTrigger: "admin.task.create",
        validateAssignee: ({ nextAssigneeUserId }) =>
          nextAssigneeUserId !== null && !activeUserExists(db, nextAssigneeUserId)
            ? "assignee_user_id deve referenciar um usuario ativo"
            : null
      }
    });

    dispatchTaskLinkedNotificationIfPresent(db, config, io, assignmentNotification);

    const created = fetchTaskById(db, taskId);
    res.status(201).json({ task: normalizeTaskRow(created as TaskRow) });
  });

  router.patch("/tasks/:id", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const taskId = parseTaskIdParam(req.params.id);
    if (!taskId) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const existing = fetchTaskById(db, taskId);
    if (!existing || existing.archivedAt) {
      res.status(404).json({ error: "Tarefa nao encontrada" });
      return;
    }
    if (isTaskTerminal(existing.status)) {
      res.status(409).json({ error: "Tarefa concluida ou cancelada nao pode ser editada" });
      return;
    }

    const timestamp = nowIso();
    const result = runTaskUpdateMutation({
      db,
      taskId,
      body: req.body as Record<string, unknown>,
      existing,
      actorUserId: req.authUser.id,
      actorName: req.authUser.name,
      timestamp,
      policy: {
        changedBy: "admin.patch",
        auditEventType: "admin.task.update",
        notificationTrigger: "admin.task.update",
        validateAssignee: ({ nextAssigneeUserId }) =>
          nextAssigneeUserId !== null && !activeUserExists(db, nextAssigneeUserId)
            ? "assignee_user_id deve referenciar um usuario ativo"
            : null
      }
    });

    if ("error" in result) {
      res.status(400).json({ error: result.error });
      return;
    }

    dispatchTaskLinkedNotificationIfPresent(db, config, io, result.assignmentNotification);
    dispatchTaskLinkedNotificationIfPresent(db, config, io, result.statusNotification);

    const updated = fetchTaskById(db, taskId);
    res.json({ task: normalizeTaskRow(updated as TaskRow) });
  });

  router.post("/tasks/:id/complete", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const taskId = parseTaskIdParam(req.params.id);
    if (!taskId) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const existing = fetchTaskById(db, taskId);
    if (!existing || existing.archivedAt) {
      res.status(404).json({ error: "Tarefa nao encontrada" });
      return;
    }

    if (existing.status === "done") {
      res.status(409).json({ error: "Tarefa ja concluida" });
      return;
    }

    if (existing.status === "cancelled") {
      res.status(409).json({ error: "Tarefa cancelada nao pode ser concluida" });
      return;
    }

    const timestamp = nowIso();
    const completionNotification = runTaskTerminalTransition({
      db,
      taskId,
      existing,
      actorUserId: req.authUser.id,
      actorName: req.authUser.name,
      targetStatus: "done",
      auditEventType: "admin.task.complete",
      notificationTrigger: "admin.task.complete",
      timestamp
    });

    dispatchTaskLinkedNotificationIfPresent(db, config, io, completionNotification);

    const updated = fetchTaskById(db, taskId);
    res.json({ task: normalizeTaskRow(updated as TaskRow) });
  });

  router.post("/tasks/:id/cancel", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const taskId = parseTaskIdParam(req.params.id);
    if (!taskId) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const existing = fetchTaskById(db, taskId);
    if (!existing || existing.archivedAt) {
      res.status(404).json({ error: "Tarefa nao encontrada" });
      return;
    }

    if (existing.status === "cancelled") {
      res.status(409).json({ error: "Tarefa ja cancelada" });
      return;
    }

    if (existing.status === "done") {
      res.status(409).json({ error: "Tarefa concluida nao pode ser cancelada" });
      return;
    }

    const timestamp = nowIso();
    const cancellationNotification = runTaskTerminalTransition({
      db,
      taskId,
      existing,
      actorUserId: req.authUser.id,
      actorName: req.authUser.name,
      targetStatus: "cancelled",
      auditEventType: "admin.task.cancel",
      notificationTrigger: "admin.task.cancel",
      timestamp
    });

    dispatchTaskLinkedNotificationIfPresent(db, config, io, cancellationNotification);

    const updated = fetchTaskById(db, taskId);
    res.json({ task: normalizeTaskRow(updated as TaskRow) });
  });

  return router;
};
