import { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../config";
import { authenticate } from "../middleware/auth";
import { registerReminderCrudRoutes } from "./reminders-me-reminders-routes";
import { registerReminderOccurrenceRoutes } from "./reminders-me-occurrence-routes";

export const createReminderMeRouter = (
  db: Database.Database,
  io: Server,
  config: AppConfig
): Router => {
  const router = Router();

  router.use(authenticate(db, config));

  registerReminderCrudRoutes({
    router,
    db,
    io,
    config
  });
  registerReminderOccurrenceRoutes({
    router,
    db,
    io
  });

  return router;
};
