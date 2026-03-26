import path from "node:path";
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "socket.io";
import { createAdminRouter } from "../routes/admin";
import { connectDatabase, nowIso, runMigrations } from "../db";
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

describe("admin user routes", () => {
  let db: ReturnType<typeof connectDatabase>;
  let adminRouter: ReturnType<typeof createAdminRouter>;
  let adminUser: { id: number; login: string; name: string; role: "admin" | "user" };

  const ioStub = {
    to: (_room: string) => ({
      emit: (_event: string, _payload: unknown) => undefined
    }),
    in: (_room: string) => ({
      disconnectSockets: (_close?: boolean) => undefined
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
    const userPasswordHash = await bcrypt.hash("123456", 10);
    const timestamp = nowIso();

    db.prepare(
      `
        INSERT INTO users (name, login, password_hash, department, job_title, role, is_active, created_at, updated_at)
        VALUES
          ('Admin Fixo', 'admin', ?, 'NOC', 'Coordenador', 'admin', 1, ?, ?),
          ('Usuario Base', 'user', ?, 'Suporte', 'Analista', 'user', 1, ?, ?)
      `
    ).run(adminPasswordHash, timestamp, timestamp, userPasswordHash, timestamp, timestamp);

    adminUser = db
      .prepare("SELECT id, login, name, role FROM users WHERE login = 'admin'")
      .get() as typeof adminUser;

    adminRouter = createAdminRouter(db, ioStub, testConfig);
  });

  afterEach(() => {
    db.close();
  });

  it("normaliza login em criacao e bloqueia duplicidade case-insensitive", async () => {
    const createUserHandler = getRouteHandler(adminRouter, "/users", "post");

    const createRes = createMockResponse();
    await createUserHandler(
      {
        authUser: adminUser,
        body: {
          name: "Novo Usuario",
          login: "Novo.Login",
          password: "123456",
          department: "Campo",
          job_title: "Tecnico"
        }
      },
      createRes
    );

    expect(createRes.statusCode).toBe(201);
    expect((createRes.body as { user: { login: string } }).user.login).toBe("novo.login");

    const duplicateRes = createMockResponse();
    await createUserHandler(
      {
        authUser: adminUser,
        body: {
          name: "Duplicado",
          login: "NOVO.LOGIN",
          password: "123456"
        }
      },
      duplicateRes
    );

    expect(duplicateRes.statusCode).toBe(409);
  });

  it("normaliza login em edicao e bloqueia colisao case-insensitive", async () => {
    const createUserHandler = getRouteHandler(adminRouter, "/users", "post");
    const updateUserHandler = getRouteHandler(adminRouter, "/users/:id", "patch");

    const createFirstRes = createMockResponse();
    await createUserHandler(
      {
        authUser: adminUser,
        body: {
          name: "Primeiro",
          login: "primeiro.user",
          password: "123456"
        }
      },
      createFirstRes
    );

    const firstUserId = (createFirstRes.body as { user: { id: number } }).user.id;

    const createSecondRes = createMockResponse();
    await createUserHandler(
      {
        authUser: adminUser,
        body: {
          name: "Segundo",
          login: "segundo.user",
          password: "123456"
        }
      },
      createSecondRes
    );

    const secondUserId = (createSecondRes.body as { user: { id: number } }).user.id;

    const updateRes = createMockResponse();
    await updateUserHandler(
      {
        authUser: adminUser,
        params: { id: String(secondUserId) },
        body: {
          login: "SEGUNDO.UPDATED"
        }
      },
      updateRes
    );

    expect(updateRes.statusCode).toBe(200);
    expect((updateRes.body as { user: { login: string } }).user.login).toBe("segundo.updated");

    const conflictRes = createMockResponse();
    await updateUserHandler(
      {
        authUser: adminUser,
        params: { id: String(firstUserId) },
        body: {
          login: "SEGUNDO.UPDATED"
        }
      },
      conflictRes
    );

    expect(conflictRes.statusCode).toBe(409);
  });

  it("aceita isActive no toggle de status admin", () => {
    const toggleStatusHandler = getRouteHandler(adminRouter, "/users/:id/status", "patch");
    const targetUser = db
      .prepare("SELECT id FROM users WHERE login = 'user'")
      .get() as { id: number };

    const response = createMockResponse();
    toggleStatusHandler(
      {
        authUser: adminUser,
        params: { id: String(targetUser.id) },
        body: { isActive: false }
      },
      response
    );

    expect(response.statusCode).toBe(204);
  });
});
