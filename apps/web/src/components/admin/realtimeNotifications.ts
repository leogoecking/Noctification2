import type { NotificationHistoryItem, PaginationInfo } from "../../types";
import type { HistoryFilters, QueueFilters } from "./types";
import {
  applyNotificationReadUpdate,
  isNotificationOperationallyActive,
  matchesHistoryFilters,
  matchesQueueFilters,
  prependNotificationPageItem
} from "./utils";

export interface NotificationReadUpdatePayload {
  notificationId?: number;
  userId?: number;
  readAt?: string | null;
  responseStatus?: "em_andamento" | "assumida" | "resolvida" | null;
  responseAt?: string | null;
}

interface FilteredInsertOptions<TFilters> {
  item: NotificationHistoryItem;
  items: NotificationHistoryItem[];
  filters: TFilters;
  pagination: PaginationInfo;
  matches: (item: NotificationHistoryItem, filters: TFilters) => boolean;
}

const updatePaginationTotal = (
  pagination: PaginationInfo,
  delta: number
): PaginationInfo => {
  if (delta === 0) {
    return pagination;
  }

  const total = Math.max(0, pagination.total + delta);
  const totalPages = Math.max(1, Math.ceil(total / pagination.limit));

  return {
    ...pagination,
    total,
    totalPages,
    page: Math.min(pagination.page, totalPages)
  };
};

const insertFilteredNotificationPage = <TFilters>({
  item,
  items,
  filters,
  pagination,
  matches
}: FilteredInsertOptions<TFilters>) => {
  if (!matches(item, filters)) {
    return {
      items,
      pagination,
      changed: false
    };
  }

  const alreadyExists = items.some((entry) => entry.id === item.id);

  return {
    items: prependNotificationPageItem(items, item, pagination.limit, pagination.page),
    pagination:
      !alreadyExists && pagination.page === 1
        ? updatePaginationTotal(pagination, 1)
        : pagination,
    changed: true
  };
};

export const insertQueueNotificationPage = (
  item: NotificationHistoryItem,
  items: NotificationHistoryItem[],
  filters: QueueFilters,
  pagination: PaginationInfo
) =>
  insertFilteredNotificationPage({
    item,
    items,
    filters,
    pagination,
    matches: matchesQueueFilters
  });

export const insertHistoryNotificationPage = (
  item: NotificationHistoryItem,
  items: NotificationHistoryItem[],
  filters: HistoryFilters,
  pagination: PaginationInfo
) =>
  insertFilteredNotificationPage({
    item,
    items,
    filters,
    pagination,
    matches: matchesHistoryFilters
  });

export const reconcileQueueReadUpdate = (
  items: NotificationHistoryItem[],
  pagination: PaginationInfo,
  payload: NotificationReadUpdatePayload
) => {
  let delta = 0;
  let changed = false;

  const nextItems = items.map((item) => {
    const beforeActive = isNotificationOperationallyActive(item);
    const nextItem = applyNotificationReadUpdate(item, {
      notificationId: payload.notificationId ?? 0,
      userId: payload.userId ?? 0,
      readAt: payload.readAt,
      responseStatus: payload.responseStatus,
      responseAt: payload.responseAt
    });

    if (nextItem !== item) {
      changed = true;
    }

    const afterActive = isNotificationOperationallyActive(nextItem);
    if (beforeActive !== afterActive) {
      delta += afterActive ? 1 : -1;
    }

    return nextItem;
  });

  return {
    items: nextItems,
    pagination: updatePaginationTotal(pagination, delta),
    changed
  };
};

export const reconcileHistoryReadUpdate = (
  items: NotificationHistoryItem[],
  pagination: PaginationInfo,
  filters: HistoryFilters,
  payload: NotificationReadUpdatePayload
) => {
  let changed = false;
  let removedCount = 0;

  const nextItems = items
    .map((item) => {
      const nextItem = applyNotificationReadUpdate(item, {
        notificationId: payload.notificationId ?? 0,
        userId: payload.userId ?? 0,
        readAt: payload.readAt,
        responseStatus: payload.responseStatus,
        responseAt: payload.responseAt
      });

      if (nextItem !== item) {
        changed = true;
      }

      return nextItem;
    })
    .filter((item) => {
      const matches = matchesHistoryFilters(item, filters);
      if (!matches) {
        removedCount += 1;
      }

      return matches;
    });

  return {
    items: nextItems,
    pagination: updatePaginationTotal(pagination, -removedCount),
    changed
  };
};
