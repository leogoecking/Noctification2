import path from "node:path";
import { createServer, type Server as HttpServer } from "node:http";
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { connectDatabase, nowIso, runMigrations } from "../db";
import type { AppConfig } from "../config";
import { setupSocket } from "../socket";
import { dispatchExpressRequest, type DispatchResponse } from "./express-test-client";

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

describe("API notification flow", () => {
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

  const extractCookie = (response: DispatchResponse): string => {
    const setCookie = response.headers["set-cookie"];
    const rawCookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    if (!rawCookie) {
      throw new Error("Cookie de sessao nao retornado");
    }

    return rawCookie.split(";")[0];
  };

  const responseBody = <T>(response: DispatchResponse): T => response.body as T;

  const createRequest = (method: "GET" | "POST" | "PATCH" | "DELETE", pathName: string, cookie?: string) => {
    const execute = (body?: unknown) =>
      dispatchExpressRequest(app, {
        method,
        path: pathName,
        cookie,
        body
      });

    return {
      send: (body: unknown) => execute(body),
      then: <TResult1 = DispatchResponse, TResult2 = never>(
        onfulfilled?: ((value: DispatchResponse) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
      ) => execute().then(onfulfilled, onrejected),
      catch: <TResult = never>(
        onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null
      ) => execute().catch(onrejected),
      finally: (onfinally?: (() => void) | null) => execute().finally(onfinally ?? undefined)
    };
  };

  const withCookie = (_instance: unknown, cookie?: string) => {
    return {
      get: (pathName: string) => createRequest("GET", pathName, cookie),
      post: (pathName: string) => createRequest("POST", pathName, cookie),
      patch: (pathName: string) => createRequest("PATCH", pathName, cookie),
      delete: (pathName: string) => createRequest("DELETE", pathName, cookie)
    };
  };

  const loginAs = async (login: string, password: string): Promise<string> => {
    const response = await dispatchExpressRequest(app, {
      method: "POST",
      path: "/api/v1/auth/login",
      body: { login, password }
    });
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
    expect(responseBody<{ user: { login: string } }>(me).user.login).toBe("admin");

    const logout = await client.post("/api/v1/auth/logout");
    expect(logout.status).toBe(204);

    const meAfterLogout = await withCookie(app).get("/api/v1/auth/me");
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
    const registerBody = responseBody<{ user: { login: string; role: string } }>(register);
    expect(registerBody.user.login).toBe("novo_user");
    expect(registerBody.user.role).toBe("user");

    const cookie = extractCookie(register);
    const me = await withCookie(app, cookie).get("/api/v1/auth/me");
    expect(me.status).toBe(200);
    expect(responseBody<{ user: { login: string } }>(me).user.login).toBe("novo_user");
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
    expect(responseBody<{ error: string }>(response).error).toMatch(/admin fixo/i);
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
    const createNotificationBody = responseBody<{ notification: { id: number } }>(response);

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
      .all(createNotificationBody.notification.id) as Array<{ login: string }>;

    expect(recipients.map((item) => item.login)).toEqual(["user"]);
  });

  it("retorna 400 para filtro de status invalido no historico admin", async () => {
    const cookie = await loginAs("admin", "admin");

    const response = await withCookie(app, cookie).get("/api/v1/admin/notifications?status=invalido");

    expect(response.status).toBe(400);
    expect(responseBody<{ error: string }>(response).error).toMatch(/status deve ser read ou unread/i);
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
    const unreadResponseBody = responseBody<{ notifications: Array<{ stats: { unread: number } }> }>(unreadResponse);
    expect(unreadResponseBody.notifications.length).toBe(5);
    expect(
      unreadResponseBody.notifications.every(
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
    const usersResponseBody = responseBody<{ users: Array<{ id: number; login: string }> }>(usersResponse);
    const targetUser = usersResponseBody.users.find((item: { login: string }) => item.login === "user");
    expect(targetUser).toBeTruthy();

    if (!targetUser) {
      throw new Error("Usuario alvo nao encontrado para o fluxo de notificacoes");
    }

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
    const unreadBeforeBody = responseBody<{ notifications: Array<{ id: number }> }>(unreadBefore);
    expect(unreadBeforeBody.notifications.length).toBe(2);

    const firstId = unreadBeforeBody.notifications[0].id as number;
    const respond = await userClient.post(`/api/v1/me/notifications/${firstId}/respond`).send({
      response_status: "em_andamento",
      response_message: "Investigando"
    });

    expect(respond.status).toBe(200);
    const respondBody = responseBody<{ responseStatus: string; isVisualized: boolean }>(respond);
    expect(respondBody.responseStatus).toBe("em_andamento");
    expect(respondBody.isVisualized).toBe(true);

    const unreadAfterRespond = await userClient.get("/api/v1/me/notifications?status=unread");
    expect(unreadAfterRespond.status).toBe(200);
    expect(responseBody<{ notifications: unknown[] }>(unreadAfterRespond).notifications.length).toBe(1);

    const readAll = await userClient.post("/api/v1/me/notifications/read-all");
    expect(readAll.status).toBe(200);
    expect(responseBody<{ updatedCount: number }>(readAll).updatedCount).toBe(1);

    const unreadAfterAll = await userClient.get("/api/v1/me/notifications?status=unread");
    expect(unreadAfterAll.status).toBe(200);
    expect(responseBody<{ notifications: unknown[] }>(unreadAfterAll).notifications.length).toBe(0);

    const allNotifications = await userClient.get("/api/v1/me/notifications");
    expect(allNotifications.status).toBe(200);
    const allNotificationsBody = responseBody<{
      notifications: Array<{ id: number; isVisualized: boolean; responseStatus: string | null }>;
    }>(allNotifications);
    expect(
      allNotificationsBody.notifications.every(
        (item: { isVisualized: boolean }) => item.isVisualized
      )
    ).toBe(true);

    const inProgressNotification = allNotificationsBody.notifications.find(
      (item: { id: number }) => item.id === firstId
    );
    expect(inProgressNotification).toBeTruthy();

    if (!inProgressNotification) {
      throw new Error("Notificacao em andamento nao encontrada apos leitura global");
    }

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
    const createBody = responseBody<{
      reminder: { id: number; title: string; weekdays: number[]; isActive: boolean };
    }>(create);
    expect(createBody.reminder.title).toBe("Tomar agua");
    expect(createBody.reminder.weekdays).toEqual([1, 3, 5]);
    expect(createBody.reminder.isActive).toBe(true);

    const reminderId = createBody.reminder.id as number;

    const update = await userClient.patch(`/api/v1/me/reminders/${reminderId}`).send({
      title: "Tomar agua cedo",
      repeatType: "daily",
      weekdays: []
    });

    expect(update.status).toBe(200);
    const updateBody = responseBody<{ reminder: { title: string; repeatType: string } }>(update);
    expect(updateBody.reminder.title).toBe("Tomar agua cedo");
    expect(updateBody.reminder.repeatType).toBe("daily");

    const toggle = await userClient.patch(`/api/v1/me/reminders/${reminderId}/toggle`).send({
      isActive: false
    });

    expect(toggle.status).toBe(200);

    const inactiveOnly = await userClient.get("/api/v1/me/reminders?active=false");
    expect(inactiveOnly.status).toBe(200);
    const inactiveOnlyBody = responseBody<{ reminders: Array<{ title: string }> }>(inactiveOnly);
    expect(inactiveOnlyBody.reminders).toHaveLength(1);
    expect(inactiveOnlyBody.reminders[0].title).toBe("Tomar agua cedo");

    const activeOnly = await userClient.get("/api/v1/me/reminders?active=true");
    expect(activeOnly.status).toBe(200);
    expect(responseBody<{ reminders: unknown[] }>(activeOnly).reminders).toHaveLength(0);
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
    const listOccurrencesBody = responseBody<{ occurrences: Array<{ title: string }> }>(listOccurrences);
    expect(listOccurrencesBody.occurrences).toHaveLength(1);
    expect(listOccurrencesBody.occurrences[0].title).toBe("Medicacao");

    const complete = await userClient.post(`/api/v1/me/reminder-occurrences/${occurrenceId}/complete`);
    expect(complete.status).toBe(200);
    expect(responseBody<{ ok: boolean }>(complete).ok).toBe(true);

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

  it("bloqueia acesso administrativo direto aos lembretes pessoais, mas mantem ocorrencias filtraveis", async () => {
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
    expect(remindersBySearch.status).toBe(403);

    const forbiddenCreate = await adminClient.post("/api/v1/admin/reminders").send({
      userId: 2,
      title: "Tentativa indevida",
      startDate: "2026-03-13",
      timeOfDay: "08:00",
      timezone: "America/Bahia",
      repeatType: "none"
    });
    expect(forbiddenCreate.status).toBe(403);

    const forbiddenUpdate = await adminClient.patch(`/api/v1/admin/reminders/${reminderId}`).send({
      title: "Tentativa indevida"
    });
    expect(forbiddenUpdate.status).toBe(403);

    const forbiddenDelete = await adminClient.delete(`/api/v1/admin/reminders/${reminderId}`);
    expect(forbiddenDelete.status).toBe(403);

    const occurrencesBySearch = await adminClient.get(
      "/api/v1/admin/reminder-occurrences?user_search=user&status=pending"
    );
    expect(occurrencesBySearch.status).toBe(403);

    const forbiddenToggle = await adminClient.patch(`/api/v1/admin/reminders/${reminderId}/toggle`).send({
      isActive: false
    });
    expect(forbiddenToggle.status).toBe(403);
  });
});
