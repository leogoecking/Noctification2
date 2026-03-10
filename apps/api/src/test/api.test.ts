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
  it("impede usuario comum de acessar endpoint admin", async () => {
    const userAgent = request.agent(server);

    await userAgent.post("/api/v1/auth/login").send({ login: "user", password: "123456" });
    const adminUsers = await userAgent.get("/api/v1/admin/users");

    expect(adminUsers.status).toBe(403);
  });

  it("retorna 400 ao criar usuario com role invalida", async () => {
    const adminAgent = request.agent(server);

    await adminAgent.post("/api/v1/auth/login").send({ login: "admin", password: "123456" });

    const createResponse = await adminAgent.post("/api/v1/admin/users").send({
      name: "Role Invalida",
      login: "role_invalida",
      password: "123456",
      role: "superadmin"
    });

    expect(createResponse.status).toBe(400);
    expect(createResponse.body.error).toMatch(/role deve ser admin ou user/i);
  });

  it("retorna 400 ao atualizar usuario com role invalida", async () => {
    const adminAgent = request.agent(server);

    await adminAgent.post("/api/v1/auth/login").send({ login: "admin", password: "123456" });
    const usersResponse = await adminAgent.get("/api/v1/admin/users");
    const targetUser = usersResponse.body.users.find((user: { login: string }) => user.login === "user");

    const updateResponse = await adminAgent.patch(`/api/v1/admin/users/${targetUser.id}`).send({
      role: "superadmin"
    });

    expect(updateResponse.status).toBe(400);
    expect(updateResponse.body.error).toMatch(/role deve ser admin ou user/i);
  });

  it("retorna 409 ao tentar atualizar usuario para login ja existente", async () => {
    const adminAgent = request.agent(server);

    await adminAgent.post("/api/v1/auth/login").send({ login: "admin", password: "123456" });
    const usersResponse = await adminAgent.get("/api/v1/admin/users");
    const targetUser = usersResponse.body.users.find((user: { login: string }) => user.login === "user");

    const updateResponse = await adminAgent.patch(`/api/v1/admin/users/${targetUser.id}`).send({
      login: "admin"
    });

    expect(updateResponse.status).toBe(409);
    expect(updateResponse.body.error).toMatch(/Login ja existente/i);
  });

  it("suporta envio para muitos destinatarios sem erro de limite do SQLite", async () => {
    const adminAgent = request.agent(server);

    const passwordHash = await bcrypt.hash("123456", 10);
    const now = nowIso();
    const insertUser = db.prepare(
      `
        INSERT INTO users (name, login, password_hash, department, job_title, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 'Operacao', 'Analista', 'user', 1, ?, ?)
      `
    );

    for (let i = 1; i <= 1100; i += 1) {
      insertUser.run(`Carga ${i}`, `bulk_${i}`, passwordHash, now, now);
    }

    await adminAgent.post("/api/v1/auth/login").send({ login: "admin", password: "123456" });
    const usersResponse = await adminAgent.get("/api/v1/admin/users");
    const bulkIds = usersResponse.body.users
      .filter((user: { login: string; role: string }) => user.role === "user" && user.login.startsWith("bulk_"))
      .map((user: { id: number }) => user.id);

    const sendResponse = await adminAgent.post("/api/v1/admin/notifications").send({
      title: "Carga grande",
      message: "Teste com muitos destinatarios",
      priority: "normal",
      recipient_mode: "users",
      recipient_ids: bulkIds
    });

    expect(sendResponse.status).toBe(201);
    expect(sendResponse.body.notification.recipient_count).toBe(bulkIds.length);
  });

  it("retorna 400 para filtro de status invalido no historico admin", async () => {
    const adminAgent = request.agent(server);
    await adminAgent.post("/api/v1/auth/login").send({ login: "admin", password: "123456" });

    const response = await adminAgent.get("/api/v1/admin/notifications?status=invalido");

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/status deve ser read ou unread/i);
  });

  it("nao perde notificacoes nao lidas antigas ao filtrar status unread", async () => {
    const adminAgent = request.agent(server);
    await adminAgent.post("/api/v1/auth/login").send({ login: "admin", password: "123456" });

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
        isOldUnread ? null : "resolvido",
        isOldUnread ? null : timestamp,
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

