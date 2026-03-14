import { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../config";
import { nowIso } from "../db";
import { authenticate, requireRole } from "../middleware/auth";
import { normalizeReminderRow } from "../reminders/service";
import type {
  ReminderHealthStats,
  ReminderLogRow,
  ReminderOccurrenceRow,
  ReminderRow
} from "../reminders/types";

const toNullableString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseMetadata = (json: string | null): Record<string, unknown> | null => {
  if (!json) {
    return null;
  }

  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const parseLimit = (value: unknown, fallback: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
};

export const createReminderAdminRouter = (
  db: Database.Database,
  _io: Server,
  config: AppConfig
): Router => {
  const router = Router();

  router.use(authenticate(db, config), requireRole("admin"));

  router.get("/reminders/health", (_req, res) => {
    const reminderCounts = db
      .prepare(
        `
          SELECT
            COUNT(*) AS totalReminders,
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS activeReminders
          FROM reminders
          WHERE deleted_at IS NULL
        `
      )
      .get() as { totalReminders: number; activeReminders: number | null };

    const occurrenceCounts = db
      .prepare(
        `
          SELECT
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingOccurrences,
            SUM(CASE
              WHEN status = 'completed'
               AND date(datetime(completed_at, 'localtime')) = date('now', 'localtime')
              THEN 1 ELSE 0 END
            ) AS completedToday,
            SUM(CASE
              WHEN status = 'expired'
               AND date(datetime(expired_at, 'localtime')) = date('now', 'localtime')
              THEN 1 ELSE 0 END
            ) AS expiredToday
          FROM reminder_occurrences
        `
      )
      .get() as {
      pendingOccurrences: number | null;
      completedToday: number | null;
      expiredToday: number | null;
    };

    const logCounts = db
      .prepare(
        `
          SELECT
            SUM(CASE
              WHEN event_type = 'reminder.occurrence.delivered'
               AND date(datetime(created_at, 'localtime')) = date('now', 'localtime')
              THEN 1 ELSE 0 END
            ) AS deliveriesToday,
            SUM(CASE
              WHEN event_type = 'reminder.occurrence.retried'
               AND date(datetime(created_at, 'localtime')) = date('now', 'localtime')
              THEN 1 ELSE 0 END
            ) AS retriesToday
          FROM reminder_logs
        `
      )
      .get() as { deliveriesToday: number | null; retriesToday: number | null };

    const health: ReminderHealthStats = {
      totalReminders: reminderCounts.totalReminders ?? 0,
      activeReminders: reminderCounts.activeReminders ?? 0,
      pendingOccurrences: occurrenceCounts.pendingOccurrences ?? 0,
      completedToday: occurrenceCounts.completedToday ?? 0,
      expiredToday: occurrenceCounts.expiredToday ?? 0,
      deliveriesToday: logCounts.deliveriesToday ?? 0,
      retriesToday: logCounts.retriesToday ?? 0
    };

    res.json({ health });
  });

  router.get("/reminders", (req, res) => {
    const userId = Number(req.query.user_id);
    const userSearch = toNullableString(req.query.user_search);
    const active = toNullableString(req.query.active);
    const conditions: string[] = ["r.deleted_at IS NULL"];
    const values: Array<number | string> = [];

    if (Number.isInteger(userId) && userId > 0) {
      conditions.push("r.user_id = ?");
      values.push(userId);
    }

    if (userSearch) {
      conditions.push("(u.name LIKE ? OR u.login LIKE ?)");
      values.push(`%${userSearch}%`, `%${userSearch}%`);
    }

    if (active === "true" || active === "false") {
      conditions.push("r.is_active = ?");
      values.push(active === "true" ? 1 : 0);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const reminders = db
      .prepare(
        `
          SELECT
            r.id,
            r.user_id AS userId,
            u.name AS userName,
            u.login AS userLogin,
            r.title,
            r.description,
            r.start_date AS startDate,
            r.time_of_day AS timeOfDay,
            r.timezone,
            r.repeat_type AS repeatType,
            r.weekdays_json AS weekdaysJson,
            r.is_active AS isActive,
            r.last_scheduled_for AS lastScheduledFor,
            r.created_at AS createdAt,
            r.updated_at AS updatedAt
          FROM reminders r
          INNER JOIN users u ON u.id = r.user_id
          ${whereClause}
          ORDER BY r.is_active DESC, r.created_at DESC
        `
      )
      .all(...values) as ReminderRow[];

    res.json({ reminders: reminders.map(normalizeReminderRow) });
  });

  router.get("/reminder-occurrences", (req, res) => {
    const userId = Number(req.query.user_id);
    const userSearch = toNullableString(req.query.user_search);
    const status = toNullableString(req.query.status);
    const filter = toNullableString(req.query.filter);
    const conditions: string[] = [];
    const values: Array<number | string> = [];

    if (Number.isInteger(userId) && userId > 0) {
      conditions.push("o.user_id = ?");
      values.push(userId);
    }

    if (userSearch) {
      conditions.push("(u.name LIKE ? OR u.login LIKE ?)");
      values.push(`%${userSearch}%`, `%${userSearch}%`);
    }

    if (status) {
      conditions.push("o.status = ?");
      values.push(status);
    }

    if (filter === "today") {
      conditions.push("date(datetime(o.scheduled_for, 'localtime')) = date('now', 'localtime')");
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const occurrences = db
      .prepare(
        `
          SELECT
            o.id,
            o.reminder_id AS reminderId,
            o.user_id AS userId,
            u.name AS userName,
            u.login AS userLogin,
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
          INNER JOIN users u ON u.id = o.user_id
          ${whereClause}
          ORDER BY o.scheduled_for DESC
          LIMIT 300
        `
      )
      .all(...values) as ReminderOccurrenceRow[];

    res.json({ occurrences });
  });

  router.get("/reminder-logs", (req, res) => {
    const userId = Number(req.query.user_id);
    const reminderId = Number(req.query.reminder_id);
    const occurrenceId = Number(req.query.occurrence_id);
    const userSearch = toNullableString(req.query.user_search);
    const eventType = toNullableString(req.query.event_type);
    const from = toNullableString(req.query.from);
    const to = toNullableString(req.query.to);
    const limit = parseLimit(req.query.limit, 100, 300);
    const conditions: string[] = [];
    const values: Array<number | string> = [];

    if (Number.isInteger(userId) && userId > 0) {
      conditions.push("rl.user_id = ?");
      values.push(userId);
    }

    if (Number.isInteger(reminderId) && reminderId > 0) {
      conditions.push("rl.reminder_id = ?");
      values.push(reminderId);
    }

    if (Number.isInteger(occurrenceId) && occurrenceId > 0) {
      conditions.push("rl.occurrence_id = ?");
      values.push(occurrenceId);
    }

    if (userSearch) {
      conditions.push("(u.name LIKE ? OR u.login LIKE ?)");
      values.push(`%${userSearch}%`, `%${userSearch}%`);
    }

    if (eventType) {
      conditions.push("rl.event_type = ?");
      values.push(eventType);
    }

    if (from) {
      conditions.push("rl.created_at >= ?");
      values.push(from);
    }

    if (to) {
      conditions.push("rl.created_at <= ?");
      values.push(to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const logs = db
      .prepare(
        `
          SELECT
            rl.id,
            rl.reminder_id AS reminderId,
            rl.occurrence_id AS occurrenceId,
            rl.user_id AS userId,
            u.name AS userName,
            u.login AS userLogin,
            rl.event_type AS eventType,
            rl.metadata_json AS metadataJson,
            rl.created_at AS createdAt
          FROM reminder_logs rl
          LEFT JOIN users u ON u.id = rl.user_id
          ${whereClause}
          ORDER BY rl.created_at DESC
          LIMIT ?
        `
      )
      .all(...values, limit) as ReminderLogRow[];

    res.json({
      logs: logs.map((row) => ({
        id: row.id,
        reminderId: row.reminderId,
        occurrenceId: row.occurrenceId,
        userId: row.userId,
        userName: row.userName ?? null,
        userLogin: row.userLogin ?? null,
        eventType: row.eventType,
        metadata: parseMetadata(row.metadataJson),
        createdAt: row.createdAt
      }))
    });
  });

  router.patch("/reminders/:id/toggle", (req, res) => {
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
            AND deleted_at IS NULL
        `
      )
      .run(isActive ? 1 : 0, nowIso(), reminderId);

    if (result.changes === 0) {
      res.status(404).json({ error: "Lembrete nao encontrado" });
      return;
    }

    res.json({ ok: true });
  });

  return router;
};
