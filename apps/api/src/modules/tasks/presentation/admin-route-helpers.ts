import type { Request } from "express";
import { buildTaskListParams } from "./route-helpers";
import { parseTaskMetricsWindow, parseTaskQueueFilter } from "../domain/domain";

export const getAuthenticatedAdminUser = (req: Request) => req.authUser ?? null;

export const parseTaskMetricsRequest = (query: Record<string, unknown>) => {
  const params = buildTaskListParams(query, {
    defaultLimit: 100,
    maxLimit: 500,
    includeAssigneeSearch: true
  });

  if ("error" in params) {
    return params;
  }

  const queueFilterRaw = query.queue ?? "all";
  const queueFilter = parseTaskQueueFilter(queueFilterRaw);
  if (!queueFilter) {
    return { error: "queue invalida" as const };
  }

  const metricsWindowRaw = query.window ?? "7d";
  const metricsWindow = parseTaskMetricsWindow(metricsWindowRaw);
  if (!metricsWindow) {
    return { error: "window invalida" as const };
  }

  return {
    conditions: params.conditions,
    values: params.values,
    queueFilter,
    metricsWindow
  };
};
