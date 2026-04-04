import type { NotificationOperationalStatus, NotificationPriority } from "../types";

export interface AdminNotificationRow {
  id: number;
  title: string;
  message: string;
  priority: NotificationPriority;
  recipientMode: "all" | "users";
  sourceTaskId: number | null;
  createdAt: string;
  senderId: number;
  senderName: string;
  senderLogin: string;
}

export interface AdminRecipientRow {
  notificationId?: number;
  userId: number;
  name: string;
  login: string;
  visualizedAt: string | null;
  deliveredAt: string;
  operationalStatus: NotificationOperationalStatus;
  responseAt: string | null;
  responseMessage: string | null;
}
