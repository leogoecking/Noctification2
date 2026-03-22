export type UserRole = "admin" | "user";
export type NotificationPriority = "low" | "normal" | "high" | "critical";
export type RecipientMode = "all" | "users";
export type NotificationOperationalStatus =
  | "recebida"
  | "visualizada"
  | "em_andamento"
  | "assumida"
  | "resolvida";
export type NotificationResponseStatus = "em_andamento" | "assumida" | "resolvida";
export type TaskPriority = "low" | "normal" | "high" | "critical";
export type TaskStatus = "new" | "in_progress" | "waiting" | "done" | "cancelled";
export type TaskRepeatType = "none" | "daily" | "weekly" | "monthly" | "weekdays";
export type TaskEventType =
  | "created"
  | "updated"
  | "status_changed"
  | "assigned"
  | "due_date_changed"
  | "recurrence_changed"
  | "completed"
  | "cancelled"
  | "automation_due_soon"
  | "automation_overdue"
  | "automation_stale_task"
  | "automation_recurring_task";

export interface TaskRecord {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  creatorUserId: number;
  assigneeUserId: number | null;
  dueAt: string | null;
  repeatType: TaskRepeatType;
  repeatWeekdays: number[];
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  recurrenceSourceTaskId: number | null;
  sourceNotificationId: number | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface NotificationRecord {
  id: number;
  title: string;
  message: string;
  priority: NotificationPriority;
  senderId: number;
  recipientMode: RecipientMode;
  sourceTaskId: number | null;
  createdAt: string;
}

export interface TaskEventRecord {
  id: number;
  taskId: number;
  actorUserId: number | null;
  eventType: TaskEventType | string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  metadataJson: string | null;
  createdAt: string;
}

export interface TaskCommentRecord {
  id: number;
  taskId: number;
  authorUserId: number;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: number;
  login: string;
  name: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: number;
  role: UserRole;
}
