import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import type express from "express";
import { createApp } from "../app";
import { connectDatabase, runMigrations } from "../db";
import { setupSocket } from "../socket";
import type { AppConfig } from "../config";
import { createMockResponse } from "./route-test-helpers";

const testConfig: AppConfig = {
  nodeEnv: "test",
  port: 0,
  dbPath: ":memory:",
  reminderTimezone: "America/Bahia",
  jwtSecret: "test-secret",
  jwtExpiresHours: 8,
  corsOrigin: "http://localhost:5173",
  corsOrigins: ["http://localhost:5173"],
  cookieName: "nc_access",
  cookieSecure: false,
  allowInsecureFixedAdmin: true,
  enableReminderScheduler: false,
  enableTaskAutomationScheduler: true,
  taskAutomationDueSoonMinutes: 90,
  taskAutomationStaleHours: 12,
  adminSeed: {
    login: "admin",
    password: "admin",
    name: "Administrador"
  }
};

describe("health routes", () => {
  let db: ReturnType<typeof connectDatabase>;
  let server: ReturnType<typeof createServer>;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = connectDatabase(":memory:");
    runMigrations(db, path.resolve(process.cwd(), "migrations"));
    server = createServer();
    const io = setupSocket(server, db, testConfig);
    app = createApp(db, io, testConfig);
    server.on("request", app);
  });

  afterEach(() => {
    server.close();
    db.close();
  });

  const getAppRouteHandler = (pathName: string, method: string) => {
    const appWithRouter = app as unknown as {
      _router?: {
        stack: Array<{
          route?: {
            path?: string;
            methods?: Record<string, boolean>;
            stack: Array<{ handle: unknown }>;
          };
        }>;
      };
    };

    const layer = appWithRouter._router?.stack.find(
      (entry) => entry.route?.path === pathName && entry.route.methods?.[method] === true
    );

    if (!layer?.route?.stack?.length) {
      throw new Error(`Rota nao encontrada: ${method.toUpperCase()} ${pathName}`);
    }

    return layer.route.stack[layer.route.stack.length - 1].handle as (
      req: express.Request,
      res: ReturnType<typeof createMockResponse>
    ) => void;
  };

  it("explicita o estado dos schedulers e as janelas da automacao no health publico", async () => {
    const healthHandler = getAppRouteHandler("/api/v1/health", "get");
    const response = createMockResponse();

    healthHandler({} as express.Request, response);

    expect(response.statusCode).toBe(200);
    expect((response.body as { status: string }).status).toBe("ok");
    expect((response.body as { schedulers: unknown }).schedulers).toEqual({
      remindersEnabled: false,
      taskAutomationEnabled: true
    });
    expect((response.body as { taskAutomation: unknown }).taskAutomation).toEqual({
      dueSoonWindowMinutes: 90,
      staleWindowHours: 12
    });
  });
});
