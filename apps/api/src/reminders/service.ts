import type Database from "better-sqlite3";
import { nowIso, sanitizeMetadata } from "../db";
import type {
  ReminderColorKey,
  ReminderChecklistItem,
  ReminderNoteKind,
  ReminderRepeatType,
  ReminderRow
} from "./types";

const WEEKDAY_VALUES = new Set([0, 1, 2, 3, 4, 5, 6]);

export const parseWeekdays = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && WEEKDAY_VALUES.has(item))
    )
  ).sort((a, b) => a - b);
};

export const stringifyWeekdays = (weekdays: number[]): string => JSON.stringify(weekdays);

export const parseReminderRepeatType = (value: unknown): ReminderRepeatType | null => {
  if (
    value === "none" ||
    value === "daily" ||
    value === "weekly" ||
    value === "monthly" ||
    value === "weekdays"
  ) {
    return value;
  }

  return null;
};

export const parseReminderNoteKind = (value: unknown): ReminderNoteKind | null => {
  if (value === "note" || value === "checklist" || value === "alarm") {
    return value;
  }

  return null;
};

export const parseReminderColor = (value: unknown): ReminderColorKey | null => {
  if (
    value === "slate" ||
    value === "sky" ||
    value === "amber" ||
    value === "emerald" ||
    value === "rose"
  ) {
    return value;
  }

  return null;
};

export const parseReminderChecklistItems = (value: unknown): ReminderChecklistItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const checked = "checked" in item && item.checked === true;
      const label = "label" in item && typeof item.label === "string" ? item.label.trim() : "";
      if (!label) {
        return null;
      }

      return { checked, label };
    })
    .filter((item): item is ReminderChecklistItem => item !== null);
};

export const stringifyReminderChecklistItems = (items: ReminderChecklistItem[]): string =>
  JSON.stringify(items);

export const isValidTimeOfDay = (value: string): boolean => /^\d{2}:\d{2}$/.test(value);

const safeParseWeekdaysJson = (value: string): number[] => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => Number(item)).filter((item) => Number.isInteger(item) && WEEKDAY_VALUES.has(item))
      : [];
  } catch {
    return [];
  }
};

const safeParseChecklistJson = (value: string): ReminderChecklistItem[] => {
  try {
    return parseReminderChecklistItems(JSON.parse(value));
  } catch {
    return [];
  }
};

const REMINDER_META_PREFIX = "::meta ";

const parseLegacyReminderMeta = (description: string): {
  noteKind?: ReminderNoteKind;
  pinned?: boolean;
  tag?: string;
  color?: ReminderColorKey;
  body: string;
} => {
  const [firstLine = "", ...restLines] = description.split("\n");
  if (!firstLine.startsWith(REMINDER_META_PREFIX)) {
    return { body: description };
  }

  const body = restLines.join("\n").trim();

  try {
    const parsed = JSON.parse(firstLine.slice(REMINDER_META_PREFIX.length)) as Record<string, unknown>;
    return {
      noteKind: parseReminderNoteKind(parsed.noteKind) ?? undefined,
      pinned: parsed.pinned === true,
      tag: typeof parsed.tag === "string" ? parsed.tag.trim() : undefined,
      color: parseReminderColor(parsed.color) ?? undefined,
      body
    };
  } catch {
    return { body };
  }
};

const parseLegacyChecklistItems = (description: string): ReminderChecklistItem[] =>
  description
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- [ ] ") || line.startsWith("- [x] "))
    .map((line) => ({
      checked: line.startsWith("- [x] "),
      label: line.slice(6).trim()
    }))
    .filter((item) => item.label.length > 0);

export const normalizeReminderRow = (row: ReminderRow) => {
  const legacyMeta = parseLegacyReminderMeta(row.description);
  const legacyNoteKind = legacyMeta.noteKind;
  const legacyColor = legacyMeta.color;
  const legacyTag = legacyMeta.tag;
  const hasLegacyMeta = row.description.startsWith(REMINDER_META_PREFIX);
  const checklistItems = safeParseChecklistJson(row.checklistJson);
  const legacyChecklistItems = checklistItems.length === 0 ? parseLegacyChecklistItems(legacyMeta.body) : [];

  return {
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    userLogin: row.userLogin,
    title: row.title,
    description: hasLegacyMeta ? legacyMeta.body : row.description,
    startDate: row.startDate,
    timeOfDay: row.timeOfDay,
    timezone: row.timezone,
    repeatType: row.repeatType,
    weekdays: safeParseWeekdaysJson(row.weekdaysJson),
    checklistItems: checklistItems.length > 0 ? checklistItems : legacyChecklistItems,
    isActive: row.isActive === 1,
    noteKind: row.noteKind === "note" && legacyNoteKind ? legacyNoteKind : row.noteKind,
    pinned: row.isPinned === 1 || legacyMeta.pinned === true,
    tag: row.tag.length > 0 ? row.tag : legacyTag ?? "",
    color: row.color === "slate" && legacyColor ? legacyColor : row.color,
    lastScheduledFor: row.lastScheduledFor,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
};

export const logReminderEvent = (
  db: Database.Database,
  params: {
    reminderId?: number;
    occurrenceId?: number;
    userId?: number;
    eventType: string;
    metadata?: Record<string, unknown>;
  }
) => {
  db.prepare(
    `
      INSERT INTO reminder_logs (
        reminder_id,
        occurrence_id,
        user_id,
        event_type,
        metadata_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(
    params.reminderId ?? null,
    params.occurrenceId ?? null,
    params.userId ?? null,
    params.eventType,
    sanitizeMetadata(params.metadata),
    nowIso()
  );
};
