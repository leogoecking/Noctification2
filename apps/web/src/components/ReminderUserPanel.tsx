import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api";
import { playReminderAlert } from "../lib/reminderAudio";
import { connectSocket } from "../lib/socket";
import type { ReminderItem, ReminderOccurrenceItem, ReminderRepeatType } from "../types";

interface ReminderUserPanelProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

type ReminderFilterMode = "all" | "active" | "inactive";
type OccurrenceFilterMode = "all" | "today" | ReminderOccurrenceItem["status"];

const EMPTY_FORM = {
  id: 0,
  title: "",
  description: "",
  startDate: "",
  timeOfDay: "",
  timezone: "America/Bahia",
  repeatType: "none" as ReminderRepeatType,
  weekdays: [] as number[]
};

interface IncomingReminderDue {
  occurrenceId: number;
  reminderId: number;
  userId: number;
  title: string;
  description: string;
  scheduledFor: string;
  retryCount: number;
}

interface IncomingReminderUpdated {
  occurrenceId: number;
  reminderId: number;
  userId: number;
  status: ReminderOccurrenceItem["status"];
  retryCount: number;
  completedAt?: string | null;
  expiredAt?: string | null;
}

const matchesReminderFilter = (item: ReminderItem, filter: ReminderFilterMode): boolean => {
  if (filter === "active") {
    return item.isActive;
  }

  if (filter === "inactive") {
    return !item.isActive;
  }

  return true;
};

const sortReminders = (items: ReminderItem[]): ReminderItem[] =>
  [...items].sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });

const matchesOccurrenceFilter = (
  item: ReminderOccurrenceItem,
  filter: OccurrenceFilterMode
): boolean => {
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

export const ReminderUserPanel = ({ onError, onToast }: ReminderUserPanelProps) => {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [occurrences, setOccurrences] = useState<ReminderOccurrenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeAlert, setActiveAlert] = useState<ReminderOccurrenceItem | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [reminderFilter, setReminderFilter] = useState<ReminderFilterMode>("all");
  const [occurrenceFilter, setOccurrenceFilter] = useState<OccurrenceFilterMode>("all");

  const buildReminderQuery = (filterMode: ReminderFilterMode): string => {
    if (filterMode === "active") {
      return "?active=true";
    }

    if (filterMode === "inactive") {
      return "?active=false";
    }

    return "";
  };

  const buildOccurrenceQuery = (filterMode: OccurrenceFilterMode): string => {
    const params = new URLSearchParams();

    if (filterMode === "today") {
      params.set("filter", "today");
    } else if (filterMode !== "all") {
      params.set("status", filterMode);
    }

    const query = params.toString();
    return query ? `?${query}` : "";
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [remindersResponse, occurrencesResponse] = await Promise.all([
        api.myReminders(buildReminderQuery(reminderFilter)),
        api.myReminderOccurrences(buildOccurrenceQuery(occurrenceFilter))
      ]);
      setReminders(remindersResponse.reminders as ReminderItem[]);
      setOccurrences(occurrencesResponse.occurrences as ReminderOccurrenceItem[]);
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao carregar lembretes");
    } finally {
      setLoading(false);
    }
  }, [occurrenceFilter, onError, reminderFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const socket = connectSocket();

    const onReminderDue = (payload: IncomingReminderDue) => {
      const occurrence: ReminderOccurrenceItem = {
        id: payload.occurrenceId,
        reminderId: payload.reminderId,
        userId: payload.userId,
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

      setOccurrences((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === payload.occurrenceId);
        if (!matchesOccurrenceFilter(occurrence, occurrenceFilter)) {
          return prev;
        }

        if (existingIndex === -1) {
          return [occurrence, ...prev];
        }

        return prev.map((item) =>
          item.id === payload.occurrenceId
            ? {
                ...item,
                retryCount: payload.retryCount,
                status: "pending",
                updatedAt: new Date().toISOString()
              }
            : item
        );
      });

      setActiveAlert(occurrence);
      const played = playReminderAlert(payload.occurrenceId);
      setAudioBlocked(!played);
      onToast(
        payload.retryCount > 0
          ? `Lembrete novamente pendente: ${payload.title}`
          : `Lembrete disparado: ${payload.title}`
      );
    };

    const onReminderUpdated = (payload: IncomingReminderUpdated) => {
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

          return matchesOccurrenceFilter(nextItem, occurrenceFilter) ? [nextItem] : [];
        })
      );

      setActiveAlert((prev) => {
        if (!prev || prev.id !== payload.occurrenceId || payload.status === "pending") {
          return prev;
        }

        return null;
      });
    };

    const onConnectError = () => {
      onError("Falha na conexao em tempo real dos lembretes");
    };

    socket.on("reminder:due", onReminderDue);
    socket.on("reminder:updated", onReminderUpdated);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("reminder:due", onReminderDue);
      socket.off("reminder:updated", onReminderUpdated);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, [occurrenceFilter, onError, onToast]);

  const retryAlertSound = () => {
    if (!activeAlert) {
      return;
    }

    const played = playReminderAlert(activeAlert.id);
    setAudioBlocked(!played);

    if (played) {
      onToast("Som do lembrete reproduzido");
    } else {
      onError("O navegador ainda bloqueou o som do lembrete");
    }
  };

  const saveReminder = async () => {
    if (!form.title.trim() || !form.startDate || !form.timeOfDay) {
      onError("Titulo, data e hora sao obrigatorios");
      return;
    }

    try {
      if (form.id) {
        const response = (await api.updateMyReminder(form.id, form)) as
          | { reminder?: ReminderItem }
          | undefined;
        if (response?.reminder && matchesReminderFilter(response.reminder, reminderFilter)) {
          setReminders((prev) =>
            sortReminders(
              prev.map((item) => (item.id === response.reminder!.id ? response.reminder! : item))
            )
          );
        } else if (response?.reminder) {
          setReminders((prev) => prev.filter((item) => item.id !== response.reminder!.id));
        }
        onToast("Lembrete atualizado");
      } else {
        const response = (await api.createMyReminder(form)) as
          | { reminder?: ReminderItem }
          | undefined;
        if (response?.reminder && matchesReminderFilter(response.reminder, reminderFilter)) {
          setReminders((prev) => sortReminders([response.reminder!, ...prev]));
        }
        onToast("Lembrete criado");
      }

      setForm(EMPTY_FORM);
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao salvar lembrete");
    }
  };

  const toggleReminder = async (item: ReminderItem) => {
    try {
      await api.toggleMyReminder(item.id, !item.isActive);
      const nextItem = {
        ...item,
        isActive: !item.isActive,
        updatedAt: new Date().toISOString()
      };
      if (matchesReminderFilter(nextItem, reminderFilter)) {
        setReminders((prev) =>
          sortReminders(prev.map((entry) => (entry.id === item.id ? nextItem : entry)))
        );
      } else {
        setReminders((prev) => prev.filter((entry) => entry.id !== item.id));
      }
      onToast(item.isActive ? "Lembrete desativado" : "Lembrete ativado");
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao alterar lembrete");
    }
  };

  const deleteReminder = async (id: number) => {
    try {
      await api.deleteMyReminder(id);
      setReminders((prev) => prev.filter((item) => item.id !== id));
      onToast("Lembrete removido");
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao remover lembrete");
    }
  };

  const completeOccurrence = async (id: number) => {
    try {
      const response = await api.completeReminderOccurrence(id);
      setOccurrences((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "completed",
                completedAt: response.completedAt,
                updatedAt: response.completedAt
              }
            : item
        )
      );
      setActiveAlert((prev) => (prev?.id === id ? null : prev));
      onToast("Ocorrencia concluida");
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao concluir ocorrencia");
    }
  };

  const reminderStats = useMemo(
    () => ({
      total: reminders.length,
      active: reminders.filter((item) => item.isActive).length,
      inactive: reminders.filter((item) => !item.isActive).length
    }),
    [reminders]
  );

  const occurrenceStats = useMemo(
    () => ({
      pending: occurrences.filter((item) => item.status === "pending").length,
      completed: occurrences.filter((item) => item.status === "completed").length,
      expired: occurrences.filter((item) => item.status === "expired").length
    }),
    [occurrences]
  );

  const formatOccurrenceStatus = (status: ReminderOccurrenceItem["status"]) => {
    if (status === "pending") return "Pendente";
    if (status === "completed") return "Concluida";
    if (status === "expired") return "Expirada";
    return "Cancelada";
  };

  const formatRepeatType = (repeatType: ReminderRepeatType) => {
    if (repeatType === "none") return "Sem repeticao";
    if (repeatType === "daily") return "Diaria";
    if (repeatType === "weekly") return "Semanal";
    if (repeatType === "monthly") return "Mensal";
    return "Dias uteis";
  };

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-slate-700 bg-panel p-4">
        <h3 className="font-display text-lg text-textMain">Lembretes</h3>
        <p className="text-sm text-textMuted">Cadastro e acompanhamento dos seus lembretes</p>
      </header>

      {activeAlert && (
        <article className="rounded-2xl border border-warning/60 bg-warning/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-base text-textMain">Lembrete pendente agora</p>
              <p className="mt-1 font-semibold text-textMain">{activeAlert.title}</p>
              {activeAlert.description && (
                <p className="mt-1 text-sm text-textMuted">{activeAlert.description}</p>
              )}
              <p className="mt-2 text-xs text-textMuted">
                Agendado para {new Date(activeAlert.scheduledFor).toLocaleString("pt-BR")} | Tentativas:{" "}
                {activeAlert.retryCount}
              </p>
              {audioBlocked && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-warning">
                    O navegador bloqueou o som. O alerta visual continua ativo.
                  </p>
                  <button
                    className="rounded-lg border border-warning/60 px-3 py-2 text-xs text-warning"
                    onClick={retryAlertSound}
                    type="button"
                  >
                    Tentar som novamente
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg bg-success px-3 py-2 text-xs font-semibold text-slate-900"
                onClick={() => completeOccurrence(activeAlert.id)}
              >
                Concluir
              </button>
              <button
                className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-textMain"
                onClick={() => setActiveAlert(null)}
              >
                Fechar alerta
              </button>
            </div>
          </div>
        </article>
      )}

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Lembretes</p>
          <p className="mt-2 font-display text-2xl text-textMain">{reminderStats.total}</p>
          <p className="mt-1 text-xs text-textMuted">
            {reminderStats.active} ativos | {reminderStats.inactive} inativos
          </p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-warning">Pendentes</p>
          <p className="mt-2 font-display text-2xl text-textMain">{occurrenceStats.pending}</p>
          <p className="mt-1 text-xs text-textMuted">Ocorrencias aguardando conclusao</p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-success">Resolucao</p>
          <p className="mt-2 font-display text-2xl text-textMain">{occurrenceStats.completed}</p>
          <p className="mt-1 text-xs text-textMuted">{occurrenceStats.expired} expiradas</p>
        </article>
      </section>

      <article className="space-y-3 rounded-2xl border border-slate-700 bg-panel p-4">
        <h4 className="font-display text-base text-textMain">
          {form.id ? "Editar lembrete" : "Novo lembrete"}
        </h4>
        <input className="input" placeholder="Titulo" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
        <textarea className="input min-h-24" placeholder="Descricao opcional" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
        <div className="grid gap-3 md:grid-cols-2">
          <input className="input" type="date" value={form.startDate} onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))} />
          <input className="input" type="time" value={form.timeOfDay} onChange={(event) => setForm((prev) => ({ ...prev, timeOfDay: event.target.value }))} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <select className="input" value={form.repeatType} onChange={(event) => setForm((prev) => ({ ...prev, repeatType: event.target.value as ReminderRepeatType, weekdays: event.target.value === "weekdays" ? [1, 2, 3, 4, 5] : prev.weekdays }))}>
            <option value="none">Sem repeticao</option>
            <option value="daily">Diaria</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
            <option value="weekdays">Dias uteis</option>
          </select>
          <input className="input" placeholder="Timezone" value={form.timezone} onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))} />
        </div>
        {form.repeatType === "weekly" && (
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Dom", value: 0 },
              { label: "Seg", value: 1 },
              { label: "Ter", value: 2 },
              { label: "Qua", value: 3 },
              { label: "Qui", value: 4 },
              { label: "Sex", value: 5 },
              { label: "Sab", value: 6 }
            ].map((item) => (
              <button
                key={item.value}
                className={`rounded-lg px-3 py-2 text-xs ${form.weekdays.includes(item.value) ? "bg-accent text-slate-900" : "bg-panelAlt text-textMuted"}`}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    weekdays: prev.weekdays.includes(item.value)
                      ? prev.weekdays.filter((value) => value !== item.value)
                      : [...prev.weekdays, item.value].sort((a, b) => a - b)
                  }))
                }
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button className="btn-primary" onClick={saveReminder}>
            {form.id ? "Salvar" : "Criar lembrete"}
          </button>
          {form.id > 0 && (
            <button className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain" onClick={() => setForm(EMPTY_FORM)}>
              Cancelar
            </button>
          )}
        </div>
      </article>

      <article className="rounded-2xl border border-slate-700 bg-panel p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-display text-base text-textMain">Meus lembretes</h4>
          <div className="flex flex-wrap gap-2">
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
                onClick={() => setReminderFilter(option.value as ReminderFilterMode)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {loading && <p className="text-sm text-textMuted">Carregando...</p>}
        {!loading && reminders.length === 0 && <p className="text-sm text-textMuted">Nenhum lembrete cadastrado.</p>}
        <div className="space-y-2">
          {reminders.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-textMain">{item.title}</p>
                  <p className="text-xs text-textMuted">
                    {item.startDate} {item.timeOfDay} | {formatRepeatType(item.repeatType)}
                  </p>
                </div>
                <span className={`rounded-md px-2 py-1 text-xs ${item.isActive ? "bg-success/20 text-success" : "bg-panel text-textMuted"}`}>
                  {item.isActive ? "Ativo" : "Inativo"}
                </span>
              </div>
              {item.description && <p className="mt-2 text-sm text-textMuted">{item.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-textMain" onClick={() => setForm({ ...item, weekdays: item.weekdays })}>
                  Editar
                </button>
                <button className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-textMain" onClick={() => toggleReminder(item)}>
                  {item.isActive ? "Desativar" : "Ativar"}
                </button>
                <button className="rounded-lg border border-danger/60 px-3 py-2 text-xs text-danger" onClick={() => deleteReminder(item.id)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-2xl border border-slate-700 bg-panel p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-display text-base text-textMain">Historico de ocorrencias</h4>
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
                onClick={() => setOccurrenceFilter(option.value as OccurrenceFilterMode)}
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
              <p className="mt-1 text-xs text-textMuted">Agendado para {new Date(item.scheduledFor).toLocaleString("pt-BR")}</p>
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
              {item.status === "pending" && (
                <button className="mt-2 rounded-lg bg-success px-3 py-2 text-xs font-semibold text-slate-900" onClick={() => completeOccurrence(item.id)}>
                  Concluir
                </button>
              )}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
};
