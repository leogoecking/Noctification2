import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import { nowIso } from "../db";
import { emitReminderDue, emitReminderUpdated } from "../socket";
import { logReminderEvent } from "./service";
import { computeNextScheduledFor, shouldExpireOccurrence } from "./recurrence";
import type { ReminderOccurrenceRow, ReminderRow } from "./types";

export const generateDueOccurrences = (db: Database.Database, now: Date) => {
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
        WHERE is_active = 1
          AND deleted_at IS NULL
      `
    )
    .all() as ReminderRow[];

  const insertOccurrence = db.prepare(
    `
      INSERT OR IGNORE INTO reminder_occurrences (
        reminder_id,
        user_id,
        scheduled_for,
        status,
        retry_count,
        trigger_source,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, 'pending', 0, 'scheduler', ?, ?)
    `
  );
  const updateReminderPointer = db.prepare(
    `
      UPDATE reminders
      SET last_scheduled_for = ?, updated_at = ?
      WHERE id = ?
        AND deleted_at IS NULL
    `
  );

  const transaction = db.transaction(() => {
    const timestamp = nowIso();

    for (const reminder of reminders) {
      let guard = 0;
      let nextScheduledFor = computeNextScheduledFor(reminder);

      while (nextScheduledFor && new Date(nextScheduledFor) <= now && guard < 32) {
        const result = insertOccurrence.run(
          reminder.id,
          reminder.userId,
          nextScheduledFor,
          timestamp,
          timestamp
        );
        updateReminderPointer.run(nextScheduledFor, timestamp, reminder.id);

        if (result.changes > 0) {
          logReminderEvent(db, {
            reminderId: reminder.id,
            userId: reminder.userId,
            eventType: "reminder.occurrence.created",
            metadata: {
              scheduledFor: nextScheduledFor
            }
          });
        }

        reminder.lastScheduledFor = nextScheduledFor;
        nextScheduledFor = computeNextScheduledFor(reminder);
        guard += 1;
      }
    }
  });

  transaction();
};

export const deliverPendingOccurrences = (
  db: Database.Database,
  io: Server,
  now: Date,
  maxRetries: number,
  retryIntervalMs: number
) => {
  const nowTimestamp = now.toISOString();
  const occurrences = db
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
          r.description,
          r.timezone AS timezone
        FROM reminder_occurrences o
        INNER JOIN reminders r ON r.id = o.reminder_id
        WHERE o.status = 'pending'
          AND (
            (o.triggered_at IS NULL AND o.scheduled_for <= ?)
            OR (o.next_retry_at IS NOT NULL AND o.next_retry_at <= ?)
          )
        ORDER BY o.scheduled_for ASC
        LIMIT 200
      `
    )
    .all(nowTimestamp, nowTimestamp) as ReminderOccurrenceRow[];

  const markDelivered = db.prepare(
    `
      UPDATE reminder_occurrences
      SET
        triggered_at = COALESCE(triggered_at, ?),
        retry_count = ?,
        next_retry_at = ?,
        updated_at = ?
      WHERE id = ?
        AND status = 'pending'
    `
  );
  const markExpired = db.prepare(
    `
      UPDATE reminder_occurrences
      SET
        status = 'expired',
        expired_at = ?,
        updated_at = ?
      WHERE id = ?
        AND status = 'pending'
    `
  );

  for (const occurrence of occurrences) {
    if (
      shouldExpireOccurrence(occurrence.scheduledFor, occurrence.timezone, now) ||
      occurrence.retryCount >= maxRetries
    ) {
      markExpired.run(nowTimestamp, nowTimestamp, occurrence.id);
      emitReminderUpdated(io, {
        occurrenceId: occurrence.id,
        reminderId: occurrence.reminderId,
        userId: occurrence.userId,
        status: "expired",
        retryCount: occurrence.retryCount,
        expiredAt: nowTimestamp
      });
      logReminderEvent(db, {
        reminderId: occurrence.reminderId,
        occurrenceId: occurrence.id,
        userId: occurrence.userId,
        eventType: "reminder.occurrence.expired"
      });
      continue;
    }

    const nextRetryCount = occurrence.triggeredAt
      ? occurrence.retryCount + 1
      : occurrence.retryCount;
    const nextRetryAt = new Date(now.getTime() + retryIntervalMs).toISOString();

    emitReminderDue(io, {
      occurrenceId: occurrence.id,
      reminderId: occurrence.reminderId,
      userId: occurrence.userId,
      title: occurrence.title,
      description: occurrence.description,
      scheduledFor: occurrence.scheduledFor,
      retryCount: nextRetryCount
    });

    markDelivered.run(nowTimestamp, nextRetryCount, nextRetryAt, nowTimestamp, occurrence.id);

    logReminderEvent(db, {
      reminderId: occurrence.reminderId,
      occurrenceId: occurrence.id,
      userId: occurrence.userId,
      eventType: occurrence.triggeredAt
        ? "reminder.occurrence.retried"
        : "reminder.occurrence.delivered",
      metadata: {
        retryCount: nextRetryCount,
        nextRetryAt
      }
    });
  }
};
