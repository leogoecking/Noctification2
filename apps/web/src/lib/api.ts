import type {
  AuditEventItem,
  AuthUser,
  NotificationHistoryItem,
  NotificationItem,
  OnlineUserItem,
  PaginationInfo,
  ReminderHealthItem,
  ReminderItem,
  ReminderLogItem,
  ReminderOccurrenceItem,
  TaskAutomationHealthItem,
  TaskAutomationLogItem,
  TaskCommentItem,
  TaskItem,
  TaskTimelineItem,
  UserItem,
  UserRole
} from "../types";
import { resolveRuntimeApiBase } from "./runtimeUrls";

const API_BASE = resolveRuntimeApiBase(
  import.meta.env.VITE_API_BASE,
  typeof window === "undefined" ? undefined : window.location
).replace(/\/+$/, "");

interface RequestOptions extends RequestInit {
  bodyJson?: unknown;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type AuthUserResponse = { user: AuthUser };
type UsersResponse = { users: UserItem[] };
type OnlineUsersResponse = { users: OnlineUserItem[]; count: number };
type AuditResponse = { events: AuditEventItem[]; pagination: PaginationInfo };
type NotificationHistoryResponse = {
  notifications: NotificationHistoryItem[];
  pagination: PaginationInfo;
};
type TaskListResponse = { tasks: TaskItem[]; pagination: PaginationInfo };
type TaskDetailResponse = { task: TaskItem; timeline: TaskTimelineItem[] };
type TaskCommentResponse = { comment: TaskCommentItem };
type TaskHealthResponse = { health: TaskAutomationHealthItem };
type TaskAutomationLogsResponse = { logs: TaskAutomationLogItem[] };
type ReminderListResponse = { reminders: ReminderItem[] };
type ReminderOccurrencesResponse = { occurrences: ReminderOccurrenceItem[] };
type ReminderHealthResponse = { health: ReminderHealthItem };
type ReminderLogsResponse = { logs: ReminderLogItem[] };

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers = new Headers(options.headers ?? {});
  if (options.bodyJson !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
    body: options.bodyJson !== undefined ? JSON.stringify(options.bodyJson) : options.body
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(payload?.error ?? `Erro HTTP ${response.status}`, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const api = {
  register: (name: string, login: string, password: string) =>
    request<AuthUserResponse>("/auth/register", {
      method: "POST",
      bodyJson: { name, login, password }
    }),

  login: (login: string, password: string, expectedRole?: UserRole) =>
    request<AuthUserResponse>("/auth/login", {
      method: "POST",
      bodyJson: {
        login,
        password,
        ...(expectedRole ? { expected_role: expectedRole } : {})
      }
    }),

  me: () => request<AuthUserResponse>("/auth/me"),

  logout: () =>
    request<void>("/auth/logout", {
      method: "POST"
    }),

  adminUsers: () => request<UsersResponse>("/admin/users"),

  adminOnlineUsers: () => request<OnlineUsersResponse>("/admin/online-users"),

  adminAudit: (query = "") => request<AuditResponse>(`/admin/audit${query}`),

  createUser: (payload: unknown) =>
    request<{ user: UserItem }>("/admin/users", {
      method: "POST",
      bodyJson: payload
    }),

  updateUser: (id: number, payload: unknown) =>
    request<{ user: UserItem }>(`/admin/users/${id}`, {
      method: "PATCH",
      bodyJson: payload
    }),

  toggleUserStatus: (id: number, isActive: boolean) =>
    request<void>(`/admin/users/${id}/status`, {
      method: "PATCH",
      bodyJson: { is_active: isActive }
    }),

  sendNotification: (payload: unknown) =>
    request<{ notification: NotificationHistoryItem }>("/admin/notifications", {
      method: "POST",
      bodyJson: payload
    }),

  adminNotifications: (query = "") =>
    request<NotificationHistoryResponse>(`/admin/notifications${query}`),

  adminTasks: (query = "") => request<TaskListResponse>(`/admin/tasks${query}`),

  adminTask: (id: number) => request<TaskDetailResponse>(`/admin/tasks/${id}`),

  createAdminTaskComment: (id: number, payload: unknown) =>
    request<TaskCommentResponse>(`/admin/tasks/${id}/comments`, {
      method: "POST",
      bodyJson: payload
    }),

  adminTaskHealth: () => request<TaskHealthResponse>("/admin/tasks/health"),

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

  myNotifications: (query = "") =>
    request<{ notifications: NotificationItem[] }>(`/me/notifications${query}`),

  webPushConfig: () =>
    request<{ enabled: boolean; vapidPublicKey: string | null }>("/me/web-push/config"),

  saveWebPushSubscription: (payload: unknown) =>
    request<{ ok: boolean }>("/me/web-push/subscription", {
      method: "PUT",
      bodyJson: payload
    }),

  removeWebPushSubscription: (endpoint: string) =>
    request<{ ok: boolean; removed: number }>("/me/web-push/subscription", {
      method: "DELETE",
      bodyJson: { endpoint }
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
    }),

  markRead: (id: number) =>
    request<{
      notificationId: number;
      visualizedAt: string | null;
      operationalStatus: string;
      responseStatus: string | null;
      isVisualized: boolean;
      isOperationallyPending: boolean;
    }>(
      `/me/notifications/${id}/read`,
      {
        method: "POST"
      }
    ),

  markAllRead: () =>
    request<{ updatedCount: number; visualizedAt: string | null }>("/me/notifications/read-all", {
      method: "POST"
    }),

  respondNotification: (id: number, responseStatus: string, responseMessage?: string) =>
    request<{
      notificationId: number;
      visualizedAt: string | null;
      operationalStatus: string;
      responseStatus: string;
      responseMessage: string | null;
      responseAt: string;
      isVisualized: boolean;
      isOperationallyPending: boolean;
    }>(`/me/notifications/${id}/respond`, {
      method: "POST",
      bodyJson: {
        operational_status: responseStatus,
        response_message: responseMessage
      }
    }),

  myReminders: (query = "") => request<ReminderListResponse>(`/me/reminders${query}`),

  createMyReminder: (payload: unknown) =>
    request<{ reminder: ReminderItem }>("/me/reminders", {
      method: "POST",
      bodyJson: payload
    }),

  updateMyReminder: (id: number, payload: unknown) =>
    request<{ reminder: ReminderItem }>(`/me/reminders/${id}`, {
      method: "PATCH",
      bodyJson: payload
    }),

  toggleMyReminder: (id: number, isActive: boolean) =>
    request<{ ok: boolean }>(`/me/reminders/${id}/toggle`, {
      method: "PATCH",
      bodyJson: { is_active: isActive }
    }),

  deleteMyReminder: (id: number) =>
    request<void>(`/me/reminders/${id}`, {
      method: "DELETE"
    }),

  myReminderOccurrences: (query = "") =>
    request<ReminderOccurrencesResponse>(`/me/reminder-occurrences${query}`),

  completeReminderOccurrence: (id: number) =>
    request<{ ok: boolean; completedAt: string }>(`/me/reminder-occurrences/${id}/complete`, {
      method: "POST"
    }),

  adminReminders: (query = "") => request<ReminderListResponse>(`/admin/reminders${query}`),

  adminReminderOccurrences: (query = "") =>
    request<ReminderOccurrencesResponse>(`/admin/reminder-occurrences${query}`),

  adminReminderHealth: () => request<ReminderHealthResponse>("/admin/reminders/health"),

  adminReminderLogs: (query = "") =>
    request<ReminderLogsResponse>(`/admin/reminder-logs${query}`),

  toggleAdminReminder: (id: number, isActive: boolean) =>
    request<{ ok: boolean }>(`/admin/reminders/${id}/toggle`, {
      method: "PATCH",
      bodyJson: { is_active: isActive }
    })
};
