import { describe, expect, it } from "vitest";
import { createKmlPosteRouter } from "../modules/kml-postes/routes";
import { connectDatabase } from "../db";
import type { AppConfig } from "../config";
import { createMockResponse, getRouteHandler } from "./route-test-helpers";

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
  enableAprModule: false,
  enableKmlPosteModule: true,
  adminSeed: {
    login: "admin",
    password: "admin",
    name: "Administrador"
  }
};

describe("kml-poste routes", () => {
  it("expõe health do módulo quando habilitado", () => {
    const db = connectDatabase(":memory:");
    const router = createKmlPosteRouter(db, testConfig);
    const handler = getRouteHandler(router, "/health", "get");
    const response = createMockResponse();

    handler({}, response);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      module: "kml-postes"
    });

    db.close();
  });
});
