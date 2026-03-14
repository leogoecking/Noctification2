import { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../config";
import { logAudit, nowIso } from "../db";
import { authenticate } from "../middleware/auth";
import {
  isValidTimeOfDay,
  logReminderEvent,
  normalizeReminderRow,
  parseReminderRepeatType,
  parseWeekdays,
  stringifyWeekdays
} from "../reminders/service";
import { emitReminderUpdated } from "../socket";
import type { ReminderOccurrenceRow, ReminderRow } from "../reminders/types";

const toNullableString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_TIMEZONE_LENGTH = 64;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateOnly = (value: string): boolean => {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const validateReminderFields = (params: {
  title?: string | null;
  description?: string | null;
  startDate?: string | null;
  timeOfDay?: string | null;
  timezone?: string | null;
  supportedTimezone: string;
  repeatType?: ReturnType<typeof parseReminderRepeatType> | null;
  weekdays?: number[];
}) => {
  if (params.title !== undefined) {
    if (!params.title || params.title.length === 0) {
      return "title e obrigatorio";
    }

    if (params.title.length > MAX_TITLE_LENGTH) {
      return `title deve ter no maximo ${MAX_TITLE_LENGTH} caracteres`;
    }
  }

  if (
    params.description !== undefined &&
    params.description !== null &&
    params.description.length > MAX_DESCRIPTION_LENGTH
  ) {
    return `description deve ter no maximo ${MAX_DESCRIPTION_LENGTH} caracteres`;
  }

  if (params.startDate !== undefined && params.startDate !== null && !isValidDateOnly(params.startDate)) {
    return "startDate deve estar no formato YYYY-MM-DD";
  }

  if (params.timeOfDay !== undefined && params.timeOfDay !== null && !isValidTimeOfDay(params.timeOfDay)) {
    return "timeOfDay deve estar no formato HH:MM";
  }

  if (
    params.timezone !== undefined &&
    params.timezone !== null &&
    (params.timezone.length === 0 || params.timezone.length > MAX_TIMEZONE_LENGTH)
  ) {
    return `timezone deve ter entre 1 e ${MAX_TIMEZONE_LENGTH} caracteres`;
  }

  if (
    params.timezone !== undefined &&
    params.timezone !== null &&
    params.timezone !== params.supportedTimezone
  ) {
    return `timezone invalida. Use ${params.supportedTimezone}`;
  }

  if (params.repeatType === "weekly" && (!params.weekdays || params.weekdays.length === 0)) {
    return "weekdays e obrigatorio para repeticao semanal";
  }

  return null;
};

export const createReminderMeRouter = (
  db: Database.Database,
  io: Server,
  config: AppConfig
): Router => {
  const router = Router();

  router.use(authenticate(db, config));

  router.get("/reminders", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const active = toNullableString(req.query.active);
    const conditions = ["user_id = ?", "deleted_at IS NULL"];
    const values: Array<number | string> = [req.authUser.id];

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

    res.json({
      reminders: reminders.map(normalizeReminderRow)
    });
  });

  router.post("/reminders", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const title = toNullableString(req.body?.title);
    const description = toNullableString(req.body?.description) ?? "";
    const startDate = toNullableString(req.body?.startDate ?? req.body?.start_date);
    const timeOfDay = toNullableString(req.body?.timeOfDay ?? req.body?.time_of_day);
    const timezone = toNullableString(req.body?.timezone) ?? config.reminderTimezone;
    const repeatType = parseReminderRepeatType(req.body?.repeatType ?? req.body?.repeat_type);
    const weekdays = parseWeekdays(req.body?.weekdays);
    const timestamp = nowIso();

    if (!title || !startDate || !timeOfDay || !repeatType) {
      res.status(400).json({ error: "title, startDate, timeOfDay e repeatType sao obrigatorios" });
      return;
    }

    const validationError = validateReminderFields({
      title,
      description,
      startDate,
      timeOfDay,
      timezone,
      supportedTimezone: config.reminderTimezone,
      repeatType,
      weekdays
    });
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

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
            is_active,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `
      )
      .run(
        req.authUser.id,
        title,
        description,
        startDate,
        timeOfDay,
        timezone,
        repeatType,
        stringifyWeekdays(weekdays),
        timestamp,
        timestamp
      );

    const created = db
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
      .get(Number(result.lastInsertRowid)) as ReminderRow;

    logReminderEvent(db, {
      reminderId: created.id,
      userId: req.authUser.id,
      eventType: "reminder.created"
    });

    logAudit(db, {
      actorUserId: req.authUser.id,
      eventType: "reminder.created",
      targetType: "reminder",
      targetId: created.id
    });

    res.status(201).json({ reminder: normalizeReminderRow(created) });
  });

  router.patch("/reminders/:id", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const reminderId = Number(req.params.id);
    if (!Number.isInteger(reminderId) || reminderId <= 0) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const existing = db
      .prepare("SELECT id FROM reminders WHERE id = ? AND user_id = ? AND deleted_at IS NULL")
      .get(reminderId, req.authUser.id) as { id: number } | undefined;

    if (!existing) {
      res.status(404).json({ error: "Lembrete nao encontrado" });
      return;
    }

    const title = toNullableString(req.body?.title);
    const description = toNullableString(req.body?.description);
    const startDate = toNullableString(req.body?.startDate ?? req.body?.start_date);
    const timeOfDay = toNullableString(req.body?.timeOfDay ?? req.body?.time_of_day);
    const timezone = toNullableString(req.body?.timezone);
    const repeatTypeRaw = req.body?.repeatType ?? req.body?.repeat_type;
    const repeatType = repeatTypeRaw !== undefined ? parseReminderRepeatType(repeatTypeRaw) : undefined;
    const weekdays = req.body?.weekdays !== undefined ? parseWeekdays(req.body?.weekdays) : undefined;

    if (repeatTypeRaw !== undefined && !repeatType) {
      res.status(400).json({ error: "repeatType invalido" });
      return;
    }

    const current = db
      .prepare(
        `
          SELECT
            title,
            description,
            start_date AS startDate,
            time_of_day AS timeOfDay,
            timezone,
            repeat_type AS repeatType,
            weekdays_json AS weekdaysJson
          FROM reminders
          WHERE id = ? AND user_id = ?
            AND deleted_at IS NULL
        `
      )
      .get(reminderId, req.authUser.id) as {
      title: string;
      description: string;
      startDate: string;
      timeOfDay: string;
      timezone: string;
      repeatType: string;
      weekdaysJson: string;
    };

    const currentTimezone =
      current.timezone === config.reminderTimezone ? current.timezone : config.reminderTimezone;
    const nextRepeatType = repeatType ?? (current.repeatType as ReturnType<typeof parseReminderRepeatType>);
    const nextWeekdays = weekdays ?? (JSON.parse(current.weekdaysJson) as number[]);

    const validationError = validateReminderFields({
      title: title ?? current.title,
      description: description ?? current.description,
      startDate: startDate ?? current.startDate,
      timeOfDay: timeOfDay ?? current.timeOfDay,
      timezone: timezone ?? currentTimezone,
      supportedTimezone: config.reminderTimezone,
      repeatType: nextRepeatType,
      weekdays: nextWeekdays
    });
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

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
          updated_at = ?
        WHERE id = ?
          AND user_id = ?
          AND deleted_at IS NULL
      `
    ).run(
      title ?? current.title,
      description ?? current.description,
      startDate ?? current.startDate,
      timeOfDay ?? current.timeOfDay,
      timezone ?? currentTimezone,
      nextRepeatType,
      stringifyWeekdays(nextWeekdays),
      nowIso(),
      reminderId,
      req.authUser.id
    );

    const updated = db
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

    logReminderEvent(db, {
      reminderId,
      userId: req.authUser.id,
      eventType: "reminder.updated"
    });

    res.json({ reminder: normalizeReminderRow(updated) });
  });

  router.patch("/reminders/:id/toggle", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const reminderId = Number(req.params.id);
    const rawIsActive = req.body?.is_active ?? req.body?.isActive;

    if (!Number.isInteger(reminderId) || reminderId <= 0) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    if (typeof rawIsActive !== "boolean") {
      res.status(400).json({ error: "is_active deve ser boolean" });
      return;
    }

    const isActive = rawIsActive;

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
      .run(isActive ? 1 : 0, nowIso(), reminderId, req.authUser.id);

    if (result.changes === 0) {
      res.status(404).json({ error: "Lembrete nao encontrado" });
      return;
    }

    logReminderEvent(db, {
      reminderId,
      userId: req.authUser.id,
      eventType: isActive ? "reminder.activated" : "reminder.deactivated"
    });

    res.json({ ok: true });
  });

  router.delete("/reminders/:id", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const reminderId = Number(req.params.id);
    if (!Number.isInteger(reminderId) || reminderId <= 0) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

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
      .all(reminderId, req.authUser.id) as Array<{ id: number; retryCount: number }>;

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
      .run(timestamp, timestamp, reminderId, req.authUser.id);

    if (result.changes === 0) {
      res.status(404).json({ error: "Lembrete nao encontrado" });
      return;
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
    ).run(timestamp, reminderId, req.authUser.id);

    for (const occurrence of pendingOccurrences) {
      logReminderEvent(db, {
        reminderId,
        occurrenceId: occurrence.id,
        userId: req.authUser.id,
        eventType: "reminder.occurrence.cancelled",
        metadata: {
          reason: "reminder_deleted",
          retryCount: occurrence.retryCount
        }
      });

      emitReminderUpdated(io, {
        occurrenceId: occurrence.id,
        reminderId,
        userId: req.authUser.id,
        status: "cancelled",
        retryCount: occurrence.retryCount
      });
    }

    logReminderEvent(db, {
      reminderId,
      userId: req.authUser.id,
      eventType: "reminder.deleted"
    });

    res.status(204).send();
  });

  router.get("/reminder-occurrences", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const status = toNullableString(req.query.status);
    const filter = toNullableString(req.query.filter);
    const conditions = ["o.user_id = ?"];
    const values: Array<number | string> = [req.authUser.id];

    if (status) {
      conditions.push("o.status = ?");
      values.push(status);
    }

    if (filter === "today") {
      conditions.push("date(datetime(o.scheduled_for, 'localtime')) = date('now', 'localtime')");
    }

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
          WHERE ${conditions.join(" AND ")}
          ORDER BY o.scheduled_for DESC
          LIMIT 200
        `
      )
      .all(...values) as ReminderOccurrenceRow[];

    res.json({ occurrences });
  });

  router.post("/reminder-occurrences/:id/complete", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const occurrenceId = Number(req.params.id);
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
      .run(timestamp, timestamp, occurrenceId, req.authUser.id);

    if (result.changes === 0) {
      res.status(404).json({ error: "Ocorrencia nao encontrada ou ja concluida" });
      return;
    }

    const occurrence = db
      .prepare(
        `
          SELECT reminder_id AS reminderId, retry_count AS retryCount
          FROM reminder_occurrences
          WHERE id = ?
        `
      )
      .get(occurrenceId) as { reminderId: number; retryCount: number };

    logReminderEvent(db, {
      reminderId: occurrence.reminderId,
      occurrenceId,
      userId: req.authUser.id,
      eventType: "reminder.occurrence.completed"
    });

    logAudit(db, {
      actorUserId: req.authUser.id,
      eventType: "reminder.occurrence.completed",
      targetType: "reminder_occurrence",
      targetId: occurrenceId
    });

    emitReminderUpdated(io, {
      occurrenceId,
      reminderId: occurrence.reminderId,
      userId: req.authUser.id,
      status: "completed",
      retryCount: occurrence.retryCount,
      completedAt: timestamp
    });

    res.json({ ok: true, completedAt: timestamp });
  });

  return router;
};
