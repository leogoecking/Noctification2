import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "socket.io";
import { connectDatabase, nowIso, runMigrations } from "../db";
import { apiMigrationsDir } from "../paths";
import { runTaskAutomationCycle } from "../tasks/automation";
import type { AppConfig } from "../config";

const createIoStub = () => {
  const emissions: Array<{ room: string; event: string; payload: unknown }> = [];

  const io = {
    to(room: string) {
      return {
        emit(event: string, payload: unknown) {
          emissions.push({ room, event, payload });
        }
      };
    }
  } as unknown as Server;

  return { io, emissions };
};

const config: AppConfig = {
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
  enableTaskAutomationScheduler: true,
  taskAutomationDueSoonMinutes: 120,
  taskAutomationStaleHours: 24,
  adminSeed: {
    login: "admin",
    password: "admin",
    name: "Administrador"
  }
};

const seedUsers = (db: ReturnType<typeof connectDatabase>) => {
  const timestamp = nowIso();
  db.prepare(
    `
      INSERT INTO users (
        id, name, login, password_hash, department, job_title, role, is_active, created_at, updated_at
      )
      VALUES
        (1, 'Admin', 'admin', 'hash', 'NOC', 'Coordenador', 'admin', 1, ?, ?),
        (2, 'Usuario', 'user', 'hash', 'Suporte', 'Analista', 'user', 1, ?, ?)
    `
  ).run(timestamp, timestamp, timestamp, timestamp);
};

describe("task automation", () => {
  afterEach(() => {
    // noop
  });

  it("emite due_soon apenas uma vez para a mesma combinacao de prazo", () => {
    const db = connectDatabase(":memory:");
    runMigrations(db, apiMigrationsDir);
    seedUsers(db);

    db.prepare(
      `
        INSERT INTO tasks (
          id, title, description, status, priority, creator_user_id, assignee_user_id, due_at, created_at, updated_at
        ) VALUES (
          10, 'Acompanhar enlace', '', 'new', 'high', 1, 2, '2026-03-21T14:00:00.000Z', '2026-03-21T10:00:00.000Z', '2026-03-21T10:00:00.000Z'
        )
      `
    ).run();

    const { io, emissions } = createIoStub();
    const now = () => new Date("2026-03-21T12:30:00.000Z");

    runTaskAutomationCycle(db, io, config, { now });
    runTaskAutomationCycle(db, io, config, { now });

    const logs = db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM task_automation_logs
          WHERE task_id = 10
            AND automation_type = 'due_soon'
        `
      )
      .get() as { total: number };

    const notifications = db
      .prepare("SELECT COUNT(*) AS total FROM notifications WHERE source_task_id = 10")
      .get() as { total: number };

    expect(logs.total).toBe(1);
    expect(notifications.total).toBe(1);
    expect(
      emissions.some(
        (item) =>
          item.room === "user:2" &&
          item.event === "notification:new" &&
          (item.payload as { sourceTaskId?: number }).sourceTaskId === 10
      )
    ).toBe(true);

    db.close();
  });

  it("emite overdue e stale_task com dedupe independente", () => {
    const db = connectDatabase(":memory:");
    runMigrations(db, apiMigrationsDir);
    seedUsers(db);

    db.prepare(
      `
        INSERT INTO tasks (
          id, title, description, status, priority, creator_user_id, assignee_user_id, due_at, created_at, updated_at
        ) VALUES
          (20, 'Escalar atraso', '', 'in_progress', 'normal', 1, 2, '2026-03-20T10:00:00.000Z', '2026-03-19T08:00:00.000Z', '2026-03-19T08:00:00.000Z'),
          (21, 'Sem prazo mas parada', '', 'waiting', 'normal', 1, 2, NULL, '2026-03-19T08:00:00.000Z', '2026-03-19T08:00:00.000Z')
      `
    ).run();

    const { io } = createIoStub();

    runTaskAutomationCycle(db, io, config, {
      now: () => new Date("2026-03-21T12:00:00.000Z")
    });

    const grouped = db
      .prepare(
        `
          SELECT automation_type AS automationType, COUNT(*) AS total
          FROM task_automation_logs
          GROUP BY automation_type
          ORDER BY automation_type ASC
        `
      )
      .all() as Array<{ automationType: string; total: number }>;

    expect(grouped).toEqual([
      { automationType: "overdue", total: 1 },
      { automationType: "stale_task", total: 1 }
    ]);

    const taskEvents = db
      .prepare(
        `
          SELECT event_type AS eventType
          FROM task_events
          WHERE task_id IN (20, 21)
          ORDER BY id ASC
        `
      )
      .all() as Array<{ eventType: string }>;

    expect(taskEvents.some((item) => item.eventType === "automation_overdue")).toBe(true);
    expect(taskEvents.some((item) => item.eventType === "automation_stale_task")).toBe(true);

    db.close();
  });

  it("gera a proxima tarefa recorrente apenas uma vez apos conclusao", () => {
    const db = connectDatabase(":memory:");
    runMigrations(db, apiMigrationsDir);
    seedUsers(db);

    db.prepare(
      `
        INSERT INTO tasks (
          id, title, description, status, priority, creator_user_id, assignee_user_id, due_at,
          repeat_type, repeat_weekdays_json, started_at, completed_at, created_at, updated_at
        ) VALUES (
          30, 'Checklist diario', '', 'done', 'normal', 1, 2, '2026-03-21T09:00:00.000Z',
          'daily', '[]', '2026-03-21T08:00:00.000Z', '2026-03-21T09:10:00.000Z',
          '2026-03-21T08:00:00.000Z', '2026-03-21T09:10:00.000Z'
        )
      `
    ).run();

    const { io, emissions } = createIoStub();
    const now = () => new Date("2026-03-21T12:00:00.000Z");

    runTaskAutomationCycle(db, io, config, { now });
    runTaskAutomationCycle(db, io, config, { now });

    const recurringLogs = db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM task_automation_logs
          WHERE task_id = 30
            AND automation_type = 'recurring_task'
        `
      )
      .get() as { total: number };

    const generatedTasks = db
      .prepare(
        `
          SELECT
            id,
            recurrence_source_task_id AS recurrenceSourceTaskId,
            due_at AS dueAt,
            repeat_type AS repeatType
          FROM tasks
          WHERE recurrence_source_task_id = 30
          ORDER BY id ASC
        `
      )
      .all() as Array<{
      id: number;
      recurrenceSourceTaskId: number | null;
      dueAt: string | null;
      repeatType: string;
    }>;

    expect(recurringLogs.total).toBe(1);
    expect(generatedTasks).toHaveLength(1);
    expect(generatedTasks[0]).toMatchObject({
      recurrenceSourceTaskId: 30,
      dueAt: "2026-03-22T09:00:00.000Z",
      repeatType: "daily"
    });
    expect(
      emissions.some(
        (item) =>
          item.room === "user:2" &&
          item.event === "notification:new" &&
          (item.payload as { sourceTaskId?: number }).sourceTaskId === generatedTasks[0].id
      )
    ).toBe(true);

    db.close();
  });
});
