export type UserRole = "admin" | "user";
export type NotificationPriority = "low" | "normal" | "high" | "critical";
export type NotificationResponseStatus =
  | "ciente"
  | "em_andamento"
  | "resolvido"
  | "aguardando";

export interface AuthUser {
  id: number;
  login: string;
  name: string;
  role: UserRole;
}

export interface UserItem {
  id: number;
  name: string;
  login: string;
  department: string;
  jobTitle: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  priority: NotificationPriority;
  createdAt: string;
  senderId: number;
  senderName: string;
  senderLogin: string;
  readAt: string | null;
  deliveredAt: string;
  responseStatus: NotificationResponseStatus | null;
  responseAt: string | null;
  isRead: boolean;
}

export interface NotificationHistoryItem {
  id: number;
  title: string;
  message: string;
  priority: NotificationPriority;
  recipient_mode: "all" | "users";
  created_at: string;
  sender: {
    id: number;
    name: string;
    login: string;
  };
  recipients: Array<{
    userId: number;
    name: string;
    login: string;
    readAt: string | null;
    deliveredAt: string;
    responseStatus: NotificationResponseStatus | null;
    responseAt: string | null;
  }>;
  stats: {
    total: number;
    read: number;
    unread: number;
    responded: number;
  };
}

export interface OnlineUserItem {
  id: number;
  name: string;
  login: string;
  role: UserRole;
  department: string;
  jobTitle: string;
}

export interface AuditEventItem {
  id: number;
  event_type: string;
  target_type: string;
  target_id: number | null;
  created_at: string;
  actor: {
    id: number;
    name: string;
    login: string;
  } | null;
  metadata: Record<string, unknown> | null;
}
