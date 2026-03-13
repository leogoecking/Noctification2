import type { Dispatch, SetStateAction } from "react";
import type {
  AuditEventItem,
  NotificationHistoryItem,
  NotificationPriority,
  OnlineUserItem,
  PaginationInfo,
  UserItem
} from "../../types";

export type NotificationRecipient = NotificationHistoryItem["recipients"][number];

export type RecipientMode = "all" | "users";
export type AdminMenu = "dashboard" | "send" | "users" | "history_notifications" | "audit";

export type AuditFilters = {
  eventType: string;
  from: string;
  to: string;
  limit: number;
};

export type HistoryStatusFilter = "" | "read" | "unread";
export type HistoryPriorityFilter = "" | NotificationPriority;

export type HistoryFilters = {
  status: HistoryStatusFilter;
  priority: HistoryPriorityFilter;
  userId: string;
  from: string;
  to: string;
  limit: number;
};

export type NotificationFormState = {
  title: string;
  message: string;
  priority: NotificationPriority;
  recipient_mode: RecipientMode;
  recipient_ids: number[];
};

export type UserFormState = {
  name: string;
  login: string;
  password: string;
  department: string;
  job_title: string;
  role: "admin" | "user";
};

export type EditUserFormState = {
  id: number;
  name: string;
  login: string;
  department: string;
  job_title: string;
  role: "admin" | "user";
  password: string;
};

export type StateSetter<T> = Dispatch<SetStateAction<T>>;

export type AdminMetrics = {
  pendingNotifications: number;
  pendingRecipients: number;
  criticalOpen: number;
  inProgressNotifications: number;
  completedNotifications: number;
  onlineUsers: number;
};

export type OnlineSummary = {
  admins: number;
  operators: number;
};

export type AdminViewShared = {
  users: UserItem[];
  onlineUsers: OnlineUserItem[];
  auditEvents: AuditEventItem[];
  history: NotificationHistoryItem[];
  historyAll: NotificationHistoryItem[];
  auditPagination: PaginationInfo;
  historyPagination: PaginationInfo;
};
