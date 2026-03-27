import type { AuditEventItem, NotificationHistoryItem, OnlineUserItem, UserItem } from "../../types";
import { isNotificationOperationallyActive, isNotificationOperationallyCompleted } from "./utils";

export const getUnreadNotifications = (history: NotificationHistoryItem[]) =>
  history.filter((item) => isNotificationOperationallyActive(item));

export const getCompletedNotifications = (historyAll: NotificationHistoryItem[]) =>
  historyAll.filter(
    (item) =>
      item.stats.total > 0 &&
      item.stats.unread === 0 &&
      isNotificationOperationallyCompleted(item)
  );

export const getActiveUsers = (users: UserItem[]) => users.filter((item) => item.isActive);

export const getSelectableUserTargets = (users: UserItem[]) =>
  users.filter((item) => item.role === "user");

export const getRecentAuditEvents = (auditEvents: AuditEventItem[]) => auditEvents.slice(0, 8);

export const getOnlineSummary = (onlineUsers: OnlineUserItem[]) => {
  const admins = onlineUsers.filter((item) => item.role === "admin").length;
  const operators = onlineUsers.filter((item) => item.role === "user").length;

  return {
    admins,
    operators
  };
};

export const getAuditEventTypes = (auditEvents: AuditEventItem[]) =>
  Array.from(new Set(auditEvents.map((event) => event.event_type))).sort((a, b) =>
    a.localeCompare(b)
  );

export const getAdminMetrics = (
  unreadNotifications: NotificationHistoryItem[],
  completedNotifications: NotificationHistoryItem[],
  onlineUsers: OnlineUserItem[]
) => {
  const pendingRecipients = unreadNotifications.reduce(
    (acc, item) => acc + item.stats.operationalPending,
    0
  );
  const criticalOpen = unreadNotifications.filter((item) => item.priority === "critical").length;
  const inProgressNotifications = unreadNotifications.filter((item) => item.stats.inProgress > 0).length;

  return {
    pendingNotifications: unreadNotifications.length,
    pendingRecipients,
    criticalOpen,
    inProgressNotifications,
    completedNotifications: completedNotifications.length,
    onlineUsers: onlineUsers.length
  };
};
