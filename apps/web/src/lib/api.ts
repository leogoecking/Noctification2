const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000/api/v1";

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
    request<{ notifications: unknown[] }>(`/admin/notifications${query}`),

  myNotifications: (query = "") => request<{ notifications: unknown[] }>(`/me/notifications${query}`),

  markRead: (id: number) =>
    request<{ notificationId: number; readAt: string | null }>(`/me/notifications/${id}/read`, {
      method: "POST"
    })
};
