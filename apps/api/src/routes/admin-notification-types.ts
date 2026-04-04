import type { NotificationPriority, RecipientMode } from "../types";

export interface SenderRow {
  id: number;
  name: string;
  login: string;
}

export interface RecipientUserRow {
  id: number;
  name: string;
  login: string;
}

export interface AdminNotificationPayload {
  id: number;
  title: string;
  message: string;
  priority: NotificationPriority;
  recipient_mode: RecipientMode;
  source_task_id: number | null;
  created_at: string;
  sender: SenderRow;
  recipients: Array<{
    userId: number;
    name: string;
    login: string;
    visualizedAt: null;
    deliveredAt: string;
    operationalStatus: "recebida";
    responseAt: null;
    responseMessage: null;
  }>;
  stats: {
    total: number;
    read: number;
    unread: number;
    responded: number;
    received: number;
    visualized: number;
    inProgress: number;
    assumed: number;
    resolved: number;
    operationalPending: number;
    operationalCompleted: number;
  };
}
