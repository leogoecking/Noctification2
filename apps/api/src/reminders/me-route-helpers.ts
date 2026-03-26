import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import { logAudit, nowIso } from "../db";
import { emitReminderUpdated } from "../socket";
import { logReminderEvent, normalizeReminderRow } from "./service";
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
          is_active AS isActive,
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
          is_active AS isActive,
          last_scheduled_for AS lastScheduledFor,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM reminders
        WHERE id = ?
          AND deleted_at IS NULL
      `
    )
    .get(reminderId) as ReminderRow;

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

export const toggleUserReminder = (
  db: Database.Database,
  params: {
    reminderId: number;
    userId: number;
    rawIsActive: unknown;
  }
): { ok: true } | { error: string; status: number } => {
  if (typeof params.rawIsActive !== "boolean") {
    return { error: "is_active deve ser boolean", status: 400 };
  }

  const result = db
    .prepare(
      `
        UPDATE reminders
        SET is_active = ?, updated_at = ?
        WHERE id = ?
          AND user_id = ?
          AND deleted_at IS NULL
      `
    )
    .run(params.rawIsActive ? 1 : 0, nowIso(), params.reminderId, params.userId);

  if (result.changes === 0) {
    return { error: "Lembrete nao encontrado", status: 404 };
  }

  logReminderEvent(db, {
    reminderId: params.reminderId,
    userId: params.userId,
    eventType: params.rawIsActive ? "reminder.activated" : "reminder.deactivated"
  });

  return { ok: true };
};

export const deleteUserReminder = (
  db: Database.Database,
  io: Server,
  params: {
    reminderId: number;
    userId: number;
  }
): { deleted: true } | { error: string; status: number } => {
  const pendingOccurrences = db
    .prepare(
      `
        SELECT id, retry_count AS retryCount
        FROM reminder_occurrences
        WHERE reminder_id = ?
          AND user_id = ?
          AND status = 'pending'
      `
    )
    .all(params.reminderId, params.userId) as Array<{ id: number; retryCount: number }>;

  const timestamp = nowIso();
  const result = db
    .prepare(
      `
        UPDATE reminders
        SET
          is_active = 0,
          deleted_at = ?,
          updated_at = ?
        WHERE id = ?
          AND user_id = ?
          AND deleted_at IS NULL
      `
    )
    .run(timestamp, timestamp, params.reminderId, params.userId);

  if (result.changes === 0) {
    return { error: "Lembrete nao encontrado", status: 404 };
  }

  db.prepare(
    `
      UPDATE reminder_occurrences
      SET
        status = 'cancelled',
        next_retry_at = NULL,
        updated_at = ?
      WHERE reminder_id = ?
        AND user_id = ?
        AND status = 'pending'
    `
  ).run(timestamp, params.reminderId, params.userId);

  for (const occurrence of pendingOccurrences) {
    logReminderEvent(db, {
      reminderId: params.reminderId,
      occurrenceId: occurrence.id,
      userId: params.userId,
      eventType: "reminder.occurrence.cancelled",
      metadata: {
        reason: "reminder_deleted",
        retryCount: occurrence.retryCount
      }
    });

    emitReminderUpdated(io, {
      occurrenceId: occurrence.id,
      reminderId: params.reminderId,
      userId: params.userId,
      status: "cancelled",
      retryCount: occurrence.retryCount
    });
  }

  logReminderEvent(db, {
    reminderId: params.reminderId,
    userId: params.userId,
    eventType: "reminder.deleted"
  });

  return { deleted: true };
};

export const completeUserReminderOccurrence = (
  db: Database.Database,
  io: Server,
  params: {
    occurrenceId: number;
    userId: number;
  }
): { ok: true; completedAt: string } | { error: string; status: number } => {
  const timestamp = nowIso();
  const result = db
    .prepare(
      `
        UPDATE reminder_occurrences
        SET
          status = 'completed',
          completed_at = ?,
          updated_at = ?
        WHERE id = ?
          AND user_id = ?
          AND status = 'pending'
      `
    )
    .run(timestamp, timestamp, params.occurrenceId, params.userId);

  if (result.changes === 0) {
    return { error: "Ocorrencia nao encontrada ou ja concluida", status: 404 };
  }

  const occurrence = db
    .prepare(
      `
        SELECT reminder_id AS reminderId, retry_count AS retryCount
        FROM reminder_occurrences
        WHERE id = ?
      `
    )
    .get(params.occurrenceId) as { reminderId: number; retryCount: number };

  logReminderEvent(db, {
    reminderId: occurrence.reminderId,
    occurrenceId: params.occurrenceId,
    userId: params.userId,
    eventType: "reminder.occurrence.completed"
  });

  logAudit(db, {
    actorUserId: params.userId,
    eventType: "reminder.occurrence.completed",
    targetType: "reminder_occurrence",
    targetId: params.occurrenceId
  });

  emitReminderUpdated(io, {
    occurrenceId: params.occurrenceId,
    reminderId: occurrence.reminderId,
    userId: params.userId,
    status: "completed",
    retryCount: occurrence.retryCount,
    completedAt: timestamp
  });

  return { ok: true, completedAt: timestamp };
};

export const parseOccurrenceListParams = (query: Record<string, unknown>) => ({
  status: toNullableString(query.status),
  filter: toNullableString(query.filter)
});
