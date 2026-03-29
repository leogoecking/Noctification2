import type {
  TaskAutomationHealthItem,
  TaskAutomationLogItem,
  TaskCommentItem,
  TaskItem,
  TaskMetricsSummaryItem,
  TaskTimelineItem,
  PaginationInfo
} from "../../../types";
import { request } from "../../../lib/apiCore";

type TaskListResponse = { tasks: TaskItem[]; pagination: PaginationInfo };
type TaskDetailResponse = { task: TaskItem; timeline: TaskTimelineItem[] };
type TaskCommentResponse = { comment: TaskCommentItem };
type TaskHealthResponse = { health: TaskAutomationHealthItem };
type TaskAutomationLogsResponse = { logs: TaskAutomationLogItem[] };
type TaskMetricsResponse = { metrics: TaskMetricsSummaryItem };

export const taskApi = {
  adminTasks: (query = "") => request<TaskListResponse>(`/admin/tasks${query}`),

  adminTask: (id: number) => request<TaskDetailResponse>(`/admin/tasks/${id}`),

  createAdminTaskComment: (id: number, payload: unknown) =>
    request<TaskCommentResponse>(`/admin/tasks/${id}/comments`, {
      method: "POST",
      bodyJson: payload
    }),

  adminTaskHealth: () => request<TaskHealthResponse>("/admin/tasks/health"),

  adminTaskMetrics: (query = "") => request<TaskMetricsResponse>(`/admin/tasks/metrics${query}`),

  adminTaskAutomationLogs: (query = "") =>
    request<TaskAutomationLogsResponse>(`/admin/tasks/automation-logs${query}`),

  createAdminTask: (payload: unknown) =>
    request<{ task: TaskItem }>("/admin/tasks", {
      method: "POST",
      bodyJson: payload
    }),

  updateAdminTask: (id: number, payload: unknown) =>
    request<{ task: TaskItem }>(`/admin/tasks/${id}`, {
      method: "PATCH",
      bodyJson: payload
    }),

  completeAdminTask: (id: number) =>
    request<{ task: TaskItem }>(`/admin/tasks/${id}/complete`, {
      method: "POST"
    }),

  cancelAdminTask: (id: number) =>
    request<{ task: TaskItem }>(`/admin/tasks/${id}/cancel`, {
      method: "POST"
    }),

  myTasks: (query = "") => request<TaskListResponse>(`/me/tasks${query}`),

  myTask: (id: number) => request<TaskDetailResponse>(`/me/tasks/${id}`),

  createMyTaskComment: (id: number, payload: unknown) =>
    request<TaskCommentResponse>(`/me/tasks/${id}/comments`, {
      method: "POST",
      bodyJson: payload
    }),

  createMyTask: (payload: unknown) =>
    request<{ task: TaskItem }>("/me/tasks", {
      method: "POST",
      bodyJson: payload
    }),

  updateMyTask: (id: number, payload: unknown) =>
    request<{ task: TaskItem }>(`/me/tasks/${id}`, {
      method: "PATCH",
      bodyJson: payload
    }),

  completeMyTask: (id: number) =>
    request<{ task: TaskItem }>(`/me/tasks/${id}/complete`, {
      method: "POST"
    }),

  cancelMyTask: (id: number) =>
    request<{ task: TaskItem }>(`/me/tasks/${id}/cancel`, {
      method: "POST"
    })
};
