import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "./config";
import { createAuthRouter } from "./routes/auth";
import { createAdminRouter } from "./routes/admin";
import { createMeRouter } from "./routes/me";
import { createReminderAdminRouter } from "./routes/reminders-admin";
import { createReminderMeRouter } from "./routes/reminders-me";
import { createOperationsBoardMeRouter } from "./routes/operations-board-me";
import { createAprRouter } from "./modules/apr/route";
import { createTaskAdminRouterWithIo, createTaskMeRouterWithIo } from "./modules/tasks";

const isCorsOriginAllowed = (allowedOrigins: Set<string>, origin?: string): boolean => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.has("*")) {
    return true;
  }

  return allowedOrigins.has(origin);
};

export const createApp = (db: Database.Database, io: Server, config: AppConfig) => {
  const app = express();
  const allowedOrigins = new Set(config.corsOrigins);

  app.use(
    cors({
      origin: (origin, callback) => {
        callback(null, isCorsOriginAllowed(allowedOrigins, origin));
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/api/v1/health", (_req, res) => {
    res.json({
      status: "ok",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      schedulers: {
        remindersEnabled: Boolean(config.enableReminderScheduler),
        taskAutomationEnabled: Boolean(config.enableTaskAutomationScheduler)
      },
      taskAutomation: {
        dueSoonWindowMinutes: config.taskAutomationDueSoonMinutes ?? 120,
        staleWindowHours: config.taskAutomationStaleHours ?? 24
      }
    });
  });

  app.use("/api/v1/auth", createAuthRouter(db, config));
  app.use("/api/v1/admin", createAdminRouter(db, io, config));
  app.use("/api/v1/admin", createReminderAdminRouter(db, io, config));
  app.use("/api/v1/admin", createTaskAdminRouterWithIo(db, io, config));
  app.use("/api/v1/me", createMeRouter(db, io, config));
  app.use("/api/v1/me", createReminderMeRouter(db, io, config));
  app.use("/api/v1/me", createOperationsBoardMeRouter(db, config));
  app.use("/api/v1/me", createTaskMeRouterWithIo(db, io, config));

  if (config.enableAprModule) {
    app.use("/api/v1/apr", createAprRouter(db, config));
  }

  app.use((_req, res) => {
    res.status(404).json({ error: "Rota nao encontrada" });
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    res.status(500).json({ error: "Erro interno" });
  });

  return app;
};
