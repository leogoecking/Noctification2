import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { notifySocketErrorOnce } from "../../lib/socketError";
import { acquireSocket, releaseSocket } from "../../lib/socket";
import type {
  ReminderHealthItem,
  ReminderItem,
  ReminderLogItem,
  ReminderOccurrenceItem
} from "../../types";

interface AdminRemindersPanelProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

type ReminderAdminFilterMode = "all" | "active" | "inactive";
type OccurrenceAdminFilterMode = "all" | "today" | ReminderOccurrenceItem["status"];

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

const matchesLogAdminFilter = (
  item: ReminderLogItem,
  eventFilter: string,
  userFilter: string
): boolean => {
  const trimmedUserFilter = userFilter.trim().toLowerCase();
  if (trimmedUserFilter) {
    const matchesText = `${item.userName ?? ""} ${item.userLogin ?? ""}`.toLowerCase();
    const matchesId = String(item.userId ?? "") === trimmedUserFilter;
    if (!matchesId && !matchesText.includes(trimmedUserFilter)) {
      return false;
    }
  }

  return eventFilter === "all" || item.eventType === eventFilter;
};

export const AdminRemindersPanel = ({ onError, onToast }: AdminRemindersPanelProps) => {
  const [health, setHealth] = useState<ReminderHealthItem | null>(null);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [occurrences, setOccurrences] = useState<ReminderOccurrenceItem[]>([]);
  const [logs, setLogs] = useState<ReminderLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [userFilter, setUserFilter] = useState("");
  const [reminderFilter, setReminderFilter] = useState<ReminderAdminFilterMode>("all");
  const [occurrenceFilter, setOccurrenceFilter] = useState<OccurrenceAdminFilterMode>("all");
  const [logEventFilter, setLogEventFilter] = useState("all");
  const loadRequestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);
    try {
      const remindersParams = new URLSearchParams();
      const occurrencesParams = new URLSearchParams();
      const logParams = new URLSearchParams();
      const trimmedUserFilter = userFilter.trim();

      if (trimmedUserFilter) {
        if (/^\d+$/.test(trimmedUserFilter)) {
          remindersParams.set("user_id", trimmedUserFilter);
          occurrencesParams.set("user_id", trimmedUserFilter);
          logParams.set("user_id", trimmedUserFilter);
        } else {
          remindersParams.set("user_search", trimmedUserFilter);
          occurrencesParams.set("user_search", trimmedUserFilter);
          logParams.set("user_search", trimmedUserFilter);
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

      if (logEventFilter !== "all") {
        logParams.set("event_type", logEventFilter);
      }

      const remindersQuery = remindersParams.toString();
      const occurrencesQuery = occurrencesParams.toString();
      const logsQuery = logParams.toString();

      const [healthResponse, remindersResponse, occurrencesResponse, logsResponse] = await Promise.all([
        api.adminReminderHealth(),
        api.adminReminders(remindersQuery ? `?${remindersQuery}` : ""),
        api.adminReminderOccurrences(occurrencesQuery ? `?${occurrencesQuery}` : ""),
        api.adminReminderLogs(logsQuery ? `?${logsQuery}` : "")
      ]);
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      setHealth(healthResponse.health as ReminderHealthItem);
      setReminders(remindersResponse.reminders as ReminderItem[]);
      setOccurrences(occurrencesResponse.occurrences as ReminderOccurrenceItem[]);
      setLogs(logsResponse.logs as ReminderLogItem[]);
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
  }, [logEventFilter, occurrenceFilter, onError, reminderFilter, userFilter]);

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

      const contextReminder = reminders.find((item) => item.id === payload.reminderId);
      const existingOccurrence = occurrences.find((item) => item.id === payload.occurrenceId);
      const nextOccurrence: ReminderOccurrenceItem = {
        id: payload.occurrenceId,
        reminderId: payload.reminderId,
        userId: payload.userId,
        userName: contextReminder?.userName ?? existingOccurrence?.userName,
        userLogin: contextReminder?.userLogin ?? existingOccurrence?.userLogin,
        scheduledFor: payload.scheduledFor,
        triggeredAt: new Date().toISOString(),
        status: "pending",
        retryCount: payload.retryCount,
        nextRetryAt: null,
        completedAt: null,
        expiredAt: null,
        triggerSource: "socket",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

      const nextLog: ReminderLogItem = {
        id: -Date.now(),
        reminderId: payload.reminderId,
        occurrenceId: payload.occurrenceId,
        userId: payload.userId,
        userName: contextReminder?.userName ?? existingOccurrence?.userName ?? null,
        userLogin: contextReminder?.userLogin ?? existingOccurrence?.userLogin ?? null,
        eventType:
          payload.retryCount > 0
            ? "reminder.occurrence.retried"
            : "reminder.occurrence.delivered",
        metadata: { retryCount: payload.retryCount, source: "socket" },
        createdAt: new Date().toISOString()
      };

      if (matchesLogAdminFilter(nextLog, logEventFilter, userFilter)) {
        setLogs((prev) => [nextLog, ...prev].slice(0, 100));
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

        const affected = occurrences.find((item) => item.id === payload.occurrenceId);
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

      const affected = occurrences.find((item) => item.id === payload.occurrenceId);
      if (affected) {
        const nextLog: ReminderLogItem = {
          id: -Date.now(),
          reminderId: affected.reminderId,
          occurrenceId: payload.occurrenceId,
          userId: payload.userId,
          userName: affected.userName ?? null,
          userLogin: affected.userLogin ?? null,
          eventType:
            payload.status === "completed"
              ? "reminder.occurrence.completed"
              : payload.status === "expired"
                ? "reminder.occurrence.expired"
                : "reminder.occurrence.updated",
          metadata: { retryCount: payload.retryCount, source: "socket" },
          createdAt: new Date().toISOString()
        };

        if (matchesLogAdminFilter(nextLog, logEventFilter, userFilter)) {
          setLogs((prev) => [nextLog, ...prev].slice(0, 100));
        }
      }
    };

    socket.on("reminder:due", onReminderDue);
    socket.on("reminder:updated", onReminderUpdated);
    const onConnectError = () => {
      notifySocketErrorOnce(onError, "Falha na conexao em tempo real dos lembretes (admin)");
    };
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("reminder:due", onReminderDue);
      socket.off("reminder:updated", onReminderUpdated);
      socket.off("connect_error", onConnectError);
      releaseSocket(socket);
    };
  }, [logEventFilter, occurrenceFilter, occurrences, onError, onToast, reminders, userFilter]);

  const toggleReminder = async (item: ReminderItem) => {
    try {
      await api.toggleAdminReminder(item.id, !item.isActive);
      const nextItem = {
        ...item,
        isActive: !item.isActive,
        updatedAt: new Date().toISOString()
      };
      if (matchesReminderAdminFilter(nextItem, reminderFilter, userFilter)) {
        setReminders((prev) =>
          prev.map((entry) => (entry.id === item.id ? nextItem : entry))
        );
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
  };

  const stats = useMemo(
    () => ({
      reminders: health?.totalReminders ?? reminders.length,
      active: health?.activeReminders ?? reminders.filter((item) => item.isActive).length,
      pending: health?.pendingOccurrences ?? occurrences.filter((item) => item.status === "pending").length,
      completed: health?.completedToday ?? occurrences.filter((item) => item.status === "completed").length,
      expiredToday: health?.expiredToday ?? 0,
      deliveriesToday: health?.deliveriesToday ?? 0,
      retriesToday: health?.retriesToday ?? 0
    }),
    [health, occurrences, reminders]
  );

  const formatOccurrenceStatus = (status: ReminderOccurrenceItem["status"]) => {
    if (status === "pending") return "Pendente";
    if (status === "completed") return "Concluida";
    if (status === "expired") return "Expirada";
    return "Cancelada";
  };

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-slate-700 bg-panel p-4">
        <h3 className="font-display text-lg text-textMain">Lembretes</h3>
        <p className="text-sm text-textMuted">Visao administrativa dos lembretes dos usuarios</p>
      </header>

      {health && !health.schedulerEnabled && (
        <article className="rounded-2xl border border-warning/50 bg-warning/10 p-4">
          <p className="font-display text-base text-textMain">Scheduler de lembretes desativado</p>
          <p className="mt-1 text-sm text-textMuted">
            Os lembretes nao vao disparar enquanto `ENABLE_REMINDER_SCHEDULER` estiver desligado na API.
          </p>
        </article>
      )}

      <section className="grid gap-3 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Lembretes</p>
          <p className="mt-2 font-display text-2xl text-textMain">{stats.reminders}</p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-success">Ativos</p>
          <p className="mt-2 font-display text-2xl text-textMain">{stats.active}</p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-warning">Pendentes</p>
          <p className="mt-2 font-display text-2xl text-textMain">{stats.pending}</p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Concluidas</p>
          <p className="mt-2 font-display text-2xl text-textMain">{stats.completed}</p>
          <p className="mt-1 text-xs text-textMuted">Hoje</p>
        </article>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-warning">Expiradas hoje</p>
          <p className="mt-2 font-display text-2xl text-textMain">{stats.expiredToday}</p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Disparos hoje</p>
          <p className="mt-2 font-display text-2xl text-textMain">{stats.deliveriesToday}</p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Retries hoje</p>
          <p className="mt-2 font-display text-2xl text-textMain">{stats.retriesToday}</p>
        </article>
      </section>

      <article className="rounded-2xl border border-slate-700 bg-panel p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-display text-base text-textMain">Lembretes cadastrados</h4>
          <div className="flex flex-wrap gap-2">
            <input
              className="input w-32"
              placeholder="Usuario ou login"
              value={userFilter}
              onChange={(event) => setUserFilter(event.target.value)}
            />
            {[
              { label: "Todos", value: "all" },
              { label: "Ativos", value: "active" },
              { label: "Inativos", value: "inactive" }
            ].map((option) => (
              <button
                key={option.value}
                className={`rounded-lg px-3 py-2 text-xs ${
                  reminderFilter === option.value
                    ? "bg-accent text-slate-900"
                    : "border border-slate-600 text-textMain"
                }`}
                onClick={() => setReminderFilter(option.value as ReminderAdminFilterMode)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {loading && <p className="text-sm text-textMuted">Carregando...</p>}
        {!loading && reminders.length === 0 && <p className="text-sm text-textMuted">Nenhum lembrete encontrado.</p>}
        <div className="space-y-2">
          {reminders.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-textMain">{item.title}</p>
                  <p className="text-xs text-textMuted">
                    {(item.userName || item.userLogin)
                      ? `${item.userName ?? "-"} (${item.userLogin ?? "-"})`
                      : `Usuario #${item.userId}`}{" "}
                    | {item.startDate} {item.timeOfDay} | {item.repeatType}
                  </p>
                </div>
                <button className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-textMain" onClick={() => toggleReminder(item)}>
                  {item.isActive ? "Desativar" : "Ativar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-2xl border border-slate-700 bg-panel p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-display text-base text-textMain">Ocorrencias recentes</h4>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Todas", value: "all" },
              { label: "Hoje", value: "today" },
              { label: "Pendentes", value: "pending" },
              { label: "Concluidas", value: "completed" },
              { label: "Expiradas", value: "expired" }
            ].map((option) => (
              <button
                key={option.value}
                className={`rounded-lg px-3 py-2 text-xs ${
                  occurrenceFilter === option.value
                    ? "bg-accent text-slate-900"
                    : "border border-slate-600 text-textMain"
                }`}
                onClick={() => setOccurrenceFilter(option.value as OccurrenceAdminFilterMode)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {occurrences.length === 0 && <p className="text-sm text-textMuted">Nenhuma ocorrencia registrada.</p>}
        <div className="space-y-2">
          {occurrences.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-textMain">{item.title}</p>
                <span className="rounded-md bg-panel px-2 py-1 text-xs text-textMuted">
                  {formatOccurrenceStatus(item.status)}
                </span>
              </div>
              <p className="mt-1 text-xs text-textMuted">
                {(item.userName || item.userLogin)
                  ? `${item.userName ?? "-"} (${item.userLogin ?? "-"})`
                  : `Usuario #${item.userId}`}{" "}
                | Agendado para {new Date(item.scheduledFor).toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-xs text-textMuted">Tentativas: {item.retryCount}</p>
              {item.completedAt && (
                <p className="mt-1 text-xs text-textMuted">
                  Concluida em {new Date(item.completedAt).toLocaleString("pt-BR")}
                </p>
              )}
              {item.expiredAt && (
                <p className="mt-1 text-xs text-textMuted">
                  Expirada em {new Date(item.expiredAt).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-2xl border border-slate-700 bg-panel p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-display text-base text-textMain">Logs operacionais</h4>
            <p className="text-xs text-textMuted">Rastreabilidade recente de disparos, retries e expiracoes</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Todos", value: "all" },
              { label: "Disparos", value: "reminder.occurrence.delivered" },
              { label: "Retries", value: "reminder.occurrence.retried" },
              { label: "Expiracoes", value: "reminder.occurrence.expired" },
              { label: "Conclusoes", value: "reminder.occurrence.completed" }
            ].map((option) => (
              <button
                key={option.value}
                className={`rounded-lg px-3 py-2 text-xs ${
                  logEventFilter === option.value
                    ? "bg-accent text-slate-900"
                    : "border border-slate-600 text-textMain"
                }`}
                onClick={() => setLogEventFilter(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {logs.length === 0 && <p className="text-sm text-textMuted">Nenhum log encontrado.</p>}
        <div className="space-y-2">
          {logs.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-textMain">{item.eventType}</p>
                <span className="text-xs text-textMuted">
                  {new Date(item.createdAt).toLocaleString("pt-BR")}
                </span>
              </div>
              <p className="mt-1 text-xs text-textMuted">
                {(item.userName || item.userLogin)
                  ? `${item.userName ?? "-"} (${item.userLogin ?? "-"})`
                  : item.userId
                    ? `Usuario #${item.userId}`
                    : "Sem usuario vinculado"}{" "}
                | Reminder #{item.reminderId ?? "-"} | Ocorrencia #{item.occurrenceId ?? "-"}
              </p>
              {item.metadata && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-panel p-2 text-[11px] text-textMuted">
                  {JSON.stringify(item.metadata, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
};
