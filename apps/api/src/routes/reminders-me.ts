import { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../config";
import { logAudit, nowIso } from "../db";
import { authenticate } from "../middleware/auth";
import {
  logReminderEvent,
  normalizeReminderRow
} from "../reminders/service";
import {
  archiveStaleUserReminders,
  createUserReminder,
  completeUserReminderOccurrence,
  deleteUserReminder,
  fetchOwnedReminderForUpdate,
  listUserReminderOccurrences,
  listUserReminders,
  parseOccurrenceListParams,
  toggleUserReminder,
  updateOwnedReminder
} from "../reminders/me-route-helpers";
import {
  parseReminderCreateInput,
  parseReminderUpdateInput,
  resolveReminderCreate,
  resolveReminderUpdate,
  toNullableString,
  validateReminderFields
} from "../reminders/route-helpers";
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
    res.json({
      reminders: listUserReminders(db, req.authUser.id, active)
    });
  });

  router.post("/reminders/archive-stale", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const archivedCount = archiveStaleUserReminders(db, {
      userId: req.authUser.id,
      staleDays: 30
    });

    res.json({ archivedCount });
  });

  router.post("/reminders", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const input = parseReminderCreateInput(req.body, config.reminderTimezone);
    const timestamp = nowIso();

    if (!input.title || !input.startDate || !input.timeOfDay || !input.repeatType) {
      res.status(400).json({ error: "title, startDate, timeOfDay e repeatType sao obrigatorios" });
      return;
    }

    const resolved = resolveReminderCreate(input);

    const validationError = validateReminderFields({
      title: resolved.title,
      description: resolved.description,
      startDate: resolved.startDate,
      timeOfDay: resolved.timeOfDay,
      timezone: resolved.timezone,
      supportedTimezone: config.reminderTimezone,
      repeatType: resolved.repeatType,
      weekdays: resolved.weekdays,
      checklistItems: resolved.checklistItems,
      noteKind: resolved.noteKind,
      tag: resolved.tag,
      color: resolved.color
    });
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const created = createUserReminder(db, {
      userId: req.authUser.id,
      title: resolved.title,
      description: resolved.description,
      startDate: resolved.startDate,
      timeOfDay: resolved.timeOfDay,
      timezone: resolved.timezone,
      repeatType: resolved.repeatType,
      weekdaysJson: resolved.weekdaysJson,
      checklistJson: resolved.checklistJson,
      noteKind: resolved.noteKind,
      isPinned: resolved.isPinned,
      tag: resolved.tag,
      color: resolved.color,
      createdAt: timestamp
    });

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

    const input = parseReminderUpdateInput(req.body);

    if (input.repeatTypeRaw !== undefined && !input.repeatType) {
      res.status(400).json({ error: "repeatType invalido" });
      return;
    }

    const current = fetchOwnedReminderForUpdate(db, {
      reminderId,
      userId: req.authUser.id
    });

    const resolved = resolveReminderUpdate(current, input, config.reminderTimezone);

    const validationError = validateReminderFields({
      title: resolved.title,
      description: resolved.description,
      startDate: resolved.startDate,
      timeOfDay: resolved.timeOfDay,
      timezone: resolved.timezone,
      supportedTimezone: config.reminderTimezone,
      repeatType: resolved.repeatType,
      weekdays: resolved.weekdays,
      checklistItems: resolved.checklistItems,
      noteKind: resolved.noteKind,
      tag: resolved.tag,
      color: resolved.color
    });
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const updated = updateOwnedReminder(db, {
      reminderId,
      userId: req.authUser.id,
      title: resolved.title,
      description: resolved.description,
      startDate: resolved.startDate,
      timeOfDay: resolved.timeOfDay,
      timezone: resolved.timezone,
      repeatType: resolved.repeatType,
      weekdaysJson: resolved.weekdaysJson,
      checklistJson: resolved.checklistJson,
      noteKind: resolved.noteKind,
      isPinned: resolved.isPinned,
      tag: resolved.tag,
      color: resolved.color,
      lastScheduledFor: resolved.lastScheduledFor,
      updatedAt: nowIso()
    });

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
    if (!Number.isInteger(reminderId) || reminderId <= 0) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const result = toggleUserReminder(db, {
      reminderId,
      userId: req.authUser.id,
      rawIsActive: req.body?.is_active ?? req.body?.isActive
    });
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }

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

    const result = deleteUserReminder(db, io, {
      reminderId,
      userId: req.authUser.id
    });
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.status(204).send();
  });

  router.get("/reminder-occurrences", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const { status, filter } = parseOccurrenceListParams(req.query as Record<string, unknown>);
    res.json({
      occurrences: listUserReminderOccurrences(db, req.authUser.id, status, filter)
    });
  });

  router.post("/reminder-occurrences/:id/complete", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const occurrenceId = Number(req.params.id);
    const result = completeUserReminderOccurrence(db, io, {
      occurrenceId,
      userId: req.authUser.id
    });
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  return router;
};
