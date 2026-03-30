import { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../../../config";
import { nowIso } from "../../../db";
import { authenticate, requireRole } from "../../../middleware/auth";
import { buildTaskAutomationHealth, listTaskAutomationLogs } from "../application/automation";
import { buildTaskMetricsSummary } from "../application/metrics";
import {
  parseLimit,
  parseTaskMetricsWindow,
  parseTaskQueueFilter,
  toNullableString,
  validateTaskCommentBody
} from "../domain/domain";
import { dispatchTaskLinkedNotificationIfPresent } from "../application/notifications";
import {
  prepareTaskCreateInput,
  runTaskCreateMutation,
  runTaskTerminalTransition,
  runTaskUpdateMutation
} from "../infrastructure/task-mutations";
import {
  buildTaskListParams,
  buildTaskDetailResponse,
  buildTaskListResponse,
  createTaskCommentResponse,
  getTaskForRoute,
  validateTaskEditableForRoute,
  validateTaskTerminalTransitionForRoute
} from "./route-helpers";
import {
  activeUserExists,
  fetchTaskById,
  normalizeTaskRow,
  type TaskRow
} from "../application/service";

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

  router.get("/tasks/metrics", (req, res) => {
    const params = buildTaskListParams(req.query as Record<string, unknown>, {
      defaultLimit: 100,
      maxLimit: 500,
      includeAssigneeSearch: true
    });

    if ("error" in params) {
      res.status(400).json({ error: params.error });
      return;
    }

    const queueFilterRaw = req.query.queue ?? "all";
    const queueFilter = parseTaskQueueFilter(queueFilterRaw);
    if (!queueFilter) {
      res.status(400).json({ error: "queue invalida" });
      return;
    }

    const metricsWindowRaw = req.query.window ?? "7d";
    const metricsWindow = parseTaskMetricsWindow(metricsWindowRaw);
    if (!metricsWindow) {
      res.status(400).json({ error: "window invalida" });
      return;
    }

    res.json({
      metrics: buildTaskMetricsSummary(db, {
        conditions: params.conditions,
        values: params.values,
        queueFilter,
        metricsWindow
      })
    });
  });

  router.get("/tasks/automation-logs", (req, res) => {
    const automationTypeRaw = toNullableString(req.query.automation_type);
    const automationType =
      automationTypeRaw === "due_soon" ||
      automationTypeRaw === "overdue" ||
      automationTypeRaw === "stale_task" ||
      automationTypeRaw === "blocked_task" ||
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
    const params = buildTaskListParams(req.query as Record<string, unknown>, {
      defaultLimit: 100,
      maxLimit: 500,
      includeAssigneeSearch: true
    });

    if ("error" in params) {
      res.status(400).json({ error: params.error });
      return;
    }

    res.json(
      buildTaskListResponse(db, {
        conditions: params.conditions,
        values: params.values,
        page: params.page,
        limit: params.limit
      })
    );
  });

  router.get("/tasks/:id", (req, res) => {
    const routeTask = getTaskForRoute(req.params.id, (taskId) => fetchTaskById(db, taskId));
    if ("error" in routeTask) {
      res.status(routeTask.status).json({ error: routeTask.error });
      return;
    }

    res.json(buildTaskDetailResponse(db, routeTask.task as TaskRow));
  });

  router.post("/tasks/:id/comments", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }
    const authUser = req.authUser;

    const routeTask = getTaskForRoute(req.params.id, (taskId) => fetchTaskById(db, taskId));
    if ("error" in routeTask) {
      res.status(routeTask.status).json({ error: routeTask.error });
      return;
    }

    const body = validateTaskCommentBody(req.body?.body);
    if (!body) {
      res.status(400).json({ error: "body e obrigatorio e deve ter ate 4000 caracteres" });
      return;
    }

    res.status(201).json(
      createTaskCommentResponse(db, {
        taskId: routeTask.task.id,
        authorUserId: authUser.id,
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
    const authUser = req.authUser;

    const parsedCreate = prepareTaskCreateInput(req.body as Record<string, unknown>, {
      actorUserId: authUser.id,
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
      actorUserId: authUser.id,
      actorName: authUser.name,
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
    const authUser = req.authUser;

    const routeTask = getTaskForRoute(req.params.id, (taskId) => fetchTaskById(db, taskId));
    if ("error" in routeTask) {
      res.status(routeTask.status).json({ error: routeTask.error });
      return;
    }

    const editableError = validateTaskEditableForRoute(routeTask.task.status);
    if (editableError) {
      res.status(editableError.status).json({ error: editableError.error });
      return;
    }

    const timestamp = nowIso();
    const mutationResult = runTaskUpdateMutation({
      db,
      taskId: routeTask.taskId,
      body: req.body as Record<string, unknown>,
      existing: routeTask.task,
      actorUserId: authUser.id,
      actorName: authUser.name,
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

    if ("error" in mutationResult) {
      res.status(400).json({ error: mutationResult.error });
      return;
    }

    dispatchTaskLinkedNotificationIfPresent(db, config, io, mutationResult.assignmentNotification);
    dispatchTaskLinkedNotificationIfPresent(db, config, io, mutationResult.statusNotification);

    const updated = fetchTaskById(db, routeTask.taskId);
    res.json({ task: normalizeTaskRow(updated as TaskRow) });
  });

  router.post("/tasks/:id/complete", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }
    const authUser = req.authUser;

    const routeTask = getTaskForRoute(req.params.id, (taskId) => fetchTaskById(db, taskId));
    if ("error" in routeTask) {
      res.status(routeTask.status).json({ error: routeTask.error });
      return;
    }

    const transitionError = validateTaskTerminalTransitionForRoute(routeTask.task.status, "done");
    if (transitionError) {
      res.status(transitionError.status).json({ error: transitionError.error });
      return;
    }

    const timestamp = nowIso();
    const completionNotification = runTaskTerminalTransition({
      db,
      taskId: routeTask.taskId,
      existing: routeTask.task,
      actorUserId: authUser.id,
      actorName: authUser.name,
      targetStatus: "done",
      auditEventType: "admin.task.complete",
      notificationTrigger: "admin.task.complete",
      timestamp
    });

    dispatchTaskLinkedNotificationIfPresent(db, config, io, completionNotification);

    const updated = fetchTaskById(db, routeTask.taskId);
    res.json({ task: normalizeTaskRow(updated as TaskRow) });
  });

  router.post("/tasks/:id/cancel", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }
    const authUser = req.authUser;

    const routeTask = getTaskForRoute(req.params.id, (taskId) => fetchTaskById(db, taskId));
    if ("error" in routeTask) {
      res.status(routeTask.status).json({ error: routeTask.error });
      return;
    }

    const transitionError = validateTaskTerminalTransitionForRoute(routeTask.task.status, "cancelled");
    if (transitionError) {
      res.status(transitionError.status).json({ error: transitionError.error });
      return;
    }

    const timestamp = nowIso();
    const cancellationNotification = runTaskTerminalTransition({
      db,
      taskId: routeTask.taskId,
      existing: routeTask.task,
      actorUserId: authUser.id,
      actorName: authUser.name,
      targetStatus: "cancelled",
      auditEventType: "admin.task.cancel",
      notificationTrigger: "admin.task.cancel",
      timestamp
    });

    dispatchTaskLinkedNotificationIfPresent(db, config, io, cancellationNotification);

    const updated = fetchTaskById(db, routeTask.taskId);
    res.json({ task: normalizeTaskRow(updated as TaskRow) });
  });

  return router;
};
