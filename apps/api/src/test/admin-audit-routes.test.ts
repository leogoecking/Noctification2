import path from "node:path";
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "socket.io";
import { createAdminRouter } from "../routes/admin";
import { connectDatabase, logAudit, nowIso, runMigrations } from "../db";
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
  adminSeed: {
    login: "admin",
    password: "admin",
    name: "Administrador"
  }
};

describe("admin audit routes", () => {
  let db: ReturnType<typeof connectDatabase>;
  let adminRouter: ReturnType<typeof createAdminRouter>;
  let adminUser: { id: number; login: string; name: string; role: "admin" | "user" };

  const ioStub = {
    to: (_room: string) => ({
      emit: (_event: string, _payload: unknown) => undefined
    }),
    sockets: {
      adapter: {
        rooms: new Map()
      }
    }
  } as unknown as Server;

  beforeEach(async () => {
    db = connectDatabase(":memory:");
    runMigrations(db, path.resolve(process.cwd(), "migrations"));

    const adminPasswordHash = await bcrypt.hash("admin", 10);
    const timestamp = nowIso();

    db.prepare(
      `
        INSERT INTO users (name, login, password_hash, department, job_title, role, is_active, created_at, updated_at)
        VALUES ('Admin Fixo', 'admin', ?, 'NOC', 'Coordenador', 'admin', 1, ?, ?)
      `
    ).run(adminPasswordHash, timestamp, timestamp);

    adminUser = db
      .prepare("SELECT id, login, name, role FROM users WHERE login = 'admin'")
      .get() as typeof adminUser;

    logAudit(db, {
      actorUserId: adminUser.id,
      eventType: "admin.notification.send",
      targetType: "notification",
      targetId: 10,
      metadata: {
        recipientCount: 2
      }
    });
    logAudit(db, {
      actorUserId: adminUser.id,
      eventType: "admin.user.create",
      targetType: "user",
      targetId: 20
    });

    adminRouter = createAdminRouter(db, ioStub, testConfig);
  });

  afterEach(() => {
    db.close();
  });

  it("filtra auditoria por event_type e retorna actor e metadata", () => {
    const getAuditHandler = getRouteHandler(adminRouter, "/audit", "get");

    const response = createMockResponse();
    getAuditHandler(
      {
        authUser: adminUser,
        query: {
          event_type: "admin.notification.send",
          limit: "10",
          page: "1"
        }
      },
      response
    );

    expect(response.statusCode).toBe(200);

    const body = response.body as {
      events: Array<{
        event_type: string;
        actor: { id: number; login: string } | null;
        metadata: { recipientCount?: number } | null;
      }>;
      pagination: { total: number; totalPages: number };
    };

    expect(body.pagination.total).toBe(1);
    expect(body.pagination.totalPages).toBe(1);
    expect(body.events).toHaveLength(1);
    expect(body.events[0].event_type).toBe("admin.notification.send");
    expect(body.events[0].actor?.id).toBe(adminUser.id);
    expect(body.events[0].actor?.login).toBe("admin");
    expect(body.events[0].metadata).toMatchObject({ recipientCount: 2 });
  });
});
