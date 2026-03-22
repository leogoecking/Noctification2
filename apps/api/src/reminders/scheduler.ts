import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../config";
import { nowIso } from "../db";
import { emitReminderDue, emitReminderUpdated } from "../socket";
import { runTaskAutomationCycle } from "../tasks/automation";
import { logReminderEvent } from "./service";
import {
  addDaysToDateParts,
  addMonthsToDateParts,
  getWeekdayFromDateParts,
  getZonedParts,
  parseDateOnly,
  parseTimeOfDay,
  zonedDateTimeToUtc
} from "./timezone";
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

const nextWeeklyDate = (
  baseDate: { year: number; month: number; day: number },
  weekdays: number[]
): { year: number; month: number; day: number } => {
  const allowed = weekdays.length > 0 ? weekdays : [getWeekdayFromDateParts(baseDate)];
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = addDaysToDateParts(baseDate, offset);
    if (allowed.includes(getWeekdayFromDateParts(candidate))) {
      return candidate;
    }
  }

  return addDaysToDateParts(baseDate, 7);
};

const nextWeekdayDate = (baseDate: { year: number; month: number; day: number }) => {
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = addDaysToDateParts(baseDate, offset);
    const day = getWeekdayFromDateParts(candidate);
    if (day >= 1 && day <= 5) {
      return candidate;
    }
  }

  return addDaysToDateParts(baseDate, 1);
};

const computeNextScheduledFor = (reminder: ReminderRow): string | null => {
  const timezone = reminder.timezone;
  const anchor = reminder.lastScheduledFor
    ? getZonedParts(new Date(reminder.lastScheduledFor), timezone)
    : {
        ...parseDateOnly(reminder.startDate),
        ...parseTimeOfDay(reminder.timeOfDay)
      };

  if (!reminder.lastScheduledFor) {
    return zonedDateTimeToUtc(anchor, anchor, timezone).toISOString();
  }

  switch (reminder.repeatType as ReminderRepeatType) {
    case "none":
      return null;
    case "daily":
      return zonedDateTimeToUtc(addDaysToDateParts(anchor, 1), anchor, timezone).toISOString();
    case "weekly":
      return zonedDateTimeToUtc(
        nextWeeklyDate(anchor, parseWeekdaysJson(reminder.weekdaysJson)),
        anchor,
        timezone
      ).toISOString();
    case "monthly":
      return zonedDateTimeToUtc(addMonthsToDateParts(anchor, 1), anchor, timezone).toISOString();
    case "weekdays":
      return zonedDateTimeToUtc(nextWeekdayDate(anchor), anchor, timezone).toISOString();
    default:
      return null;
  }
};

const shouldExpireOccurrence = (scheduledFor: string, timezone: string, now: Date): boolean => {
  const scheduled = getZonedParts(new Date(scheduledFor), timezone);
  const nextDayStart = zonedDateTimeToUtc(addDaysToDateParts(scheduled, 1), {
    hour: 0,
    minute: 0,
    second: 0
  }, timezone);
  return now.getTime() >= nextDayStart.getTime();
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
    if (shouldExpireOccurrence(occurrence.scheduledFor, occurrence.timezone, now) || occurrence.retryCount >= MAX_RETRIES) {
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

export const startOperationalScheduler = (
  db: Database.Database,
  io: Server,
  config: AppConfig,
  options: ReminderSchedulerOptions = {}
) => {
  let running = false;

  const tick = () => {
    if (running) {
      return;
    }

    running = true;
    try {
      if (config.enableReminderScheduler) {
        runReminderSchedulerCycle(db, io, options);
      }

      if (config.enableTaskAutomationScheduler) {
        runTaskAutomationCycle(db, io, config, options);
      }
    } finally {
      running = false;
    }
  };

  tick();
  const timer = setInterval(tick, TICK_INTERVAL_MS);
  return () => clearInterval(timer);
};
