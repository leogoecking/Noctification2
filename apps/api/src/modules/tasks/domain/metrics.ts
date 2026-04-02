import type { TaskPriority, TaskStatus } from "../../../types";
import type { MetricsWindow, TaskQueueFilter } from "./domain";

export interface MetricsTaskItem {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  creatorUserId: number;
  creatorName: string;
  creatorLogin: string;
  assigneeUserId: number | null;
  assigneeName: string | null;
  assigneeLogin: string | null;
  dueAt: string | null;
  repeatType: string;
  repeatWeekdays: number[];
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  recurrenceSourceTaskId: number | null;
  sourceNotificationId: number | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface UserDepartmentRow {
  id: number;
  department: string;
}

export interface TaskMetricsProductivity {
  windowDays: number;
  createdInWindow: number;
  completedInWindow: number;
  completedOnTime: number;
  completedLate: number;
  overdueOpen: number;
  blockedOpen: number;
  completionRate: number | null;
  onTimeRate: number | null;
  avgCycleHours: number | null;
  avgStartLagHours: number | null;
}

export interface TaskMetricsCapacityByAssignee {
  assigneeKey: string;
  assigneeLabel: string;
  open: number;
  critical: number;
  overdue: number;
  blocked: number;
  done: number;
  completedOnTime: number;
  completedLate: number;
  avgCycleHours: number | null;
}

export interface TaskMetricsCapacityByDepartment {
  departmentKey: string;
  departmentLabel: string;
  open: number;
  overdue: number;
  blocked: number;
  critical: number;
  members: number;
}

export interface TaskMetricsSummary {
  productivity: TaskMetricsProductivity;
  capacityByAssignee: TaskMetricsCapacityByAssignee[];
  capacityByDepartment: TaskMetricsCapacityByDepartment[];
}

export type TaskSlaKind =
  | "overdue"
  | "due_today"
  | "due_soon"
  | "blocked"
  | "stale"
  | "no_due"
  | "terminal";

const isTaskTerminal = (status: TaskStatus): boolean => status === "done" || status === "cancelled";

const isSameLocalDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const buildTaskSlaKind = (task: MetricsTaskItem, now = new Date()): TaskSlaKind => {
  if (isTaskTerminal(task.status)) {
    return "terminal";
  }

  const updatedAt = new Date(task.updatedAt);
  const dueAt = task.dueAt ? new Date(task.dueAt) : null;
  const isStale = now.getTime() - updatedAt.getTime() >= 24 * 60 * 60 * 1000;

  if (dueAt) {
    if (dueAt.getTime() < now.getTime()) {
      return "overdue";
    }

    if (isSameLocalDay(dueAt, now)) {
      return "due_today";
    }

    if (dueAt.getTime() - now.getTime() <= 24 * 60 * 60 * 1000) {
      return "due_soon";
    }
  }

  if (task.status === "blocked") {
    return "blocked";
  }

  if (isStale) {
    return "stale";
  }

  return "no_due";
};

export const matchesTaskQueueFilter = (
  task: MetricsTaskItem,
  queueFilter: TaskQueueFilter,
  now = new Date()
): boolean => {
  if (queueFilter === "all") {
    return true;
  }

  if (isTaskTerminal(task.status)) {
    return false;
  }

  const sla = buildTaskSlaKind(task, now);

  if (queueFilter === "due_today") {
    return sla === "due_today";
  }

  if (queueFilter === "attention") {
    return sla === "overdue" || sla === "due_today" || task.status === "blocked" || sla === "stale";
  }

  if (queueFilter === "overdue") {
    return sla === "overdue";
  }

  if (queueFilter === "blocked") {
    return task.status === "blocked";
  }

  if (queueFilter === "stale") {
    return (
      sla === "stale" ||
      (task.status === "blocked" &&
        now.getTime() - new Date(task.updatedAt).getTime() >= 24 * 60 * 60 * 1000)
    );
  }

  return task.assigneeUserId === null;
};

const differenceInHours = (startAt: string, endAt: string): number => {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return 0;
  }

  return (end - start) / 3_600_000;
};

const average = (values: number[]): number | null => {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const buildTaskProductivity = (
  tasks: MetricsTaskItem[],
  window: MetricsWindow,
  now = new Date()
): TaskMetricsProductivity => {
  const windowDays = window === "30d" ? 30 : 7;
  const windowStart = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const createdInWindow = tasks.filter((task) => new Date(task.createdAt).getTime() >= windowStart).length;
  const completedTasks = tasks.filter(
    (task) => task.completedAt && new Date(task.completedAt).getTime() >= windowStart
  );
  const startedTasks = tasks.filter((task) => task.startedAt && new Date(task.startedAt).getTime() >= windowStart);
  const overdueOpen = tasks.filter((task) => buildTaskSlaKind(task, now) === "overdue").length;
  const blockedOpen = tasks.filter((task) => task.status === "blocked").length;

  const completedOnTime = completedTasks.filter((task) => {
    if (!task.completedAt) {
      return false;
    }

    if (!task.dueAt) {
      return true;
    }

    return new Date(task.completedAt).getTime() <= new Date(task.dueAt).getTime();
  }).length;

  const completedLate = completedTasks.length - completedOnTime;

  return {
    windowDays,
    createdInWindow,
    completedInWindow: completedTasks.length,
    completedOnTime,
    completedLate,
    overdueOpen,
    blockedOpen,
    completionRate: createdInWindow > 0 ? completedTasks.length / createdInWindow : null,
    onTimeRate: completedTasks.length > 0 ? completedOnTime / completedTasks.length : null,
    avgCycleHours: average(
      completedTasks
        .filter((task) => task.completedAt)
        .map((task) => differenceInHours(task.createdAt, task.completedAt as string))
    ),
    avgStartLagHours: average(
      startedTasks
        .filter((task) => task.startedAt)
        .map((task) => differenceInHours(task.createdAt, task.startedAt as string))
    )
  };
};

export const buildTaskCapacityByAssignee = (
  tasks: MetricsTaskItem[],
  now = new Date()
): TaskMetricsCapacityByAssignee[] => {
  const grouped = new Map<string, TaskMetricsCapacityByAssignee & { cycleSamples: number[] }>();

  for (const task of tasks) {
    const assigneeKey = task.assigneeUserId === null ? "unassigned" : String(task.assigneeUserId);
    const assigneeLabel = task.assigneeName || "Sem responsavel";
    const current = grouped.get(assigneeKey) ?? {
      assigneeKey,
      assigneeLabel,
      open: 0,
      critical: 0,
      overdue: 0,
      blocked: 0,
      done: 0,
      completedOnTime: 0,
      completedLate: 0,
      avgCycleHours: null,
      cycleSamples: []
    };

    if (task.status === "done") {
      current.done += 1;
      if (task.completedAt) {
        current.cycleSamples.push(differenceInHours(task.createdAt, task.completedAt));
      }
      if (!task.dueAt || (task.completedAt && new Date(task.completedAt).getTime() <= new Date(task.dueAt).getTime())) {
        current.completedOnTime += 1;
      } else {
        current.completedLate += 1;
      }
    }

    if (task.status !== "done" && task.status !== "cancelled") {
      current.open += 1;
    }

    if (task.priority === "critical" && task.status !== "done" && task.status !== "cancelled") {
      current.critical += 1;
    }

    if (buildTaskSlaKind(task, now) === "overdue") {
      current.overdue += 1;
    }

    if (task.status === "blocked") {
      current.blocked += 1;
    }

    grouped.set(assigneeKey, current);
  }

  return Array.from(grouped.values())
    .map(({ cycleSamples, ...item }) => ({
      ...item,
      avgCycleHours: average(cycleSamples)
    }))
    .sort((left, right) => {
      if (left.overdue !== right.overdue) {
        return right.overdue - left.overdue;
      }

      if (left.critical !== right.critical) {
        return right.critical - left.critical;
      }

      if (left.open !== right.open) {
        return right.open - left.open;
      }

      return left.assigneeLabel.localeCompare(right.assigneeLabel);
    });
};

export const buildTaskCapacityByDepartment = (
  tasks: MetricsTaskItem[],
  users: UserDepartmentRow[],
  now = new Date()
): TaskMetricsCapacityByDepartment[] => {
  const userById = new Map(users.map((user) => [user.id, user]));
  const grouped = new Map<string, TaskMetricsCapacityByDepartment>();

  for (const task of tasks) {
    const department = (task.assigneeUserId ? userById.get(task.assigneeUserId)?.department : null) ?? "Sem equipe";
    const current = grouped.get(department) ?? {
      departmentKey: department,
      departmentLabel: department,
      open: 0,
      overdue: 0,
      blocked: 0,
      critical: 0,
      members: 0
    };

    if (task.status !== "done" && task.status !== "cancelled") {
      current.open += 1;
    }

    if (buildTaskSlaKind(task, now) === "overdue") {
      current.overdue += 1;
    }

    if (task.status === "blocked") {
      current.blocked += 1;
    }

    if (task.priority === "critical" && task.status !== "done" && task.status !== "cancelled") {
      current.critical += 1;
    }

    grouped.set(department, current);
  }

  const membersByDepartment = new Map<string, number>();
  for (const user of users) {
    membersByDepartment.set(user.department, (membersByDepartment.get(user.department) ?? 0) + 1);
  }

  return Array.from(grouped.values())
    .map((item) => ({
      ...item,
      members: membersByDepartment.get(item.departmentKey) ?? 0
    }))
    .sort((left, right) => {
      if (left.overdue !== right.overdue) {
        return right.overdue - left.overdue;
      }

      if (left.open !== right.open) {
        return right.open - left.open;
      }

      return left.departmentLabel.localeCompare(right.departmentLabel);
    });
};
