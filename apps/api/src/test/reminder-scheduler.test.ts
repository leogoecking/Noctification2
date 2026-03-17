import { afterEach, describe, expect, it, vi } from "vitest";
import type { Server } from "socket.io";
import { connectDatabase, nowIso, runMigrations } from "../db";
import { apiMigrationsDir } from "../paths";
import {
  RETRY_INTERVAL_MS,
  runReminderSchedulerCycle,
  startReminderScheduler
} from "../reminders/scheduler";

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

const seedUser = (db: ReturnType<typeof connectDatabase>, id = 1) => {
  const timestamp = nowIso();
  db.prepare(
    `
      INSERT INTO users (id, name, login, password_hash, department, job_title, role, is_active, created_at, updated_at)
      VALUES (?, 'Usuario Teste', 'user_teste', 'hash', 'Suporte', 'Analista', 'user', 1, ?, ?)
    `
  ).run(id, timestamp, timestamp);
};

describe("reminder scheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("gera ocorrencia unica sem duplicar em novo ciclo", () => {
    const db = connectDatabase(":memory:");
    runMigrations(db, apiMigrationsDir);
    seedUser(db, 1);

    const timestamp = nowIso();
    db.prepare(
      `
        INSERT INTO reminders (
          user_id, title, description, start_date, time_of_day, timezone,
          repeat_type, weekdays_json, is_active, created_at, updated_at
        ) VALUES (1, 'Pagamento', '', '2026-03-12', '09:00', 'America/Bahia', 'none', '[]', 1, ?, ?)
      `
    ).run(timestamp, timestamp);

    const { io } = createIoStub();
    const now = () => new Date("2026-03-13T12:00:00.000Z");

    runReminderSchedulerCycle(db, io, { now });
    runReminderSchedulerCycle(db, io, { now });

    const row = db
      .prepare("SELECT COUNT(*) AS total FROM reminder_occurrences")
      .get() as { total: number };

    expect(row.total).toBe(1);
    db.close();
  });

  it("gera proxima ocorrencia semanal apenas em dia permitido", () => {
    const db = connectDatabase(":memory:");
    runMigrations(db, apiMigrationsDir);
    seedUser(db, 1);

    const timestamp = nowIso();
    db.prepare(
      `
        INSERT INTO reminders (
          user_id, title, description, start_date, time_of_day, timezone,
          repeat_type, weekdays_json, is_active, last_scheduled_for, created_at, updated_at
        ) VALUES (1, 'Reuniao', '', '2026-03-09', '08:00', 'America/Bahia', 'weekly', '[1,3,5]', 1, '2026-03-13T11:00:00.000Z', ?, ?)
      `
    ).run(timestamp, timestamp);

    const { io } = createIoStub();

    runReminderSchedulerCycle(db, io, {
      now: () => new Date("2026-03-17T12:00:00.000Z")
    });

    const occurrence = db
      .prepare(
        `
          SELECT scheduled_for AS scheduledFor
          FROM reminder_occurrences
          ORDER BY id DESC
          LIMIT 1
        `
      )
      .get() as { scheduledFor: string };

    expect(occurrence.scheduledFor).toBe("2026-03-16T11:00:00.000Z");
    db.close();
  });

  it("expira ocorrencia pendente no fim do dia sem reenviar", () => {
    const db = connectDatabase(":memory:");
    runMigrations(db, apiMigrationsDir);
    seedUser(db, 1);

    const timestamp = nowIso();
    db.prepare(
      `
        INSERT INTO reminders (
          user_id, title, description, start_date, time_of_day, timezone,
          repeat_type, weekdays_json, is_active, created_at, updated_at
        ) VALUES (1, 'Checkup', '', '2026-03-12', '09:00', 'America/Bahia', 'none', '[]', 1, ?, ?)
      `
    ).run(timestamp, timestamp);

    db.prepare(
      `
        INSERT INTO reminder_occurrences (
          reminder_id, user_id, scheduled_for, triggered_at, status, retry_count, next_retry_at, trigger_source, created_at, updated_at
        ) VALUES (1, 1, '2026-03-12T09:00:00.000Z', '2026-03-12T09:00:00.000Z', 'pending', 2, '2026-03-13T00:05:00.000Z', 'scheduler', ?, ?)
      `
    ).run(timestamp, timestamp);

    const { io, emissions } = createIoStub();

    runReminderSchedulerCycle(db, io, {
      now: () => new Date("2026-03-13T03:10:00.000Z")
    });

    const occurrence = db
      .prepare(
        `
          SELECT status, expired_at AS expiredAt
          FROM reminder_occurrences
          WHERE id = 1
        `
      )
      .get() as { status: string; expiredAt: string | null };

    expect(occurrence.status).toBe("expired");
    expect(occurrence.expiredAt).toBe("2026-03-13T03:10:00.000Z");
    expect(emissions.some((item) => item.event === "reminder:due")).toBe(false);
    db.close();
  });

  it("reenvia a cada 10 minutos e expira ao atingir o limite de retries", () => {
    const db = connectDatabase(":memory:");
    runMigrations(db, apiMigrationsDir);
    seedUser(db, 1);

    const timestamp = nowIso();
    db.prepare(
      `
        INSERT INTO reminders (
          user_id, title, description, start_date, time_of_day, timezone,
          repeat_type, weekdays_json, is_active, created_at, updated_at
        ) VALUES (1, 'Medicacao', '', '2026-03-13', '09:00', 'America/Bahia', 'none', '[]', 1, ?, ?)
      `
    ).run(timestamp, timestamp);

    const { io, emissions } = createIoStub();
    const initialScheduledFor = "2026-03-13T12:00:00.000Z";

    runReminderSchedulerCycle(db, io, {
      now: () => new Date(initialScheduledFor)
    });

    let occurrence = db
      .prepare(
        `
          SELECT
            retry_count AS retryCount,
            next_retry_at AS nextRetryAt,
            status,
            expired_at AS expiredAt
          FROM reminder_occurrences
          WHERE id = 1
        `
      )
      .get() as {
      retryCount: number;
      nextRetryAt: string | null;
      status: string;
      expiredAt: string | null;
    };

    expect(occurrence.retryCount).toBe(0);
    expect(occurrence.status).toBe("pending");
    expect(occurrence.nextRetryAt).toBe(
      new Date(new Date(initialScheduledFor).getTime() + RETRY_INTERVAL_MS).toISOString()
    );
    expect(emissions.filter((item) => item.event === "reminder:due")).toHaveLength(2);

    runReminderSchedulerCycle(db, io, {
      now: () => new Date("2026-03-13T12:10:00.000Z")
    });
    runReminderSchedulerCycle(db, io, {
      now: () => new Date("2026-03-13T12:20:00.000Z")
    });
    runReminderSchedulerCycle(db, io, {
      now: () => new Date("2026-03-13T12:30:00.000Z")
    });

    occurrence = db
      .prepare(
        `
          SELECT
            retry_count AS retryCount,
            next_retry_at AS nextRetryAt,
            status,
            expired_at AS expiredAt
          FROM reminder_occurrences
          WHERE id = 1
        `
      )
      .get() as {
      retryCount: number;
      nextRetryAt: string | null;
      status: string;
      expiredAt: string | null;
    };

    expect(occurrence.retryCount).toBe(3);
    expect(occurrence.status).toBe("pending");

    runReminderSchedulerCycle(db, io, {
      now: () => new Date("2026-03-13T12:40:00.000Z")
    });

    occurrence = db
      .prepare(
        `
          SELECT
            retry_count AS retryCount,
            next_retry_at AS nextRetryAt,
            status,
            expired_at AS expiredAt
          FROM reminder_occurrences
          WHERE id = 1
        `
      )
      .get() as {
      retryCount: number;
      nextRetryAt: string | null;
      status: string;
      expiredAt: string | null;
    };

    expect(occurrence.status).toBe("expired");
    expect(occurrence.retryCount).toBe(3);
    expect(occurrence.expiredAt).toBe("2026-03-13T12:40:00.000Z");
    expect(emissions.filter((item) => item.event === "reminder:due")).toHaveLength(8);
    expect(emissions.some((item) => item.event === "reminder:updated")).toBe(true);
    db.close();
  });

  it("executa o scheduler periodicamente quando iniciado", () => {
    vi.useFakeTimers();

    const db = connectDatabase(":memory:");
    runMigrations(db, apiMigrationsDir);
    seedUser(db, 1);

    const timestamp = nowIso();
    db.prepare(
      `
        INSERT INTO reminders (
          user_id, title, description, start_date, time_of_day, timezone,
          repeat_type, weekdays_json, is_active, created_at, updated_at
        ) VALUES (1, 'Alongar', '', '2026-03-13', '09:00', 'America/Bahia', 'none', '[]', 1, ?, ?)
      `
    ).run(timestamp, timestamp);

    const { io } = createIoStub();
    const stop = startReminderScheduler(db, io, {
      now: () => new Date("2026-03-13T12:00:00.000Z")
    });

    const initialCount = db
      .prepare("SELECT COUNT(*) AS total FROM reminder_occurrences")
      .get() as { total: number };
    expect(initialCount.total).toBe(1);

    vi.advanceTimersByTime(60_000);

    const secondCount = db
      .prepare("SELECT COUNT(*) AS total FROM reminder_occurrences")
      .get() as { total: number };
    expect(secondCount.total).toBe(1);

    stop();
    db.close();
  });
});
