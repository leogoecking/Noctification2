import type Database from "better-sqlite3";
import { normalizeTaskRow, taskSelectSql, type TaskRow } from "./service";
import type { MetricsWindow, TaskQueueFilter } from "../domain/domain";
import {
  buildTaskCapacityByAssignee,
  buildTaskCapacityByDepartment,
  buildTaskProductivity,
  matchesTaskQueueFilter,
  type MetricsTaskItem,
  type TaskMetricsSummary,
  type UserDepartmentRow
} from "../domain/metrics";

const listMetricsTasks = (
  db: Database.Database,
  params: { conditions: string[]; values: Array<string | number> }
): MetricsTaskItem[] => {
  const whereClause = params.conditions.length > 0 ? `WHERE ${params.conditions.join(" AND ")}` : "";
  const rows = db.prepare(`${taskSelectSql} ${whereClause}`).all(...params.values) as TaskRow[];
  return rows.map(normalizeTaskRow);
};

const listActiveUsers = (db: Database.Database): UserDepartmentRow[] =>
  db
    .prepare(
      `
        SELECT id, COALESCE(NULLIF(department, ''), 'Sem equipe') AS department
        FROM users
        WHERE is_active = 1
      `
    )
    .all() as UserDepartmentRow[];

export const buildTaskMetricsSummary = (
  db: Database.Database,
  params: {
    conditions: string[];
    values: Array<string | number>;
    queueFilter: TaskQueueFilter;
    metricsWindow: MetricsWindow;
    now?: Date;
  }
): TaskMetricsSummary => {
  const now = params.now ?? new Date();
  const tasks = listMetricsTasks(db, params).filter((task) => matchesTaskQueueFilter(task, params.queueFilter, now));
  const users = listActiveUsers(db);

  return {
    productivity: buildTaskProductivity(tasks, params.metricsWindow, now),
    capacityByAssignee: buildTaskCapacityByAssignee(tasks, now),
    capacityByDepartment: buildTaskCapacityByDepartment(tasks, users, now)
  };
};
