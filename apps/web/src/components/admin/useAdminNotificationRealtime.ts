import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NotificationHistoryItem, PaginationInfo } from "../../types";
import type { HistoryFilters, QueueFilters } from "./types";
import { createHistoryFilters, createPagination, createQueueFilters } from "./adminRealtimeState";
import { buildHistoryQuery, buildQueueQuery } from "./adminRealtimeQueries";
import { getCompletedNotifications, getUnreadNotifications } from "./adminRealtimeDerived";
import {
  type NotificationReadUpdatePayload
} from "./realtimeNotifications";
import {
  applyCreatedNotificationUpdate,
  applyHistoryFiltersState,
  applyQueueFiltersState,
  applyReadUpdateCollections,
  resetHistoryFiltersState,
  resetQueueFiltersState
} from "./adminNotificationRealtimeUpdates";
import { loadAdminNotificationsPage } from "./adminNotificationRealtimeLoaders";

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

  const commitCollectionUpdates = useCallback((nextState: {
    queue: { items: NotificationHistoryItem[]; pagination: PaginationInfo };
    history: { items: NotificationHistoryItem[]; pagination: PaginationInfo };
  }, refreshedAt: string) => {
    historyRef.current = nextState.queue.items;
    queuePaginationRef.current = nextState.queue.pagination;
    historyAllRef.current = nextState.history.items;
    historyPaginationRef.current = nextState.history.pagination;
    setHistory(nextState.queue.items);
    setQueuePagination(nextState.queue.pagination);
    setHistoryAll(nextState.history.items);
    setHistoryPagination(nextState.history.pagination);
    setLastQueueRefreshAt(refreshedAt);
    setLastHistoryRefreshAt(refreshedAt);
  }, []);

  const loadUnreadDashboard = useCallback(async () => {
    await loadAdminNotificationsPage({
      requestIdRef: queueRequestIdRef,
      setLoading: setLoadingHistory,
      filters: appliedQueueFilters,
      page: queuePagination.page,
      buildQuery: buildQueueQuery,
      onSuccess: (response) => {
        setHistory(response.notifications);
        setQueuePagination(response.pagination);
        setLastQueueRefreshAt(new Date().toISOString());
      },
      onError,
      fallbackMessage: "Falha ao carregar dashboard"
    });
  }, [appliedQueueFilters, onError, queuePagination.page]);

  const loadNotificationHistory = useCallback(async () => {
    await loadAdminNotificationsPage({
      requestIdRef: historyRequestIdRef,
      setLoading: setLoadingHistoryAll,
      filters: appliedHistoryFilters,
      page: historyPagination.page,
      buildQuery: buildHistoryQuery,
      onSuccess: (response) => {
        setHistoryAll(response.notifications);
        setHistoryPagination(response.pagination);
        setLastHistoryRefreshAt(new Date().toISOString());
      },
      onError,
      fallbackMessage: "Falha ao carregar historico"
    });
  }, [appliedHistoryFilters, historyPagination.page, onError]);

  const insertCreatedNotification = useCallback((item: NotificationHistoryItem) => {
    const nextState = applyCreatedNotificationUpdate({
      item,
      queue: {
        items: historyRef.current,
        pagination: queuePaginationRef.current
      },
      queueFilters: appliedQueueFilters,
      history: {
        items: historyAllRef.current,
        pagination: historyPaginationRef.current
      },
      historyFilters: appliedHistoryFilters
    });
    commitCollectionUpdates(nextState, new Date().toISOString());
  }, [appliedHistoryFilters, appliedQueueFilters, commitCollectionUpdates]);

  const handleReadUpdate = useCallback((payload?: NotificationReadUpdatePayload) => {
    if (payload?.notificationId && payload.userId) {
      const nextState = applyReadUpdateCollections({
        payload,
        queue: {
          items: historyRef.current,
          pagination: queuePaginationRef.current
        },
        history: {
          items: historyAllRef.current,
          pagination: historyPaginationRef.current
        },
        historyFilters: appliedHistoryFilters
      });
      commitCollectionUpdates(nextState, new Date().toISOString());
      return;
    }

    void loadUnreadDashboard();
    void loadNotificationHistory();
  }, [appliedHistoryFilters, commitCollectionUpdates, loadNotificationHistory, loadUnreadDashboard]);

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
    setHistoryPagination((prev) => {
      const nextState = applyHistoryFiltersState(prev, historyFilters);
      setAppliedHistoryFilters(nextState.appliedFilters);
      return nextState.pagination;
    });
  }, [historyFilters]);

  const resetHistoryFilters = useCallback(() => {
    setHistoryPagination((prev) => {
      const nextState = resetHistoryFiltersState(prev);
      setHistoryFilters(nextState.filters);
      setAppliedHistoryFilters(nextState.appliedFilters);
      return nextState.pagination;
    });
  }, []);

  const applyQueueFilters = useCallback(() => {
    setQueuePagination((prev) => {
      const nextState = applyQueueFiltersState(prev, queueFilters);
      setAppliedQueueFilters(nextState.appliedFilters);
      return nextState.pagination;
    });
  }, [queueFilters]);

  const resetQueueFilters = useCallback(() => {
    setQueuePagination((prev) => {
      const nextState = resetQueueFiltersState(prev);
      setQueueFilters(nextState.filters);
      setAppliedQueueFilters(nextState.appliedFilters);
      return nextState.pagination;
    });
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
