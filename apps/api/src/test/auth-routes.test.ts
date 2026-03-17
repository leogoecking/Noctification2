import path from "node:path";
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuthRouter } from "../routes/auth";
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
  allowInsecureFixedAdmin: true,
  enableReminderScheduler: false,
  adminSeed: {
    login: "admin",
    password: "admin",
    name: "Administrador"
  }
};

describe("auth routes", () => {
  let db: ReturnType<typeof connectDatabase>;
  let authRouter: ReturnType<typeof createAuthRouter>;

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

    authRouter = createAuthRouter(db, testConfig);
  });

  afterEach(() => {
    db.close();
  });

  it("realiza login, consulta sessao e logout pelo contrato da rota", async () => {
    const loginHandler = getRouteHandler(authRouter, "/login", "post");
    const meHandler = getRouteHandler(authRouter, "/me", "get");
    const logoutHandler = getRouteHandler(authRouter, "/logout", "post");

    const loginRes = createMockResponse();
    await loginHandler(
      {
        body: {
          login: "admin",
          password: "admin"
        },
        ip: "127.0.0.1"
      },
      loginRes
    );

    expect(loginRes.statusCode).toBe(200);
    expect((loginRes.body as { user: { login: string } }).user.login).toBe("admin");
    expect(loginRes.cookies[0]?.name).toBe(testConfig.cookieName);

    const adminUser = db
      .prepare("SELECT id, login, name, role FROM users WHERE login = 'admin'")
      .get() as { id: number; login: string; name: string; role: "admin" | "user" };

    const meRes = createMockResponse();
    meHandler(
      {
        authUser: adminUser
      },
      meRes
    );

    expect(meRes.statusCode).toBe(200);
    expect((meRes.body as { user: { login: string } }).user.login).toBe("admin");

    const logoutRes = createMockResponse();
    logoutHandler(
      {
        authUser: adminUser
      },
      logoutRes
    );

    expect(logoutRes.statusCode).toBe(204);
    expect(logoutRes.clearedCookies[0]?.name).toBe(testConfig.cookieName);
  });

  it("bloqueia login apos muitas tentativas invalidas", async () => {
    const loginHandler = getRouteHandler(authRouter, "/login", "post");

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = createMockResponse();
      await loginHandler(
        {
          body: {
            login: "admin",
            password: "senha-incorreta"
          },
          ip: "127.0.0.1"
        },
        response
      );

      expect(response.statusCode).toBe(401);
    }

    const blockedRes = createMockResponse();
    await loginHandler(
      {
        body: {
          login: "admin",
          password: "senha-incorreta"
        },
        ip: "127.0.0.1"
      },
      blockedRes
    );

    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.headers["retry-after"]).toBeTruthy();
  });

  it("realiza cadastro com cookie de sessao e rejeita login duplicado", async () => {
    const registerHandler = getRouteHandler(authRouter, "/register", "post");

    const registerRes = createMockResponse();
    await registerHandler(
      {
        body: {
          name: "Novo Usuario",
          login: "novo_user",
          password: "123456"
        }
      },
      registerRes
    );

    expect(registerRes.statusCode).toBe(201);
    expect((registerRes.body as { user: { login: string } }).user.login).toBe("novo_user");
    expect(registerRes.cookies[0]?.name).toBe(testConfig.cookieName);

    const duplicateRes = createMockResponse();
    await registerHandler(
      {
        body: {
          name: "Duplicado",
          login: "user",
          password: "123456"
        }
      },
      duplicateRes
    );

    expect(duplicateRes.statusCode).toBe(409);
  });

  it("normaliza login para lowercase e autentica de forma case-insensitive", async () => {
    const registerHandler = getRouteHandler(authRouter, "/register", "post");
    const loginHandler = getRouteHandler(authRouter, "/login", "post");

    const registerRes = createMockResponse();
    await registerHandler(
      {
        body: {
          name: "Case User",
          login: "Novo_User",
          password: "123456"
        }
      },
      registerRes
    );

    expect(registerRes.statusCode).toBe(201);
    expect((registerRes.body as { user: { login: string } }).user.login).toBe("novo_user");

    const duplicateRes = createMockResponse();
    await registerHandler(
      {
        body: {
          name: "Duplicado",
          login: "NOVO_USER",
          password: "123456"
        }
      },
      duplicateRes
    );

    expect(duplicateRes.statusCode).toBe(409);

    const loginRes = createMockResponse();
    await loginHandler(
      {
        body: {
          login: "AdMiN",
          password: "admin"
        },
        ip: "127.0.0.1"
      },
      loginRes
    );

    expect(loginRes.statusCode).toBe(200);
    expect((loginRes.body as { user: { login: string } }).user.login).toBe("admin");
  });

  it("rejeita login quando o papel esperado diverge antes de criar cookie", async () => {
    const loginHandler = getRouteHandler(authRouter, "/login", "post");
    const loginRes = createMockResponse();

    await loginHandler(
      {
        body: {
          login: "admin",
          password: "admin",
          expected_role: "user"
        },
        ip: "127.0.0.1"
      },
      loginRes
    );

    expect(loginRes.statusCode).toBe(403);
    expect((loginRes.body as { error: string }).error).toBe("Use /login para acesso de usuario");
    expect(loginRes.cookies).toHaveLength(0);
  });

  it("limpa o cookie no logout mesmo com sessao invalida", () => {
    const logoutHandler = getRouteHandler(authRouter, "/logout", "post");
    const logoutRes = createMockResponse();

    logoutHandler(
      {
        cookies: {
          [testConfig.cookieName]: "token-invalido"
        }
      },
      logoutRes
    );

    expect(logoutRes.statusCode).toBe(204);
    expect(logoutRes.clearedCookies[0]?.name).toBe(testConfig.cookieName);
  });
});
