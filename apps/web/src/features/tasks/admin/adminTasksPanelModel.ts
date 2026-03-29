import type {
  TaskItem,
  TaskPriority,
  TaskRepeatType,
  TaskStatus
} from "../../../types";
import {
  TASK_BOARD_COLUMNS,
  TASK_STATUS_LABELS,
  toApiDueAt,
  toDateTimeLocalValue
} from "../../../components/tasks/taskUi";

export type AdminTaskFilterStatus = "" | TaskStatus;
export type AdminTaskFilterPriority = "" | TaskPriority;

export type TaskAdminFormState = {
  id: number;
  title: string;
  description: string;
  priority: TaskPriority;
  dueAt: string;
  repeatType: TaskRepeatType;
  weekdays: number[];
  assigneeUserId: string;
};

export const EMPTY_TASK_ADMIN_FORM: TaskAdminFormState = {
  id: 0,
  title: "",
  description: "",
  priority: "normal",
  dueAt: "",
  repeatType: "none",
  weekdays: [],
  assigneeUserId: ""
};

export const buildAdminTaskQuery = (filters: {
  statusFilter: AdminTaskFilterStatus;
  priorityFilter: AdminTaskFilterPriority;
  assigneeFilter: string;
}): string => {
  const params = new URLSearchParams();

  if (filters.statusFilter) {
    params.set("status", filters.statusFilter);
  }

  if (filters.priorityFilter) {
    params.set("priority", filters.priorityFilter);
  }

  if (filters.assigneeFilter) {
    params.set("assignee_user_id", filters.assigneeFilter);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
};

export const buildAdminTaskStats = (tasks: TaskItem[]) => ({
  total: tasks.length,
  open: tasks.filter((task) => task.status !== "done" && task.status !== "cancelled").length,
  done: tasks.filter((task) => task.status === "done").length,
  unassigned: tasks.filter((task) => task.assigneeUserId === null).length
});

export const buildAdminTaskBoardColumns = (tasks: TaskItem[]) =>
  TASK_BOARD_COLUMNS.map((status) => ({
    status,
    label: TASK_STATUS_LABELS[status],
    tasks: tasks.filter((task) => task.status === status)
  }));

export const buildAdminTaskFormState = (task: TaskItem): TaskAdminFormState => ({
  id: task.id,
  title: task.title,
  description: task.description,
  priority: task.priority,
  dueAt: toDateTimeLocalValue(task.dueAt),
  repeatType: task.repeatType,
  weekdays: task.repeatWeekdays,
  assigneeUserId: task.assigneeUserId ? String(task.assigneeUserId) : ""
});

export const buildAdminTaskPayload = (form: TaskAdminFormState) => ({
  title: form.title,
  description: form.description,
  priority: form.priority,
  due_at: toApiDueAt(form.dueAt),
  repeat_type: form.repeatType,
  weekdays: form.repeatType === "weekly" ? form.weekdays : [],
  assignee_user_id: form.assigneeUserId ? Number(form.assigneeUserId) : null
});
