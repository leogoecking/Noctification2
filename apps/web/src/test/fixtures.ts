import type {
  AuthUser,
  NotificationHistoryItem,
  OnlineUserItem,
  TaskCommentItem,
  TaskItem,
  UserItem
} from "../types";

const FIXED_ISO = "2026-03-21T12:00:00.000Z";

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
