const isLoopbackHost = (hostname: string): boolean => {
  return hostname === "localhost" || hostname === "127.0.0.1";
};

const resolveDefaultApiBase = (): string => {
  if (typeof window === "undefined") {
    return "http://localhost:4000/api/v1";
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:4000/api/v1`;
};

const resolveApiBase = (): string => {
  const configuredValue = import.meta.env.VITE_API_BASE;
  if (!configuredValue || typeof window === "undefined") {
    return resolveDefaultApiBase();
  }

  try {
    const configuredUrl = new URL(configuredValue);
    const pageHostname = window.location.hostname;

    if (!isLoopbackHost(pageHostname) && isLoopbackHost(configuredUrl.hostname)) {
      configuredUrl.hostname = pageHostname;
      return configuredUrl.toString();
    }

    return configuredUrl.toString();
  } catch {
    return configuredValue;
  }
};

const API_BASE = resolveApiBase().replace(/\/+$/, "");

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

  login: (login: string, password: string) =>
    request<{ user: unknown }>("/auth/login", {
      method: "POST",
      bodyJson: { login, password }
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

  myNotifications: (query = "") => request<{ notifications: unknown[] }>(`/me/notifications${query}`),

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
