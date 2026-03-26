import type { NotificationPriority, TaskRepeatType, TaskStatus } from "../types";

export type TaskAutomationType = "due_soon" | "overdue" | "stale_task" | "recurring_task";

export interface TaskAutomationCandidateRow {
  id: number;
  title: string;
  status: TaskStatus;
  priority: NotificationPriority;
  creatorUserId: number;
  assigneeUserId: number | null;
  dueAt: string | null;
  repeatType: TaskRepeatType;
  repeatWeekdaysJson: string;
  updatedAt: string;
  staleSince: string | null;
  completedAt: string | null;
}

export interface TaskAutomationLogRow {
  id: number;
  taskId: number;
  taskTitle: string;
  automationType: TaskAutomationType;
  dedupeKey: string;
  notificationId: number | null;
  metadataJson: string | null;
  createdAt: string;
}

export const NON_TERMINAL_TASK_STATUS_FILTER = "('new', 'in_progress', 'waiting')";
