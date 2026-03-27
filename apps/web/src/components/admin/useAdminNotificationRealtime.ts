import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import type { NotificationHistoryItem, PaginationInfo } from "../../types";
import type { HistoryFilters, QueueFilters } from "./types";
import { matchesHistoryFilters, matchesQueueFilters } from "./utils";
import { createHistoryFilters, createPagination, createQueueFilters } from "./adminRealtimeState";
import { buildHistoryQuery, buildQueueQuery } from "./adminRealtimeQueries";
import { getCompletedNotifications, getUnreadNotifications } from "./adminRealtimeDerived";
import {
  insertHistoryNotificationPage,
  insertQueueNotificationPage,
  reconcileHistoryReadUpdate,
  reconcileQueueReadUpdate,
  type NotificationReadUpdatePayload
} from "./realtimeNotifications";

const toErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof ApiError ? error.message : fallback;
};

interface UseAdminNotificationRealtimeOptions {
  onError: (message: string) => void;
}

export const useAdminNotificationRealtime = ({ onError }: UseAdminNotificationRealtimeOptions) => {
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [historyAll, setHistoryAll] = useState<NotificationHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingHistoryAll, setLoadingHistoryAll] = useState(false);
  const [historyFilters, setHistoryFilters] = useState<HistoryFilters>(() => createHistoryFilters());
  const [appliedHistoryFilters, setAppliedHistoryFilters] = useState<HistoryFilters>(() => createHistoryFilters());
  const [historyPagination, setHistoryPagination] = useState<PaginationInfo>(() => createPagination(100));
  const [lastHistoryRefreshAt, setLastHistoryRefreshAt] = useState<string | null>(null);
  const [queuePagination, setQueuePagination] = useState<PaginationInfo>(() => createPagination(20));
  const [queueFilters, setQueueFilters] = useState<QueueFilters>(() => createQueueFilters());
  const [appliedQueueFilters, setAppliedQueueFilters] = useState<QueueFilters>(() => createQueueFilters());
  const [lastQueueRefreshAt, setLastQueueRefreshAt] = useState<string | null>(null);
  const queueRequestIdRef = useRef(0);
  const historyRequestIdRef = useRef(0);
  const historyRef = useRef<NotificationHistoryItem[]>([]);
  const historyAllRef = useRef<NotificationHistoryItem[]>([]);
  const queuePaginationRef = useRef<PaginationInfo>(createPagination(20));
  const historyPaginationRef = useRef<PaginationInfo>(createPagination(100));

  const loadUnreadDashboard = useCallback(async () => {
    const requestId = queueRequestIdRef.current + 1;
    queueRequestIdRef.current = requestId;
    setLoadingHistory(true);
    try {
      const response = await api.adminNotifications(
        buildQueueQuery(appliedQueueFilters, queuePagination.page)
      );
      if (requestId !== queueRequestIdRef.current) {
        return;
      }

      setHistory(response.notifications);
      setQueuePagination(response.pagination);
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
  }, [appliedQueueFilters, onError, queuePagination.page]);

  const loadNotificationHistory = useCallback(async () => {
    const requestId = historyRequestIdRef.current + 1;
    historyRequestIdRef.current = requestId;
    setLoadingHistoryAll(true);
    try {
      const response = await api.adminNotifications(
        buildHistoryQuery(appliedHistoryFilters, historyPagination.page)
      );
      if (requestId !== historyRequestIdRef.current) {
        return;
      }

      setHistoryAll(response.notifications);
      setHistoryPagination(response.pagination);
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
  }, [appliedHistoryFilters, historyPagination.page, onError]);

  const insertCreatedNotification = useCallback((item: NotificationHistoryItem) => {
    if (matchesQueueFilters(item, appliedQueueFilters)) {
      const nextQueueState = insertQueueNotificationPage(
        item,
        historyRef.current,
        appliedQueueFilters,
        queuePaginationRef.current
      );
      historyRef.current = nextQueueState.items;
      queuePaginationRef.current = nextQueueState.pagination;
      setHistory(nextQueueState.items);
      setQueuePagination(nextQueueState.pagination);
      setLastQueueRefreshAt(new Date().toISOString());
    }

    if (matchesHistoryFilters(item, appliedHistoryFilters)) {
      const nextHistoryState = insertHistoryNotificationPage(
        item,
        historyAllRef.current,
        appliedHistoryFilters,
        historyPaginationRef.current
      );
      historyAllRef.current = nextHistoryState.items;
      historyPaginationRef.current = nextHistoryState.pagination;
      setHistoryAll(nextHistoryState.items);
      setHistoryPagination(nextHistoryState.pagination);
      setLastHistoryRefreshAt(new Date().toISOString());
    }
  }, [appliedHistoryFilters, appliedQueueFilters]);

  const handleReadUpdate = useCallback((payload?: NotificationReadUpdatePayload) => {
    if (payload?.notificationId && payload.userId) {
      const nextQueueState = reconcileQueueReadUpdate(
        historyRef.current,
        queuePaginationRef.current,
        payload
      );
      historyRef.current = nextQueueState.items;
      queuePaginationRef.current = nextQueueState.pagination;
      setHistory(nextQueueState.items);
      setQueuePagination(nextQueueState.pagination);

      const nextHistoryState = reconcileHistoryReadUpdate(
        historyAllRef.current,
        historyPaginationRef.current,
        appliedHistoryFilters,
        payload
      );
      historyAllRef.current = nextHistoryState.items;
      historyPaginationRef.current = nextHistoryState.pagination;
      setHistoryAll(nextHistoryState.items);
      setHistoryPagination(nextHistoryState.pagination);
      setLastHistoryRefreshAt(new Date().toISOString());
      setLastQueueRefreshAt(new Date().toISOString());
      return;
    }

    void loadUnreadDashboard();
    void loadNotificationHistory();
  }, [appliedHistoryFilters, loadNotificationHistory, loadUnreadDashboard]);

  const handleNotificationCreated = useCallback((payload?: NotificationHistoryItem) => {
    if (!payload?.id) {
      void loadUnreadDashboard();
      void loadNotificationHistory();
      return;
    }

    insertCreatedNotification(payload);
  }, [insertCreatedNotification, loadNotificationHistory, loadUnreadDashboard]);

  useEffect(() => {
    void loadUnreadDashboard();
  }, [loadUnreadDashboard]);

  useEffect(() => {
    void loadNotificationHistory();
  }, [loadNotificationHistory]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    historyAllRef.current = historyAll;
  }, [historyAll]);

  useEffect(() => {
    queuePaginationRef.current = queuePagination;
  }, [queuePagination]);

  useEffect(() => {
    historyPaginationRef.current = historyPagination;
  }, [historyPagination]);

  const unreadNotifications = useMemo(() => getUnreadNotifications(history), [history]);
  const completedNotifications = useMemo(() => getCompletedNotifications(historyAll), [historyAll]);

  const applyHistoryFilters = useCallback(() => {
    setAppliedHistoryFilters(historyFilters);
    setHistoryPagination((prev) => ({ ...prev, page: 1, limit: historyFilters.limit }));
  }, [historyFilters]);

  const resetHistoryFilters = useCallback(() => {
    const nextFilters = createHistoryFilters();
    setHistoryFilters(nextFilters);
    setAppliedHistoryFilters(nextFilters);
    setHistoryPagination((prev) => ({ ...prev, page: 1, limit: 100 }));
  }, []);

  const applyQueueFilters = useCallback(() => {
    setAppliedQueueFilters(queueFilters);
    setQueuePagination((prev) => ({ ...prev, page: 1, limit: queueFilters.limit }));
  }, [queueFilters]);

  const resetQueueFilters = useCallback(() => {
    const nextFilters = createQueueFilters();
    setQueueFilters(nextFilters);
    setAppliedQueueFilters(nextFilters);
    setQueuePagination((prev) => ({ ...prev, page: 1, limit: 20 }));
  }, []);

  return {
    historyAll,
    loadingHistory,
    loadingHistoryAll,
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
    loadUnreadDashboard,
    loadNotificationHistory,
    insertCreatedNotification,
    handleReadUpdate,
    handleNotificationCreated,
    applyHistoryFilters,
    resetHistoryFilters,
    applyQueueFilters,
    resetQueueFilters
  };
};
