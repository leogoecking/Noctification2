import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import { logAudit, nowIso } from "../db";
import { emitReminderUpdated } from "../socket";
import { logReminderEvent } from "./service";
import { fetchReminderById } from "./me-route-queries";

export const createUserReminder = (
  db: Database.Database,
  params: {
    userId: number;
    title: string;
    description: string;
    startDate: string;
    timeOfDay: string;
    timezone: string;
    repeatType: string;
    weekdaysJson: string;
    checklistJson: string;
    noteKind: "note" | "checklist" | "alarm";
    isPinned: boolean;
    tag: string;
    color: "slate" | "sky" | "amber" | "emerald" | "rose";
    createdAt: string;
  }
) => {
  const result = db
    .prepare(
      `
        INSERT INTO reminders (
          user_id,
          title,
          description,
          start_date,
          time_of_day,
          timezone,
          repeat_type,
          weekdays_json,
          checklist_json,
          is_active,
          note_kind,
          is_pinned,
          tag,
          color,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      params.userId,
      params.title,
      params.description,
      params.startDate,
      params.timeOfDay,
      params.timezone,
      params.repeatType,
      params.weekdaysJson,
      params.checklistJson,
      params.noteKind,
      params.isPinned ? 1 : 0,
      params.tag,
      params.color,
      params.createdAt,
      params.createdAt
    );

  return fetchReminderById(db, Number(result.lastInsertRowid));
};

export const updateOwnedReminder = (
  db: Database.Database,
  params: {
    reminderId: number;
    userId: number;
    title: string;
    description: string;
    startDate: string;
    timeOfDay: string;
    timezone: string;
    repeatType: string;
    weekdaysJson: string;
    checklistJson: string;
    noteKind: "note" | "checklist" | "alarm";
    isPinned: boolean;
    tag: string;
    color: "slate" | "sky" | "amber" | "emerald" | "rose";
    lastScheduledFor: string | null;
    updatedAt: string;
  }
) => {
  db.prepare(
    `
      UPDATE reminders
      SET
        title = ?,
        description = ?,
        start_date = ?,
        time_of_day = ?,
        timezone = ?,
        repeat_type = ?,
        weekdays_json = ?,
        checklist_json = ?,
        note_kind = ?,
        is_pinned = ?,
        tag = ?,
        color = ?,
        last_scheduled_for = ?,
        updated_at = ?
      WHERE id = ?
        AND user_id = ?
        AND deleted_at IS NULL
    `
  ).run(
    params.title,
    params.description,
    params.startDate,
    params.timeOfDay,
    params.timezone,
    params.repeatType,
    params.weekdaysJson,
    params.checklistJson,
    params.noteKind,
    params.isPinned ? 1 : 0,
    params.tag,
    params.color,
    params.lastScheduledFor,
    params.updatedAt,
    params.reminderId,
    params.userId
  );

  return fetchReminderById(db, params.reminderId);
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
