import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import { ReminderCollections } from "./reminders/ReminderCollections";
import { ReminderComposer } from "./reminders/ReminderComposer";
import { ReminderPendingList } from "./reminders/ReminderPendingList";
import {
  subscribeReminderDue,
  subscribeReminderUpdated,
  type IncomingReminderDue,
  type IncomingReminderUpdated
} from "../lib/reminderEvents";
import type { ReminderItem, ReminderOccurrenceItem } from "../types";
import {
  matchesOccurrenceFilter,
  matchesReminderFilter,
  REMINDER_EMPTY_FORM,
  sortReminders,
  type OccurrenceFilterMode,
  type ReminderFilterMode
} from "./reminders/reminderUi";

interface ReminderUserPanelProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

export const ReminderUserPanel = ({ onError, onToast }: ReminderUserPanelProps) => {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [occurrences, setOccurrences] = useState<ReminderOccurrenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [form, setForm] = useState(REMINDER_EMPTY_FORM);
  const [reminderFilter, setReminderFilter] = useState<ReminderFilterMode>("all");
  const [occurrenceFilter, setOccurrenceFilter] = useState<OccurrenceFilterMode>("all");
  const loadRequestIdRef = useRef(0);

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
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);
    try {
      const [remindersResponse, occurrencesResponse] = await Promise.all([
        api.myReminders(buildReminderQuery(reminderFilter)),
        api.myReminderOccurrences(buildOccurrenceQuery(occurrenceFilter))
      ]);
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

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
  }, [occurrenceFilter, onError, reminderFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
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
    };

    const unsubscribeDue = subscribeReminderDue(onReminderDue);
    const unsubscribeUpdated = subscribeReminderUpdated(onReminderUpdated);

    return () => {
      unsubscribeDue();
      unsubscribeUpdated();
    };
  }, [occurrenceFilter]);

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

      setForm(REMINDER_EMPTY_FORM);
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
      onToast("Lembrete arquivado");
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao arquivar lembrete");
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

  const pendingOccurrences = useMemo(
    () => occurrences.filter((item) => item.status === "pending").slice(0, 5),
    [occurrences]
  );

  return (
    <section className="space-y-6">
      <header className="rounded-[1.25rem] bg-panelAlt/80 p-6 shadow-glow">
        <h3 className="font-display text-3xl font-extrabold tracking-tight text-textMain">Lembretes</h3>
        <p className="mt-2 text-sm text-textMuted">Acompanhamento da sua rotina e dos lembretes ativos</p>
      </header>

      <article className="rounded-[1.25rem] bg-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Visao rapida</p>
            <h4 className="mt-1 font-display text-base text-textMain">Meus lembretes</h4>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-panelAlt px-3 py-1.5 text-textMain">{reminderStats.total} lembretes</span>
            <span className="rounded-full bg-accent/10 px-3 py-1.5 text-accent">{reminderStats.active} ativos</span>
            <span className="rounded-full bg-warning/20 px-3 py-1.5 text-warning">{occurrenceStats.pending} pendentes</span>
            <span className="rounded-full bg-success/20 px-3 py-1.5 text-success">{occurrenceStats.completed} concluidas</span>
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <div className="space-y-4">
          <ReminderPendingList
            pendingCount={occurrenceStats.pending}
            pendingOccurrences={pendingOccurrences}
            onCompleteOccurrence={completeOccurrence}
          />

          <ReminderComposer
            composerOpen={composerOpen}
            form={form}
            onFormChange={(updater) => setForm((current) => updater(current))}
            onReset={() => setForm(REMINDER_EMPTY_FORM)}
            onSave={() => void saveReminder()}
            onToggleComposer={() => setComposerOpen((current) => !current)}
          />
        </div>

        <div className="space-y-4">
          <ReminderCollections
            loading={loading}
            occurrenceFilter={occurrenceFilter}
            occurrences={occurrences}
            reminderFilter={reminderFilter}
            reminders={reminders}
            onCompleteOccurrence={completeOccurrence}
            onDeleteReminder={deleteReminder}
            onEditReminder={(item) => setForm({ ...item, weekdays: item.weekdays })}
            onOccurrenceFilterChange={setOccurrenceFilter}
            onReminderFilterChange={setReminderFilter}
            onToggleReminder={toggleReminder}
          />
        </div>
      </div>
    </section>
  );
};
