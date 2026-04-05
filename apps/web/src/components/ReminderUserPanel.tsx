import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { ReminderItem, ReminderNoteKind } from "../types";
import { ReminderComposeInline } from "./reminders/ReminderComposeInline";
import { ReminderGridCard, ReminderListItem } from "./reminders/ReminderCards";
import { isDarkModeActive } from "./reminders/reminderNoteUi";
import {
  buildQuickReminderDefaults,
  buildReminderMeta,
  parseChecklistItems,
  REMINDER_EMPTY_FORM,
  serializeReminderContent,
  sortReminders,
  stringifyChecklistItems,
  toReminderViewModel,
  type ReminderFormState
} from "./reminders/reminderUi";

interface ReminderUserPanelProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

type ReminderViewMode = "grid" | "lista";
type ReminderTab = "todas" | "fixadas" | "alarme" | "checklist";
export const ReminderUserPanel = ({ onError, onToast }: ReminderUserPanelProps) => {
  const [darkMode, setDarkMode] = useState(isDarkModeActive);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [mode, setMode] = useState<ReminderViewMode>("grid");
  const [tab, setTab] = useState<ReminderTab>("todas");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ReminderFormState>({
    ...REMINDER_EMPTY_FORM,
    ...buildQuickReminderDefaults("note")
  });
  const loadRequestIdRef = useRef(0);
  const autoArchiveStartedRef = useRef(false);

  useEffect(() => {
    setDarkMode(isDarkModeActive());

    if (typeof MutationObserver === "undefined") {
      return;
    }

    const observer = new MutationObserver(() => {
      setDarkMode(isDarkModeActive());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });

    return () => observer.disconnect();
  }, []);

  const resetForm = useCallback((kind: ReminderNoteKind = "note") => {
    setForm({
      ...REMINDER_EMPTY_FORM,
      ...buildQuickReminderDefaults(kind),
      noteKind: kind
    });
  }, []);

  const closeComposer = useCallback(() => {
    setComposerOpen(false);
    resetForm();
  }, [resetForm]);

  const loadData = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);

    try {
      const response = await api.myReminders("");
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      setReminders(sortReminders(response.reminders));
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

  const reminderViews = useMemo(
    () => sortReminders(reminders).map((item) => toReminderViewModel(item)),
    [reminders]
  );

  const buildPayload = useCallback(
    (currentForm: ReminderFormState) => ({
      title: currentForm.title.trim(),
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

  const saveReminder = async () => {
    if (!form.title.trim()) {
      onError("Titulo e obrigatorio");
      return;
    }

    if (form.noteKind === "checklist" && parseChecklistItems(form.description).length === 0) {
      onError("Adicione ao menos um item no checklist");
      return;
    }

    if (!form.startDate || !form.timeOfDay) {
      onError("Data e hora sao obrigatorias");
      return;
    }

    const payload = buildPayload(form);

    try {
      if (form.id) {
        const response = await api.updateMyReminder(form.id, payload);
        if (response && "reminder" in response && response.reminder) {
          setReminders((prev) =>
            sortReminders(prev.map((item) => (item.id === response.reminder.id ? response.reminder : item)))
          );
        }
        onToast("Nota atualizada");
      } else {
        const response = await api.createMyReminder(payload);
        if (response && "reminder" in response && response.reminder) {
          setReminders((prev) => sortReminders([response.reminder, ...prev]));
        }
        onToast("Nota criada");
      }

      closeComposer();
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao salvar lembrete");
    }
  };

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
        if (response && "reminder" in response && response.reminder) {
          setReminders((prev) =>
            sortReminders(prev.map((entry) => (entry.id === item.id ? response.reminder : entry)))
          );
        }
        return true;
      } catch (error) {
        onError(error instanceof ApiError ? error.message : "Falha ao atualizar nota");
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

  const toggleChecklistItem = useCallback(
    async (item: ReminderItem, itemIndex: number) => {
      const parsed = toReminderViewModel(item);
      const nextChecklistItems = parsed.checklistItems.map((entry, index) =>
        index === itemIndex
          ? {
              ...entry,
              checked: !entry.checked
            }
          : entry
      );
      const nextDescription = stringifyChecklistItems(nextChecklistItems);
      const updated = await updateReminderContent(item, nextDescription);
      if (updated) {
        onToast("Checklist atualizada");
      }
    },
    [onToast, updateReminderContent]
  );

  const archiveReminder = useCallback(
    async (id: number) => {
      try {
        await api.deleteMyReminder(id);
        setReminders((prev) => prev.filter((item) => item.id !== id));
        onToast("Nota arquivada");
        closeComposer();
      } catch (error) {
        onError(error instanceof ApiError ? error.message : "Falha ao arquivar lembrete");
      }
    },
    [closeComposer, onError, onToast]
  );

  const openEditor = useCallback((item: ReminderItem) => {
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

  const filteredReminders = useMemo(() => {
    const sorted = [...reminderViews].sort((left, right) => {
      if (left.meta.pinned !== right.meta.pinned) {
        return left.meta.pinned ? -1 : 1;
      }

      return right.item.createdAt.localeCompare(left.item.createdAt);
    });

    return sorted.filter((entry) => {
      if (tab === "fixadas" && !entry.meta.pinned) {
        return false;
      }
      if (tab === "alarme" && entry.meta.noteKind !== "alarm") {
        return false;
      }
      if (tab === "checklist" && entry.meta.noteKind !== "checklist") {
        return false;
      }

      if (!search.trim()) {
        return true;
      }

      const query = search.trim().toLowerCase();
      return entry.searchableText.includes(query);
    });
  }, [reminderViews, search, tab]);

  const totalPinned = useMemo(
    () => reminderViews.filter((entry) => entry.meta.pinned).length,
    [reminderViews]
  );
  const totalAlarms = useMemo(
    () => reminderViews.filter((entry) => entry.meta.noteKind === "alarm").length,
    [reminderViews]
  );
  const totalChecklist = useMemo(
    () => reminderViews.filter((entry) => entry.meta.noteKind === "checklist").length,
    [reminderViews]
  );

  const tabs: Array<{ key: ReminderTab; label: string }> = [
    { key: "todas", label: `Todas · ${reminderViews.length}` },
    { key: "fixadas", label: `📌 Fixadas · ${totalPinned}` },
    { key: "alarme", label: `⏰ Alarme · ${totalAlarms}` },
    { key: "checklist", label: `☑ Listas · ${totalChecklist}` }
  ];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14, padding: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>📒</span>
          <span className="font-display text-base text-textMain">Meus lembretes</span>
        </div>

        <div
          style={{
            display: "flex",
            border: "0.5px solid rgb(var(--color-outline-soft) / 1)",
            borderRadius: 8,
            overflow: "hidden"
          }}
        >
          {[
            ["grid", "⊞ Grade"],
            ["lista", "≡ Lista"]
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setMode(value as ReminderViewMode)}
              style={{
                padding: "5px 12px",
                fontSize: 12,
                cursor: "pointer",
                border: "none",
                fontFamily: "inherit",
                background:
                  mode === value ? "rgb(var(--color-panel-alt) / 1)" : "transparent",
                color:
                  mode === value
                    ? "rgb(var(--color-text-main) / 1)"
                    : "rgb(var(--color-text-muted) / 1)",
                fontWeight: mode === value ? 500 : 400,
                transition: "background .12s"
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar anotações…"
          style={{
            flex: 1,
            minWidth: 220,
            padding: "7px 14px",
            borderRadius: 20,
            border: "0.5px solid rgb(var(--color-outline-soft) / 1)",
            background: "rgb(var(--color-panel-alt) / 1)",
            color: "rgb(var(--color-text-main) / 1)",
            fontSize: 12,
            fontFamily: "inherit",
            outline: "none"
          }}
          value={search}
        />
        <button
          onClick={() => {
            if (composerOpen) {
              closeComposer();
              return;
            }

            resetForm();
            setComposerOpen(true);
          }}
          style={{
            padding: "7px 18px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 500,
            border: composerOpen ? "0.5px solid rgb(var(--color-outline-soft) / 1)" : "none",
            background: composerOpen
              ? "rgb(var(--color-panel-alt) / 1)"
              : "rgb(var(--color-text-main) / 1)",
            color: composerOpen
              ? "rgb(var(--color-text-main) / 1)"
              : "rgb(var(--color-canvas) / 1)",
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap"
          }}
          type="button"
        >
          {composerOpen ? "× Fechar" : "+ Nova nota"}
        </button>
      </div>

      {composerOpen ? (
        <ReminderComposeInline
          darkMode={darkMode}
          form={form}
          onArchive={() => void archiveReminder(form.id)}
          onCancel={closeComposer}
          onFormChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          onSave={() => void saveReminder()}
        />
      ) : null}

      <div
        style={{
          display: "flex",
          borderBottom: "0.5px solid rgb(var(--color-outline-soft) / 1)",
          gap: 0,
          overflowX: "auto"
        }}
      >
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            style={{
              padding: "8px 14px",
              fontSize: 12,
              cursor: "pointer",
              border: "none",
              background: "none",
              fontFamily: "inherit",
              color:
                tab === item.key
                  ? "rgb(var(--color-text-main) / 1)"
                  : "rgb(var(--color-text-muted) / 1)",
              fontWeight: tab === item.key ? 500 : 400,
              borderBottom:
                tab === item.key
                  ? "2px solid rgb(var(--color-text-main) / 1)"
                  : "2px solid transparent",
              whiteSpace: "nowrap",
              transition: "color .12s"
            }}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-textMuted">Carregando lembretes...</p> : null}

      {!loading && filteredReminders.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 0",
            color: "rgb(var(--color-text-muted) / 1)",
            fontSize: 13
          }}
        >
          {search.trim()
            ? `Nenhuma nota encontrada para "${search}".`
            : "Nenhuma nota nessa categoria ainda."}
        </div>
      ) : mode === "grid" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 10
          }}
        >
          {filteredReminders.map((entry) => (
            <ReminderGridCard
              darkMode={darkMode}
              entry={entry}
              key={entry.item.id}
              onEdit={openEditor}
              onPin={(item) => void togglePinnedReminder(item)}
              onToggleChecklistItem={(item, itemIndex) => void toggleChecklistItem(item, itemIndex)}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {filteredReminders.map((entry) => (
            <ReminderListItem
              darkMode={darkMode}
              entry={entry}
              key={entry.item.id}
              onEdit={openEditor}
              onPin={(item) => void togglePinnedReminder(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
};
