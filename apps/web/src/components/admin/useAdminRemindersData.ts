import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { acquireSocket, releaseSocket } from "../../lib/socket";
import { notifySocketErrorOnce } from "../../lib/socketError";
import type { ReminderHealthItem, ReminderItem, ReminderOccurrenceItem } from "../../types";

export type ReminderAdminFilterMode = "all" | "active" | "inactive";
export type OccurrenceAdminFilterMode = "all" | "today" | ReminderOccurrenceItem["status"];

const matchesReminderAdminFilter = (
  item: ReminderItem,
  filter: ReminderAdminFilterMode,
  userFilter: string
): boolean => {
  const trimmedUserFilter = userFilter.trim().toLowerCase();
  if (trimmedUserFilter) {
    const matchesText = `${item.userName ?? ""} ${item.userLogin ?? ""}`.toLowerCase();
    const matchesId = String(item.userId) === trimmedUserFilter;
    if (!matchesId && !matchesText.includes(trimmedUserFilter)) {
      return false;
    }
  }

  if (filter === "active") {
    return item.isActive;
  }

  if (filter === "inactive") {
    return !item.isActive;
  }

  return true;
};

const matchesOccurrenceAdminFilter = (
  item: ReminderOccurrenceItem,
  filter: OccurrenceAdminFilterMode,
  userFilter: string
): boolean => {
  const trimmedUserFilter = userFilter.trim().toLowerCase();
  if (trimmedUserFilter) {
    const matchesText = `${item.userName ?? ""} ${item.userLogin ?? ""}`.toLowerCase();
    const matchesId = String(item.userId) === trimmedUserFilter;
    if (!matchesId && !matchesText.includes(trimmedUserFilter)) {
      return false;
    }
  }

  if (filter === "today") {
    return (
      new Date(item.scheduledFor).toLocaleDateString("sv-SE") ===
      new Date().toLocaleDateString("sv-SE")
    );
  }

  if (filter !== "all") {
    return item.status === filter;
  }

  return true;
};

const buildReminderQueries = (
  userFilter: string,
  reminderFilter: ReminderAdminFilterMode,
  occurrenceFilter: OccurrenceAdminFilterMode
) => {
  const remindersParams = new URLSearchParams();
  const occurrencesParams = new URLSearchParams();
  const trimmedUserFilter = userFilter.trim();

  if (trimmedUserFilter) {
    if (/^\d+$/.test(trimmedUserFilter)) {
      remindersParams.set("user_id", trimmedUserFilter);
      occurrencesParams.set("user_id", trimmedUserFilter);
    } else {
      remindersParams.set("user_search", trimmedUserFilter);
      occurrencesParams.set("user_search", trimmedUserFilter);
    }
  }

  if (reminderFilter === "active") {
    remindersParams.set("active", "true");
  } else if (reminderFilter === "inactive") {
    remindersParams.set("active", "false");
  }

  if (occurrenceFilter === "today") {
    occurrencesParams.set("filter", "today");
  } else if (occurrenceFilter !== "all") {
    occurrencesParams.set("status", occurrenceFilter);
  }

  const remindersQuery = remindersParams.toString();
  const occurrencesQuery = occurrencesParams.toString();

  return {
    remindersQuery: remindersQuery ? `?${remindersQuery}` : "",
    occurrencesQuery: occurrencesQuery ? `?${occurrencesQuery}` : ""
  };
};

interface UseAdminRemindersDataParams {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

export const useAdminRemindersData = ({
  onError,
  onToast
}: UseAdminRemindersDataParams) => {
  const [health, setHealth] = useState<ReminderHealthItem | null>(null);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [occurrences, setOccurrences] = useState<ReminderOccurrenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [userFilter, setUserFilter] = useState("");
  const [reminderFilter, setReminderFilter] = useState<ReminderAdminFilterMode>("all");
  const [occurrenceFilter, setOccurrenceFilter] = useState<OccurrenceAdminFilterMode>("all");
  const loadRequestIdRef = useRef(0);
  const remindersRef = useRef<ReminderItem[]>([]);
  const occurrencesRef = useRef<ReminderOccurrenceItem[]>([]);

  useEffect(() => {
    remindersRef.current = reminders;
  }, [reminders]);

  useEffect(() => {
    occurrencesRef.current = occurrences;
  }, [occurrences]);

  const loadData = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);
    try {
      const { remindersQuery, occurrencesQuery } = buildReminderQueries(
        userFilter,
        reminderFilter,
        occurrenceFilter
      );
      const [healthResponse, remindersResponse, occurrencesResponse] = await Promise.all([
        api.adminReminderHealth(),
        api.adminReminders(remindersQuery),
        api.adminReminderOccurrences(occurrencesQuery)
      ]);
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      setHealth(healthResponse.health);
      setReminders(remindersResponse.reminders);
      setOccurrences(occurrencesResponse.occurrences);
    } catch (error) {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      onError(error instanceof ApiError ? error.message : "Falha ao carregar lembretes");
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [occurrenceFilter, onError, reminderFilter, userFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const socket = acquireSocket();

    const onReminderDue = (payload: {
      occurrenceId: number;
      reminderId: number;
      userId: number;
      title: string;
      description: string;
      scheduledFor: string;
      retryCount: number;
    }) => {
      onToast(
        payload.retryCount > 0
          ? `Lembrete reenviado para usuario #${payload.userId}: ${payload.title}`
          : `Lembrete disparado para usuario #${payload.userId}: ${payload.title}`
      );

      const contextReminder = remindersRef.current.find((item) => item.id === payload.reminderId);
      const existingOccurrence = occurrencesRef.current.find((item) => item.id === payload.occurrenceId);
      const now = new Date().toISOString();
      const nextOccurrence: ReminderOccurrenceItem = {
        id: payload.occurrenceId,
        reminderId: payload.reminderId,
        userId: payload.userId,
        userName: contextReminder?.userName ?? existingOccurrence?.userName,
        userLogin: contextReminder?.userLogin ?? existingOccurrence?.userLogin,
        scheduledFor: payload.scheduledFor,
        triggeredAt: now,
        status: "pending",
        retryCount: payload.retryCount,
        nextRetryAt: null,
        completedAt: null,
        expiredAt: null,
        triggerSource: "socket",
        createdAt: now,
        updatedAt: now,
        title: payload.title,
        description: payload.description
      };

      if (matchesOccurrenceAdminFilter(nextOccurrence, occurrenceFilter, userFilter)) {
        setOccurrences((prev) => {
          const exists = prev.some((item) => item.id === nextOccurrence.id);
          if (exists) {
            return prev.map((item) => (item.id === nextOccurrence.id ? nextOccurrence : item));
          }

          return [nextOccurrence, ...prev].slice(0, 300);
        });
      }

      setHealth((prev) =>
        prev
          ? {
              ...prev,
              pendingOccurrences: prev.pendingOccurrences + (payload.retryCount === 0 ? 1 : 0),
              deliveriesToday: prev.deliveriesToday + 1,
              retriesToday: prev.retriesToday + (payload.retryCount > 0 ? 1 : 0)
            }
          : prev
      );
    };

    const onReminderUpdated = (payload: {
      occurrenceId: number;
      userId: number;
      status: ReminderOccurrenceItem["status"];
      retryCount: number;
      completedAt?: string | null;
      expiredAt?: string | null;
    }) => {
      setOccurrences((prev) =>
        prev.flatMap((item) => {
          if (item.id !== payload.occurrenceId) {
            return [item];
          }

          const nextItem = {
            ...item,
            status: payload.status,
            retryCount: payload.retryCount,
            completedAt: payload.completedAt ?? item.completedAt,
            expiredAt: payload.expiredAt ?? item.expiredAt,
            updatedAt: new Date().toISOString()
          };

          return matchesOccurrenceAdminFilter(nextItem, occurrenceFilter, userFilter)
            ? [nextItem]
            : [];
        })
      );

      setHealth((prev) => {
        if (!prev) {
          return prev;
        }

        const affected = occurrencesRef.current.find((item) => item.id === payload.occurrenceId);
        const wasPending = affected?.status === "pending";

        return {
          ...prev,
          pendingOccurrences: Math.max(
            0,
            prev.pendingOccurrences - (wasPending && payload.status !== "pending" ? 1 : 0)
          ),
          completedToday:
            prev.completedToday + (payload.status === "completed" && wasPending ? 1 : 0),
          expiredToday: prev.expiredToday + (payload.status === "expired" && wasPending ? 1 : 0)
        };
      });
    };

    const onConnectError = () => {
      notifySocketErrorOnce(onError, "Falha na conexao em tempo real dos lembretes (admin)");
    };

    socket.on("reminder:due", onReminderDue);
    socket.on("reminder:updated", onReminderUpdated);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("reminder:due", onReminderDue);
      socket.off("reminder:updated", onReminderUpdated);
      socket.off("connect_error", onConnectError);
      releaseSocket(socket);
    };
  }, [occurrenceFilter, onError, onToast, userFilter]);

  const toggleReminder = useCallback(
    async (item: ReminderItem) => {
      try {
        await api.toggleAdminReminder(item.id, !item.isActive);
        const nextItem = {
          ...item,
          isActive: !item.isActive,
          updatedAt: new Date().toISOString()
        };
        if (matchesReminderAdminFilter(nextItem, reminderFilter, userFilter)) {
          setReminders((prev) => prev.map((entry) => (entry.id === item.id ? nextItem : entry)));
        } else {
          setReminders((prev) => prev.filter((entry) => entry.id !== item.id));
        }
        setHealth((prev) =>
          prev
            ? {
                ...prev,
                activeReminders: prev.activeReminders + (item.isActive ? -1 : 1)
              }
            : prev
        );
        onToast(item.isActive ? "Lembrete desativado" : "Lembrete ativado");
      } catch (error) {
        onError(error instanceof ApiError ? error.message : "Falha ao alterar lembrete");
      }
    },
    [onError, onToast, reminderFilter, userFilter]
  );

  const stats = useMemo(
    () => ({
      reminders: health?.totalReminders ?? reminders.length,
      active: health?.activeReminders ?? reminders.filter((item) => item.isActive).length,
      pending:
        health?.pendingOccurrences ?? occurrences.filter((item) => item.status === "pending").length,
      completed:
        health?.completedToday ?? occurrences.filter((item) => item.status === "completed").length,
      expiredToday: health?.expiredToday ?? 0,
      deliveriesToday: health?.deliveriesToday ?? 0,
      retriesToday: health?.retriesToday ?? 0
    }),
    [health, occurrences, reminders]
  );

  return {
    health,
    reminders,
    occurrences,
    loading,
    userFilter,
    reminderFilter,
    occurrenceFilter,
    stats,
    setUserFilter,
    setReminderFilter,
    setOccurrenceFilter,
    toggleReminder
  };
};
