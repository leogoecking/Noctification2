import { useEffect, useMemo } from "react";
import { notifySocketErrorOnce } from "../../lib/socketError";
import { acquireSocket, releaseSocket } from "../../lib/socket";
import { getAdminMetrics } from "./adminRealtimeDerived";
import { useAdminAuditRealtime } from "./useAdminAuditRealtime";
import { useAdminNotificationRealtime } from "./useAdminNotificationRealtime";
import { useAdminUsersRealtime } from "./useAdminUsersRealtime";

interface UseAdminRealtimeDataOptions {
  onError: (message: string) => void;
}

export const useAdminRealtimeData = ({ onError }: UseAdminRealtimeDataOptions) => {
  const usersRealtime = useAdminUsersRealtime({ onError });
  const auditRealtime = useAdminAuditRealtime({ onError });
  const notificationRealtime = useAdminNotificationRealtime({ onError });

  useEffect(() => {
    const socket = acquireSocket();

    const onConnectError = () => {
      notifySocketErrorOnce(onError, "Falha na conexao em tempo real (admin)");
    };

    socket.on("notification:read_update", notificationRealtime.handleReadUpdate);
    socket.on("notification:created", notificationRealtime.handleNotificationCreated);
    socket.on("online_users:update", usersRealtime.handleOnlineUsersUpdate);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("notification:read_update", notificationRealtime.handleReadUpdate);
      socket.off("notification:created", notificationRealtime.handleNotificationCreated);
      socket.off("online_users:update", usersRealtime.handleOnlineUsersUpdate);
      socket.off("connect_error", onConnectError);
      releaseSocket(socket);
    };
  }, [
    notificationRealtime.handleNotificationCreated,
    notificationRealtime.handleReadUpdate,
    onError,
    usersRealtime.handleOnlineUsersUpdate
  ]);

  const metrics = useMemo(
    () =>
      getAdminMetrics(
        notificationRealtime.unreadNotifications,
        notificationRealtime.completedNotifications,
        usersRealtime.onlineUsers
      ),
    [
      notificationRealtime.completedNotifications,
      notificationRealtime.unreadNotifications,
      usersRealtime.onlineUsers
    ]
  );

  return {
    users: usersRealtime.users,
    onlineUsers: usersRealtime.onlineUsers,
    auditEvents: auditRealtime.auditEvents,
    historyAll: notificationRealtime.historyAll,
    loadingUsers: usersRealtime.loadingUsers,
    loadingOnlineUsers: usersRealtime.loadingOnlineUsers,
    loadingAudit: auditRealtime.loadingAudit,
    loadingHistory: notificationRealtime.loadingHistory,
    loadingHistoryAll: notificationRealtime.loadingHistoryAll,
    auditPagination: auditRealtime.auditPagination,
    setAuditPagination: auditRealtime.setAuditPagination,
    auditFilters: auditRealtime.auditFilters,
    setAuditFilters: auditRealtime.setAuditFilters,
    lastOnlineRefreshAt: usersRealtime.lastOnlineRefreshAt,
    lastAuditRefreshAt: auditRealtime.lastAuditRefreshAt,
    historyFilters: notificationRealtime.historyFilters,
    setHistoryFilters: notificationRealtime.setHistoryFilters,
    historyPagination: notificationRealtime.historyPagination,
    setHistoryPagination: notificationRealtime.setHistoryPagination,
    lastHistoryRefreshAt: notificationRealtime.lastHistoryRefreshAt,
    queueFilters: notificationRealtime.queueFilters,
    setQueueFilters: notificationRealtime.setQueueFilters,
    queuePagination: notificationRealtime.queuePagination,
    setQueuePagination: notificationRealtime.setQueuePagination,
    lastQueueRefreshAt: notificationRealtime.lastQueueRefreshAt,
    unreadNotifications: notificationRealtime.unreadNotifications,
    completedNotifications: notificationRealtime.completedNotifications,
    activeUsers: usersRealtime.activeUsers,
    selectableUserTargets: usersRealtime.selectableUserTargets,
    recentAuditEvents: auditRealtime.recentAuditEvents,
    onlineSummary: usersRealtime.onlineSummary,
    auditEventTypes: auditRealtime.auditEventTypes,
    metrics,
    loadUsers: usersRealtime.loadUsers,
    loadOnlineUsers: usersRealtime.loadOnlineUsers,
    loadAudit: auditRealtime.loadAudit,
    loadUnreadDashboard: notificationRealtime.loadUnreadDashboard,
    loadNotificationHistory: notificationRealtime.loadNotificationHistory,
    insertCreatedNotification: notificationRealtime.insertCreatedNotification,
    upsertUser: usersRealtime.upsertUser,
    updateUserActiveState: usersRealtime.updateUserActiveState,
    applyAuditFilters: auditRealtime.applyAuditFilters,
    resetAuditFilters: auditRealtime.resetAuditFilters,
    applyHistoryFilters: notificationRealtime.applyHistoryFilters,
    resetHistoryFilters: notificationRealtime.resetHistoryFilters,
    applyQueueFilters: notificationRealtime.applyQueueFilters,
    resetQueueFilters: notificationRealtime.resetQueueFilters
  };
};
