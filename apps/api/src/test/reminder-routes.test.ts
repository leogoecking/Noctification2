import path from "node:path";
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Router } from "express";
import type { Server } from "socket.io";
import { connectDatabase, nowIso, runMigrations } from "../db";
import type { AppConfig } from "../config";
import { createReminderMeRouter } from "../routes/reminders-me";
import { createReminderAdminRouter } from "../routes/reminders-admin";

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

type TestUser = {
  id: number;
  login: string;
  name: string;
  role: "admin" | "user";
};

type MockResponse = {
  statusCode: number;
  body: unknown;
  sent: boolean;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
  send: (payload?: unknown) => MockResponse;
};

type RouteHandle = (req: MockRequest, res: MockResponse, next?: () => void) => void;

type RouteLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack: Array<{
      handle: unknown;
    }>;
  };
};

type MockRequest = {
  authUser?: TestUser;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, string>;
};

type ReminderResponseBody = {
  reminder: {
    id: number;
    title: string;
    weekdays: number[];
    repeatType: string;
  };
};

type ReminderListResponseBody = {
  reminders: Array<{
    title: string;
    isActive: boolean;
    userName?: string;
    userLogin?: string;
  }>;
};

type OccurrenceListResponseBody = {
  occurrences: Array<{
    title: string;
    userName?: string;
    userLogin?: string;
  }>;
};

type LogsResponseBody = {
  logs: Array<{
    userName?: string;
    eventType: string;
    metadata: { retryCount?: number } | null;
  }>;
};

type HealthResponseBody = {
  health: {
    totalReminders: number;
    activeReminders: number;
    pendingOccurrences: number;
    deliveriesToday: number;
    retriesToday: number;
  };
};

type ErrorResponseBody = {
  error: string;
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

const getRouteHandler = (router: Router, pathName: string, method: string): RouteHandle => {
  const routerWithStack = router as unknown as { stack: RouteLayer[] };
  const layer = routerWithStack.stack.find(
    (entry) => entry.route?.path === pathName && entry.route.methods?.[method] === true
  );

  if (!layer?.route) {
    throw new Error(`Rota nao encontrada: ${method.toUpperCase()} ${pathName}`);
  }

  const routeLayer = layer.route.stack[layer.route.stack.length - 1];
  if (!routeLayer) {
    throw new Error(`Metodo nao encontrado: ${method.toUpperCase()} ${pathName}`);
  }

  return routeLayer.handle as RouteHandle;
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
    meRouter = createReminderMeRouter(db, ioStub as unknown as Server, testConfig);
    adminRouter = createReminderAdminRouter(db, ioStub as unknown as Server, testConfig);
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

    const createBody = createRes.body as ReminderResponseBody;
    expect(createRes.statusCode).toBe(201);
    expect(createBody.reminder.title).toBe("Tomar agua");
    expect(createBody.reminder.weekdays).toEqual([1, 3, 5]);

    const reminderId = createBody.reminder.id;

    const updateRes = createMockResponse();
    updateHandler(
      {
        authUser: regularUser,
        params: { id: String(reminderId) },
        body: { title: "Tomar agua cedo", repeatType: "daily", weekdays: [] }
      },
      updateRes
    );

    const updateBody = updateRes.body as ReminderResponseBody;
    expect(updateRes.statusCode).toBe(200);
    expect(updateBody.reminder.title).toBe("Tomar agua cedo");
    expect(updateBody.reminder.repeatType).toBe("daily");

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

    const listBody = listRes.body as ReminderListResponseBody;
    expect(listRes.statusCode).toBe(200);
    expect(listBody.reminders).toHaveLength(1);
    expect(listBody.reminders[0].title).toBe("Tomar agua cedo");
    expect(listBody.reminders[0].isActive).toBe(false);
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
    expect((invalidCreateRes.body as ErrorResponseBody).error).toMatch(/title deve ter no maximo/i);

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
    expect((invalidUpdateRes.body as ErrorResponseBody).error).toMatch(/weekdays e obrigatorio/i);

    const invalidTimezoneCreateRes = createMockResponse();
    createHandler(
      {
        authUser: regularUser,
        body: {
          title: "Valido",
          description: "",
          startDate: "2026-03-13",
          timeOfDay: "08:00",
          timezone: "America/Sao_Paulo",
          repeatType: "none",
          weekdays: []
        }
      },
      invalidTimezoneCreateRes
    );

    expect(invalidTimezoneCreateRes.statusCode).toBe(400);
    expect((invalidTimezoneCreateRes.body as ErrorResponseBody).error).toMatch(/America\/Bahia/i);
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

    const listBody = listRes.body as OccurrenceListResponseBody;
    expect(listRes.statusCode).toBe(200);
    expect(listBody.occurrences).toHaveLength(1);
    expect(listBody.occurrences[0].title).toBe("Medicacao");

    const completeRes = createMockResponse();
    completeHandler(
      {
        authUser: regularUser,
        params: { id: String(occurrenceId) }
      },
      completeRes
    );

    expect(completeRes.statusCode).toBe(200);
    expect((completeRes.body as { ok: boolean }).ok).toBe(true);

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

  it("arquiva o lembrete sem apagar historico e cancela ocorrencias pendentes", () => {
    const deleteHandler = getRouteHandler(meRouter, "/reminders/:id", "delete");
    const listHandler = getRouteHandler(meRouter, "/reminders", "get");
    const listOccurrencesHandler = getRouteHandler(meRouter, "/reminder-occurrences", "get");
    const listLogsHandler = getRouteHandler(adminRouter, "/reminder-logs", "get");
    const timestamp = nowIso();

    const reminderResult = db
      .prepare(
        `
          INSERT INTO reminders (
            user_id, title, description, start_date, time_of_day, timezone,
            repeat_type, weekdays_json, is_active, created_at, updated_at
          ) VALUES (?, 'Alongamento', '', '2026-03-13', '10:00', 'America/Bahia', 'daily', '[]', 1, ?, ?)
        `
      )
      .run(regularUser.id, timestamp, timestamp);

    const reminderId = Number(reminderResult.lastInsertRowid);
    const occurrenceResult = db
      .prepare(
        `
          INSERT INTO reminder_occurrences (
            reminder_id, user_id, scheduled_for, triggered_at, status, retry_count, next_retry_at, trigger_source, created_at, updated_at
          ) VALUES (?, ?, '2026-03-13T13:00:00.000Z', '2026-03-13T13:00:00.000Z', 'pending', 2, '2026-03-13T13:10:00.000Z', 'scheduler', ?, ?)
        `
      )
      .run(reminderId, regularUser.id, timestamp, timestamp);

    const occurrenceId = Number(occurrenceResult.lastInsertRowid);

    const deleteRes = createMockResponse();
    deleteHandler(
      {
        authUser: regularUser,
        params: { id: String(reminderId) }
      },
      deleteRes
    );

    expect(deleteRes.statusCode).toBe(204);

    const reminderRow = db
      .prepare("SELECT is_active AS isActive, deleted_at AS deletedAt FROM reminders WHERE id = ?")
      .get(reminderId) as { isActive: number; deletedAt: string | null };
    expect(reminderRow.isActive).toBe(0);
    expect(reminderRow.deletedAt).toBeTruthy();

    const listRes = createMockResponse();
    listHandler(
      {
        authUser: regularUser,
        query: {}
      },
      listRes
    );

    expect((listRes.body as ReminderListResponseBody).reminders).toHaveLength(0);

    const occurrencesRes = createMockResponse();
    listOccurrencesHandler(
      {
        authUser: regularUser,
        query: {}
      },
      occurrencesRes
    );

    const occurrencesBody = occurrencesRes.body as {
      occurrences: Array<{ id: number; status: string }>;
    };
    expect(occurrencesBody.occurrences).toHaveLength(1);
    expect(occurrencesBody.occurrences[0].id).toBe(occurrenceId);
    expect(occurrencesBody.occurrences[0].status).toBe("cancelled");

    const logsRes = createMockResponse();
    listLogsHandler(
      {
        authUser: adminUser,
        query: { reminder_id: String(reminderId) }
      },
      logsRes
    );

    const logsBody = logsRes.body as LogsResponseBody;
    expect(logsBody.logs.some((item) => item.eventType === "reminder.deleted")).toBe(true);
    expect(logsBody.logs.some((item) => item.eventType === "reminder.occurrence.cancelled")).toBe(true);

    expect(
      emittedEvents.some(
        (item) =>
          item.event === "reminder:updated" &&
          (item.payload as { occurrenceId?: number; status?: string }).occurrenceId === occurrenceId &&
          (item.payload as { occurrenceId?: number; status?: string }).status === "cancelled"
      )
    ).toBe(true);
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

    const remindersBody = remindersRes.body as ReminderListResponseBody;
    expect(remindersRes.statusCode).toBe(200);
    expect(remindersBody.reminders).toHaveLength(1);
    expect(remindersBody.reminders[0].userName).toBe("Usuario Teste");
    expect(remindersBody.reminders[0].userLogin).toBe("user");

    const occurrencesRes = createMockResponse();
    listOccurrencesHandler(
      {
        authUser: adminUser,
        query: { user_search: "user", status: "pending" }
      },
      occurrencesRes
    );

    const occurrencesBody = occurrencesRes.body as OccurrenceListResponseBody;
    expect(occurrencesRes.statusCode).toBe(200);
    expect(occurrencesBody.occurrences).toHaveLength(1);
    expect(occurrencesBody.occurrences[0].userName).toBe("Usuario Teste");
    expect(occurrencesBody.occurrences[0].userLogin).toBe("user");
    expect(occurrencesBody.occurrences[0].title).toBe("Checklist diario");

    const logsRes = createMockResponse();
    listLogsHandler(
      {
        authUser: adminUser,
        query: { user_search: "user", event_type: "reminder.occurrence.retried" }
      },
      logsRes
    );

    const logsBody = logsRes.body as LogsResponseBody;
    expect(logsRes.statusCode).toBe(200);
    expect(logsBody.logs).toHaveLength(1);
    expect(logsBody.logs[0].userName).toBe("Usuario Teste");
    expect(logsBody.logs[0].eventType).toBe("reminder.occurrence.retried");
    expect(logsBody.logs[0].metadata?.retryCount).toBe(1);

    const healthRes = createMockResponse();
    healthHandler({ authUser: adminUser, query: {} }, healthRes);

    const healthBody = healthRes.body as HealthResponseBody;
    expect(healthRes.statusCode).toBe(200);
    expect(healthBody.health.totalReminders).toBe(1);
    expect(healthBody.health.activeReminders).toBe(1);
    expect(healthBody.health.pendingOccurrences).toBe(1);
    expect(healthBody.health.deliveriesToday).toBe(1);
    expect(healthBody.health.retriesToday).toBe(1);
  });
});
