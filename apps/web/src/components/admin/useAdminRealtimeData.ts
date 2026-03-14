import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { notifySocketErrorOnce } from "../../lib/socketError";
import { acquireSocket, releaseSocket } from "../../lib/socket";
import type {
  AuditEventItem,
  NotificationHistoryItem,
  OnlineUserItem,
  PaginationInfo,
  UserItem
} from "../../types";
import type { AuditFilters, HistoryFilters, QueueFilters } from "./types";
import {
  applyNotificationReadUpdate,
  isNotificationOperationallyActive,
  isNotificationOperationallyCompleted,
  matchesHistoryFilters,
  matchesQueueFilters,
  prependNotificationPageItem
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
  const [appliedAuditFilters, setAppliedAuditFilters] = useState<AuditFilters>({
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
  const [appliedHistoryFilters, setAppliedHistoryFilters] = useState<HistoryFilters>({
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
  const [queuePagination, setQueuePagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });
  const [queueFilters, setQueueFilters] = useState<QueueFilters>({
    priority: "",
    userId: "",
    limit: 20
  });
  const [appliedQueueFilters, setAppliedQueueFilters] = useState<QueueFilters>({
    priority: "",
    userId: "",
    limit: 20
  });
  const [lastQueueRefreshAt, setLastQueueRefreshAt] = useState<string | null>(null);
  const usersRequestIdRef = useRef(0);
  const onlineUsersRequestIdRef = useRef(0);
  const auditRequestIdRef = useRef(0);
  const queueRequestIdRef = useRef(0);
  const historyRequestIdRef = useRef(0);

  const loadUsers = useCallback(async () => {
    const requestId = usersRequestIdRef.current + 1;
    usersRequestIdRef.current = requestId;
    setLoadingUsers(true);
    try {
      const response = await api.adminUsers();
      if (requestId !== usersRequestIdRef.current) {
        return;
      }

      setUsers(response.users as UserItem[]);
    } catch (error) {
      if (requestId !== usersRequestIdRef.current) {
        return;
      }

      onError(toErrorMessage(error, "Falha ao carregar usuarios"));
    } finally {
      if (requestId === usersRequestIdRef.current) {
        setLoadingUsers(false);
      }
    }
  }, [onError]);

  const loadOnlineUsers = useCallback(async () => {
    const requestId = onlineUsersRequestIdRef.current + 1;
    onlineUsersRequestIdRef.current = requestId;
    setLoadingOnlineUsers(true);
    try {
      const response = await api.adminOnlineUsers();
      if (requestId !== onlineUsersRequestIdRef.current) {
        return;
      }

      setOnlineUsers(response.users as OnlineUserItem[]);
      setLastOnlineRefreshAt(new Date().toISOString());
    } catch (error) {
      if (requestId !== onlineUsersRequestIdRef.current) {
        return;
      }

      onError(toErrorMessage(error, "Falha ao carregar usuarios online"));
    } finally {
      if (requestId === onlineUsersRequestIdRef.current) {
        setLoadingOnlineUsers(false);
      }
    }
  }, [onError]);

  const loadAudit = useCallback(async () => {
    const requestId = auditRequestIdRef.current + 1;
    auditRequestIdRef.current = requestId;
    setLoadingAudit(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(appliedAuditFilters.limit));
      params.set("page", String(auditPagination.page));
      if (appliedAuditFilters.eventType.trim()) {
        params.set("event_type", appliedAuditFilters.eventType.trim());
      }
      if (appliedAuditFilters.from) {
        params.set("from", new Date(`${appliedAuditFilters.from}T00:00:00`).toISOString());
      }
      if (appliedAuditFilters.to) {
        params.set("to", new Date(`${appliedAuditFilters.to}T23:59:59`).toISOString());
      }

      const response = await api.adminAudit(`?${params.toString()}`);
      if (requestId !== auditRequestIdRef.current) {
        return;
      }

      setAuditEvents(response.events as AuditEventItem[]);
      setAuditPagination(response.pagination as PaginationInfo);
      setLastAuditRefreshAt(new Date().toISOString());
    } catch (error) {
      if (requestId !== auditRequestIdRef.current) {
        return;
      }

      onError(toErrorMessage(error, "Falha ao carregar auditoria"));
    } finally {
      if (requestId === auditRequestIdRef.current) {
        setLoadingAudit(false);
      }
    }
  }, [
    appliedAuditFilters.eventType,
    appliedAuditFilters.from,
    appliedAuditFilters.limit,
    appliedAuditFilters.to,
    auditPagination.page,
    onError
  ]);

  const loadUnreadDashboard = useCallback(async () => {
    const requestId = queueRequestIdRef.current + 1;
    queueRequestIdRef.current = requestId;
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams();
      params.set("scope", "operational_active");
      params.set("limit", String(appliedQueueFilters.limit));
      params.set("page", String(queuePagination.page));
      if (appliedQueueFilters.priority) {
        params.set("priority", appliedQueueFilters.priority);
      }
      if (appliedQueueFilters.userId) {
        params.set("user_id", appliedQueueFilters.userId);
      }

      const response = await api.adminNotifications(`?${params.toString()}`);
      if (requestId !== queueRequestIdRef.current) {
        return;
      }

      setHistory(response.notifications as NotificationHistoryItem[]);
      setQueuePagination(response.pagination as PaginationInfo);
      setLastQueueRefreshAt(new Date().toISOString());
    } catch (error) {
      if (requestId !== queueRequestIdRef.current) {
        return;
      }

      onError(toErrorMessage(error, "Falha ao carregar dashboard"));
    } finally {
      if (requestId === queueRequestIdRef.current) {
        setLoadingHistory(false);
      }
    }
  }, [
    appliedQueueFilters.limit,
    appliedQueueFilters.priority,
    appliedQueueFilters.userId,
    onError,
    queuePagination.page
  ]);

  const loadNotificationHistory = useCallback(async () => {
    const requestId = historyRequestIdRef.current + 1;
    historyRequestIdRef.current = requestId;
    setLoadingHistoryAll(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(appliedHistoryFilters.limit));
      params.set("page", String(historyPagination.page));
      if (appliedHistoryFilters.status) {
        params.set("status", appliedHistoryFilters.status);
      }
      if (appliedHistoryFilters.priority) {
        params.set("priority", appliedHistoryFilters.priority);
      }
      if (appliedHistoryFilters.userId) {
        params.set("user_id", appliedHistoryFilters.userId);
      }
      if (appliedHistoryFilters.from) {
        params.set("from", new Date(`${appliedHistoryFilters.from}T00:00:00`).toISOString());
      }
      if (appliedHistoryFilters.to) {
        params.set("to", new Date(`${appliedHistoryFilters.to}T23:59:59`).toISOString());
      }

      const query = params.toString();
      const response = await api.adminNotifications(query ? `?${query}` : "");
      if (requestId !== historyRequestIdRef.current) {
        return;
      }

      setHistoryAll(response.notifications as NotificationHistoryItem[]);
      setHistoryPagination(response.pagination as PaginationInfo);
      setLastHistoryRefreshAt(new Date().toISOString());
    } catch (error) {
      if (requestId !== historyRequestIdRef.current) {
        return;
      }

      onError(toErrorMessage(error, "Falha ao carregar historico"));
    } finally {
      if (requestId === historyRequestIdRef.current) {
        setLoadingHistoryAll(false);
      }
    }
  }, [
    appliedHistoryFilters.from,
    appliedHistoryFilters.limit,
    appliedHistoryFilters.priority,
    appliedHistoryFilters.status,
    appliedHistoryFilters.to,
    appliedHistoryFilters.userId,
    historyPagination.page,
    onError
  ]);

  const insertCreatedNotification = useCallback(
    (item: NotificationHistoryItem) => {
      if (matchesQueueFilters(item, appliedQueueFilters)) {
        setHistory((prev) => {
          const alreadyExists = prev.some((entry) => entry.id === item.id);
          if (!alreadyExists && queuePagination.page === 1) {
            setQueuePagination((prevPagination) => ({
              ...prevPagination,
              total: prevPagination.total + 1,
              totalPages: Math.max(1, Math.ceil((prevPagination.total + 1) / prevPagination.limit))
            }));
          }

          return prependNotificationPageItem(prev, item, queuePagination.limit, queuePagination.page);
        });
        setLastQueueRefreshAt(new Date().toISOString());
      }

      if (matchesHistoryFilters(item, appliedHistoryFilters)) {
        setHistoryAll((prev) => {
          const alreadyExists = prev.some((entry) => entry.id === item.id);
          if (!alreadyExists && historyPagination.page === 1) {
            setHistoryPagination((prevPagination) => ({
              ...prevPagination,
              total: prevPagination.total + 1,
              totalPages: Math.max(1, Math.ceil((prevPagination.total + 1) / prevPagination.limit))
            }));
          }

          return prependNotificationPageItem(prev, item, historyPagination.limit, historyPagination.page);
        });
        setLastHistoryRefreshAt(new Date().toISOString());
      }
    },
    [
      appliedHistoryFilters,
      appliedQueueFilters,
      historyPagination.limit,
      historyPagination.page,
      queuePagination.limit,
      queuePagination.page
    ]
  );

  const upsertUser = useCallback((user: UserItem) => {
    setUsers((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === user.id);
      if (existingIndex === -1) {
        return [...prev, user].sort((left, right) => left.name.localeCompare(right.name));
      }

      const next = [...prev];
      next[existingIndex] = user;
      return next.sort((left, right) => left.name.localeCompare(right.name));
    });

    setOnlineUsers((prev) => {
      if (!user.isActive) {
        return prev.filter((item) => item.id !== user.id);
      }

      return prev.map((item) =>
        item.id === user.id
          ? {
              ...item,
              name: user.name,
              login: user.login,
              role: user.role,
              department: user.department,
              jobTitle: user.jobTitle
            }
          : item
      );
    });
  }, []);

  const updateUserActiveState = useCallback((userId: number, isActive: boolean) => {
    setUsers((prev) =>
      prev.map((item) =>
        item.id === userId
          ? {
              ...item,
              isActive,
              updatedAt: new Date().toISOString()
            }
          : item
      )
    );

    if (!isActive) {
      setOnlineUsers((prev) => prev.filter((item) => item.id !== userId));
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadOnlineUsers();
  }, [loadOnlineUsers]);

  useEffect(() => {
    loadUnreadDashboard();
  }, [loadUnreadDashboard]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  useEffect(() => {
    void loadNotificationHistory();
  }, [loadNotificationHistory]);

  useEffect(() => {
    const socket = acquireSocket();

    const onReadUpdate = (payload?: {
      notificationId?: number;
      userId?: number;
      readAt?: string | null;
      responseStatus?: "em_andamento" | "assumida" | "resolvida" | null;
      responseAt?: string | null;
    }) => {
      if (payload?.notificationId && payload.userId) {
        setHistory((prev) => {
          let delta = 0;
          const next = prev.map((item) => {
            const beforeActive = isNotificationOperationallyActive(item);
            const updated = applyNotificationReadUpdate(item, {
              notificationId: payload.notificationId ?? 0,
              userId: payload.userId ?? 0,
              readAt: payload.readAt,
              responseStatus: payload.responseStatus,
              responseAt: payload.responseAt
            });
            const afterActive = isNotificationOperationallyActive(updated);

            if (beforeActive !== afterActive) {
              delta += afterActive ? 1 : -1;
            }

            return updated;
          });

          if (delta !== 0) {
            setQueuePagination((prevPagination) => {
              const nextTotal = Math.max(0, prevPagination.total + delta);
              const nextTotalPages = Math.max(1, Math.ceil(nextTotal / prevPagination.limit));
              return {
                ...prevPagination,
                total: nextTotal,
                totalPages: nextTotalPages,
                page: Math.min(prevPagination.page, nextTotalPages)
              };
            });
          }

          return next;
        });
        setHistoryAll((prev) => {
          let removedCount = 0;
          const next = prev
            .map((item) =>
              applyNotificationReadUpdate(item, {
                notificationId: payload.notificationId ?? 0,
                userId: payload.userId ?? 0,
                readAt: payload.readAt,
                responseStatus: payload.responseStatus,
                responseAt: payload.responseAt
              })
            )
            .filter((item) => {
              const matches = matchesHistoryFilters(item, appliedHistoryFilters);
              if (!matches) {
                removedCount += 1;
              }

              return matches;
            });

          if (removedCount > 0) {
            setHistoryPagination((prevPagination) => {
              const nextTotal = Math.max(0, prevPagination.total - removedCount);
              const nextTotalPages = Math.max(1, Math.ceil(nextTotal / prevPagination.limit));
              return {
                ...prevPagination,
                total: nextTotal,
                totalPages: nextTotalPages,
                page: Math.min(prevPagination.page, nextTotalPages)
              };
            });
          }

          return next;
        });
        setLastHistoryRefreshAt(new Date().toISOString());
        setLastQueueRefreshAt(new Date().toISOString());
        return;
      }

      loadUnreadDashboard();
      loadNotificationHistory();
    };

    const onNotificationCreated = (payload?: NotificationHistoryItem) => {
      if (!payload?.id) {
        loadUnreadDashboard();
        loadNotificationHistory();
        return;
      }

      insertCreatedNotification(payload);
    };

    const onOnlineUsersUpdate = (payload?: { users?: OnlineUserItem[] }) => {
      if (payload?.users) {
        setOnlineUsers(payload.users);
        setLastOnlineRefreshAt(new Date().toISOString());
        return;
      }

      loadOnlineUsers();
    };

    const onConnectError = () => {
      notifySocketErrorOnce(onError, "Falha na conexao em tempo real (admin)");
    };

    socket.on("notification:read_update", onReadUpdate);
    socket.on("notification:created", onNotificationCreated);
    socket.on("online_users:update", onOnlineUsersUpdate);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("notification:read_update", onReadUpdate);
      socket.off("notification:created", onNotificationCreated);
      socket.off("online_users:update", onOnlineUsersUpdate);
      socket.off("connect_error", onConnectError);
      releaseSocket(socket);
    };
  }, [
    appliedHistoryFilters,
    insertCreatedNotification,
    loadNotificationHistory,
    loadOnlineUsers,
    loadUnreadDashboard,
    onError
  ]);

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
    setAppliedAuditFilters(auditFilters);
    setAuditPagination((prev) => ({ ...prev, page: 1, limit: auditFilters.limit }));
  };

  const resetAuditFilters = () => {
    const nextFilters: AuditFilters = {
      eventType: "",
      from: "",
      to: "",
      limit: 20
    };
    setAuditFilters(nextFilters);
    setAppliedAuditFilters(nextFilters);
    setAuditPagination((prev) => ({ ...prev, page: 1, limit: 20 }));
  };

  const applyHistoryFilters = () => {
    setAppliedHistoryFilters(historyFilters);
    setHistoryPagination((prev) => ({ ...prev, page: 1, limit: historyFilters.limit }));
  };

  const resetHistoryFilters = () => {
    const nextFilters: HistoryFilters = {
      status: "",
      priority: "",
      userId: "",
      from: "",
      to: "",
      limit: 100
    };
    setHistoryFilters(nextFilters);
    setAppliedHistoryFilters(nextFilters);
    setHistoryPagination((prev) => ({ ...prev, page: 1, limit: 100 }));
  };

  const applyQueueFilters = () => {
    setAppliedQueueFilters(queueFilters);
    setQueuePagination((prev) => ({ ...prev, page: 1, limit: queueFilters.limit }));
  };

  const resetQueueFilters = () => {
    const nextFilters: QueueFilters = {
      priority: "",
      userId: "",
      limit: 20
    };
    setQueueFilters(nextFilters);
    setAppliedQueueFilters(nextFilters);
    setQueuePagination((prev) => ({ ...prev, page: 1, limit: 20 }));
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
    queueFilters,
    setQueueFilters,
    queuePagination,
    setQueuePagination,
    lastQueueRefreshAt,
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
    insertCreatedNotification,
    upsertUser,
    updateUserActiveState,
    applyAuditFilters,
    resetAuditFilters,
    applyHistoryFilters,
    resetHistoryFilters,
    applyQueueFilters,
    resetQueueFilters
  };
};
