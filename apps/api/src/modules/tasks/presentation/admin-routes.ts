import { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../../../config";
import { authenticate, requireRole } from "../../../middleware/auth";
import { registerTaskAdminReadRoutes } from "./admin-read-routes";
import { registerTaskAdminWriteRoutes } from "./admin-write-routes";

export const createTaskAdminRouter = (db: Database.Database, config: AppConfig): Router => {
  return createTaskAdminRouterWithIo(db, null, config);
};

export const createTaskAdminRouterWithIo = (
  db: Database.Database,
  io: Server | null,
  config: AppConfig
): Router => {
  const router = Router();

  router.use(authenticate(db, config), requireRole("admin"));
  registerTaskAdminReadRoutes(router, { db, config });
  registerTaskAdminWriteRoutes(router, { db, io, config });

  return router;
};
