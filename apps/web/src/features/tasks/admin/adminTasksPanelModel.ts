import type { TaskItem, TaskPriority, TaskRepeatType } from "../../../types";
import {
  compareTasksByOperationalOrder,
  TASK_BOARD_COLUMNS,
  TASK_STATUS_LABELS,
  toApiDueAt,
  toDateTimeLocalValue
} from "../../../components/tasks/taskUi";

export type AdminTaskMetricsWindow = "7d" | "30d";

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

export const buildAdminTaskBoardColumns = (tasks: TaskItem[], now = new Date()) =>
  TASK_BOARD_COLUMNS.filter((status) => status !== "blocked" && status !== "cancelled").map((status) => ({
    status,
    label: TASK_STATUS_LABELS[status],
    tasks: tasks.filter((task) => task.status === status).sort((left, right) => compareTasksByOperationalOrder(left, right, now))
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
