import type { UserRole } from "../types";
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
    request<{ user: unknown }>("/auth/register", {
      method: "POST",
      bodyJson: { name, login, password }
    }),

  login: (login: string, password: string, expectedRole?: UserRole) =>
    request<{ user: unknown }>("/auth/login", {
      method: "POST",
      bodyJson: {
        login,
        password,
        ...(expectedRole ? { expected_role: expectedRole } : {})
      }
    }),

  me: () => request<{ user: unknown }>("/auth/me"),

  logout: () =>
    request<void>("/auth/logout", {
      method: "POST"
    }),

  adminUsers: () => request<{ users: unknown[] }>("/admin/users"),

  adminOnlineUsers: () => request<{ users: unknown[]; count: number }>("/admin/online-users"),

  adminAudit: (query = "") =>
    request<{
      events: unknown[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/audit${query}`),

  createUser: (payload: unknown) =>
    request<{ user: unknown }>("/admin/users", {
      method: "POST",
      bodyJson: payload
    }),

  updateUser: (id: number, payload: unknown) =>
    request<{ user: unknown }>(`/admin/users/${id}`, {
      method: "PATCH",
      bodyJson: payload
    }),

  toggleUserStatus: (id: number, isActive: boolean) =>
    request<void>(`/admin/users/${id}/status`, {
      method: "PATCH",
      bodyJson: { is_active: isActive }
    }),

  sendNotification: (payload: unknown) =>
    request<{ notification: unknown }>("/admin/notifications", {
      method: "POST",
      bodyJson: payload
    }),

  adminNotifications: (query = "") =>
    request<{
      notifications: unknown[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/notifications${query}`),

  adminTasks: (query = "") =>
    request<{
      tasks: unknown[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/tasks${query}`),

  adminTask: (id: number) =>
    request<{ task: unknown; timeline: unknown[] }>(`/admin/tasks/${id}`),

  createAdminTaskComment: (id: number, payload: unknown) =>
    request<{ comment: unknown }>(`/admin/tasks/${id}/comments`, {
      method: "POST",
      bodyJson: payload
    }),

  adminTaskHealth: () =>
    request<{ health: unknown }>("/admin/tasks/health"),

  adminTaskAutomationLogs: (query = "") =>
    request<{ logs: unknown[] }>(`/admin/tasks/automation-logs${query}`),

  createAdminTask: (payload: unknown) =>
    request<{ task: unknown }>("/admin/tasks", {
      method: "POST",
      bodyJson: payload
    }),

  updateAdminTask: (id: number, payload: unknown) =>
    request<{ task: unknown }>(`/admin/tasks/${id}`, {
      method: "PATCH",
      bodyJson: payload
    }),

  completeAdminTask: (id: number) =>
    request<{ task: unknown }>(`/admin/tasks/${id}/complete`, {
      method: "POST"
    }),

  cancelAdminTask: (id: number) =>
    request<{ task: unknown }>(`/admin/tasks/${id}/cancel`, {
      method: "POST"
    }),

  myNotifications: (query = "") => request<{ notifications: unknown[] }>(`/me/notifications${query}`),

  myTasks: (query = "") =>
    request<{
      tasks: unknown[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/me/tasks${query}`),

  myTask: (id: number) =>
    request<{ task: unknown; timeline: unknown[] }>(`/me/tasks/${id}`),

  createMyTaskComment: (id: number, payload: unknown) =>
    request<{ comment: unknown }>(`/me/tasks/${id}/comments`, {
      method: "POST",
      bodyJson: payload
    }),

  createMyTask: (payload: unknown) =>
    request<{ task: unknown }>("/me/tasks", {
      method: "POST",
      bodyJson: payload
    }),

  updateMyTask: (id: number, payload: unknown) =>
    request<{ task: unknown }>(`/me/tasks/${id}`, {
      method: "PATCH",
      bodyJson: payload
    }),

  completeMyTask: (id: number) =>
    request<{ task: unknown }>(`/me/tasks/${id}/complete`, {
      method: "POST"
    }),

  cancelMyTask: (id: number) =>
    request<{ task: unknown }>(`/me/tasks/${id}/cancel`, {
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

  myReminders: (query = "") => request<{ reminders: unknown[] }>(`/me/reminders${query}`),

  createMyReminder: (payload: unknown) =>
    request<{ reminder: unknown }>("/me/reminders", {
      method: "POST",
      bodyJson: payload
    }),

  updateMyReminder: (id: number, payload: unknown) =>
    request<{ reminder: unknown }>(`/me/reminders/${id}`, {
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
    request<{ occurrences: unknown[] }>(`/me/reminder-occurrences${query}`),

  completeReminderOccurrence: (id: number) =>
    request<{ ok: boolean; completedAt: string }>(`/me/reminder-occurrences/${id}/complete`, {
      method: "POST"
    }),

  adminReminders: (query = "") => request<{ reminders: unknown[] }>(`/admin/reminders${query}`),

  adminReminderOccurrences: (query = "") =>
    request<{ occurrences: unknown[] }>(`/admin/reminder-occurrences${query}`),

  adminReminderHealth: () =>
    request<{ health: unknown }>("/admin/reminders/health"),

  adminReminderLogs: (query = "") =>
    request<{ logs: unknown[] }>(`/admin/reminder-logs${query}`),

  toggleAdminReminder: (id: number, isActive: boolean) =>
    request<{ ok: boolean }>(`/admin/reminders/${id}/toggle`, {
      method: "PATCH",
      bodyJson: { is_active: isActive }
    })
};
