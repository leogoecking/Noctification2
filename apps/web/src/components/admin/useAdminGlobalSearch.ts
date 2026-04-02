import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import type { AuditEventItem, NotificationHistoryItem, TaskItem, UserItem } from "../../types";

interface UseAdminGlobalSearchParams {
  enabled: boolean;
  users: UserItem[];
  unreadNotifications: NotificationHistoryItem[];
  historyAll: NotificationHistoryItem[];
  completedNotifications: NotificationHistoryItem[];
  auditEvents: AuditEventItem[];
}

export const useAdminGlobalSearch = ({
  enabled,
  users,
  unreadNotifications,
  historyAll,
  completedNotifications,
  auditEvents
}: UseAdminGlobalSearchParams) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [taskSearchResults, setTaskSearchResults] = useState<TaskItem[]>([]);
  const [loadingTaskSearch, setLoadingTaskSearch] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearch = deferredSearchQuery.trim().toLowerCase();
  const isSearching = enabled && normalizedSearch.length >= 2;

  useEffect(() => {
    if (!isSearching) {
      setTaskSearchResults([]);
      setLoadingTaskSearch(false);
      return;
    }

    const controller = new AbortController();
    const searchParams = new URLSearchParams();
    searchParams.set("search", normalizedSearch);
    searchParams.set("limit", "8");
    setLoadingTaskSearch(true);

    void api
      .adminTasks(`?${searchParams.toString()}`)
      .then((response) => {
        if (!controller.signal.aborted) {
          setTaskSearchResults(response.tasks);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setTaskSearchResults([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingTaskSearch(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [isSearching, normalizedSearch]);

  const matchedUsers = useMemo<UserItem[]>(
    () =>
      !isSearching
        ? []
        : users
            .filter(
              (user) =>
                user.name.toLowerCase().includes(normalizedSearch) ||
                user.login.toLowerCase().includes(normalizedSearch) ||
                user.department.toLowerCase().includes(normalizedSearch) ||
                user.jobTitle.toLowerCase().includes(normalizedSearch)
            )
            .slice(0, 6),
    [isSearching, normalizedSearch, users]
  );

  const matchedNotifications = useMemo<NotificationHistoryItem[]>(() => {
    if (!isSearching) {
      return [];
    }

    const notificationMap = new Map<number, NotificationHistoryItem>();
    for (const item of [...unreadNotifications, ...historyAll, ...completedNotifications]) {
      notificationMap.set(item.id, item);
    }

    return [...notificationMap.values()]
      .filter(
        (item) =>
          item.title.toLowerCase().includes(normalizedSearch) ||
          item.message.toLowerCase().includes(normalizedSearch) ||
          item.sender.name.toLowerCase().includes(normalizedSearch) ||
          item.sender.login.toLowerCase().includes(normalizedSearch) ||
          item.recipients.some(
            (recipient) =>
              recipient.name.toLowerCase().includes(normalizedSearch) ||
              recipient.login.toLowerCase().includes(normalizedSearch)
          )
      )
      .slice(0, 6);
  }, [completedNotifications, historyAll, isSearching, normalizedSearch, unreadNotifications]);

  const matchedAudit = useMemo<AuditEventItem[]>(
    () =>
      !isSearching
        ? []
        : auditEvents
            .filter(
              (event) =>
                event.event_type.toLowerCase().includes(normalizedSearch) ||
                event.target_type.toLowerCase().includes(normalizedSearch) ||
                event.actor?.name?.toLowerCase().includes(normalizedSearch) ||
                event.actor?.login?.toLowerCase().includes(normalizedSearch) ||
                JSON.stringify(event.metadata ?? {}).toLowerCase().includes(normalizedSearch)
            )
            .slice(0, 6),
    [auditEvents, isSearching, normalizedSearch]
  );

  return {
    searchQuery,
    setSearchQuery,
    taskSearchResults,
    loadingTaskSearch,
    matchedUsers,
    matchedNotifications,
    matchedAudit,
    isSearching
  };
};
