import path from "node:path";
import { createServer, type Server as HttpServer } from "node:http";
import request from "supertest";
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { connectDatabase, nowIso, runMigrations } from "../db";
import { setupSocket } from "../socket";
import type { AppConfig } from "../config";

const testConfig: AppConfig = {
  nodeEnv: "test",
  port: 0,
  dbPath: ":memory:",
  jwtSecret: "test-secret",
  jwtExpiresHours: 8,
  corsOrigin: "http://localhost:5173",
  cookieName: "nc_access",
  adminSeed: {
    login: "admin",
    password: "admin",
    name: "Administrador"
  }
};

describe("API notification flow", () => {
  let db: ReturnType<typeof connectDatabase>;
  let server: HttpServer;

  const seedUsers = async () => {
    const passwordHash = await bcrypt.hash("123456", 10);
    const timestamp = nowIso();

    db.prepare(
      `
        INSERT INTO users (name, login, password_hash, department, job_title, role, is_active, created_at, updated_at)
        VALUES
          ('Admin Teste', 'admin', ?, 'NOC', 'Coordenador', 'admin', 1, ?, ?),
          ('Usuario Teste', 'user', ?, 'Suporte', 'Analista', 'user', 1, ?, ?)
      `
    ).run(passwordHash, timestamp, timestamp, passwordHash, timestamp, timestamp);
  };

  beforeEach(async () => {
    db = connectDatabase(":memory:");
    runMigrations(db, path.resolve(process.cwd(), "migrations"));
    await seedUsers();

    server = createServer();
    const io = setupSocket(server, db, testConfig);
    const app = createApp(db, io, testConfig);
    server.on("request", app);
  });

  afterEach(() => {
    server.close();
    db.close();
  });

  it("faz login e logout com sucesso", async () => {
    const agent = request.agent(server);

    const login = await agent.post("/api/v1/auth/login").send({ login: "admin", password: "123456" });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe("admin");

    const me = await agent.get("/api/v1/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.login).toBe("admin");

    const logout = await agent.post("/api/v1/auth/logout");
    expect(logout.status).toBe(204);

    const meAfterLogout = await agent.get("/api/v1/auth/me");
    expect(meAfterLogout.status).toBe(401);
  });

  it("impede usuario comum de acessar endpoint admin", async () => {
    const userAgent = request.agent(server);

    await userAgent.post("/api/v1/auth/login").send({ login: "user", password: "123456" });
    const adminUsers = await userAgent.get("/api/v1/admin/users");

    expect(adminUsers.status).toBe(403);
  });

  it("mantem notificacao pendente apos refresh ate marcar resolvido", async () => {
    const adminAgent = request.agent(server);
    const userAgent = request.agent(server);

    await adminAgent.post("/api/v1/auth/login").send({ login: "admin", password: "123456" });
    await userAgent.post("/api/v1/auth/login").send({ login: "user", password: "123456" });

    const usersResponse = await adminAgent.get("/api/v1/admin/users");
    const targetUser = usersResponse.body.users.find((user: { login: string }) => user.login === "user");

    const sendResponse = await adminAgent.post("/api/v1/admin/notifications").send({
      title: "Teste",
      message: "Mensagem de teste",
      priority: "high",
      recipient_mode: "users",
      recipient_ids: [targetUser.id]
    });

    expect(sendResponse.status).toBe(201);

    const myUnreadStart = await userAgent.get("/api/v1/me/notifications?status=unread");
    expect(myUnreadStart.status).toBe(200);
    expect(myUnreadStart.body.notifications.length).toBe(1);

    const notificationId = myUnreadStart.body.notifications[0].id as number;

    const setInProgress = await userAgent.post(`/api/v1/me/notifications/${notificationId}/respond`).send({
      response_status: "em_andamento",
      response_message: "Estou verificando o incidente"
    });

    expect(setInProgress.status).toBe(200);
    expect(setInProgress.body.responseStatus).toBe("em_andamento");
    expect(setInProgress.body.responseMessage).toBe("Estou verificando o incidente");
    expect(setInProgress.body.isRead).toBe(false);

    const myAllAfterProgress = await userAgent.get("/api/v1/me/notifications");
    expect(myAllAfterProgress.status).toBe(200);
    expect(myAllAfterProgress.body.notifications[0].isRead).toBe(false);

    const markReadWhileInProgress = await userAgent.post(`/api/v1/me/notifications/${notificationId}/read`);
    expect(markReadWhileInProgress.status).toBe(200);
    expect(markReadWhileInProgress.body.isRead).toBe(false);

    const myUnreadAfterRefreshScenario = await userAgent.get("/api/v1/me/notifications?status=unread");
    expect(myUnreadAfterRefreshScenario.status).toBe(200);
    expect(myUnreadAfterRefreshScenario.body.notifications.length).toBe(1);

    const adminUnread = await adminAgent.get("/api/v1/admin/notifications?status=unread");
    expect(adminUnread.status).toBe(200);
    expect(adminUnread.body.notifications.length).toBe(1);
    expect(adminUnread.body.notifications[0].recipients[0].responseMessage).toBe("Estou verificando o incidente");

    const resolve = await userAgent.post(`/api/v1/me/notifications/${notificationId}/respond`).send({
      response_status: "resolvido"
    });

    expect(resolve.status).toBe(200);
    expect(resolve.body.isRead).toBe(true);

    const myUnreadAfterResolve = await userAgent.get("/api/v1/me/notifications?status=unread");
    expect(myUnreadAfterResolve.status).toBe(200);
    expect(myUnreadAfterResolve.body.notifications.length).toBe(0);

    const adminRead = await adminAgent.get("/api/v1/admin/notifications?status=read");
    expect(adminRead.status).toBe(200);
    expect(adminRead.body.notifications.length).toBe(1);
    expect(adminRead.body.notifications[0].stats.unread).toBe(0);

    const audit = await adminAgent.get("/api/v1/admin/audit?limit=20");
    expect(audit.status).toBe(200);
    expect(
      audit.body.events.some((event: { event_type: string }) => event.event_type === "notification.respond")
    ).toBe(true);
  });
});

