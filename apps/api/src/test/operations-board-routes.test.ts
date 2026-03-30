import path from "node:path";
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AppConfig } from "../config";
import { connectDatabase, nowIso, runMigrations } from "../db";
import { createOperationsBoardMeRouter } from "../routes/operations-board-me";
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

describe("operations board routes", () => {
  let db: ReturnType<typeof connectDatabase>;
  let meRouter: ReturnType<typeof createOperationsBoardMeRouter>;
  let regularUser: { id: number; login: string; name: string; role: "admin" | "user" };
  let secondUser: { id: number; login: string; name: string; role: "admin" | "user" };

  beforeEach(async () => {
    db = connectDatabase(":memory:");
    runMigrations(db, path.resolve(process.cwd(), "migrations"));

    const userPasswordHash = await bcrypt.hash("123456", 10);
    const timestamp = nowIso();

    db.prepare(
      `
        INSERT INTO users (name, login, password_hash, department, job_title, role, is_active, created_at, updated_at)
        VALUES
          ('Usuario Teste', 'user', ?, 'Suporte', 'Analista', 'user', 1, ?, ?),
          ('Outro Usuario', 'user2', ?, 'Operacoes', 'Tecnico', 'user', 1, ?, ?)
      `
    ).run(userPasswordHash, timestamp, timestamp, userPasswordHash, timestamp, timestamp);

    regularUser = db
      .prepare("SELECT id, login, name, role FROM users WHERE login = 'user'")
      .get() as typeof regularUser;
    secondUser = db
      .prepare("SELECT id, login, name, role FROM users WHERE login = 'user2'")
      .get() as typeof secondUser;

    meRouter = createOperationsBoardMeRouter(db, testConfig);
  });

  afterEach(() => {
    db.close();
  });

  it("permite criar, listar, comentar e encerrar recados do mural com timeline", () => {
    const createHandler = getRouteHandler(meRouter, "/operations-board", "post");
    const listHandler = getRouteHandler(meRouter, "/operations-board", "get");
    const detailHandler = getRouteHandler(meRouter, "/operations-board/:id", "get");
    const commentHandler = getRouteHandler(meRouter, "/operations-board/:id/comments", "post");
    const updateHandler = getRouteHandler(meRouter, "/operations-board/:id", "patch");

    const createRes = createMockResponse();
    createHandler(
      {
        authUser: regularUser,
        body: {
          title: "Turno da madrugada",
          body: "Monitorar o enlace principal e repassar qualquer oscilacao."
        }
      },
      createRes
    );

    expect(createRes.statusCode).toBe(201);
    const messageId = (createRes.body as { message: { id: number } }).message.id;

    const listRes = createMockResponse();
    listHandler(
      {
        authUser: secondUser,
        query: {
          status: "active"
        }
      },
      listRes
    );

    expect(listRes.statusCode).toBe(200);
    expect((listRes.body as { messages: Array<{ title: string }> }).messages[0]?.title).toBe(
      "Turno da madrugada"
    );

    const commentRes = createMockResponse();
    commentHandler(
      {
        authUser: secondUser,
        params: {
          id: String(messageId)
        },
        body: {
          body: "Oscilacao observada as 03:10, seguindo acompanhamento."
        }
      },
      commentRes
    );

    expect(commentRes.statusCode).toBe(201);

    const updateRes = createMockResponse();
    updateHandler(
      {
        authUser: regularUser,
        params: {
          id: String(messageId)
        },
        body: {
          status: "resolved"
        }
      },
      updateRes
    );

    expect(updateRes.statusCode).toBe(200);
    expect((updateRes.body as { message: { status: string } }).message.status).toBe("resolved");

    const detailRes = createMockResponse();
    detailHandler(
      {
        authUser: secondUser,
        params: {
          id: String(messageId)
        }
      },
      detailRes
    );

    expect(detailRes.statusCode).toBe(200);
    const detailBody = detailRes.body as {
      message: { title: string; status: string };
      timeline: Array<{ eventType: string; actorLogin: string; body: string | null }>;
    };
    expect(detailBody.message.title).toBe("Turno da madrugada");
    expect(detailBody.message.status).toBe("resolved");
    expect(detailBody.timeline.map((item) => item.eventType)).toEqual([
      "resolved",
      "commented",
      "created"
    ]);
    expect(detailBody.timeline[1]?.actorLogin).toBe("user2");
    expect(detailBody.timeline[1]?.body).toMatch(/03:10/);
  });
});
