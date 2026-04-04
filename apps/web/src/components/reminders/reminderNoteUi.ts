import type { ReminderColorKey, ReminderItem, ReminderNoteKind } from "../../types";
import { stringifyChecklistItems, type ReminderViewModel } from "./reminderUi";

export type NoteUiColor = "amarelo" | "azul" | "verde" | "rosa" | "branco";

export type NotePalette = {
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

export type DraftChecklistItem = {
  checked: boolean;
  label: string;
};

export const NOTE_COLOR_STYLES: Record<NoteUiColor, NoteUiStyle> = {
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

export const NOTE_KIND_OPTIONS: Array<{ key: ReminderNoteKind; label: string }> = [
  { key: "note", label: "📝 Nota" },
  { key: "checklist", label: "☑ Checklist" },
  { key: "alarm", label: "⏰ Com alarme" }
];

export const isDarkModeActive = () =>
  typeof document !== "undefined" && document.documentElement.classList.contains("dark");

export const mapReminderColorToUi = (color: ReminderColorKey): NoteUiColor => {
  if (color === "amber") return "amarelo";
  if (color === "sky") return "azul";
  if (color === "emerald") return "verde";
  if (color === "rose") return "rosa";
  return "branco";
};

export const mapUiColorToReminder = (color: NoteUiColor): ReminderColorKey =>
  NOTE_COLOR_STYLES[color].backend;

export const getNotePalette = (color: NoteUiColor, darkMode: boolean): NotePalette =>
  darkMode ? NOTE_COLOR_STYLES[color].dark : NOTE_COLOR_STYLES[color].light;

export const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short"
  }).format(new Date(`${value}T12:00:00`));

export const formatAlarmBadge = (item: ReminderItem) =>
  `${new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(`${item.startDate}T12:00:00`))} ${item.timeOfDay}`;

export const parseDraftChecklistItems = (body: string): DraftChecklistItem[] =>
  body
    .split("\n")
    .map((line) => line.trimStart())
    .filter((line) => line.startsWith("- [ ] ") || line.startsWith("- [x] "))
    .map((line) => ({
      checked: line.startsWith("- [x] "),
      label: line.slice(6)
    }));

export const stringifyDraftChecklistItems = (items: DraftChecklistItem[]) =>
  stringifyChecklistItems(
    items.map((item) => ({
      checked: item.checked,
      label: item.label
    }))
  );

export const buildSearchableTags = (entry: ReminderViewModel) => (entry.meta.tag ? [entry.meta.tag] : []);

export const getReminderDisplayBody = (entry: ReminderViewModel) =>
  entry.meta.noteKind === "checklist" ? "" : entry.body;
