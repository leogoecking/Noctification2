import type Database from "better-sqlite3";
import { nowIso, sanitizeMetadata } from "../db";
import type { ReminderRepeatType, ReminderRow } from "./types";

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

export const isValidTimeOfDay = (value: string): boolean => /^\d{2}:\d{2}$/.test(value);

export const normalizeReminderRow = (row: ReminderRow) => ({
  id: row.id,
  userId: row.userId,
  userName: row.userName,
  userLogin: row.userLogin,
  title: row.title,
  description: row.description,
  startDate: row.startDate,
  timeOfDay: row.timeOfDay,
  timezone: row.timezone,
  repeatType: row.repeatType,
  weekdays: JSON.parse(row.weekdaysJson) as number[],
  isActive: row.isActive === 1,
  lastScheduledFor: row.lastScheduledFor,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

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
