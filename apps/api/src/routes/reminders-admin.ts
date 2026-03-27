import { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../config";
import { authenticate, requireRole } from "../middleware/auth";
import { registerReminderAdminRoutes } from "./reminders-admin-routes";

export const createReminderAdminRouter = (
  db: Database.Database,
  _io: Server,
  config: AppConfig
): Router => {
  const router = Router();

  router.use(authenticate(db, config), requireRole("admin"));
  registerReminderAdminRoutes(router, db, config);

  return router;
};
