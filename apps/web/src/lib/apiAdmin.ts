import type {
  AuditEventItem,
  NotificationHistoryItem,
  OnlineUserItem,
  PaginationInfo,
  UserItem
} from "../types";
import { request } from "./apiCore";

type UsersResponse = { users: UserItem[] };
type OnlineUsersResponse = { users: OnlineUserItem[]; count: number };
type AuditResponse = { events: AuditEventItem[]; pagination: PaginationInfo };
type NotificationHistoryResponse = {
  notifications: NotificationHistoryItem[];
  pagination: PaginationInfo;
};

export const adminApi = {
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
    request<NotificationHistoryResponse>(`/admin/notifications${query}`)
};
