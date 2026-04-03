export type UserRole = "admin" | "user";
export type NotificationPriority = "low" | "normal" | "high" | "critical";
export type NotificationOperationalStatus =
  | "recebida"
  | "visualizada"
  | "em_andamento"
  | "assumida"
  | "resolvida";
export type NotificationResponseStatus = "em_andamento" | "assumida" | "resolvida";
export type TaskPriority = "low" | "normal" | "high" | "critical";
export type TaskStatus =
  | "new"
  | "assumed"
  | "in_progress"
  | "blocked"
  | "waiting_external"
  | "done"
  | "cancelled";
export type TaskRepeatType = "none" | "daily" | "weekly" | "monthly" | "weekdays";
export type TaskEventType =
  | "created"
  | "updated"
  | "title_changed"
  | "description_changed"
  | "priority_changed"
  | "status_changed"
  | "assigned"
  | "due_date_changed"
  | "recurrence_changed"
  | "completed"
  | "cancelled"
  | "automation_due_soon"
  | "automation_overdue"
  | "automation_stale_task"
  | "automation_blocked_task"
  | "automation_recurring_task";
export type ReminderRepeatType = "none" | "daily" | "weekly" | "monthly" | "weekdays";
export type ReminderOccurrenceStatus = "pending" | "completed" | "expired" | "cancelled";
export type ReminderNoteKind = "note" | "checklist" | "alarm";
export type ReminderColorKey = "slate" | "sky" | "amber" | "emerald" | "rose";
export interface ReminderChecklistItem {
  checked: boolean;
  label: string;
}
export type OperationsBoardStatus = "active" | "resolved";
export type OperationsBoardEventType =
  | "created"
  | "updated"
  | "commented"
  | "resolved"
  | "reopened"
  | "viewed";

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
  sourceTaskId?: number | null;
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
  source_task_id?: number | null;
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

export interface TaskItem {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  creatorUserId: number;
  creatorName?: string;
  creatorLogin?: string;
  assigneeUserId: number | null;
  assigneeName?: string | null;
  assigneeLogin?: string | null;
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

export interface TaskEventItem {
  id: number;
  taskId: number;
  actorUserId: number | null;
  actorName?: string | null;
  actorLogin?: string | null;
  eventType: TaskEventType | string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface TaskCommentItem {
  id: number;
  taskId: number;
  authorUserId: number;
  authorName: string;
  authorLogin: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskTimelineItem {
  id: string;
  kind: "event" | "comment";
  taskId: number;
  actorUserId: number | null;
  actorName: string | null;
  actorLogin: string | null;
  eventType: TaskEventType | string | null;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  body: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface TaskAutomationHealthItem {
  schedulerEnabled: boolean;
  dueSoonWindowMinutes: number;
  staleWindowHours: number;
  activeTasks: number;
  dueSoonEligible: number;
  overdueEligible: number;
  staleEligible: number;
  blockedEligible: number;
  recurringEligible: number;
  dueSoonSentToday: number;
  overdueSentToday: number;
  staleSentToday: number;
  blockedSentToday: number;
  recurringCreatedToday: number;
}

export interface TaskAutomationLogItem {
  id: number;
  taskId: number;
  taskTitle: string;
  automationType: "due_soon" | "overdue" | "stale_task" | "blocked_task" | "recurring_task";
  dedupeKey: string;
  notificationId: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface TaskMetricsProductivityItem {
  windowDays: number;
  createdInWindow: number;
  completedInWindow: number;
  completedOnTime: number;
  completedLate: number;
  overdueOpen: number;
  blockedOpen: number;
  completionRate: number | null;
  onTimeRate: number | null;
  avgCycleHours: number | null;
  avgStartLagHours: number | null;
}

export interface TaskMetricsCapacityByAssigneeItem {
  assigneeKey: string;
  assigneeLabel: string;
  open: number;
  critical: number;
  overdue: number;
  blocked: number;
  done: number;
  completedOnTime: number;
  completedLate: number;
  avgCycleHours: number | null;
}

export interface TaskMetricsCapacityByDepartmentItem {
  departmentKey: string;
  departmentLabel: string;
  open: number;
  overdue: number;
  blocked: number;
  critical: number;
  members: number;
}

export interface TaskMetricsSummaryItem {
  productivity: TaskMetricsProductivityItem;
  capacityByAssignee: TaskMetricsCapacityByAssigneeItem[];
  capacityByDepartment: TaskMetricsCapacityByDepartmentItem[];
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
  checklistItems?: ReminderChecklistItem[];
  isActive: boolean;
  noteKind?: ReminderNoteKind;
  pinned?: boolean;
  tag?: string;
  color?: ReminderColorKey;
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

export type MuralCategory = "urgente" | "info" | "aviso" | "comunicado" | "procedimento" | "geral";

export interface OperationsBoardMessageItem {
  id: number;
  title: string;
  body: string;
  status: OperationsBoardStatus;
  category: MuralCategory;
  authorUserId: number;
  authorName: string;
  authorLogin: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface OperationsBoardEventItem {
  id: number;
  messageId: number;
  actorUserId: number;
  actorName: string;
  actorLogin: string;
  eventType: OperationsBoardEventType;
  body: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
