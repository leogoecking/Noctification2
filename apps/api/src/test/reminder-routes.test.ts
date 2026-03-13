import path from "node:path";
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { connectDatabase, nowIso, runMigrations } from "../db";
import type { AppConfig } from "../config";
import { createReminderMeRouter } from "../routes/reminders-me";
import { createReminderAdminRouter } from "../routes/reminders-admin";

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

type TestUser = {
  id: number;
  login: string;
  name: string;
  role: "admin" | "user";
};

type MockResponse = {
  statusCode: number;
  body: any;
  sent: boolean;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
  send: (payload?: unknown) => MockResponse;
};

const createMockResponse = (): MockResponse => {
  const response: MockResponse = {
    statusCode: 200,
    body: null,
    sent: false,
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(payload: unknown) {
      response.body = payload;
      response.sent = true;
      return response;
    },
    send(payload?: unknown) {
      response.body = payload ?? null;
      response.sent = true;
      return response;
    }
  };

  return response;
};

const getRouteHandler = (router: any, pathName: string, method: string) => {
  const layer = router.stack.find(
    (entry: any) => entry.route?.path === pathName && entry.route.methods?.[method]
  );

  if (!layer) {
    throw new Error(`Rota nao encontrada: ${method.toUpperCase()} ${pathName}`);
  }

  return layer.route.stack[layer.route.stack.length - 1].handle as (
    req: any,
    res: MockResponse
  ) => void;
};

describe("reminder routes", () => {
  let db: ReturnType<typeof connectDatabase>;
  let emittedEvents: Array<{ room: string; event: string; payload: unknown }>;
  let meRouter: ReturnType<typeof createReminderMeRouter>;
  let adminRouter: ReturnType<typeof createReminderAdminRouter>;
  let adminUser: TestUser;
  let regularUser: TestUser;

  const ioStub = {
    to(room: string) {
      return {
        emit(event: string, payload: unknown) {
          emittedEvents.push({ room, event, payload });
        }
      };
    }
  };

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

    adminUser = db
      .prepare("SELECT id, login, name, role FROM users WHERE login = 'admin'")
      .get() as TestUser;
    regularUser = db
      .prepare("SELECT id, login, name, role FROM users WHERE login = 'user'")
      .get() as TestUser;
  };

  beforeEach(async () => {
    db = connectDatabase(":memory:");
    runMigrations(db, path.resolve(process.cwd(), "migrations"));
    emittedEvents = [];
    await seedUsers();
    meRouter = createReminderMeRouter(db, ioStub as any, testConfig);
    adminRouter = createReminderAdminRouter(db, ioStub as any, testConfig);
  });

  afterEach(() => {
    db.close();
  });

  it("permite criar, listar, atualizar e desativar lembretes do proprio usuario", () => {
    const createHandler = getRouteHandler(meRouter, "/reminders", "post");
    const listHandler = getRouteHandler(meRouter, "/reminders", "get");
    const updateHandler = getRouteHandler(meRouter, "/reminders/:id", "patch");
    const toggleHandler = getRouteHandler(meRouter, "/reminders/:id/toggle", "patch");

    const createRes = createMockResponse();
    createHandler(
      {
        authUser: regularUser,
        body: {
          title: "Tomar agua",
          description: "500ml",
          startDate: "2026-03-13",
          timeOfDay: "09:30",
          timezone: "America/Bahia",
          repeatType: "weekly",
          weekdays: [1, 3, 5]
        }
      },
      createRes
    );

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.reminder.title).toBe("Tomar agua");
    expect(createRes.body.reminder.weekdays).toEqual([1, 3, 5]);

    const reminderId = createRes.body.reminder.id as number;

    const updateRes = createMockResponse();
    updateHandler(
      {
        authUser: regularUser,
        params: { id: String(reminderId) },
        body: { title: "Tomar agua cedo", repeatType: "daily", weekdays: [] }
      },
      updateRes
    );

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.reminder.title).toBe("Tomar agua cedo");
    expect(updateRes.body.reminder.repeatType).toBe("daily");

    const toggleRes = createMockResponse();
    toggleHandler(
      {
        authUser: regularUser,
        params: { id: String(reminderId) },
        body: { isActive: false }
      },
      toggleRes
    );

    expect(toggleRes.statusCode).toBe(200);

    const listRes = createMockResponse();
    listHandler(
      {
        authUser: regularUser,
        query: { active: "false" }
      },
      listRes
    );

    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.reminders).toHaveLength(1);
    expect(listRes.body.reminders[0].title).toBe("Tomar agua cedo");
    expect(listRes.body.reminders[0].isActive).toBe(false);
  });

  it("rejeita payload invalido de lembrete com mensagens claras", () => {
    const createHandler = getRouteHandler(meRouter, "/reminders", "post");
    const updateHandler = getRouteHandler(meRouter, "/reminders/:id", "patch");
    const timestamp = nowIso();

    const invalidCreateRes = createMockResponse();
    createHandler(
      {
        authUser: regularUser,
        body: {
          title: "X".repeat(121),
          description: "ok",
          startDate: "2026-13-40",
          timeOfDay: "99:99",
          timezone: "America/Bahia",
          repeatType: "none",
          weekdays: []
        }
      },
      invalidCreateRes
    );

    expect(invalidCreateRes.statusCode).toBe(400);
    expect(invalidCreateRes.body.error).toMatch(/title deve ter no maximo/i);

    const reminderResult = db
      .prepare(
        `
          INSERT INTO reminders (
            user_id, title, description, start_date, time_of_day, timezone,
            repeat_type, weekdays_json, is_active, created_at, updated_at
          ) VALUES (?, 'Valido', '', '2026-03-13', '08:00', 'America/Bahia', 'daily', '[]', 1, ?, ?)
        `
      )
      .run(regularUser.id, timestamp, timestamp);

    const invalidUpdateRes = createMockResponse();
    updateHandler(
      {
        authUser: regularUser,
        params: { id: String(Number(reminderResult.lastInsertRowid)) },
        body: { repeatType: "weekly", weekdays: [] }
      },
      invalidUpdateRes
    );

    expect(invalidUpdateRes.statusCode).toBe(400);
    expect(invalidUpdateRes.body.error).toMatch(/weekdays e obrigatorio/i);
  });

  it("conclui ocorrencia pendente e emite atualizacao realtime", () => {
    const completeHandler = getRouteHandler(meRouter, "/reminder-occurrences/:id/complete", "post");
    const listOccurrencesHandler = getRouteHandler(meRouter, "/reminder-occurrences", "get");
    const timestamp = nowIso();

    const reminderResult = db
      .prepare(
        `
          INSERT INTO reminders (
            user_id, title, description, start_date, time_of_day, timezone,
            repeat_type, weekdays_json, is_active, created_at, updated_at
          ) VALUES (?, 'Medicacao', '', '2026-03-13', '09:00', 'America/Bahia', 'none', '[]', 1, ?, ?)
        `
      )
      .run(regularUser.id, timestamp, timestamp);

    const reminderId = Number(reminderResult.lastInsertRowid);
    const occurrenceResult = db
      .prepare(
        `
          INSERT INTO reminder_occurrences (
            reminder_id, user_id, scheduled_for, triggered_at, status, retry_count, next_retry_at, trigger_source, created_at, updated_at
          ) VALUES (?, ?, '2026-03-13T12:00:00.000Z', '2026-03-13T12:00:00.000Z', 'pending', 1, '2026-03-13T12:10:00.000Z', 'scheduler', ?, ?)
        `
      )
      .run(reminderId, regularUser.id, timestamp, timestamp);

    const occurrenceId = Number(occurrenceResult.lastInsertRowid);

    const listRes = createMockResponse();
    listOccurrencesHandler(
      {
        authUser: regularUser,
        query: { status: "pending" }
      },
      listRes
    );

    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.occurrences).toHaveLength(1);
    expect(listRes.body.occurrences[0].title).toBe("Medicacao");

    const completeRes = createMockResponse();
    completeHandler(
      {
        authUser: regularUser,
        params: { id: String(occurrenceId) }
      },
      completeRes
    );

    expect(completeRes.statusCode).toBe(200);
    expect(completeRes.body.ok).toBe(true);

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
    expect(emittedEvents.some((item) => item.event === "reminder:updated")).toBe(true);
  });

  it("retorna contexto de usuario no admin e permite busca textual", () => {
    const listRemindersHandler = getRouteHandler(adminRouter, "/reminders", "get");
    const listOccurrencesHandler = getRouteHandler(adminRouter, "/reminder-occurrences", "get");
    const listLogsHandler = getRouteHandler(adminRouter, "/reminder-logs", "get");
    const healthHandler = getRouteHandler(adminRouter, "/reminders/health", "get");
    const timestamp = nowIso();

    const reminderResult = db
      .prepare(
        `
          INSERT INTO reminders (
            user_id, title, description, start_date, time_of_day, timezone,
            repeat_type, weekdays_json, is_active, created_at, updated_at
          ) VALUES (?, 'Checklist diario', '', '2026-03-13', '08:00', 'America/Bahia', 'daily', '[]', 1, ?, ?)
        `
      )
      .run(regularUser.id, timestamp, timestamp);

    const reminderId = Number(reminderResult.lastInsertRowid);
    const occurrenceResult = db.prepare(
      `
        INSERT INTO reminder_occurrences (
          reminder_id, user_id, scheduled_for, triggered_at, status, retry_count, next_retry_at, trigger_source, created_at, updated_at
        ) VALUES (?, ?, '2026-03-13T11:00:00.000Z', '2026-03-13T11:00:00.000Z', 'pending', 2, '2026-03-13T11:10:00.000Z', 'scheduler', ?, ?)
      `
    ).run(reminderId, regularUser.id, timestamp, timestamp);
    const occurrenceId = Number(occurrenceResult.lastInsertRowid);
    db.prepare(
      `
        INSERT INTO reminder_logs (
          reminder_id, occurrence_id, user_id, event_type, metadata_json, created_at
        ) VALUES (?, ?, ?, 'reminder.occurrence.delivered', '{"retryCount":0}', ?)
      `
    ).run(reminderId, occurrenceId, regularUser.id, timestamp);
    db.prepare(
      `
        INSERT INTO reminder_logs (
          reminder_id, occurrence_id, user_id, event_type, metadata_json, created_at
        ) VALUES (?, ?, ?, 'reminder.occurrence.retried', '{"retryCount":1}', ?)
      `
    ).run(reminderId, occurrenceId, regularUser.id, timestamp);

    const remindersRes = createMockResponse();
    listRemindersHandler(
      {
        authUser: adminUser,
        query: { user_search: "Usuario" }
      },
      remindersRes
    );

    expect(remindersRes.statusCode).toBe(200);
    expect(remindersRes.body.reminders).toHaveLength(1);
    expect(remindersRes.body.reminders[0].userName).toBe("Usuario Teste");
    expect(remindersRes.body.reminders[0].userLogin).toBe("user");

    const occurrencesRes = createMockResponse();
    listOccurrencesHandler(
      {
        authUser: adminUser,
        query: { user_search: "user", status: "pending" }
      },
      occurrencesRes
    );

    expect(occurrencesRes.statusCode).toBe(200);
    expect(occurrencesRes.body.occurrences).toHaveLength(1);
    expect(occurrencesRes.body.occurrences[0].userName).toBe("Usuario Teste");
    expect(occurrencesRes.body.occurrences[0].userLogin).toBe("user");
    expect(occurrencesRes.body.occurrences[0].title).toBe("Checklist diario");

    const logsRes = createMockResponse();
    listLogsHandler(
      {
        authUser: adminUser,
        query: { user_search: "user", event_type: "reminder.occurrence.retried" }
      },
      logsRes
    );

    expect(logsRes.statusCode).toBe(200);
    expect(logsRes.body.logs).toHaveLength(1);
    expect(logsRes.body.logs[0].userName).toBe("Usuario Teste");
    expect(logsRes.body.logs[0].eventType).toBe("reminder.occurrence.retried");
    expect(logsRes.body.logs[0].metadata.retryCount).toBe(1);

    const healthRes = createMockResponse();
    healthHandler({ authUser: adminUser, query: {} }, healthRes);

    expect(healthRes.statusCode).toBe(200);
    expect(healthRes.body.health.totalReminders).toBe(1);
    expect(healthRes.body.health.activeReminders).toBe(1);
    expect(healthRes.body.health.pendingOccurrences).toBe(1);
    expect(healthRes.body.health.deliveriesToday).toBe(1);
    expect(healthRes.body.health.retriesToday).toBe(1);
  });
});
