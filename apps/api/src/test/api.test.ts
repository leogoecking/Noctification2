import path from "node:path";
import { createServer, type Server as HttpServer } from "node:http";
import request from "supertest";
import bcrypt from "bcryptjs";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { connectDatabase, runMigrations, nowIso } from "../db";
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

  it("envia notificacao e marca leitura", async () => {
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

    const myNotifications = await userAgent.get("/api/v1/me/notifications?status=unread");
    expect(myNotifications.status).toBe(200);
    expect(myNotifications.body.notifications.length).toBe(1);

    const notificationId = myNotifications.body.notifications[0].id;

    const markRead = await userAgent.post(`/api/v1/me/notifications/${notificationId}/read`);
    expect(markRead.status).toBe(200);
    expect(markRead.body.readAt).toBeTruthy();

    const adminHistory = await adminAgent.get("/api/v1/admin/notifications?status=read");
    expect(adminHistory.status).toBe(200);
    expect(adminHistory.body.notifications.length).toBe(1);
    expect(adminHistory.body.notifications[0].stats.read).toBe(1);
  });
});
