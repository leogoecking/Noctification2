import { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../../../config";
import { authenticate } from "../../../middleware/auth";
import { registerTaskMeReadRoutes } from "./me-read-routes";
import { registerTaskMeWriteRoutes } from "./me-write-routes";

export const createTaskMeRouter = (db: Database.Database, config: AppConfig): Router => {
  return createTaskMeRouterWithIo(db, null, config);
};

export const createTaskMeRouterWithIo = (
  db: Database.Database,
  io: Server | null,
  config: AppConfig
): Router => {
  const router = Router();

  router.use(authenticate(db, config));
  registerTaskMeReadRoutes(router, db);
  registerTaskMeWriteRoutes(router, { db, io, config });

  return router;
};
