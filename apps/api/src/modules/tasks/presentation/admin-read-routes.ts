import type { Router } from "express";
import type Database from "better-sqlite3";
import {
  buildTaskAutomationHealth,
  listTaskAutomationLogs
} from "../application/automation";
import { buildTaskMetricsSummary } from "../application/metrics";
import {
  fetchTaskById,
  type TaskRow
} from "../application/service";
import {
  parseLimit,
  toNullableString
} from "../domain/domain";
import {
  buildTaskDetailResponse,
  buildTaskListParams,
  buildTaskListResponse,
  getTaskForRoute
} from "./route-helpers";
import { parseTaskMetricsRequest } from "./admin-route-helpers";
import type { AppConfig } from "../../../config";

interface TaskAdminReadRouteOptions {
  db: Database.Database;
  config: AppConfig;
}

export const registerTaskAdminReadRoutes = (
  router: Router,
  { db, config }: TaskAdminReadRouteOptions
): void => {
  router.get("/tasks/health", (_req, res) => {
    res.json({
      health: buildTaskAutomationHealth(db, config)
    });
  });

  router.get("/tasks/metrics", (req, res) => {
    const params = parseTaskMetricsRequest(req.query as Record<string, unknown>);
    if ("error" in params) {
      res.status(400).json({ error: params.error });
      return;
    }

    res.json({
      metrics: buildTaskMetricsSummary(db, {
        conditions: params.conditions,
        values: params.values,
        queueFilter: params.queueFilter,
        metricsWindow: params.metricsWindow
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
};
