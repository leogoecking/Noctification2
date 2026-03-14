export type UserRole = "admin" | "user";
export type NotificationPriority = "low" | "normal" | "high" | "critical";
export type NotificationOperationalStatus =
  | "recebida"
  | "visualizada"
  | "em_andamento"
  | "assumida"
  | "resolvida";
export type NotificationResponseStatus = "em_andamento" | "assumida" | "resolvida";
export type ReminderRepeatType = "none" | "daily" | "weekly" | "monthly" | "weekdays";
export type ReminderOccurrenceStatus = "pending" | "completed" | "expired" | "cancelled";

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

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
  visualizedAt: string | null;
  deliveredAt: string;
  operationalStatus: NotificationOperationalStatus;
  responseAt: string | null;
  responseMessage: string | null;
  isVisualized: boolean;
  isRead?: boolean;
  isOperationallyPending?: boolean;
  responseStatus?: NotificationResponseStatus | null;
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
    visualizedAt: string | null;
    deliveredAt: string;
    operationalStatus: NotificationOperationalStatus;
    responseAt: string | null;
    responseMessage: string | null;
    responseStatus?: NotificationResponseStatus | null;
  }>;
  stats: {
    total: number;
    read: number;
    unread: number;
    responded: number;
    received?: number;
    visualized?: number;
    inProgress: number;
    assumed?: number;
    resolved: number;
    operationalPending: number;
    operationalCompleted: number;
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

export interface ReminderItem {
  id: number;
  userId: number;
  userName?: string;
  userLogin?: string;
  title: string;
  description: string;
  startDate: string;
  timeOfDay: string;
  timezone: string;
  repeatType: ReminderRepeatType;
  weekdays: number[];
  isActive: boolean;
  lastScheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderOccurrenceItem {
  id: number;
  reminderId: number;
  userId: number;
  userName?: string;
  userLogin?: string;
  scheduledFor: string;
  triggeredAt: string | null;
  status: ReminderOccurrenceStatus;
  retryCount: number;
  nextRetryAt: string | null;
  completedAt: string | null;
  expiredAt: string | null;
  triggerSource: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  description: string;
}

export interface ReminderLogItem {
  id: number;
  reminderId: number | null;
  occurrenceId: number | null;
  userId: number | null;
  userName?: string | null;
  userLogin?: string | null;
  eventType: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ReminderHealthItem {
  schedulerEnabled: boolean;
  totalReminders: number;
  activeReminders: number;
  pendingOccurrences: number;
  completedToday: number;
  expiredToday: number;
  deliveriesToday: number;
  retriesToday: number;
}
