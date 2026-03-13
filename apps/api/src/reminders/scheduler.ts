import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import { nowIso } from "../db";
import { emitReminderDue, emitReminderUpdated } from "../socket";
import { logReminderEvent } from "./service";
import type { ReminderOccurrenceRow, ReminderRepeatType, ReminderRow } from "./types";

export const MAX_RETRIES = 3;
export const RETRY_INTERVAL_MS = 10 * 60 * 1000;
const TICK_INTERVAL_MS = 60 * 1000;

interface ReminderSchedulerOptions {
  now?: () => Date;
}

const parseWeekdaysJson = (value: string): number[] => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => Number(item)).filter(Number.isInteger) : [];
  } catch {
    return [];
  }
};

const combineDateAndTime = (dateValue: string, timeOfDay: string): Date =>
  new Date(`${dateValue}T${timeOfDay}:00`);

const toIsoFromDate = (date: Date): string => date.toISOString();

const addDays = (date: Date, amount: number): Date => {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + amount);
  return next;
};

const addMonths = (date: Date, amount: number): Date => {
  const next = new Date(date.getTime());
  const desiredDay = next.getDate();
  next.setMonth(next.getMonth() + amount, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(desiredDay, lastDay));
  return next;
};

const nextWeeklyDate = (base: Date, weekdays: number[]): Date => {
  const allowed = weekdays.length > 0 ? weekdays : [base.getDay()];
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = addDays(base, offset);
    if (allowed.includes(candidate.getDay())) {
      return candidate;
    }
  }

  return addDays(base, 7);
};

const nextWeekdayDate = (base: Date): Date => {
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = addDays(base, offset);
    const day = candidate.getDay();
    if (day >= 1 && day <= 5) {
      return candidate;
    }
  }

  return addDays(base, 1);
};

const computeNextScheduledFor = (reminder: ReminderRow): string | null => {
  const anchor = reminder.lastScheduledFor
    ? new Date(reminder.lastScheduledFor)
    : combineDateAndTime(reminder.startDate, reminder.timeOfDay);

  if (!reminder.lastScheduledFor) {
    return anchor.toISOString();
  }

  switch (reminder.repeatType as ReminderRepeatType) {
    case "none":
      return null;
    case "daily":
      return toIsoFromDate(addDays(anchor, 1));
    case "weekly":
      return toIsoFromDate(nextWeeklyDate(anchor, parseWeekdaysJson(reminder.weekdaysJson)));
    case "monthly":
      return toIsoFromDate(addMonths(anchor, 1));
    case "weekdays":
      return toIsoFromDate(nextWeekdayDate(anchor));
    default:
      return null;
  }
};

const endOfScheduledDay = (scheduledFor: string): Date => {
  const scheduled = new Date(scheduledFor);
  return new Date(
    scheduled.getFullYear(),
    scheduled.getMonth(),
    scheduled.getDate(),
    23,
    59,
    59,
    999
  );
};

const shouldExpireOccurrence = (scheduledFor: string, now: Date): boolean => {
  return now.getTime() > endOfScheduledDay(scheduledFor).getTime();
};

const generateDueOccurrences = (db: Database.Database, now: Date) => {
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
        WHERE is_active = 1
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
    `
  );

  const transaction = db.transaction(() => {
    const timestamp = nowIso();

    for (const reminder of reminders) {
      let guard = 0;
      let nextScheduledFor = computeNextScheduledFor(reminder);

      while (nextScheduledFor && new Date(nextScheduledFor) <= now && guard < 32) {
        const result = insertOccurrence.run(reminder.id, reminder.userId, nextScheduledFor, timestamp, timestamp);
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

const deliverPendingOccurrences = (db: Database.Database, io: Server, now: Date) => {
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
          r.description
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
    if (shouldExpireOccurrence(occurrence.scheduledFor, now) || occurrence.retryCount >= MAX_RETRIES) {
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

    const nextRetryCount = occurrence.triggeredAt ? occurrence.retryCount + 1 : occurrence.retryCount;
    const nextRetryAt = new Date(now.getTime() + RETRY_INTERVAL_MS).toISOString();

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
      eventType: occurrence.triggeredAt ? "reminder.occurrence.retried" : "reminder.occurrence.delivered",
      metadata: {
        retryCount: nextRetryCount,
        nextRetryAt
      }
    });
  }
};

export const runReminderSchedulerCycle = (
  db: Database.Database,
  io: Server,
  options: ReminderSchedulerOptions = {}
) => {
  const now = options.now ? options.now() : new Date();
  generateDueOccurrences(db, now);
  deliverPendingOccurrences(db, io, now);
};

export const startReminderScheduler = (
  db: Database.Database,
  io: Server,
  options: ReminderSchedulerOptions = {}
) => {
  let running = false;

  const tick = () => {
    if (running) {
      return;
    }

    running = true;
    try {
      runReminderSchedulerCycle(db, io, options);
    } finally {
      running = false;
    }
  };

  tick();
  const timer = setInterval(tick, TICK_INTERVAL_MS);
  return () => clearInterval(timer);
};
