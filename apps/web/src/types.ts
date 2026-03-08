export type UserRole = "admin" | "user";
export type NotificationPriority = "low" | "normal" | "high" | "critical";

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
  }>;
  stats: {
    total: number;
    read: number;
    unread: number;
  };
}
