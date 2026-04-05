import type Database from "better-sqlite3";
import { nowIso } from "../db";
import { normalizeReminderRow } from "./service";
import { toNullableString } from "./route-helpers";
import type { ReminderOccurrenceRow, ReminderRow } from "./types";

export const listUserReminders = (
  db: Database.Database,
  userId: number,
  active: string | null
) => {
  const conditions = ["user_id = ?", "deleted_at IS NULL"];
  const values: Array<number | string> = [userId];

  if (active === "true" || active === "false") {
    conditions.push("is_active = ?");
    values.push(active === "true" ? 1 : 0);
  }

  const reminders = db
    .prepare(
      `
        SELECT
          id,
          user_id AS userId,
          title,
          description,
          start_date AS startDate,
          time_of_day AS timeOfDay,
          timezone,
          repeat_type AS repeatType,
          weekdays_json AS weekdaysJson,
          checklist_json AS checklistJson,
          is_active AS isActive,
          note_kind AS noteKind,
          is_pinned AS isPinned,
          tag,
          color,
          last_scheduled_for AS lastScheduledFor,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM reminders
        WHERE ${conditions.join(" AND ")}
        ORDER BY is_active DESC, created_at DESC
      `
    )
    .all(...values) as ReminderRow[];

  return reminders.map(normalizeReminderRow);
};

export const archiveStaleUserReminders = (
  db: Database.Database,
  params: { userId: number; staleDays: number }
): number => {
  const cutoff = new Date(Date.now() - params.staleDays * 24 * 60 * 60 * 1000).toISOString();
  const timestamp = nowIso();

  const result = db
    .prepare(
      `
        UPDATE reminders
        SET
          deleted_at = ?,
          updated_at = ?
        WHERE user_id = ?
          AND deleted_at IS NULL
          AND is_active = 0
          AND updated_at <= ?
          AND NOT EXISTS (
            SELECT 1
            FROM reminder_occurrences o
            WHERE o.reminder_id = reminders.id
              AND o.status = 'pending'
          )
      `
    )
    .run(timestamp, timestamp, params.userId, cutoff);

  return result.changes;
};

export const fetchReminderById = (db: Database.Database, reminderId: number): ReminderRow =>
  db
    .prepare(
      `
        SELECT
          id,
          user_id AS userId,
          title,
          description,
          start_date AS startDate,
          time_of_day AS timeOfDay,
          timezone,
          repeat_type AS repeatType,
          weekdays_json AS weekdaysJson,
          checklist_json AS checklistJson,
          is_active AS isActive,
          note_kind AS noteKind,
          is_pinned AS isPinned,
          tag,
          color,
          last_scheduled_for AS lastScheduledFor,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM reminders
        WHERE id = ?
          AND deleted_at IS NULL
      `
    )
    .get(reminderId) as ReminderRow;

export const fetchOwnedReminderForUpdate = (
  db: Database.Database,
  params: { reminderId: number; userId: number }
) =>
  db
    .prepare(
      `
        SELECT
          title,
          description,
          start_date AS startDate,
          time_of_day AS timeOfDay,
          timezone,
          repeat_type AS repeatType,
          weekdays_json AS weekdaysJson,
          checklist_json AS checklistJson,
          note_kind AS noteKind,
          is_pinned AS isPinned,
          tag,
          color,
          last_scheduled_for AS lastScheduledFor
        FROM reminders
        WHERE id = ? AND user_id = ?
          AND deleted_at IS NULL
      `
    )
    .get(params.reminderId, params.userId) as {
    title: string;
    description: string;
    startDate: string;
    timeOfDay: string;
    timezone: string;
    repeatType: string;
    weekdaysJson: string;
    checklistJson: string;
    noteKind: "note" | "checklist" | "alarm";
    isPinned: number;
    tag: string;
    color: "slate" | "sky" | "amber" | "emerald" | "rose";
    lastScheduledFor: string | null;
  };

export const listUserReminderOccurrences = (
  db: Database.Database,
  userId: number,
  status: string | null,
  filter: string | null
) => {
  const conditions = ["o.user_id = ?"];
  const values: Array<number | string> = [userId];

  if (status) {
    conditions.push("o.status = ?");
    values.push(status);
  }

  if (filter === "today") {
    conditions.push("date(datetime(o.scheduled_for, 'localtime')) = date('now', 'localtime')");
  }

  return db
    .prepare(
      `
        SELECT
          o.id,
          o.reminder_id AS reminderId,
          o.user_id AS userId,
          o.scheduled_for AS scheduledFor,
          o.triggered_at AS triggeredAt,
          o.status,
          o.retry_count AS retryCount,
          o.next_retry_at AS nextRetryAt,
          o.completed_at AS completedAt,
          o.expired_at AS expiredAt,
          o.trigger_source AS triggerSource,
          o.created_at AS createdAt,
          o.updated_at AS updatedAt,
          r.title,
          r.description
        FROM reminder_occurrences o
        INNER JOIN reminders r ON r.id = o.reminder_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY o.scheduled_for DESC
        LIMIT 200
      `
    )
    .all(...values) as ReminderOccurrenceRow[];
};

export const parseOccurrenceListParams = (query: Record<string, unknown>) => ({
  status: toNullableString(query.status),
  filter: toNullableString(query.filter)
});
