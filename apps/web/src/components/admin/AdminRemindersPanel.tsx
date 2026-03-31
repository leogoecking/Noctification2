import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import type { ReminderItem } from "../../types";
import { ReminderComposer } from "../reminders/ReminderComposer";
import { ReminderQuickBoard } from "../reminders/ReminderQuickBoard";
import {
  buildQuickReminderDefaults,
  buildReminderMeta,
  parseChecklistItems,
  REMINDER_EMPTY_FORM,
  serializeReminderContent,
  sortReminders,
  stringifyChecklistItems,
  toReminderViewModel,
  type ReminderFormState,
  type ReminderViewModel
} from "../reminders/reminderUi";

interface AdminRemindersPanelProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

export const AdminRemindersPanel = ({ onError, onToast }: AdminRemindersPanelProps) => {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [form, setForm] = useState<ReminderFormState>({
    ...REMINDER_EMPTY_FORM,
    ...buildQuickReminderDefaults("note")
  });
  const loadRequestIdRef = useRef(0);
  const autoArchiveStartedRef = useRef(false);

  const loadData = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);
    try {
      const remindersResponse = await api.myReminders("");
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      setReminders(sortReminders(remindersResponse.reminders));
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
  }, [onError]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (autoArchiveStartedRef.current) {
      return;
    }

    autoArchiveStartedRef.current = true;

    void (async () => {
      try {
        const response = await api.archiveMyStaleReminders();
        if (response.archivedCount > 0) {
          onToast(`${response.archivedCount} notas antigas foram arquivadas automaticamente`);
          void loadData();
        }
      } catch (error) {
        onError(error instanceof ApiError ? error.message : "Falha ao arquivar notas antigas");
      }
    })();
  }, [loadData, onError, onToast]);

  const buildReminderPayload = useCallback(
    (currentForm: ReminderFormState) => ({
      title: currentForm.title,
      description: serializeReminderContent(
        buildReminderMeta({
          noteKind: currentForm.noteKind,
          pinned: currentForm.pinned,
          tag: currentForm.tag,
          color: currentForm.color
        }),
        currentForm.description
      ),
      startDate: currentForm.startDate,
      timeOfDay: currentForm.timeOfDay,
      timezone: currentForm.timezone,
      repeatType: currentForm.repeatType,
      weekdays: currentForm.weekdays,
      checklistItems:
        currentForm.noteKind === "checklist" ? parseChecklistItems(currentForm.description) : [],
      noteKind: currentForm.noteKind,
      isPinned: currentForm.pinned,
      tag: currentForm.tag,
      color: currentForm.color
    }),
    []
  );

  const resetComposer = useCallback(() => {
    setComposerOpen(false);
    setForm({
      ...REMINDER_EMPTY_FORM,
      ...buildQuickReminderDefaults("note")
    });
  }, []);

  const reminderLibrary = useMemo<ReminderViewModel[]>(
    () => sortReminders(reminders).map((item) => toReminderViewModel(item)),
    [reminders]
  );

  const updateReminderContent = useCallback(
    async (item: ReminderItem, description: string, overrides?: Partial<ReturnType<typeof buildReminderMeta>>) => {
      const currentView = toReminderViewModel(item);
      const payload = {
        title: item.title,
        description: serializeReminderContent(buildReminderMeta({ ...currentView.meta, ...overrides }), description),
        startDate: item.startDate,
        timeOfDay: item.timeOfDay,
        timezone: item.timezone,
        repeatType: item.repeatType,
        weekdays: item.weekdays,
        checklistItems:
          (overrides?.noteKind ?? currentView.meta.noteKind) === "checklist"
            ? parseChecklistItems(description)
            : [],
        noteKind: overrides?.noteKind ?? currentView.meta.noteKind,
        isPinned: overrides?.pinned ?? currentView.meta.pinned,
        tag: overrides?.tag ?? currentView.meta.tag,
        color: overrides?.color ?? currentView.meta.color
      };

      try {
        const response = await api.updateMyReminder(item.id, payload);
        if (response?.reminder) {
          setReminders((prev) =>
            sortReminders(prev.map((entry) => (entry.id === item.id ? response.reminder : entry)))
          );
        }
        return true;
      } catch (error) {
        onError(error instanceof ApiError ? error.message : "Falha ao atualizar lembrete");
        return false;
      }
    },
    [onError]
  );

  const togglePinnedReminder = useCallback(
    async (item: ReminderItem) => {
      const parsed = toReminderViewModel(item);
      const updated = await updateReminderContent(item, item.description, {
        pinned: !parsed.meta.pinned
      });
      if (updated) {
        onToast(parsed.meta.pinned ? "Nota desafixada" : "Nota fixada");
      }
    },
    [onToast, updateReminderContent]
  );

  const deleteReminder = useCallback(
    async (id: number) => {
      try {
        await api.deleteMyReminder(id);
        setReminders((prev) => prev.filter((item) => item.id !== id));
        onToast("Nota arquivada");
      } catch (error) {
        onError(error instanceof ApiError ? error.message : "Falha ao arquivar lembrete");
      }
    },
    [onError, onToast]
  );

  const sendReminderToBoard = useCallback(
    async (item: ReminderItem, body: string) => {
      try {
        await api.createMyOperationsBoardMessage({
          title: item.title,
          body: body || item.description
        });
        onToast("Nota enviada ao mural");
      } catch (error) {
        onError(error instanceof ApiError ? error.message : "Falha ao enviar lembrete ao mural");
      }
    },
    [onError, onToast]
  );

  const openReminderEditor = useCallback((item: ReminderItem) => {
    const parsed = toReminderViewModel(item);
    setForm({
      id: item.id,
      title: item.title,
      description:
        parsed.meta.noteKind === "checklist" && parsed.checklistItems.length > 0
          ? stringifyChecklistItems(parsed.checklistItems)
          : parsed.body,
      startDate: item.startDate,
      timeOfDay: item.timeOfDay,
      timezone: item.timezone,
      repeatType: item.repeatType,
      weekdays: item.weekdays,
      noteKind: parsed.meta.noteKind,
      pinned: parsed.meta.pinned,
      tag: parsed.meta.tag,
      color: parsed.meta.color
    });
    setComposerOpen(true);
  }, []);

  const saveReminder = async () => {
    if (!form.title.trim() || !form.startDate || !form.timeOfDay) {
      onError("Titulo, data e hora sao obrigatorios");
      return;
    }

    const payload = buildReminderPayload(form);

    try {
      if (form.id) {
        const response = await api.updateMyReminder(form.id, payload);
        if (response?.reminder) {
          setReminders((prev) =>
            sortReminders(prev.map((item) => (item.id === response.reminder.id ? response.reminder : item)))
          );
        }
        onToast("Nota atualizada");
      } else {
        const response = await api.createMyReminder(payload);
        if (response?.reminder) {
          setReminders((prev) => sortReminders([response.reminder, ...prev]));
        }
        onToast("Nota criada");
      }

      resetComposer();
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao salvar lembrete");
    }
  };

  return (
    <section className="space-y-6">
      <header className="rounded-[1.25rem] bg-panelAlt/80 p-6 shadow-glow">
        <h3 className="font-display text-3xl font-extrabold tracking-tight text-textMain">Lembretes</h3>
        <p className="mt-2 text-sm text-textMuted">Quadro pessoal para organizar seus lembretes sem sair do admin.</p>
      </header>

      {loading ? <p className="text-sm text-textMuted">Carregando lembretes...</p> : null}

      <ReminderQuickBoard
        reminders={reminderLibrary}
        onDeleteReminder={deleteReminder}
        onEditReminder={openReminderEditor}
        onSendToBoard={sendReminderToBoard}
        onToggleChecklistItem={(item, nextDescription) => void updateReminderContent(item, nextDescription)}
        onTogglePinnedReminder={togglePinnedReminder}
      />

      <ReminderComposer
        open={composerOpen}
        form={form}
        onClose={resetComposer}
        onFormChange={(updater) => setForm((current) => updater(current))}
        onReset={resetComposer}
        onSave={() => void saveReminder()}
      />

      <button
        aria-label="Novo lembrete admin"
        className="fixed bottom-6 right-6 z-40 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:brightness-110"
        onClick={() => {
          setForm({
            ...REMINDER_EMPTY_FORM,
            ...buildQuickReminderDefaults("note")
          });
          setComposerOpen(true);
        }}
        type="button"
      >
        + Novo lembrete
      </button>
    </section>
  );
};
