import {
  buildAuditEventItem,
  buildNotificationHistoryItem,
  buildOnlineUserItem,
  buildOperationsBoardMessageItem,
  buildTaskAutomationHealthItem,
  buildUserItem
} from "./fixtures";
import type { OperationsBoardEventItem, TaskItem } from "../types";

export const buildAdminDashboardUsersResponse = (
  users: ReturnType<typeof buildUserItem>[] = [
    buildUserItem({
      id: 1,
      name: "Admin",
      login: "admin",
      department: "NOC",
      jobTitle: "Coordenador",
      role: "admin"
    }),
    buildUserItem()
  ]
) => ({
  users
});

export const buildAdminNotificationsResponse = (
  notifications: ReturnType<typeof buildNotificationHistoryItem>[] = [],
  pagination: Partial<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> = {}
) => ({
  notifications,
  pagination: {
    page: 1,
    limit: 100,
    total: notifications.length,
    totalPages: 1,
    ...pagination
  }
});

export const buildAdminTasksResponse = (
  tasks: TaskItem[] = [],
  pagination: Partial<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> = {}
) => ({
  tasks,
  pagination: {
    page: 1,
    limit: 8,
    total: tasks.length,
    totalPages: 1,
    ...pagination
  }
});

export const buildAdminTaskHealthResponse = (overrides: Record<string, unknown> = {}) => ({
  health: buildTaskAutomationHealthItem({
    activeTasks: 10,
    dueSoonEligible: 2,
    overdueEligible: 1,
    staleEligible: 1,
    blockedEligible: 1,
    dueSoonSentToday: 2,
    overdueSentToday: 1,
    staleSentToday: 0,
    blockedSentToday: 1,
    ...overrides
  })
});

export const buildAdminOnlineUsersResponse = (
  users: ReturnType<typeof buildOnlineUserItem>[] = [buildOnlineUserItem()]
) => ({
  users,
  count: users.length
});

export const buildAdminAuditResponse = (
  events: ReturnType<typeof buildAuditEventItem>[] = [buildAuditEventItem()],
  pagination: Partial<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> = {}
) => ({
  events,
  pagination: {
    page: 1,
    limit: 20,
    total: events.length,
    totalPages: 1,
    ...pagination
  }
});

export const buildOperationsBoardMessage = buildOperationsBoardMessageItem;

export const buildOperationsBoardResponse = (
  messages: ReturnType<typeof buildOperationsBoardMessage>[] = [buildOperationsBoardMessage()]
) => ({
  messages
});

export const buildOperationsBoardDetailResponse = (
  message = buildOperationsBoardMessage(),
  timeline: OperationsBoardEventItem[] = []
) => ({
  message,
  timeline
});

export const buildCreatedUserResponse = () => ({
  user: buildUserItem({
    id: 3,
    name: "Novo Usuario",
    login: "novo.usuario",
    department: "Campo",
    jobTitle: "Tecnico"
  })
});

export const buildUpdatedUserResponse = () => ({
  user: buildUserItem({
    id: 2,
    name: "Operador Atualizado",
    department: "NOC",
    jobTitle: "Especialista"
  })
});
