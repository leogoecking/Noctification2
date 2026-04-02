import type { TaskPriority, TaskRepeatType, TaskStatus } from "../../../types";

export type TaskQueueFilter = "all" | "attention" | "due_today" | "overdue" | "blocked" | "stale" | "unassigned";
export type MetricsWindow = "7d" | "30d";

export const TASK_PRIORITIES: TaskPriority[] = ["low", "normal", "high", "critical"];
export const TASK_STATUSES: TaskStatus[] = [
  "new",
  "assumed",
  "in_progress",
  "blocked",
  "waiting_external",
  "done",
  "cancelled"
];
export const TASK_REPEAT_TYPES: TaskRepeatType[] = ["none", "daily", "weekly", "monthly", "weekdays"];
export const NON_TERMINAL_TASK_STATUSES: TaskStatus[] = [
  "new",
  "assumed",
  "in_progress",
  "blocked",
  "waiting_external"
];
const WEEKDAY_VALUES = new Set([0, 1, 2, 3, 4, 5, 6]);

export const toNullableString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const parseLimit = (value: unknown, fallback: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
};

export const parsePage = (value: unknown, fallback = 1): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

export const parseTaskQueueFilter = (
  value: unknown
): TaskQueueFilter | null => {
  if (
    value === "all" ||
    value === "attention" ||
    value === "due_today" ||
    value === "overdue" ||
    value === "blocked" ||
    value === "stale" ||
    value === "unassigned"
  ) {
    return value;
  }

  return null;
};

export const parseTaskMetricsWindow = (value: unknown): MetricsWindow | null => {
  if (value === "7d" || value === "30d") {
    return value;
  }

  return null;
};

export const parseTaskPriority = (value: unknown): TaskPriority | null => {
  if (value === "low" || value === "normal" || value === "high" || value === "critical") {
    return value;
  }

  return null;
};

export const parseTaskStatus = (value: unknown): TaskStatus | null => {
  if (
    value === "new" ||
    value === "assumed" ||
    value === "in_progress" ||
    value === "blocked" ||
    value === "waiting_external" ||
    value === "done" ||
    value === "cancelled"
  ) {
    return value;
  }

  return null;
};

export const parseTaskRepeatType = (value: unknown): TaskRepeatType | null => {
  if (
    value === "none" ||
    value === "daily" ||
    value === "weekly" ||
    value === "monthly" ||
    value === "weekdays"
  ) {
    return value;
  }

  return null;
};

export const parseTaskWeekdays = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && WEEKDAY_VALUES.has(item))
    )
  ).sort((a, b) => a - b);
};

export const stringifyTaskWeekdays = (weekdays: number[]): string => JSON.stringify(weekdays);

export const parseNonTerminalTaskStatus = (value: unknown): TaskStatus | null => {
  if (
    value === "new" ||
    value === "assumed" ||
    value === "in_progress" ||
    value === "blocked" ||
    value === "waiting_external"
  ) {
    return value;
  }

  return null;
};

export const isTaskTerminal = (status: TaskStatus): boolean =>
  status === "done" || status === "cancelled";

export const parseOptionalUserId = (value: unknown): number | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
};

export const parseOptionalDueAt = (
  value: unknown
): { provided: boolean; value: string | null; error?: string } => {
  if (value === undefined) {
    return { provided: false, value: null };
  }

  if (value === null || value === "") {
    return { provided: true, value: null };
  }

  if (typeof value !== "string") {
    return { provided: true, value: null, error: "due_at deve ser uma data ISO valida ou null" };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { provided: true, value: null, error: "due_at deve ser uma data ISO valida ou null" };
  }

  return { provided: true, value: parsed.toISOString() };
};

export const validateTaskRecurrence = (
  repeatType: TaskRepeatType,
  weekdays: number[]
): string | null => {
  if (repeatType === "weekly" && weekdays.length === 0) {
    return "weekdays e obrigatorio para recorrencia semanal";
  }

  return null;
};

export const validateTaskTitle = (value: unknown): string | null => {
  const title = toNullableString(value);
  if (!title || title.length > 200) {
    return null;
  }

  return title;
};

export const validateTaskDescription = (value: unknown): string => {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, 4000);
};

export const validateTaskCommentBody = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const body = value.trim().slice(0, 4000);
  return body.length > 0 ? body : null;
};
