import type {
  ReminderColorKey,
  ReminderChecklistItem,
  ReminderItem,
  ReminderNoteKind,
  ReminderOccurrenceItem,
  ReminderRepeatType
} from "../../types";

export type ReminderFilterMode = "all" | "active" | "inactive";
export type OccurrenceFilterMode = "all" | "today" | ReminderOccurrenceItem["status"];

export interface ReminderFormState {
  id: number;
  title: string;
  description: string;
  startDate: string;
  timeOfDay: string;
  timezone: string;
  repeatType: ReminderRepeatType;
  weekdays: number[];
  noteKind: ReminderNoteKind;
  pinned: boolean;
  tag: string;
  color: ReminderColorKey;
}

export interface ReminderMeta {
  noteKind: ReminderNoteKind;
  pinned: boolean;
  tag: string;
  color: ReminderColorKey;
}

export interface ReminderViewModel {
  item: ReminderItem;
  meta: ReminderMeta;
  body: string;
  checklistItems: ReminderChecklistItem[];
  checklistCompleted: number;
  checklistTotal: number;
  searchableText: string;
}

export const REMINDER_FILTER_LABELS: Record<ReminderFilterMode, string> = {
  all: "Todos",
  active: "Ativos",
  inactive: "Inativos"
};

export const OCCURRENCE_FILTER_LABELS: Record<OccurrenceFilterMode, string> = {
  all: "Todas",
  today: "Hoje",
  pending: "Pendentes",
  completed: "Concluidas",
  expired: "Expiradas",
  cancelled: "Canceladas"
};

export const REMINDER_EMPTY_FORM: ReminderFormState = {
  id: 0,
  title: "",
  description: "",
  startDate: "",
  timeOfDay: "",
  timezone: "America/Bahia",
  repeatType: "none" as ReminderRepeatType,
  weekdays: [] as number[],
  noteKind: "note",
  pinned: false,
  tag: "",
  color: "slate"
};

export const REMINDER_WEEKDAY_LABELS = [
  { short: "Dom", full: "domingo", value: 0 },
  { short: "Seg", full: "segunda", value: 1 },
  { short: "Ter", full: "terca", value: 2 },
  { short: "Qua", full: "quarta", value: 3 },
  { short: "Qui", full: "quinta", value: 4 },
  { short: "Sex", full: "sexta", value: 5 },
  { short: "Sab", full: "sabado", value: 6 }
] as const;

export const matchesReminderFilter = (item: ReminderItem, filter: ReminderFilterMode): boolean => {
  if (filter === "active") {
    return item.isActive;
  }

  if (filter === "inactive") {
    return !item.isActive;
  }

  return true;
};

const REMINDER_META_PREFIX = "::meta ";

const normalizeReminderColor = (value: unknown): ReminderColorKey =>
  value === "sky" || value === "amber" || value === "emerald" || value === "rose" ? value : "slate";

const normalizeReminderKind = (value: unknown): ReminderNoteKind =>
  value === "checklist" || value === "alarm" ? value : "note";

export const buildReminderMeta = (partial?: Partial<ReminderMeta>): ReminderMeta => ({
  noteKind: normalizeReminderKind(partial?.noteKind),
  pinned: partial?.pinned === true,
  tag: typeof partial?.tag === "string" ? partial.tag.trim() : "",
  color: normalizeReminderColor(partial?.color)
});

export const parseReminderContent = (
  item: Pick<
    ReminderItem,
    "description" | "repeatType" | "noteKind" | "pinned" | "tag" | "color" | "checklistItems"
  >
): {
  meta: ReminderMeta;
  body: string;
  checklistItems: ReminderChecklistItem[];
} => {
  const [firstLine = "", ...restLines] = item.description.split("\n");
  let meta = buildReminderMeta({
    noteKind: item.noteKind ?? (item.repeatType !== "none" ? "alarm" : "note"),
    pinned: item.pinned,
    tag: item.tag,
    color: item.color
  });
  let body = item.description;

  if (firstLine.startsWith(REMINDER_META_PREFIX)) {
    body = restLines.join("\n").trim();
    try {
      const parsed = JSON.parse(firstLine.slice(REMINDER_META_PREFIX.length)) as Partial<ReminderMeta>;
      meta = buildReminderMeta({
        noteKind: item.noteKind === undefined || item.noteKind === "note" ? parsed.noteKind : item.noteKind,
        pinned: item.pinned === true ? true : parsed.pinned,
        tag: item.tag && item.tag.length > 0 ? item.tag : parsed.tag,
        color: item.color && item.color !== "slate" ? item.color : parsed.color
      });
    } catch {
      meta = buildReminderMeta({
        noteKind: item.noteKind ?? (item.repeatType !== "none" ? "alarm" : "note"),
        pinned: item.pinned,
        tag: item.tag,
        color: item.color
      });
    }
  }

  const checklistItems =
    item.checklistItems && item.checklistItems.length > 0 ? item.checklistItems : parseChecklistItems(body);
  if (meta.noteKind === "note" && checklistItems.length > 0) {
    meta = { ...meta, noteKind: "checklist" };
  }

  return {
    meta,
    body,
    checklistItems
  };
};

export const serializeReminderContent = (meta: ReminderMeta, body: string): string => {
  void meta;
  return body.trim();
};

export const parseChecklistItems = (body: string): ReminderChecklistItem[] =>
  body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- [ ] ") || line.startsWith("- [x] "))
    .map((line) => ({
      checked: line.startsWith("- [x] "),
      label: line.slice(6).trim()
    }))
    .filter((item) => item.label.length > 0);

export const stringifyChecklistItems = (items: ReminderChecklistItem[]): string =>
  items.map((item) => `- [${item.checked ? "x" : " "}] ${item.label}`).join("\n");

export const toggleChecklistLine = (body: string, index: number): string => {
  let checklistIndex = -1;
  return body
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("- [ ] ") && !trimmed.startsWith("- [x] ")) {
        return line;
      }

      checklistIndex += 1;
      if (checklistIndex !== index) {
        return line;
      }

      const nextPrefix = trimmed.startsWith("- [x] ") ? "- [ ] " : "- [x] ";
      return `${nextPrefix}${trimmed.slice(6).trim()}`;
    })
    .join("\n");
};

export const toReminderViewModel = (item: ReminderItem): ReminderViewModel => {
  const { meta, body, checklistItems } = parseReminderContent(item);
  const effectiveChecklistItems = meta.noteKind === "checklist" ? checklistItems : [];

  return {
    item,
    meta,
    body,
    checklistItems: effectiveChecklistItems,
    checklistCompleted: effectiveChecklistItems.filter((entry) => entry.checked).length,
    checklistTotal: effectiveChecklistItems.length,
    searchableText: [
      item.title,
      body,
      effectiveChecklistItems.map((entry) => entry.label).join(" "),
      meta.tag,
      meta.noteKind === "alarm" ? "alarme" : meta.noteKind === "checklist" ? "lista checklist" : "nota",
      item.repeatType,
      item.isActive ? "ativo" : "inativo"
    ]
      .join(" ")
      .toLowerCase()
  };
};

export const REMINDER_COLOR_STYLES: Record<
  ReminderColorKey,
  { accent: string; chip: string; swatch: string; soft: string }
> = {
  slate: {
    accent: "border-l-outlineSoft",
    chip: "bg-panel text-textMuted",
    swatch: "bg-slate-400",
    soft: "bg-panelAlt/80"
  },
  sky: {
    accent: "border-l-sky-400",
    chip: "bg-sky-500/15 text-sky-300",
    swatch: "bg-sky-400",
    soft: "bg-sky-500/10"
  },
  amber: {
    accent: "border-l-warning",
    chip: "bg-warning/20 text-warning",
    swatch: "bg-amber-400",
    soft: "bg-warning/10"
  },
  emerald: {
    accent: "border-l-success",
    chip: "bg-success/20 text-success",
    swatch: "bg-emerald-400",
    soft: "bg-success/10"
  },
  rose: {
    accent: "border-l-danger",
    chip: "bg-danger/20 text-danger",
    swatch: "bg-rose-400",
    soft: "bg-danger/10"
  }
};

export const getReminderKindLabel = (kind: ReminderNoteKind, pinned: boolean): string => {
  if (pinned) {
    return "Fixada";
  }

  if (kind === "checklist") {
    return "Checklist";
  }

  if (kind === "alarm") {
    return "Alarme";
  }

  return "Nota";
};

export const buildQuickReminderDefaults = (
  nextKind: ReminderNoteKind,
  currentDate = new Date()
): Pick<ReminderFormState, "repeatType" | "startDate" | "timeOfDay" | "weekdays"> => {
  const pad = (value: number) => String(value).padStart(2, "0");
  const startDate = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`;
  const timeOfDay = `${pad(currentDate.getHours())}:${pad(currentDate.getMinutes())}`;

  if (nextKind === "alarm") {
    return {
      repeatType: "daily",
      startDate,
      timeOfDay,
      weekdays: []
    };
  }

  return {
    repeatType: "none",
    startDate,
    timeOfDay,
    weekdays: []
  };
};

export const sortReminders = (items: ReminderItem[]): ReminderItem[] =>
  [...items].sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });

export const matchesOccurrenceFilter = (
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

export const formatOccurrenceStatus = (status: ReminderOccurrenceItem["status"]) => {
  if (status === "pending") return "Pendente";
  if (status === "completed") return "Concluida";
  if (status === "expired") return "Expirada";
  return "Cancelada";
};

export const formatRepeatType = (repeatType: ReminderRepeatType) => {
  if (repeatType === "none") return "Sem repeticao";
  if (repeatType === "daily") return "Diaria";
  if (repeatType === "weekly") return "Semanal";
  if (repeatType === "monthly") return "Mensal";
  return "Dias uteis";
};

export const formatReminderSummary = (
  item: Pick<ReminderItem, "repeatType" | "weekdays" | "timeOfDay">
) => {
  if (item.repeatType === "none") {
    return `Uma vez as ${item.timeOfDay}`;
  }

  if (item.repeatType === "daily") {
    return `Todos os dias as ${item.timeOfDay}`;
  }

  if (item.repeatType === "monthly") {
    return `Todo mes as ${item.timeOfDay}`;
  }

  if (item.repeatType === "weekdays") {
    return `Dias uteis as ${item.timeOfDay}`;
  }

  const days = REMINDER_WEEKDAY_LABELS.filter((day) => item.weekdays.includes(day.value)).map((day) => day.full);
  return days.length > 0 ? `${days.join(", ")} as ${item.timeOfDay}` : `Semanal as ${item.timeOfDay}`;
};
