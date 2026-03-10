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
  corsOrigins: ["http://localhost:5173"],
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

  it("faz login e logout com sucesso para admin fixo", async () => {
    const agent = request.agent(server);

    const login = await agent.post("/api/v1/auth/login").send({ login: "admin", password: "admin" });
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

  it("rejeita senha incorreta para admin fixo", async () => {
    const response = await request(server)
      .post("/api/v1/auth/login")
      .send({ login: "admin", password: "123456" });

    expect(response.status).toBe(401);
  });

  it("bloqueia login apos muitas tentativas invalidas", async () => {
    const agent = request.agent(server);

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await agent
        .post("/api/v1/auth/login")
        .send({ login: "admin", password: "senha-incorreta" });

      expect(response.status).toBe(401);
    }

    const blocked = await agent
      .post("/api/v1/auth/login")
      .send({ login: "admin", password: "senha-incorreta" });

    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeTruthy();
  });

  it("realiza cadastro e inicia sessao automaticamente", async () => {
    const agent = request.agent(server);

    const register = await agent.post("/api/v1/auth/register").send({
      name: "Novo Usuario",
      login: "novo_user",
      password: "123456"
    });

    expect(register.status).toBe(201);
    expect(register.body.user.login).toBe("novo_user");
    expect(register.body.user.role).toBe("user");

    const me = await agent.get("/api/v1/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.login).toBe("novo_user");
  });

  it("retorna 409 para cadastro com login duplicado", async () => {
    const response = await request(server).post("/api/v1/auth/register").send({
      name: "Duplicado",
      login: "user",
      password: "123456"
    });

    expect(response.status).toBe(409);
  });

  it("impede usuario comum de acessar endpoint admin", async () => {
    const userAgent = request.agent(server);

    await userAgent.post("/api/v1/auth/login").send({ login: "user", password: "123456" });
    const adminUsers = await userAgent.get("/api/v1/admin/users");

    expect(adminUsers.status).toBe(403);
  });

  it("impede criar outro admin pela API de usuarios", async () => {
    const adminAgent = request.agent(server);
    await adminAgent.post("/api/v1/auth/login").send({ login: "admin", password: "admin" });

    const response = await adminAgent.post("/api/v1/admin/users").send({
      name: "Outro Admin",
      login: "admin2",
      password: "123456",
      role: "admin"
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/admin fixo/i);
  });

  it("retorna 400 para filtro de status invalido no historico admin", async () => {
    const adminAgent = request.agent(server);
    await adminAgent.post("/api/v1/auth/login").send({ login: "admin", password: "admin" });

    const response = await adminAgent.get("/api/v1/admin/notifications?status=invalido");

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/status deve ser read ou unread/i);
  });

  it("nao perde notificacoes nao lidas antigas ao filtrar status unread", async () => {
    const adminAgent = request.agent(server);
    await adminAgent.post("/api/v1/auth/login").send({ login: "admin", password: "admin" });

    const baseTime = Date.now();
    const insertNotification = db.prepare(
      `
        INSERT INTO notifications (title, message, priority, sender_id, recipient_mode, created_at)
        VALUES (?, ?, 'normal', 1, 'users', ?)
      `
    );
    const insertRecipient = db.prepare(
      `
        INSERT INTO notification_recipients (
          notification_id,
          user_id,
          delivered_at,
          read_at,
          created_at,
          response_status,
          response_at,
          response_message,
          last_reminder_at,
          reminder_count
        ) VALUES (?, 2, ?, ?, ?, ?, ?, ?, NULL, 0)
      `
    );

    for (let index = 1; index <= 205; index += 1) {
      const timestamp = new Date(baseTime + index * 1000).toISOString();
      const notification = insertNotification.run(
        `Historico ${index}`,
        `Mensagem ${index}`,
        timestamp
      );
      const notificationId = Number(notification.lastInsertRowid);
      const isOldUnread = index <= 5;

      insertRecipient.run(
        notificationId,
        timestamp,
        isOldUnread ? null : timestamp,
        timestamp,
        null,
        null,
        null
      );
    }

    const unreadResponse = await adminAgent.get("/api/v1/admin/notifications?status=unread");

    expect(unreadResponse.status).toBe(200);
    expect(unreadResponse.body.notifications.length).toBe(5);
    expect(
      unreadResponse.body.notifications.every(
        (item: { stats: { unread: number } }) => item.stats.unread > 0
      )
    ).toBe(true);
  });

  it("marca todas como lidas sem afetar status de resposta", async () => {
    const adminAgent = request.agent(server);
    const userAgent = request.agent(server);

    await adminAgent.post("/api/v1/auth/login").send({ login: "admin", password: "admin" });
    await userAgent.post("/api/v1/auth/login").send({ login: "user", password: "123456" });

    const usersResponse = await adminAgent.get("/api/v1/admin/users");
    const targetUser = usersResponse.body.users.find((item: { login: string }) => item.login === "user");

    await adminAgent.post("/api/v1/admin/notifications").send({
      title: "N1",
      message: "Mensagem 1",
      priority: "high",
      recipient_mode: "users",
      recipient_ids: [targetUser.id]
    });

    await adminAgent.post("/api/v1/admin/notifications").send({
      title: "N2",
      message: "Mensagem 2",
      priority: "normal",
      recipient_mode: "users",
      recipient_ids: [targetUser.id]
    });

    const unreadBefore = await userAgent.get("/api/v1/me/notifications?status=unread");
    expect(unreadBefore.status).toBe(200);
    expect(unreadBefore.body.notifications.length).toBe(2);

    const firstId = unreadBefore.body.notifications[0].id as number;
    const respond = await userAgent.post(`/api/v1/me/notifications/${firstId}/respond`).send({
      response_status: "em_andamento",
      response_message: "Investigando"
    });

    expect(respond.status).toBe(200);
    expect(respond.body.responseStatus).toBe("em_andamento");
    expect(respond.body.isRead).toBe(true);

    const unreadAfterRespond = await userAgent.get("/api/v1/me/notifications?status=unread");
    expect(unreadAfterRespond.status).toBe(200);
    expect(unreadAfterRespond.body.notifications.length).toBe(1);

    const readAll = await userAgent.post("/api/v1/me/notifications/read-all");
    expect(readAll.status).toBe(200);
    expect(readAll.body.updatedCount).toBe(1);

    const unreadAfterAll = await userAgent.get("/api/v1/me/notifications?status=unread");
    expect(unreadAfterAll.status).toBe(200);
    expect(unreadAfterAll.body.notifications.length).toBe(0);

    const allNotifications = await userAgent.get("/api/v1/me/notifications");
    expect(allNotifications.status).toBe(200);
    expect(allNotifications.body.notifications.every((item: { isRead: boolean }) => item.isRead)).toBe(true);

    const inProgressNotification = allNotifications.body.notifications.find(
      (item: { id: number }) => item.id === firstId
    );
    expect(inProgressNotification.responseStatus).toBe("em_andamento");
  });
});
