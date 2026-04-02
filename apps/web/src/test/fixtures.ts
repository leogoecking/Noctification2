import type {
  AuditEventItem,
  AuthUser,
  NotificationHistoryItem,
  OnlineUserItem,
  OperationsBoardMessageItem,
  TaskAutomationHealthItem,
  TaskCommentItem,
  TaskItem,
  TaskMetricsSummaryItem,
  TaskTimelineItem,
  UserItem
} from "../types";

export const FIXED_ISO = "2026-03-21T12:00:00.000Z";

export const buildAuthUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 2,
  login: "user",
  name: "Usuario",
  role: "user",
  ...overrides
});

export const buildUserItem = (overrides: Partial<UserItem> = {}): UserItem => ({
  id: 2,
  name: "Operador",
  login: "operador",
  department: "Suporte",
  jobTitle: "Analista",
  role: "user",
  isActive: true,
  createdAt: FIXED_ISO,
  updatedAt: FIXED_ISO,
  ...overrides
});

export const buildOnlineUserItem = (overrides: Partial<OnlineUserItem> = {}): OnlineUserItem => ({
  id: 2,
  name: "Operador",
  login: "operador",
  role: "user",
  department: "Suporte",
  jobTitle: "Analista",
  ...overrides
});

export const buildTaskItem = (overrides: Partial<TaskItem> = {}): TaskItem => ({
  id: 1,
  title: "Tarefa 1",
  description: "Descricao",
  status: "new",
  priority: "normal",
  creatorUserId: 2,
  creatorName: "Usuario",
  creatorLogin: "user",
  assigneeUserId: 2,
  assigneeName: "Usuario",
  assigneeLogin: "user",
  dueAt: null,
  repeatType: "none",
  repeatWeekdays: [],
  startedAt: null,
  completedAt: null,
  cancelledAt: null,
  recurrenceSourceTaskId: null,
  sourceNotificationId: null,
  createdAt: FIXED_ISO,
  updatedAt: FIXED_ISO,
  archivedAt: null,
  ...overrides
});

export const buildTaskCommentItem = (
  overrides: Partial<TaskCommentItem> = {}
): TaskCommentItem => ({
  id: 1,
  taskId: 1,
  authorUserId: 2,
  authorName: "Usuario",
  authorLogin: "user",
  body: "Comentario",
  createdAt: "2026-03-21T12:05:00.000Z",
  updatedAt: "2026-03-21T12:05:00.000Z",
  ...overrides
});

export const buildTaskTimelineCommentItem = (
  overrides: Partial<TaskTimelineItem> = {}
): TaskTimelineItem => ({
  id: "comment:1",
  kind: "comment",
  taskId: 1,
  actorUserId: 2,
  actorName: "Usuario",
  actorLogin: "user",
  eventType: null,
  fromStatus: null,
  toStatus: null,
  body: "Comentario",
  metadata: null,
  createdAt: FIXED_ISO,
  updatedAt: FIXED_ISO,
  ...overrides
});

export const buildTaskAutomationHealthItem = (
  overrides: Partial<TaskAutomationHealthItem> = {}
): TaskAutomationHealthItem => ({
  schedulerEnabled: true,
  dueSoonWindowMinutes: 120,
  staleWindowHours: 24,
  activeTasks: 3,
  dueSoonEligible: 1,
  overdueEligible: 1,
  staleEligible: 1,
  blockedEligible: 1,
  recurringEligible: 0,
  dueSoonSentToday: 1,
  overdueSentToday: 2,
  staleSentToday: 1,
  blockedSentToday: 1,
  recurringCreatedToday: 0,
  ...overrides
});

export const buildTaskMetricsSummaryItem = (
  overrides: Partial<TaskMetricsSummaryItem> = {}
): TaskMetricsSummaryItem => ({
  productivity: {
    windowDays: 7,
    createdInWindow: 3,
    completedInWindow: 2,
    completedOnTime: 1,
    completedLate: 1,
    overdueOpen: 1,
    blockedOpen: 1,
    completionRate: 2 / 3,
    onTimeRate: 0.5,
    avgCycleHours: 4,
    avgStartLagHours: 1
  },
  capacityByAssignee: [
    {
      assigneeKey: "2",
      assigneeLabel: "Operador",
      open: 1,
      critical: 1,
      overdue: 1,
      blocked: 0,
      done: 1,
      completedOnTime: 1,
      completedLate: 0,
      avgCycleHours: 3
    },
    {
      assigneeKey: "unassigned",
      assigneeLabel: "Sem responsavel",
      open: 1,
      critical: 0,
      overdue: 0,
      blocked: 1,
      done: 0,
      completedOnTime: 0,
      completedLate: 0,
      avgCycleHours: null
    }
  ],
  capacityByDepartment: [
    {
      departmentKey: "Suporte",
      departmentLabel: "Suporte",
      open: 1,
      overdue: 1,
      blocked: 0,
      critical: 1,
      members: 1
    }
  ],
  ...overrides
});

export const buildNotificationHistoryItem = (
  overrides: Partial<NotificationHistoryItem> = {}
): NotificationHistoryItem => ({
  id: 1,
  title: "Notificacao operacional",
  message: "Mensagem operacional",
  priority: "normal",
  recipient_mode: "users",
  source_task_id: null,
  created_at: FIXED_ISO,
  sender: {
    id: 1,
    name: "Admin",
    login: "admin"
  },
  recipients: [],
  stats: {
    total: 0,
    read: 0,
    unread: 0,
    responded: 0,
    inProgress: 0,
    resolved: 0,
    operationalPending: 0,
    operationalCompleted: 0
  },
  ...overrides
});

export const buildAuditEventItem = (
  overrides: Partial<AuditEventItem> = {}
): AuditEventItem => ({
  id: 10,
  event_type: "admin.notification.send",
  target_type: "notification",
  target_id: 55,
  created_at: FIXED_ISO,
  actor: {
    id: 1,
    name: "Admin",
    login: "admin"
  },
  metadata: {
    recipientCount: 1,
    priority: "high"
  },
  ...overrides
});

export const buildOperationsBoardMessageItem = (
  overrides: Partial<OperationsBoardMessageItem> = {}
): OperationsBoardMessageItem => ({
  id: 1,
  title: "Troca de turno",
  body: "Equipe da madrugada assumiu o monitoramento.",
  status: "active",
  authorUserId: 1,
  authorName: "Admin",
  authorLogin: "admin",
  createdAt: FIXED_ISO,
  updatedAt: FIXED_ISO,
  resolvedAt: null,
  ...overrides
});
