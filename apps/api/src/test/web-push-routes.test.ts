import path from "node:path";
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "socket.io";
import { createMeRouter } from "../routes/me";
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
  webPushSubject: "mailto:admin@noctification.local",
  webPushVapidPublicKey:
    "BK0E4uQdX6QzJ9oL9lA4fQ1VfHk4U12G0jR5cA5QxY8lM0LQvX2K0sB2xE5N1rR2mGQqv8M6eL4cN8pR0sU9M0",
  webPushVapidPrivateKey:
    "5jWZk8xS7bT0sR4nV6mQ1aP3yL9eK2dH7cF5gJ1pQ8r",
  adminSeed: {
    login: "admin",
    password: "admin",
    name: "Administrador"
  }
};

describe("web push routes", () => {
  let db: ReturnType<typeof connectDatabase>;
  let meRouter: ReturnType<typeof createMeRouter>;
  let regularUser: { id: number; login: string; name: string; role: "admin" | "user" };

  const ioStub = {
    to() {
      return {
        emit() {
          return undefined;
        }
      };
    },
    sockets: {
      adapter: {
        rooms: new Map()
      }
    }
  };

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
          ('Usuario Teste', 'user', ?, 'Suporte', 'Analista', 'user', 1, ?, ?)
      `
    ).run(adminPasswordHash, timestamp, timestamp, userPasswordHash, timestamp, timestamp);

    regularUser = db
      .prepare("SELECT id, login, name, role FROM users WHERE login = 'user'")
      .get() as typeof regularUser;

    meRouter = createMeRouter(db, ioStub as unknown as Server, testConfig);
  });

  afterEach(() => {
    db.close();
  });

  it("retorna configuracao publica do web push", () => {
    const handler = getRouteHandler(meRouter, "/web-push/config", "get");
    const response = createMockResponse();

    handler({ authUser: regularUser }, response);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      enabled: true,
      vapidPublicKey: testConfig.webPushVapidPublicKey
    });
  });

  it("salva subscription do usuario autenticado", () => {
    const handler = getRouteHandler(meRouter, "/web-push/subscription", "put");
    const response = createMockResponse();

    handler(
      {
        authUser: regularUser,
        headers: {
          "user-agent": "Vitest Browser"
        },
        body: {
          endpoint: "https://push.example.test/sub/abc",
          expirationTime: null,
          keys: {
            p256dh: "key-p256dh",
            auth: "key-auth"
          }
        }
      },
      response
    );

    expect(response.statusCode).toBe(200);

    const stored = db
      .prepare(
        `
          SELECT endpoint, p256dh, auth, user_agent AS userAgent
          FROM web_push_subscriptions
          WHERE user_id = ?
        `
      )
      .get(regularUser.id) as {
      endpoint: string;
      p256dh: string;
      auth: string;
      userAgent: string;
    };

    expect(stored.endpoint).toBe("https://push.example.test/sub/abc");
    expect(stored.p256dh).toBe("key-p256dh");
    expect(stored.auth).toBe("key-auth");
    expect(stored.userAgent).toBe("Vitest Browser");
  });

  it("remove subscription pelo endpoint", () => {
    db.prepare(
      `
        INSERT INTO web_push_subscriptions (
          user_id, endpoint, p256dh, auth, expiration_time, user_agent, device_label, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, '', NULL, ?, ?)
      `
    ).run(
      regularUser.id,
      "https://push.example.test/sub/remove",
      "key-p256dh",
      "key-auth",
      nowIso(),
      nowIso()
    );

    const handler = getRouteHandler(meRouter, "/web-push/subscription", "delete");
    const response = createMockResponse();

    handler(
      {
        authUser: regularUser,
        body: {
          endpoint: "https://push.example.test/sub/remove"
        }
      },
      response
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true, removed: 1 });
  });
});
