import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { ReminderColorKey, ReminderItem, ReminderNoteKind } from "../types";
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
} from "./reminders/reminderUi";

interface ReminderUserPanelProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

type ReminderViewMode = "grid" | "lista";
type ReminderTab = "todas" | "fixadas" | "alarme" | "checklist";
type NoteUiColor = "amarelo" | "azul" | "verde" | "rosa" | "branco";

type NotePalette = {
  bg: string;
  border: string;
  dot: string;
  text: string;
  muted: string;
  chipBg: string;
  chipText: string;
  buttonBg: string;
  buttonBorder: string;
};

type NoteUiStyle = {
  backend: ReminderColorKey;
  light: NotePalette;
  dark: NotePalette;
};

const NOTE_COLOR_STYLES: Record<NoteUiColor, NoteUiStyle> = {
  amarelo: {
    backend: "amber",
    light: {
      bg: "#FFFDE7",
      border: "#FFF176",
      dot: "#F9A825",
      text: "#4A3800",
      muted: "#715A18",
      chipBg: "rgba(74,56,0,0.08)",
      chipText: "#5F4A06",
      buttonBg: "rgba(255,255,255,0.6)",
      buttonBorder: "rgba(74,56,0,0.14)"
    },
    dark: {
      bg: "#312712",
      border: "#8A6B2F",
      dot: "#E9B949",
      text: "#FFF1BF",
      muted: "#E0CC91",
      chipBg: "rgba(255,241,191,0.1)",
      chipText: "#F5DEA0",
      buttonBg: "rgba(255,255,255,0.06)",
      buttonBorder: "rgba(255,255,255,0.12)"
    }
  },
  azul: {
    backend: "sky",
    light: {
      bg: "#E3F2FD",
      border: "#90CAF9",
      dot: "#1565C0",
      text: "#0D2B4E",
      muted: "#31567E",
      chipBg: "rgba(13,43,78,0.08)",
      chipText: "#17406E",
      buttonBg: "rgba(255,255,255,0.6)",
      buttonBorder: "rgba(13,43,78,0.14)"
    },
    dark: {
      bg: "#152638",
      border: "#4D7BAA",
      dot: "#58A6F4",
      text: "#E6F4FF",
      muted: "#B9D7F4",
      chipBg: "rgba(230,244,255,0.1)",
      chipText: "#C9E4FF",
      buttonBg: "rgba(255,255,255,0.06)",
      buttonBorder: "rgba(255,255,255,0.12)"
    }
  },
  verde: {
    backend: "emerald",
    light: {
      bg: "#E8F5E9",
      border: "#A5D6A7",
      dot: "#2E7D32",
      text: "#1B3A1F",
      muted: "#446448",
      chipBg: "rgba(27,58,31,0.08)",
      chipText: "#29592E",
      buttonBg: "rgba(255,255,255,0.6)",
      buttonBorder: "rgba(27,58,31,0.14)"
    },
    dark: {
      bg: "#1B2C1F",
      border: "#5E8E63",
      dot: "#6DCB74",
      text: "#E5F7E6",
      muted: "#B8D7BA",
      chipBg: "rgba(229,247,230,0.1)",
      chipText: "#D2EED4",
      buttonBg: "rgba(255,255,255,0.06)",
      buttonBorder: "rgba(255,255,255,0.12)"
    }
  },
  rosa: {
    backend: "rose",
    light: {
      bg: "#FCE4EC",
      border: "#F48FB1",
      dot: "#C2185B",
      text: "#4A0020",
      muted: "#793552",
      chipBg: "rgba(74,0,32,0.08)",
      chipText: "#71163F",
      buttonBg: "rgba(255,255,255,0.6)",
      buttonBorder: "rgba(74,0,32,0.14)"
    },
    dark: {
      bg: "#311723",
      border: "#9E4E6D",
      dot: "#ED5E9B",
      text: "#FFE4EF",
      muted: "#E5B8C8",
      chipBg: "rgba(255,228,239,0.1)",
      chipText: "#FFD2E4",
      buttonBg: "rgba(255,255,255,0.06)",
      buttonBorder: "rgba(255,255,255,0.12)"
    }
  },
  branco: {
    backend: "slate",
    light: {
      bg: "rgb(var(--color-panel) / 1)",
      border: "rgb(var(--color-outline-soft) / 1)",
      dot: "#9E9E9E",
      text: "rgb(var(--color-text-main) / 1)",
      muted: "rgb(var(--color-text-muted) / 1)",
      chipBg: "rgb(var(--color-panel-alt) / 1)",
      chipText: "rgb(var(--color-text-muted) / 1)",
      buttonBg: "rgb(var(--color-panel-alt) / 1)",
      buttonBorder: "rgb(var(--color-outline-soft) / 1)"
    },
    dark: {
      bg: "rgb(var(--color-panel) / 1)",
      border: "rgb(var(--color-outline-soft) / 1)",
      dot: "#A3A3A3",
      text: "rgb(var(--color-text-main) / 1)",
      muted: "rgb(var(--color-text-muted) / 1)",
      chipBg: "rgb(var(--color-panel-alt) / 1)",
      chipText: "rgb(var(--color-text-muted) / 1)",
      buttonBg: "rgb(var(--color-panel-alt) / 1)",
      buttonBorder: "rgb(var(--color-outline-soft) / 1)"
    }
  }
};

const NOTE_KIND_OPTIONS: Array<{ key: ReminderNoteKind; label: string }> = [
  { key: "note", label: "📝 Nota" },
  { key: "checklist", label: "☑ Checklist" },
  { key: "alarm", label: "⏰ Com alarme" }
];

const isDarkModeActive = () =>
  typeof document !== "undefined" && document.documentElement.classList.contains("dark");

const mapReminderColorToUi = (color: ReminderColorKey): NoteUiColor => {
  if (color === "amber") return "amarelo";
  if (color === "sky") return "azul";
  if (color === "emerald") return "verde";
  if (color === "rose") return "rosa";
  return "branco";
};

const mapUiColorToReminder = (color: NoteUiColor): ReminderColorKey => NOTE_COLOR_STYLES[color].backend;

const getNotePalette = (color: NoteUiColor, darkMode: boolean): NotePalette =>
  darkMode ? NOTE_COLOR_STYLES[color].dark : NOTE_COLOR_STYLES[color].light;

const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short"
  }).format(new Date(`${value}T12:00:00`));

const formatAlarmBadge = (item: ReminderItem) =>
  `${new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(`${item.startDate}T12:00:00`))} ${item.timeOfDay}`;

const parseDraftChecklistItems = (body: string): Array<{ checked: boolean; label: string }> =>
  body
    .split("\n")
    .map((line) => line.trimStart())
    .filter((line) => line.startsWith("- [ ] ") || line.startsWith("- [x] "))
    .map((line) => ({
      checked: line.startsWith("- [x] "),
      label: line.slice(6)
    }));

const stringifyDraftChecklistItems = (items: Array<{ checked: boolean; label: string }>) =>
  stringifyChecklistItems(
    items.map((item) => ({
      checked: item.checked,
      label: item.label
    }))
  );

const buildSearchableTags = (entry: ReminderViewModel) =>
  entry.meta.tag ? [entry.meta.tag] : [];

const getReminderDisplayBody = (entry: ReminderViewModel) =>
  entry.meta.noteKind === "checklist" ? "" : entry.body;

interface ReminderCardProps {
  darkMode: boolean;
  entry: ReminderViewModel;
  onEdit: (item: ReminderItem) => void;
  onPin: (item: ReminderItem) => void;
  onToggleChecklistItem: (item: ReminderItem, itemIndex: number) => void;
}

const ReminderCheckItem = ({
  checked,
  color,
  darkMode,
  label,
  onToggle
}: {
  checked: boolean;
  color: NoteUiColor;
  darkMode: boolean;
  label: string;
  onToggle: () => void;
}) => {
  const palette = getNotePalette(color, darkMode);

  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        marginTop: 5,
        cursor: "pointer"
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 3,
          flexShrink: 0,
          border: `1.5px solid ${checked ? palette.dot : palette.buttonBorder}`,
          background: checked ? palette.dot : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {checked ? <span style={{ fontSize: 9, fontWeight: 700, color: "#ffffff" }}>✓</span> : null}
      </div>
      <span
        style={{
          fontSize: 12,
          color: palette.text,
          opacity: checked ? 0.5 : 0.82,
          textDecoration: checked ? "line-through" : "none",
          lineHeight: 1.4
        }}
      >
        {label}
      </span>
    </div>
  );
};

const ReminderGridCard = ({
  darkMode,
  entry,
  onEdit,
  onPin,
  onToggleChecklistItem
}: ReminderCardProps) => {
  const [hovered, setHovered] = useState(false);
  const color = mapReminderColorToUi(entry.meta.color);
  const palette = getNotePalette(color, darkMode);
  const tags = buildSearchableTags(entry);
  const displayBody = getReminderDisplayBody(entry);

  return (
    <div
      onClick={() => onEdit(entry.item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 14,
        padding: "13px 13px 10px",
        position: "relative",
        transform: hovered ? "translateY(-3px) scale(1.01)" : "translateY(0) scale(1)",
        transition: "transform .18s ease",
        cursor: "pointer"
      }}
      tabIndex={0}
    >
      <button
        aria-label={entry.meta.pinned ? "Desafixar" : "Fixar"}
        onClick={(event) => {
          event.stopPropagation();
          onPin(entry.item);
        }}
        style={{
          position: "absolute",
          top: 8,
          right: 9,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          opacity: entry.meta.pinned ? 0.9 : hovered ? 0.45 : 0.18,
          transition: "opacity .15s",
          padding: 2
        }}
        title={entry.meta.pinned ? "Desafixar" : "Fixar"}
        type="button"
      >
        📌
      </button>

      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: palette.text,
          marginBottom: 4,
          lineHeight: 1.35,
          paddingRight: 18
        }}
      >
        {entry.item.title}
      </div>

      {displayBody ? (
        <div
          style={{
            fontSize: 12,
            color: palette.text,
            opacity: 0.78,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap"
          }}
        >
          {displayBody}
        </div>
      ) : null}

      {entry.checklistItems.length > 0 ? (
        <>
          {entry.checklistItems.map((item, index) => (
            <ReminderCheckItem
              checked={item.checked}
              color={color}
              darkMode={darkMode}
              key={`${entry.item.id}-task-${index}`}
              label={item.label}
              onToggle={() => onToggleChecklistItem(entry.item, index)}
            />
          ))}
          <div style={{ fontSize: 10, color: palette.muted, marginTop: 6 }}>
            {entry.checklistCompleted} de {entry.checklistTotal} feitos
          </div>
        </>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginTop: 10,
          flexWrap: "wrap"
        }}
      >
        {tags.map((tag) => (
          <span
            key={`${entry.item.id}-${tag}`}
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: "2px 7px",
              borderRadius: 10,
              background: palette.chipBg,
              color: palette.chipText
            }}
          >
            {tag}
          </span>
        ))}
        {entry.meta.noteKind === "alarm" ? (
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: "2px 7px",
              borderRadius: 10,
              background: palette.chipBg,
              color: palette.chipText
            }}
          >
            ⏰ {formatAlarmBadge(entry.item)}
          </span>
        ) : null}
        <span style={{ fontSize: 10, color: palette.muted, marginLeft: "auto" }}>
          {formatShortDate(entry.item.startDate)}
        </span>
      </div>
    </div>
  );
};

const ReminderListItem = ({
  darkMode,
  entry,
  onEdit,
  onPin
}: Pick<ReminderCardProps, "darkMode" | "entry" | "onEdit" | "onPin">) => {
  const [hovered, setHovered] = useState(false);
  const color = mapReminderColorToUi(entry.meta.color);
  const palette = getNotePalette(color, darkMode);
  const preview =
    getReminderDisplayBody(entry) || entry.checklistItems.map((item) => item.label).join(" · ") || "—";
  const tags = buildSearchableTags(entry);

  return (
    <div
      onClick={() => onEdit(entry.item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 14,
        background: hovered ? "rgb(var(--color-panel-alt) / 1)" : "transparent",
        transition: "background .12s",
        cursor: "pointer"
      }}
      tabIndex={0}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: palette.dot,
          flexShrink: 0,
          marginTop: 5
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
          {entry.meta.pinned ? <span style={{ fontSize: 11 }}>📌</span> : null}
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: "rgb(var(--color-text-main) / 1)"
            }}
          >
            {entry.item.title}
          </span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: "rgb(var(--color-text-muted) / 1)",
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}
        >
          {preview}
        </div>
        <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
          {tags.map((tag) => (
            <span
              key={`${entry.item.id}-${tag}`}
              style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 10,
                background: "rgb(var(--color-panel-alt) / 1)",
                color: "rgb(var(--color-text-muted) / 1)"
              }}
            >
              {tag}
            </span>
          ))}
          {entry.meta.noteKind === "alarm" ? (
            <span
              style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 10,
                background: palette.chipBg,
                color: palette.chipText
              }}
            >
              ⏰ {formatAlarmBadge(entry.item)}
            </span>
          ) : null}
          <button
            aria-label={entry.meta.pinned ? "Desafixar" : "Fixar"}
            onClick={(event) => {
              event.stopPropagation();
              onPin(entry.item);
            }}
            style={{
              marginLeft: "auto",
              fontSize: 11,
              border: "none",
              background: "none",
              padding: 0,
              color: "rgb(var(--color-text-muted) / 1)",
              cursor: "pointer"
            }}
            type="button"
          >
            📌
          </button>
        </div>
      </div>
      <div
        style={{
          fontSize: 10,
          color: "rgb(var(--color-text-muted) / 1)",
          flexShrink: 0,
          marginTop: 3
        }}
      >
        {formatShortDate(entry.item.startDate)}
      </div>
    </div>
  );
};

interface ReminderComposeInlineProps {
  darkMode: boolean;
  form: ReminderFormState;
  onArchive: () => void;
  onCancel: () => void;
  onFormChange: (patch: Partial<ReminderFormState>) => void;
  onSave: () => void;
}

const ReminderComposeInline = ({
  darkMode,
  form,
  onArchive,
  onCancel,
  onFormChange,
  onSave
}: ReminderComposeInlineProps) => {
  const uiColor = mapReminderColorToUi(form.color);
  const palette = getNotePalette(uiColor, darkMode);
  const focusChecklistInput = (position: number) => {
    window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLInputElement>(
        `[aria-label="Texto do item ${position}"]`
      );
      target?.focus();
    });
  };
  const checklistItems =
    form.noteKind === "checklist"
      ? (() => {
          const parsedItems = parseDraftChecklistItems(form.description);
          return parsedItems.length > 0 ? parsedItems : [{ checked: false, label: "" }];
        })()
      : [];

  const syncChecklistItems = (
    updater: (
      currentItems: Array<{ checked: boolean; label: string }>
    ) => Array<{ checked: boolean; label: string }>
  ) => {
    const currentItems = parseDraftChecklistItems(form.description);
    const nextItems = updater(currentItems.length > 0 ? currentItems : [{ checked: false, label: "" }]);
    onFormChange({
      description: stringifyDraftChecklistItems(nextItems)
    });
  };

  const insertChecklistItemAfter = (index: number, currentLabel: string) => {
    const currentItems = checklistItems.length > 0 ? checklistItems : [{ checked: false, label: "" }];
    const baseItems = currentItems.map((item, itemIndex) =>
      itemIndex === index
        ? {
            ...item,
            label: currentLabel
          }
        : item
    );
    const nextItems = [
      ...baseItems.slice(0, index + 1),
      { checked: false, label: "" },
      ...baseItems.slice(index + 1)
    ];

    onFormChange({
      description: stringifyDraftChecklistItems(nextItems)
    });
    focusChecklistInput(index + 2);
  };

  return (
    <div
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 14,
        overflow: "hidden",
        animation: "composeSlide .2s ease"
      }}
    >
      <style>{`@keyframes composeSlide { from { opacity:0; transform:translateY(-8px)} to { opacity:1; transform:translateY(0)} }`}</style>

      <div style={{ padding: "13px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          autoFocus
          onChange={(event) => onFormChange({ title: event.target.value })}
          placeholder="Título da nota…"
          style={{
            fontSize: 13,
            fontWeight: 500,
            border: "none",
            outline: "none",
            background: "transparent",
            color: palette.text,
            fontFamily: "inherit",
            width: "100%"
          }}
          value={form.title}
        />
        {form.noteKind === "checklist" ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8
            }}
          >
            {checklistItems.map((item, index) => (
              <div
                key={`checklist-draft-${index}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                <button
                  aria-label={`Checklist item ${index + 1}`}
                  onClick={() =>
                    syncChecklistItems((currentItems) =>
                      currentItems.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, checked: !entry.checked } : entry
                      )
                    )
                  }
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: `1px solid ${item.checked ? palette.dot : palette.buttonBorder}`,
                    background: item.checked ? palette.dot : "transparent",
                    color: "#ffffff",
                    fontSize: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0
                  }}
                  type="button"
                >
                  {item.checked ? "✓" : ""}
                </button>
                <input
                  aria-label={`Texto do item ${index + 1}`}
                  onChange={(event) =>
                    syncChecklistItems((currentItems) =>
                      currentItems.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, label: event.target.value } : entry
                      )
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" && item.label.length === 0 && checklistItems.length > 1) {
                      event.preventDefault();
                      syncChecklistItems((currentItems) =>
                        currentItems.filter((_, entryIndex) => entryIndex !== index)
                      );
                      return;
                    }

                    if (event.key === "Enter") {
                      event.preventDefault();
                      insertChecklistItemAfter(index, event.currentTarget.value);
                    }
                  }}
                  placeholder="Descreva o item"
                  style={{
                    fontSize: 12,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: palette.text,
                    fontFamily: "inherit",
                    width: "100%",
                    lineHeight: 1.5
                  }}
                  value={item.label}
                />
              </div>
            ))}
            <button
              onClick={() =>
                syncChecklistItems((currentItems) => [...currentItems, { checked: false, label: "" }])
              }
              style={{
                alignSelf: "flex-start",
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 12,
                border: `0.5px solid ${palette.buttonBorder}`,
                background: palette.buttonBg,
                color: palette.text,
                cursor: "pointer",
                fontFamily: "inherit"
              }}
              type="button"
            >
              Adicionar item
            </button>
          </div>
        ) : (
          <textarea
            onChange={(event) => onFormChange({ description: event.target.value })}
            placeholder="Escreva aqui…"
            rows={3}
            style={{
              fontSize: 12,
              border: "none",
              outline: "none",
              resize: "none",
              background: "transparent",
              color: palette.text,
              opacity: 0.8,
              fontFamily: "inherit",
              width: "100%",
              lineHeight: 1.5
            }}
            value={form.description}
          />
        )}

        {form.noteKind === "alarm" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              onChange={(event) => onFormChange({ startDate: event.target.value })}
              style={{
                fontSize: 12,
                border: `1px solid ${palette.border}`,
                borderRadius: 8,
                padding: "5px 10px",
                background: palette.buttonBg,
                color: palette.text,
                fontFamily: "inherit",
                outline: "none"
              }}
              type="date"
              value={form.startDate}
            />
            <input
              onChange={(event) => onFormChange({ timeOfDay: event.target.value })}
              style={{
                fontSize: 12,
                border: `1px solid ${palette.border}`,
                borderRadius: 8,
                padding: "5px 10px",
                background: palette.buttonBg,
                color: palette.text,
                fontFamily: "inherit",
                outline: "none"
              }}
              type="time"
              value={form.timeOfDay}
            />
          </div>
        ) : null}
      </div>

      <div
        style={{
          borderTop: `0.5px solid ${palette.border}`,
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap"
        }}
      >
        {NOTE_KIND_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => {
              const nextPatch: Partial<ReminderFormState> = {
                noteKind: option.key,
                ...buildQuickReminderDefaults(option.key)
              };

              if (option.key === "checklist") {
                const currentItems = parseDraftChecklistItems(form.description);
                nextPatch.description =
                  currentItems.length > 0
                    ? stringifyDraftChecklistItems(currentItems)
                    : stringifyDraftChecklistItems([{ checked: false, label: "" }]);
              }

              onFormChange(nextPatch);
            }}
            style={{
              fontSize: 11,
              padding: "3px 10px",
              borderRadius: 12,
              border: `0.5px solid ${form.noteKind === option.key ? palette.dot : palette.buttonBorder}`,
              background: form.noteKind === option.key ? palette.chipBg : palette.buttonBg,
              color: palette.text,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: form.noteKind === option.key ? 500 : 400
            }}
            type="button"
          >
            {option.label}
          </button>
        ))}

        <div style={{ display: "flex", gap: 5, alignItems: "center", marginLeft: 4 }}>
          {(Object.keys(NOTE_COLOR_STYLES) as NoteUiColor[]).map((color) => {
            const swatch = getNotePalette(color, darkMode);
            return (
              <button
                aria-label={`Cor ${color}`}
                key={color}
                onClick={() => onFormChange({ color: mapUiColorToReminder(color) })}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: swatch.dot,
                  border: `2px solid ${uiColor === color ? "rgb(var(--color-text-main) / 1)" : "transparent"}`,
                  cursor: "pointer",
                  transform: uiColor === color ? "scale(1.25)" : "scale(1)",
                  transition: "transform .12s"
                }}
                title={color}
                type="button"
              />
            );
          })}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {form.id ? (
            <button
              onClick={onArchive}
              style={{
                fontSize: 11,
                padding: "4px 12px",
                borderRadius: 12,
                border: `0.5px solid ${palette.buttonBorder}`,
                background: palette.buttonBg,
                color: palette.text,
                cursor: "pointer",
                fontFamily: "inherit"
              }}
              type="button"
            >
              Arquivar
            </button>
          ) : null}
          <button
            onClick={onCancel}
            style={{
              fontSize: 11,
              padding: "4px 12px",
              borderRadius: 12,
              border: `0.5px solid ${palette.buttonBorder}`,
              background: palette.buttonBg,
              color: palette.text,
              cursor: "pointer",
              fontFamily: "inherit"
            }}
            type="button"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: "4px 14px",
              borderRadius: 12,
              border: "none",
              background: palette.dot,
              color: "#ffffff",
              cursor: "pointer",
              fontFamily: "inherit",
              opacity: form.title.trim() ? 1 : 0.4,
              transition: "opacity .15s"
            }}
            type="button"
          >
            {form.id ? "Salvar" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
};

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
