import type { Router } from "express";
import type Database from "better-sqlite3";
import {
  fetchTaskForUser,
  type TaskRow
} from "../application/service";
import {
  buildTaskDetailResponse,
  buildTaskListParams,
  buildTaskListResponse,
  getTaskForRoute
} from "./route-helpers";

export const registerTaskMeReadRoutes = (router: Router, db: Database.Database): void => {
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
};
