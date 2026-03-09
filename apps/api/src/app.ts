import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "./config";
import { createAuthRouter } from "./routes/auth";
import { createAdminRouter } from "./routes/admin";
import { createMeRouter } from "./routes/me";

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
      timestamp: new Date().toISOString()
    });
  });

  app.use("/api/v1/auth", createAuthRouter(db, config));
  app.use("/api/v1/admin", createAdminRouter(db, io, config));
  app.use("/api/v1/me", createMeRouter(db, io, config));

  app.use((_req, res) => {
    res.status(404).json({ error: "Rota nao encontrada" });
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    res.status(500).json({ error: "Erro interno" });
  });

  return app;
};

