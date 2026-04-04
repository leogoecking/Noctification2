import type { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import {
  completeUserReminderOccurrence,
  listUserReminderOccurrences,
  parseOccurrenceListParams
} from "../reminders/me-route-helpers";
import { parsePositiveId, requireAuthUser } from "./reminders-me-shared";

interface RegisterReminderOccurrenceRoutesParams {
  router: Router;
  db: Database.Database;
  io: Server;
}

export const registerReminderOccurrenceRoutes = ({
  router,
  db,
  io
}: RegisterReminderOccurrenceRoutesParams) => {
  router.get("/reminder-occurrences", (req, res) => {
    const authUser = requireAuthUser(req.authUser, res);
    if (!authUser) {
      return;
    }

    const { status, filter } = parseOccurrenceListParams(req.query as Record<string, unknown>);
    res.json({
      occurrences: listUserReminderOccurrences(db, authUser.id, status, filter)
    });
  });

  router.post("/reminder-occurrences/:id/complete", (req, res) => {
    const authUser = requireAuthUser(req.authUser, res);
    if (!authUser) {
      return;
    }

    const occurrenceId = parsePositiveId(req.params.id);
    if (!occurrenceId) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const result = completeUserReminderOccurrence(db, io, {
      occurrenceId,
      userId: authUser.id
    });
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json(result);
  });
};
