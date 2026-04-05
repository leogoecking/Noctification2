import type { NotificationHistoryItem, PaginationInfo } from "../../types";
import type { HistoryFilters, QueueFilters } from "./types";
import { createHistoryFilters, createQueueFilters } from "./adminRealtimeState";
import {
  insertHistoryNotificationPage,
  insertQueueNotificationPage,
  reconcileHistoryReadUpdate,
  reconcileQueueReadUpdate,
  type NotificationReadUpdatePayload
} from "./realtimeNotifications";
import { matchesHistoryFilters, matchesQueueFilters } from "./utils";

interface NotificationPageState {
  items: NotificationHistoryItem[];
  pagination: PaginationInfo;
}

interface ApplyCreatedNotificationUpdateParams {
  item: NotificationHistoryItem;
  queue: NotificationPageState;
  queueFilters: QueueFilters;
  history: NotificationPageState;
  historyFilters: HistoryFilters;
}

export const applyCreatedNotificationUpdate = ({
  item,
  queue,
  queueFilters,
  history,
  historyFilters
}: ApplyCreatedNotificationUpdateParams) => {
  let nextQueue = queue;
  let nextHistory = history;

  if (matchesQueueFilters(item, queueFilters)) {
    nextQueue = insertQueueNotificationPage(item, queue.items, queueFilters, queue.pagination);
  }

  if (matchesHistoryFilters(item, historyFilters)) {
    nextHistory = insertHistoryNotificationPage(item, history.items, historyFilters, history.pagination);
  }

  return {
    queue: nextQueue,
    history: nextHistory
  };
};

interface ApplyReadUpdateCollectionsParams {
  payload: NotificationReadUpdatePayload;
  queue: NotificationPageState;
  history: NotificationPageState;
  historyFilters: HistoryFilters;
}

export const applyReadUpdateCollections = ({
  payload,
  queue,
  history,
  historyFilters
}: ApplyReadUpdateCollectionsParams) => ({
  queue: reconcileQueueReadUpdate(queue.items, queue.pagination, payload),
  history: reconcileHistoryReadUpdate(
    history.items,
    history.pagination,
    historyFilters,
    payload
  )
});

export const applyHistoryFiltersState = (
  pagination: PaginationInfo,
  historyFilters: HistoryFilters
) => ({
  appliedFilters: historyFilters,
  pagination: { ...pagination, page: 1, limit: historyFilters.limit }
});

export const resetHistoryFiltersState = (pagination: PaginationInfo) => {
  const nextFilters = createHistoryFilters();

  return {
    filters: nextFilters,
    appliedFilters: nextFilters,
    pagination: { ...pagination, page: 1, limit: 100 }
  };
};

export const applyQueueFiltersState = (
  pagination: PaginationInfo,
  queueFilters: QueueFilters
) => ({
  appliedFilters: queueFilters,
  pagination: { ...pagination, page: 1, limit: queueFilters.limit }
});

export const resetQueueFiltersState = (pagination: PaginationInfo) => {
  const nextFilters = createQueueFilters();

  return {
    filters: nextFilters,
    appliedFilters: nextFilters,
    pagination: { ...pagination, page: 1, limit: 20 }
  };
};
