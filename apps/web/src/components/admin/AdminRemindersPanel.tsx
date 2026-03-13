import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { connectSocket } from "../../lib/socket";
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

  const loadData = useCallback(async () => {
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
      setHealth(healthResponse.health as ReminderHealthItem);
      setReminders(remindersResponse.reminders as ReminderItem[]);
      setOccurrences(occurrencesResponse.occurrences as ReminderOccurrenceItem[]);
      setLogs(logsResponse.logs as ReminderLogItem[]);
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao carregar lembretes");
    } finally {
      setLoading(false);
    }
  }, [logEventFilter, occurrenceFilter, onError, reminderFilter, userFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const socket = connectSocket();

    const refreshFromRealtime = () => {
      void loadData();
    };

    const onReminderDue = (payload: { title: string; userId: number; retryCount: number }) => {
      onToast(
        payload.retryCount > 0
          ? `Lembrete reenviado para usuario #${payload.userId}: ${payload.title}`
          : `Lembrete disparado para usuario #${payload.userId}: ${payload.title}`
      );
      refreshFromRealtime();
    };

    const onReminderUpdated = () => {
      refreshFromRealtime();
    };

    socket.on("reminder:due", onReminderDue);
    socket.on("reminder:updated", onReminderUpdated);

    return () => {
      socket.off("reminder:due", onReminderDue);
      socket.off("reminder:updated", onReminderUpdated);
      socket.disconnect();
    };
  }, [loadData, onToast]);

  const toggleReminder = async (item: ReminderItem) => {
    try {
      await api.toggleAdminReminder(item.id, !item.isActive);
      onToast(item.isActive ? "Lembrete desativado" : "Lembrete ativado");
      await loadData();
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
