import { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../../../config";
import { nowIso } from "../../../db";
import { authenticate } from "../../../middleware/auth";
import {
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
  fetchTaskForUser,
  normalizeTaskRow,
  type TaskRow
} from "../application/service";

export const createTaskMeRouter = (db: Database.Database, config: AppConfig): Router => {
  return createTaskMeRouterWithIo(db, null, config);
};

export const createTaskMeRouterWithIo = (
  db: Database.Database,
  io: Server | null,
  config: AppConfig
): Router => {
  const router = Router();

  router.use(authenticate(db, config));

  router.get("/tasks", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }
    const authUser = req.authUser;

    const params = buildTaskListParams(req.query as Record<string, unknown>, {
      defaultLimit: 50,
      maxLimit: 200,
      scopeUserId: authUser.id
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
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }
    const authUser = req.authUser;

    const routeTask = getTaskForRoute(req.params.id, (taskId) =>
      fetchTaskForUser(db, taskId, authUser.id)
    );
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

    const routeTask = getTaskForRoute(req.params.id, (taskId) =>
      fetchTaskForUser(db, taskId, authUser.id)
    );
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
      validateAssignee: ({ actorUserId, nextAssigneeUserId }) =>
        nextAssigneeUserId !== null && nextAssigneeUserId !== actorUserId
          ? "Usuario comum so pode atribuir tarefa a si mesmo"
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
        auditEventType: "task.create",
        notificationTrigger: "task.create",
        validateAssignee: ({ actorUserId, nextAssigneeUserId }) =>
          nextAssigneeUserId !== null && nextAssigneeUserId !== actorUserId
            ? "Usuario comum so pode atribuir tarefa a si mesmo"
            : null
      }
    });

    dispatchTaskLinkedNotificationIfPresent(db, config, io, assignmentNotification);

    const created = fetchTaskForUser(db, taskId, authUser.id);
    res.status(201).json({ task: normalizeTaskRow(created as TaskRow) });
  });

  router.patch("/tasks/:id", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }
    const authUser = req.authUser;

    const routeTask = getTaskForRoute(req.params.id, (taskId) =>
      fetchTaskForUser(db, taskId, authUser.id)
    );
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
        changedBy: "user.patch",
        auditEventType: "task.update",
        notificationTrigger: "task.update",
        validateAssignee: ({ actorUserId, nextAssigneeUserId }) =>
          nextAssigneeUserId !== null && nextAssigneeUserId !== actorUserId
            ? "Usuario comum so pode atribuir tarefa a si mesmo"
            : null
      }
    });

    if ("error" in mutationResult) {
      res.status(400).json({ error: mutationResult.error });
      return;
    }

    dispatchTaskLinkedNotificationIfPresent(db, config, io, mutationResult.assignmentNotification);
    dispatchTaskLinkedNotificationIfPresent(db, config, io, mutationResult.statusNotification);

    const updated = fetchTaskForUser(db, routeTask.taskId, authUser.id);
    res.json({ task: normalizeTaskRow(updated as TaskRow) });
  });

  router.post("/tasks/:id/complete", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }
    const authUser = req.authUser;

    const routeTask = getTaskForRoute(req.params.id, (taskId) =>
      fetchTaskForUser(db, taskId, authUser.id)
    );
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
      auditEventType: "task.complete",
      notificationTrigger: "task.complete",
      timestamp
    });

    dispatchTaskLinkedNotificationIfPresent(db, config, io, completionNotification);

    const updated = fetchTaskForUser(db, routeTask.taskId, authUser.id);
    res.json({ task: normalizeTaskRow(updated as TaskRow) });
  });

  router.post("/tasks/:id/cancel", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }
    const authUser = req.authUser;

    const routeTask = getTaskForRoute(req.params.id, (taskId) =>
      fetchTaskForUser(db, taskId, authUser.id)
    );
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
      auditEventType: "task.cancel",
      notificationTrigger: "task.cancel",
      timestamp
    });

    dispatchTaskLinkedNotificationIfPresent(db, config, io, cancellationNotification);

    const updated = fetchTaskForUser(db, routeTask.taskId, authUser.id);
    res.json({ task: normalizeTaskRow(updated as TaskRow) });
  });

  return router;
};
