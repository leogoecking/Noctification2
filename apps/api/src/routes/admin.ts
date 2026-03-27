import { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../config";
import { authenticate, requireRole } from "../middleware/auth";
import { registerAdminAuditRoutes } from "./admin-audit-routes";
import { createAdminNotificationRoutes } from "./admin-notification-routes";
import { registerAdminUserRoutes } from "./admin-user-routes";

export const createAdminRouter = (
  db: Database.Database,
  io: Server,
  config: AppConfig
): Router => {
  const router = Router();

  router.use(authenticate(db, config), requireRole("admin"));
  registerAdminUserRoutes(router, db, io);
  registerAdminAuditRoutes(router, db);
  createAdminNotificationRoutes(router, db, io, config);

  return router;
};
