import type { Router } from "express";
import type Database from "better-sqlite3";
import { nowIso } from "../db";
import type { AppConfig } from "../config";
import {
  buildReminderAdminHealth,
  fetchAdminReminderLogs,
  fetchAdminReminderOccurrences,
  fetchAdminReminders
} from "./reminders-admin-helpers";

export const registerReminderAdminRoutes = (
  router: Router,
  db: Database.Database,
  config: AppConfig
): void => {
  router.get("/reminders/health", (_req, res) => {
    res.json({ health: buildReminderAdminHealth(db, config) });
  });

  router.get("/reminders", (req, res) => {
    res.json({ reminders: fetchAdminReminders(db, req.query as Record<string, unknown>) });
  });

  router.get("/reminder-occurrences", (req, res) => {
    const result = fetchAdminReminderOccurrences(db, req.query as Record<string, unknown>);
    if ("error" in result) {
      res.status(result.statusCode).json({ error: result.error });
      return;
    }

    res.json({ occurrences: result });
  });

  router.get("/reminder-logs", (req, res) => {
    const result = fetchAdminReminderLogs(db, req.query as Record<string, unknown>);
    if ("error" in result) {
      res.status(result.statusCode).json({ error: result.error });
      return;
    }

    res.json({ logs: result });
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

    const result = db
      .prepare(
        `
          UPDATE reminders
          SET is_active = ?, updated_at = ?
          WHERE id = ?
            AND deleted_at IS NULL
        `
      )
      .run(rawIsActive ? 1 : 0, nowIso(), reminderId);

    if (result.changes === 0) {
      res.status(404).json({ error: "Lembrete nao encontrado" });
      return;
    }

    res.json({ ok: true });
  });
};
