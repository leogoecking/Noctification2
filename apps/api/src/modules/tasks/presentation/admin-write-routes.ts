import type { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../../../config";
import { nowIso } from "../../../db";
import { dispatchTaskLinkedNotificationIfPresent } from "../application/notifications";
import {
  fetchTaskById,
  getActiveTaskAssigneeValidationError,
  normalizeTaskRow,
  type TaskRow
} from "../application/service";
import { validateTaskCommentBody } from "../domain/domain";
import {
  prepareTaskCreateInput,
  runTaskCreateMutation,
  runTaskTerminalTransition,
  runTaskUpdateMutation
} from "../infrastructure/task-mutations";
import {
  createTaskCommentResponse,
  getTaskForRoute,
  validateTaskEditableForRoute,
  validateTaskTerminalTransitionForRoute
} from "./route-helpers";
import { getAuthenticatedAdminUser } from "./admin-route-helpers";

interface TaskAdminWriteRouteOptions {
  db: Database.Database;
  io: Server | null;
  config: AppConfig;
}

export const registerTaskAdminWriteRoutes = (
  router: Router,
  { db, io, config }: TaskAdminWriteRouteOptions
): void => {
  router.post("/tasks/:id/comments", (req, res) => {
    const authUser = getAuthenticatedAdminUser(req);
    if (!authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

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
    const authUser = getAuthenticatedAdminUser(req);
    if (!authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const parsedCreate = prepareTaskCreateInput(req.body as Record<string, unknown>, {
      actorUserId: authUser.id,
      validateAssignee: ({ nextAssigneeUserId }) =>
        getActiveTaskAssigneeValidationError(db, nextAssigneeUserId)
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
          getActiveTaskAssigneeValidationError(db, nextAssigneeUserId)
      }
    });

    dispatchTaskLinkedNotificationIfPresent(db, config, io, assignmentNotification);

    const created = fetchTaskById(db, taskId);
    res.status(201).json({ task: normalizeTaskRow(created as TaskRow) });
  });

  router.patch("/tasks/:id", (req, res) => {
    const authUser = getAuthenticatedAdminUser(req);
    if (!authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

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
          getActiveTaskAssigneeValidationError(db, nextAssigneeUserId)
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
    const authUser = getAuthenticatedAdminUser(req);
    if (!authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

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
    const authUser = getAuthenticatedAdminUser(req);
    if (!authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

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
};
