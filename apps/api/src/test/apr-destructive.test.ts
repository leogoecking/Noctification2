import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { connectDatabase, runMigrations } from "../db";
import { createAprManualEntryService, createAprSnapshotService, restoreLatestAprSnapshotService } from "../modules/apr/service";
import { createAprRouter } from "../modules/apr/routes";
import { createMockResponse, getRouteHandler } from "./route-test-helpers";
import type { AppConfig } from "../config";

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
  enableAprModule: true,
  adminSeed: {
    login: "admin",
    password: "admin",
    name: "Administrador"
  }
};

describe("APR destructive operations", () => {
  let db: ReturnType<typeof connectDatabase>;

  beforeEach(() => {
    db = connectDatabase(":memory:");
    runMigrations(db, path.resolve(process.cwd(), "migrations"));
  });

  afterEach(() => {
    db.close();
  });

  it("nao restaura sem snapshot disponivel", () => {
    const restored = restoreLatestAprSnapshotService(db, {
      monthRef: "2026-03",
      payload: {
        reason: "rollback sem base",
        confirmText: "RESTORE APR MONTH 2026-03"
      }
    });

    expect(restored).toEqual({
      error: "Nenhum snapshot APR disponivel para restauracao",
      status: 404
    });
  });

  it("requer confirmacao exata no clear-month HTTP", () => {
    createAprManualEntryService(db, {
      requestedMonthRef: "2026-03",
      payload: {
        externalId: "APR-700",
        openedOn: "2026-03-20",
        subject: "mapeamento",
        collaborator: "Felipe"
      }
    });
    createAprSnapshotService(db, {
      monthRef: "2026-03",
      payload: { reason: "baseline" }
    });

    const router = createAprRouter(db, testConfig);
    const clearMonth = getRouteHandler(router, "/months/:month/clear", "post");
    const response = createMockResponse();

    clearMonth(
      {
        authUser: {
          id: 1,
          login: "admin",
          name: "Administrador",
          role: "admin"
        },
        params: { month: "2026-03" },
        body: {
          reason: "tentativa insegura",
          confirm_text: "CLEAR 2026-03"
        }
      },
      response
    );

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: "confirm_text deve ser exatamente CLEAR APR MONTH 2026-03"
    });
  });
});
