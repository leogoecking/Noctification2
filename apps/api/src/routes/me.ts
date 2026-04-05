import { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../config";
import { authenticate } from "../middleware/auth";
import { registerMeNotificationRoutes } from "./me-notification-routes";
import { createMeSettingsRouter } from "./me-settings";
import { registerMeWebPushRoutes } from "./me-web-push-routes";

export const createMeRouter = (db: Database.Database, io: Server, config: AppConfig): Router => {
  const router = Router();

  router.use(authenticate(db, config));

  registerMeWebPushRoutes({
    router,
    db,
    config
  });
  registerMeNotificationRoutes({
    router,
    db,
    io
  });

  router.use("/settings", createMeSettingsRouter(db));

  return router;
};
