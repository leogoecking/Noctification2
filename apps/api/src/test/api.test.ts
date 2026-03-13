import path from "node:path";
import { createServer, type Server as HttpServer } from "node:http";
import request from "supertest";
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { connectDatabase, nowIso, runMigrations } from "../db";
import type { AppConfig } from "../config";
import { setupSocket } from "../socket";

const testConfig: AppConfig = {
  nodeEnv: "test",
  port: 0,
  dbPath: ":memory:",
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

const describeHttp =
  process.env.NOCTIFICATION_RUN_HTTP_TESTS === "1" ? describe : describe.skip;

describeHttp("API notification flow", () => {
  let db: ReturnType<typeof connectDatabase>;
  let server: HttpServer;
  let app: ReturnType<typeof createApp>;

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

  const extractCookie = (response: request.Response): string => {
    const rawCookie = response.headers["set-cookie"]?.[0];
    if (!rawCookie) {
      throw new Error("Cookie de sessao nao retornado");
    }

    return rawCookie.split(";")[0];
  };

  const withCookie = (_instance: unknown, cookie?: string) => {
    return {
      get: (path: string) => {
        const req = request(server).get(path);
        return cookie ? req.set("Cookie", cookie) : req;
      },
      post: (path: string) => {
        const req = request(server).post(path);
        return cookie ? req.set("Cookie", cookie) : req;
      },
      patch: (path: string) => {
        const req = request(server).patch(path);
        return cookie ? req.set("Cookie", cookie) : req;
      },
      delete: (path: string) => {
        const req = request(server).delete(path);
        return cookie ? req.set("Cookie", cookie) : req;
      }
    };
  };

  const loginAs = async (login: string, password: string): Promise<string> => {
    const response = await request(server).post("/api/v1/auth/login").send({ login, password });
    expect(response.status).toBe(200);
    return extractCookie(response);
  };

  beforeEach(async () => {
    db = connectDatabase(":memory:");
    runMigrations(db, path.resolve(process.cwd(), "migrations"));
    await seedUsers();

    server = createServer();
    const io = setupSocket(server, db, testConfig);
    app = createApp(db, io, testConfig);
    server.on("request", app);
  });

  afterEach(() => {
    server.close();
    db.close();
  });

  it("faz login e logout com sucesso para admin fixo", async () => {
    const cookie = await loginAs("admin", "admin");
    const client = withCookie(app, cookie);

    const me = await client.get("/api/v1/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.login).toBe("admin");

    const logout = await client.post("/api/v1/auth/logout");
    expect(logout.status).toBe(204);

    const meAfterLogout = await client.get("/api/v1/auth/me");
    expect(meAfterLogout.status).toBe(401);
  });

  it("rejeita senha incorreta para admin fixo", async () => {
    const response = await withCookie(app)
      .post("/api/v1/auth/login")
      .send({ login: "admin", password: "123456" });

    expect(response.status).toBe(401);
  });

  it("bloqueia login apos muitas tentativas invalidas", async () => {
    const client = withCookie(app);

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await client
        .post("/api/v1/auth/login")
        .send({ login: "admin", password: "senha-incorreta" });

      expect(response.status).toBe(401);
    }

    const blocked = await client
      .post("/api/v1/auth/login")
      .send({ login: "admin", password: "senha-incorreta" });

    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeTruthy();
  });

  it("realiza cadastro e inicia sessao automaticamente", async () => {
    const register = await withCookie(app).post("/api/v1/auth/register").send({
      name: "Novo Usuario",
      login: "novo_user",
      password: "123456"
    });

    expect(register.status).toBe(201);
    expect(register.body.user.login).toBe("novo_user");
    expect(register.body.user.role).toBe("user");

    const cookie = extractCookie(register);
    const me = await withCookie(app, cookie).get("/api/v1/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.login).toBe("novo_user");
  });

  it("retorna 409 para cadastro com login duplicado", async () => {
    const response = await withCookie(app).post("/api/v1/auth/register").send({
      name: "Duplicado",
      login: "user",
      password: "123456"
    });

    expect(response.status).toBe(409);
  });

  it("impede usuario comum de acessar endpoint admin", async () => {
    const cookie = await loginAs("user", "123456");
    const adminUsers = await withCookie(app, cookie).get("/api/v1/admin/users");

    expect(adminUsers.status).toBe(403);
  });

  it("impede criar outro admin pela API de usuarios", async () => {
    const cookie = await loginAs("admin", "admin");
    const adminClient = withCookie(app, cookie);

    const response = await adminClient.post("/api/v1/admin/users").send({
      name: "Outro Admin",
      login: "admin2",
      password: "123456",
      role: "admin"
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/admin fixo/i);
  });

  it("envia para all apenas usuarios comuns ativos", async () => {
    const cookie = await loginAs("admin", "admin");
    const adminClient = withCookie(app, cookie);

    const response = await adminClient.post("/api/v1/admin/notifications").send({
      title: "Broadcast",
      message: "Mensagem geral",
      priority: "normal",
      recipient_mode: "all",
      recipient_ids: []
    });

    expect(response.status).toBe(201);

    const recipients = db
      .prepare(
        `
          SELECT u.login
          FROM notification_recipients nr
          INNER JOIN users u ON u.id = nr.user_id
          WHERE nr.notification_id = ?
          ORDER BY u.login ASC
        `
      )
      .all(response.body.notification.id) as Array<{ login: string }>;

    expect(recipients.map((item) => item.login)).toEqual(["user"]);
  });

  it("retorna 400 para filtro de status invalido no historico admin", async () => {
    const cookie = await loginAs("admin", "admin");

    const response = await withCookie(app, cookie).get("/api/v1/admin/notifications?status=invalido");

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/status deve ser read ou unread/i);
  });

  it("nao perde notificacoes nao lidas antigas ao filtrar status unread", async () => {
    const cookie = await loginAs("admin", "admin");

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

    const unreadResponse = await withCookie(app, cookie).get("/api/v1/admin/notifications?status=unread");

    expect(unreadResponse.status).toBe(200);
    expect(unreadResponse.body.notifications.length).toBe(5);
    expect(
      unreadResponse.body.notifications.every(
        (item: { stats: { unread: number } }) => item.stats.unread > 0
      )
    ).toBe(true);
  });

  it("marca todas como lidas sem afetar status de resposta", async () => {
    const adminCookie = await loginAs("admin", "admin");
    const userCookie = await loginAs("user", "123456");
    const adminClient = withCookie(app, adminCookie);
    const userClient = withCookie(app, userCookie);

    const usersResponse = await adminClient.get("/api/v1/admin/users");
    const targetUser = usersResponse.body.users.find((item: { login: string }) => item.login === "user");

    await adminClient.post("/api/v1/admin/notifications").send({
      title: "N1",
      message: "Mensagem 1",
      priority: "high",
      recipient_mode: "users",
      recipient_ids: [targetUser.id]
    });

    await adminClient.post("/api/v1/admin/notifications").send({
      title: "N2",
      message: "Mensagem 2",
      priority: "normal",
      recipient_mode: "users",
      recipient_ids: [targetUser.id]
    });

    const unreadBefore = await userClient.get("/api/v1/me/notifications?status=unread");
    expect(unreadBefore.status).toBe(200);
    expect(unreadBefore.body.notifications.length).toBe(2);

    const firstId = unreadBefore.body.notifications[0].id as number;
    const respond = await userClient.post(`/api/v1/me/notifications/${firstId}/respond`).send({
      response_status: "em_andamento",
      response_message: "Investigando"
    });

    expect(respond.status).toBe(200);
    expect(respond.body.responseStatus).toBe("em_andamento");
    expect(respond.body.isVisualized).toBe(true);

    const unreadAfterRespond = await userClient.get("/api/v1/me/notifications?status=unread");
    expect(unreadAfterRespond.status).toBe(200);
    expect(unreadAfterRespond.body.notifications.length).toBe(1);

    const readAll = await userClient.post("/api/v1/me/notifications/read-all");
    expect(readAll.status).toBe(200);
    expect(readAll.body.updatedCount).toBe(1);

    const unreadAfterAll = await userClient.get("/api/v1/me/notifications?status=unread");
    expect(unreadAfterAll.status).toBe(200);
    expect(unreadAfterAll.body.notifications.length).toBe(0);

    const allNotifications = await userClient.get("/api/v1/me/notifications");
    expect(allNotifications.status).toBe(200);
    expect(
      allNotifications.body.notifications.every(
        (item: { isVisualized: boolean }) => item.isVisualized
      )
    ).toBe(true);

    const inProgressNotification = allNotifications.body.notifications.find(
      (item: { id: number }) => item.id === firstId
    );
    expect(inProgressNotification.responseStatus).toBe("em_andamento");
  });

  it("permite criar, listar, filtrar e atualizar lembretes do proprio usuario", async () => {
    const userCookie = await loginAs("user", "123456");
    const userClient = withCookie(app, userCookie);

    const create = await userClient.post("/api/v1/me/reminders").send({
      title: "Tomar agua",
      description: "500ml",
      startDate: "2026-03-13",
      timeOfDay: "09:30",
      timezone: "America/Bahia",
      repeatType: "weekly",
      weekdays: [1, 3, 5]
    });

    expect(create.status).toBe(201);
    expect(create.body.reminder.title).toBe("Tomar agua");
    expect(create.body.reminder.weekdays).toEqual([1, 3, 5]);
    expect(create.body.reminder.isActive).toBe(true);

    const reminderId = create.body.reminder.id as number;

    const update = await userClient.patch(`/api/v1/me/reminders/${reminderId}`).send({
      title: "Tomar agua cedo",
      repeatType: "daily",
      weekdays: []
    });

    expect(update.status).toBe(200);
    expect(update.body.reminder.title).toBe("Tomar agua cedo");
    expect(update.body.reminder.repeatType).toBe("daily");

    const toggle = await userClient.patch(`/api/v1/me/reminders/${reminderId}/toggle`).send({
      isActive: false
    });

    expect(toggle.status).toBe(200);

    const inactiveOnly = await userClient.get("/api/v1/me/reminders?active=false");
    expect(inactiveOnly.status).toBe(200);
    expect(inactiveOnly.body.reminders).toHaveLength(1);
    expect(inactiveOnly.body.reminders[0].title).toBe("Tomar agua cedo");

    const activeOnly = await userClient.get("/api/v1/me/reminders?active=true");
    expect(activeOnly.status).toBe(200);
    expect(activeOnly.body.reminders).toHaveLength(0);
  });

  it("permite concluir a propria ocorrencia de lembrete e impede acesso a lembrete de outro usuario", async () => {
    const userCookie = await loginAs("user", "123456");
    const adminCookie = await loginAs("admin", "admin");
    const userClient = withCookie(app, userCookie);
    const adminClient = withCookie(app, adminCookie);

    const timestamp = nowIso();
    const reminderResult = db
      .prepare(
        `
          INSERT INTO reminders (
            user_id, title, description, start_date, time_of_day, timezone,
            repeat_type, weekdays_json, is_active, created_at, updated_at
          ) VALUES (2, 'Medicacao', '', '2026-03-13', '09:00', 'America/Bahia', 'none', '[]', 1, ?, ?)
        `
      )
      .run(timestamp, timestamp);

    const reminderId = Number(reminderResult.lastInsertRowid);
    const occurrenceResult = db
      .prepare(
        `
          INSERT INTO reminder_occurrences (
            reminder_id, user_id, scheduled_for, triggered_at, status, retry_count, next_retry_at, trigger_source, created_at, updated_at
          ) VALUES (?, 2, '2026-03-13T12:00:00.000Z', '2026-03-13T12:00:00.000Z', 'pending', 1, '2026-03-13T12:10:00.000Z', 'scheduler', ?, ?)
        `
      )
      .run(reminderId, timestamp, timestamp);

    const occurrenceId = Number(occurrenceResult.lastInsertRowid);

    const listOccurrences = await userClient.get("/api/v1/me/reminder-occurrences?status=pending");
    expect(listOccurrences.status).toBe(200);
    expect(listOccurrences.body.occurrences).toHaveLength(1);
    expect(listOccurrences.body.occurrences[0].title).toBe("Medicacao");

    const complete = await userClient.post(`/api/v1/me/reminder-occurrences/${occurrenceId}/complete`);
    expect(complete.status).toBe(200);
    expect(complete.body.ok).toBe(true);

    const completedRow = db
      .prepare(
        `
          SELECT status, completed_at AS completedAt
          FROM reminder_occurrences
          WHERE id = ?
        `
      )
      .get(occurrenceId) as { status: string; completedAt: string | null };

    expect(completedRow.status).toBe("completed");
    expect(completedRow.completedAt).toBeTruthy();

    const forbiddenUpdate = await adminClient.patch(`/api/v1/me/reminders/${reminderId}`).send({
      title: "Tentativa indevida"
    });
    expect(forbiddenUpdate.status).toBe(404);
  });

  it("retorna contexto de usuario nos endpoints admin de lembretes e permite filtrar por busca textual", async () => {
    const adminCookie = await loginAs("admin", "admin");
    const adminClient = withCookie(app, adminCookie);

    const timestamp = nowIso();
    const reminderResult = db
      .prepare(
        `
          INSERT INTO reminders (
            user_id, title, description, start_date, time_of_day, timezone,
            repeat_type, weekdays_json, is_active, created_at, updated_at
          ) VALUES (2, 'Checklist diario', '', '2026-03-13', '08:00', 'America/Bahia', 'daily', '[]', 1, ?, ?)
        `
      )
      .run(timestamp, timestamp);

    const reminderId = Number(reminderResult.lastInsertRowid);
    db.prepare(
      `
        INSERT INTO reminder_occurrences (
          reminder_id, user_id, scheduled_for, triggered_at, status, retry_count, next_retry_at, trigger_source, created_at, updated_at
        ) VALUES (?, 2, '2026-03-13T11:00:00.000Z', '2026-03-13T11:00:00.000Z', 'pending', 2, '2026-03-13T11:10:00.000Z', 'scheduler', ?, ?)
      `
    ).run(reminderId, timestamp, timestamp);

    const remindersBySearch = await adminClient.get("/api/v1/admin/reminders?user_search=Usuario");
    expect(remindersBySearch.status).toBe(200);
    expect(remindersBySearch.body.reminders).toHaveLength(1);
    expect(remindersBySearch.body.reminders[0].userName).toBe("Usuario Teste");
    expect(remindersBySearch.body.reminders[0].userLogin).toBe("user");

    const occurrencesBySearch = await adminClient.get(
      "/api/v1/admin/reminder-occurrences?user_search=user&status=pending"
    );
    expect(occurrencesBySearch.status).toBe(200);
    expect(occurrencesBySearch.body.occurrences).toHaveLength(1);
    expect(occurrencesBySearch.body.occurrences[0].userName).toBe("Usuario Teste");
    expect(occurrencesBySearch.body.occurrences[0].userLogin).toBe("user");
    expect(occurrencesBySearch.body.occurrences[0].title).toBe("Checklist diario");
  });
});
