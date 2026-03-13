import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { connectSocket } from "../../lib/socket";
import type {
  AuditEventItem,
  NotificationHistoryItem,
  OnlineUserItem,
  PaginationInfo,
  UserItem
} from "../../types";
import type { AuditFilters, HistoryFilters } from "./types";
import {
  isNotificationOperationallyActive,
  isNotificationOperationallyCompleted
} from "./utils";

interface UseAdminRealtimeDataOptions {
  onError: (message: string) => void;
}

const toErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof ApiError ? error.message : fallback;
};

export const useAdminRealtimeData = ({ onError }: UseAdminRealtimeDataOptions) => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [historyAll, setHistoryAll] = useState<NotificationHistoryItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingOnlineUsers, setLoadingOnlineUsers] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingHistoryAll, setLoadingHistoryAll] = useState(false);
  const [auditPagination, setAuditPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });
  const [auditFilters, setAuditFilters] = useState<AuditFilters>({
    eventType: "",
    from: "",
    to: "",
    limit: 20
  });
  const [lastOnlineRefreshAt, setLastOnlineRefreshAt] = useState<string | null>(null);
  const [lastAuditRefreshAt, setLastAuditRefreshAt] = useState<string | null>(null);
  const [historyFilters, setHistoryFilters] = useState<HistoryFilters>({
    status: "",
    priority: "",
    userId: "",
    from: "",
    to: "",
    limit: 100
  });
  const [historyPagination, setHistoryPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 1
  });
  const [lastHistoryRefreshAt, setLastHistoryRefreshAt] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await api.adminUsers();
      setUsers(response.users as UserItem[]);
    } catch (error) {
      onError(toErrorMessage(error, "Falha ao carregar usuarios"));
    } finally {
      setLoadingUsers(false);
    }
  }, [onError]);

  const loadOnlineUsers = useCallback(async () => {
    setLoadingOnlineUsers(true);
    try {
      const response = await api.adminOnlineUsers();
      setOnlineUsers(response.users as OnlineUserItem[]);
      setLastOnlineRefreshAt(new Date().toISOString());
    } catch (error) {
      onError(toErrorMessage(error, "Falha ao carregar usuarios online"));
    } finally {
      setLoadingOnlineUsers(false);
    }
  }, [onError]);

  const loadAudit = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(auditFilters.limit));
      params.set("page", String(auditPagination.page));
      if (auditFilters.eventType.trim()) {
        params.set("event_type", auditFilters.eventType.trim());
      }
      if (auditFilters.from) {
        params.set("from", new Date(`${auditFilters.from}T00:00:00`).toISOString());
      }
      if (auditFilters.to) {
        params.set("to", new Date(`${auditFilters.to}T23:59:59`).toISOString());
      }

      const response = await api.adminAudit(`?${params.toString()}`);
      setAuditEvents(response.events as AuditEventItem[]);
      setAuditPagination(response.pagination as PaginationInfo);
      setLastAuditRefreshAt(new Date().toISOString());
    } catch (error) {
      onError(toErrorMessage(error, "Falha ao carregar auditoria"));
    } finally {
      setLoadingAudit(false);
    }
  }, [
    auditFilters.eventType,
    auditFilters.from,
    auditFilters.limit,
    auditFilters.to,
    auditPagination.page,
    onError
  ]);

  const loadUnreadDashboard = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const response = await api.adminNotifications("?limit=200");
      setHistory(response.notifications as NotificationHistoryItem[]);
    } catch (error) {
      onError(toErrorMessage(error, "Falha ao carregar dashboard"));
    } finally {
      setLoadingHistory(false);
    }
  }, [onError]);

  const loadNotificationHistory = useCallback(async () => {
    setLoadingHistoryAll(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(historyFilters.limit));
      params.set("page", String(historyPagination.page));
      if (historyFilters.status) {
        params.set("status", historyFilters.status);
      }
      if (historyFilters.priority) {
        params.set("priority", historyFilters.priority);
      }
      if (historyFilters.userId) {
        params.set("user_id", historyFilters.userId);
      }
      if (historyFilters.from) {
        params.set("from", new Date(`${historyFilters.from}T00:00:00`).toISOString());
      }
      if (historyFilters.to) {
        params.set("to", new Date(`${historyFilters.to}T23:59:59`).toISOString());
      }

      const query = params.toString();
      const response = await api.adminNotifications(query ? `?${query}` : "");
      setHistoryAll(response.notifications as NotificationHistoryItem[]);
      setHistoryPagination(response.pagination as PaginationInfo);
      setLastHistoryRefreshAt(new Date().toISOString());
    } catch (error) {
      onError(toErrorMessage(error, "Falha ao carregar historico"));
    } finally {
      setLoadingHistoryAll(false);
    }
  }, [
    historyFilters.from,
    historyFilters.limit,
    historyFilters.priority,
    historyFilters.status,
    historyFilters.to,
    historyFilters.userId,
    historyPagination.page,
    onError
  ]);

  useEffect(() => {
    loadUsers();
    loadOnlineUsers();
    loadAudit();
    loadUnreadDashboard();
    loadNotificationHistory();
  }, [loadAudit, loadNotificationHistory, loadOnlineUsers, loadUnreadDashboard, loadUsers]);

  useEffect(() => {
    const socket = connectSocket();

    const onReadUpdate = () => {
      loadUnreadDashboard();
      loadNotificationHistory();
      loadAudit();
    };

    const onOnlineUsersUpdate = () => {
      loadOnlineUsers();
    };

    const onConnectError = () => {
      onError("Falha na conexao em tempo real (admin)");
    };

    socket.on("notification:read_update", onReadUpdate);
    socket.on("online_users:update", onOnlineUsersUpdate);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("notification:read_update", onReadUpdate);
      socket.off("online_users:update", onOnlineUsersUpdate);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, [loadAudit, loadNotificationHistory, loadOnlineUsers, loadUnreadDashboard, onError]);

  const unreadNotifications = useMemo(
    () => history.filter((item) => isNotificationOperationallyActive(item)),
    [history]
  );
  const completedNotifications = useMemo(
    () =>
      historyAll.filter(
        (item) =>
          item.stats.total > 0 &&
          item.stats.unread === 0 &&
          isNotificationOperationallyCompleted(item)
      ),
    [historyAll]
  );
  const activeUsers = useMemo(() => users.filter((item) => item.isActive), [users]);
  const selectableUserTargets = useMemo(() => users.filter((item) => item.role === "user"), [users]);
  const recentAuditEvents = useMemo(() => auditEvents.slice(0, 8), [auditEvents]);
  const onlineSummary = useMemo(() => {
    const admins = onlineUsers.filter((item) => item.role === "admin").length;
    const operators = onlineUsers.filter((item) => item.role === "user").length;

    return {
      admins,
      operators
    };
  }, [onlineUsers]);
  const auditEventTypes = useMemo(() => {
    return Array.from(new Set(auditEvents.map((event) => event.event_type))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [auditEvents]);
  const metrics = useMemo(() => {
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
  }, [completedNotifications.length, onlineUsers.length, unreadNotifications]);

  const applyAuditFilters = () => {
    setAuditPagination((prev) => ({ ...prev, page: 1, limit: auditFilters.limit }));
    if (auditPagination.page === 1) {
      void loadAudit();
    }
  };

  const resetAuditFilters = () => {
    setAuditFilters({
      eventType: "",
      from: "",
      to: "",
      limit: 20
    });
    setAuditPagination((prev) => ({ ...prev, page: 1, limit: 20 }));
  };

  const applyHistoryFilters = () => {
    setHistoryPagination((prev) => ({ ...prev, page: 1, limit: historyFilters.limit }));
    if (historyPagination.page === 1) {
      void loadNotificationHistory();
    }
  };

  const resetHistoryFilters = () => {
    setHistoryFilters({
      status: "",
      priority: "",
      userId: "",
      from: "",
      to: "",
      limit: 100
    });
    setHistoryPagination((prev) => ({ ...prev, page: 1, limit: 100 }));
  };

  return {
    users,
    onlineUsers,
    auditEvents,
    historyAll,
    loadingUsers,
    loadingOnlineUsers,
    loadingAudit,
    loadingHistory,
    loadingHistoryAll,
    auditPagination,
    setAuditPagination,
    auditFilters,
    setAuditFilters,
    lastOnlineRefreshAt,
    lastAuditRefreshAt,
    historyFilters,
    setHistoryFilters,
    historyPagination,
    setHistoryPagination,
    lastHistoryRefreshAt,
    unreadNotifications,
    completedNotifications,
    activeUsers,
    selectableUserTargets,
    recentAuditEvents,
    onlineSummary,
    auditEventTypes,
    metrics,
    loadUsers,
    loadOnlineUsers,
    loadAudit,
    loadUnreadDashboard,
    loadNotificationHistory,
    applyAuditFilters,
    resetAuditFilters,
    applyHistoryFilters,
    resetHistoryFilters
  };
};
