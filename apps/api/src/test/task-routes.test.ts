import path from "node:path";
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "socket.io";
import { connectDatabase, nowIso, runMigrations } from "../db";
import type { AppConfig } from "../config";
import { createTaskMeRouterWithIo } from "../modules/tasks/presentation/me-routes";
import { createTaskAdminRouterWithIo } from "../modules/tasks/presentation/admin-routes";
import { createMockResponse, getRouteHandler } from "./route-test-helpers";

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

describe("task routes", () => {
  let db: ReturnType<typeof connectDatabase>;
  let meRouter: ReturnType<typeof createTaskMeRouterWithIo>;
  let adminRouter: ReturnType<typeof createTaskAdminRouterWithIo>;
  let adminUser: { id: number; login: string; name: string; role: "admin" | "user" };
  let regularUser: { id: number; login: string; name: string; role: "admin" | "user" };
  let secondUser: { id: number; login: string; name: string; role: "admin" | "user" };
  let emittedEvents: Array<{ room: string; event: string; payload: unknown }>;

  const ioStub = {
    to(room: string) {
      return {
        emit(event: string, payload: unknown) {
          emittedEvents.push({ room, event, payload });
        }
      };
    },
    sockets: {
      adapter: {
        rooms: new Map()
      }
    }
  };

  beforeEach(async () => {
    db = connectDatabase(":memory:");
    runMigrations(db, path.resolve(process.cwd(), "migrations"));
    emittedEvents = [];

    const adminPasswordHash = await bcrypt.hash("admin", 10);
    const userPasswordHash = await bcrypt.hash("123456", 10);
    const secondUserPasswordHash = await bcrypt.hash("654321", 10);
    const timestamp = nowIso();

    db.prepare(
      `
        INSERT INTO users (name, login, password_hash, department, job_title, role, is_active, created_at, updated_at)
        VALUES
          ('Admin Fixo', 'admin', ?, 'NOC', 'Coordenador', 'admin', 1, ?, ?),
          ('Usuario Teste', 'user', ?, 'Suporte', 'Analista', 'user', 1, ?, ?),
          ('Usuario Dois', 'user2', ?, 'Campo', 'Tecnico', 'user', 1, ?, ?)
      `
    ).run(
      adminPasswordHash,
      timestamp,
      timestamp,
      userPasswordHash,
      timestamp,
      timestamp,
      secondUserPasswordHash,
      timestamp,
      timestamp
    );

    adminUser = db
      .prepare("SELECT id, login, name, role FROM users WHERE login = 'admin'")
      .get() as typeof adminUser;
    regularUser = db
      .prepare("SELECT id, login, name, role FROM users WHERE login = 'user'")
      .get() as typeof regularUser;
    secondUser = db
      .prepare("SELECT id, login, name, role FROM users WHERE login = 'user2'")
      .get() as typeof secondUser;

    meRouter = createTaskMeRouterWithIo(db, ioStub as unknown as Server, testConfig);
    adminRouter = createTaskAdminRouterWithIo(db, ioStub as unknown as Server, testConfig);
  });

  afterEach(() => {
    db.close();
  });

  it("permite ao usuario criar, listar, atualizar e concluir tarefa propria", () => {
    const createHandler = getRouteHandler(meRouter, "/tasks", "post");
    const listHandler = getRouteHandler(meRouter, "/tasks", "get");
    const getHandler = getRouteHandler(meRouter, "/tasks/:id", "get");
    const commentHandler = getRouteHandler(meRouter, "/tasks/:id/comments", "post");
    const updateHandler = getRouteHandler(meRouter, "/tasks/:id", "patch");
    const completeHandler = getRouteHandler(meRouter, "/tasks/:id/complete", "post");

    const createRes = createMockResponse();
    createHandler(
      {
        authUser: regularUser,
        body: {
          title: "Investigar enlace",
          description: "Verificar evento de rede",
          priority: "high",
          repeat_type: "daily",
          assignee_user_id: regularUser.id,
          due_at: "2026-03-24T10:00:00.000Z"
        }
      },
      createRes
    );

    expect(createRes.statusCode).toBe(201);
    const createdTaskId = (createRes.body as { task: { id: number } }).task.id;
    expect((createRes.body as { task: { repeatType: string } }).task.repeatType).toBe("daily");

    const updateRes = createMockResponse();
    updateHandler(
      {
        authUser: regularUser,
        params: { id: String(createdTaskId) },
        body: {
          status: "in_progress",
          description: "Evento em analise",
          repeat_type: "weekly",
          weekdays: [1, 3, 5]
        }
      },
      updateRes
    );

    expect(updateRes.statusCode).toBe(200);
    expect((updateRes.body as { task: { status: string } }).task.status).toBe("in_progress");
    expect((updateRes.body as { task: { repeatType: string; repeatWeekdays: number[] } }).task).toMatchObject({
      repeatType: "weekly",
      repeatWeekdays: [1, 3, 5]
    });

    const listRes = createMockResponse();
    listHandler(
      {
        authUser: regularUser,
        query: {
          status: "in_progress"
        }
      },
      listRes
    );

    expect(listRes.statusCode).toBe(200);
    expect((listRes.body as { tasks: Array<{ id: number }> }).tasks).toHaveLength(1);

    const getRes = createMockResponse();
    getHandler(
      {
        authUser: regularUser,
        params: { id: String(createdTaskId) }
      },
      getRes
    );

    expect(getRes.statusCode).toBe(200);
    const getBody = getRes.body as {
      timeline: Array<{ kind: string; eventType: string | null }>;
    };
    expect(getBody.timeline.some((item) => item.kind === "event" && item.eventType === "created")).toBe(true);
    expect(getBody.timeline.some((item) => item.kind === "event" && item.eventType === "status_changed")).toBe(true);

    const commentRes = createMockResponse();
    commentHandler(
      {
        authUser: regularUser,
        params: { id: String(createdTaskId) },
        body: {
          body: "Validando comentario operacional"
        }
      },
      commentRes
    );

    expect(commentRes.statusCode).toBe(201);
    expect((commentRes.body as { comment: { body: string } }).comment.body).toBe(
      "Validando comentario operacional"
    );

    const completeRes = createMockResponse();
    completeHandler(
      {
        authUser: regularUser,
        params: { id: String(createdTaskId) }
      },
      completeRes
    );

    expect(completeRes.statusCode).toBe(200);
    expect((completeRes.body as { task: { status: string } }).task.status).toBe("done");

    const getAfterCommentRes = createMockResponse();
    getHandler(
      {
        authUser: regularUser,
        params: { id: String(createdTaskId) }
      },
      getAfterCommentRes
    );

    expect(getAfterCommentRes.statusCode).toBe(200);
    expect(
      (getAfterCommentRes.body as { timeline: Array<{ kind: string; body: string | null }> }).timeline.some(
        (item) => item.kind === "comment" && item.body === "Validando comentario operacional"
      )
    ).toBe(true);
  });

  it("impede o usuario comum de atribuir tarefa a outro usuario", () => {
    const createHandler = getRouteHandler(meRouter, "/tasks", "post");
    const createRes = createMockResponse();

    createHandler(
      {
        authUser: regularUser,
        body: {
          title: "Tarefa invalida",
          assignee_user_id: secondUser.id
        }
      },
      createRes
    );

    expect(createRes.statusCode).toBe(400);
    expect((createRes.body as { error: string }).error).toContain("atribuir");
  });

  it("permite ao admin criar para outro usuario, filtrar e cancelar", () => {
    const createHandler = getRouteHandler(adminRouter, "/tasks", "post");
    const listHandler = getRouteHandler(adminRouter, "/tasks", "get");
    const getHandler = getRouteHandler(adminRouter, "/tasks/:id", "get");
    const commentHandler = getRouteHandler(adminRouter, "/tasks/:id/comments", "post");
    const cancelHandler = getRouteHandler(adminRouter, "/tasks/:id/cancel", "post");
    const healthHandler = getRouteHandler(adminRouter, "/tasks/health", "get");
    const metricsHandler = getRouteHandler(adminRouter, "/tasks/metrics", "get");
    const logsHandler = getRouteHandler(adminRouter, "/tasks/automation-logs", "get");

    const createRes = createMockResponse();
    createHandler(
      {
        authUser: adminUser,
        body: {
          title: "Acompanhar incidente",
          description: "Coletar dados",
          priority: "critical",
          repeat_type: "monthly",
          assignee_user_id: secondUser.id,
          due_at: "2026-03-25T15:00:00.000Z"
        }
      },
      createRes
    );

    expect(createRes.statusCode).toBe(201);
    const task = (createRes.body as {
      task: { id: number; assigneeUserId: number | null; repeatType: string };
    }).task;
    expect(task.assigneeUserId).toBe(secondUser.id);
    expect(task.repeatType).toBe("monthly");

    const listRes = createMockResponse();
    listHandler(
      {
        authUser: adminUser,
        query: {
          priority: "critical",
          assignee_user_id: String(secondUser.id)
        }
      },
      listRes
    );

    expect(listRes.statusCode).toBe(200);
    expect((listRes.body as { tasks: Array<{ id: number }> }).tasks).toHaveLength(1);

    const metricsRes = createMockResponse();
    metricsHandler(
      {
        authUser: adminUser,
        query: {
          priority: "critical",
          assignee_user_id: String(secondUser.id),
          queue: "all",
          window: "7d"
        }
      },
      metricsRes
    );

    expect(metricsRes.statusCode).toBe(200);
    expect(
      (metricsRes.body as { metrics: { productivity: { createdInWindow: number } } }).metrics.productivity.createdInWindow
    ).toBe(1);
    expect(
      (metricsRes.body as { metrics: { capacityByAssignee: Array<{ assigneeLabel: string }> } }).metrics
        .capacityByAssignee[0]?.assigneeLabel
    ).toBe(secondUser.name);

    const commentRes = createMockResponse();
    commentHandler(
      {
        authUser: adminUser,
        params: { id: String(task.id) },
        body: {
          body: "Acionar equipe de campo"
        }
      },
      commentRes
    );

    expect(commentRes.statusCode).toBe(201);

    const getRes = createMockResponse();
    getHandler(
      {
        authUser: adminUser,
        params: { id: String(task.id) }
      },
      getRes
    );

    expect(getRes.statusCode).toBe(200);
    expect(
      (getRes.body as { timeline: Array<{ kind: string; body: string | null }> }).timeline.some(
        (item) => item.kind === "comment" && item.body === "Acionar equipe de campo"
      )
    ).toBe(true);

    const cancelRes = createMockResponse();
    cancelHandler(
      {
        authUser: adminUser,
        params: { id: String(task.id) }
      },
      cancelRes
    );

    expect(cancelRes.statusCode).toBe(200);
    expect((cancelRes.body as { task: { status: string } }).task.status).toBe("cancelled");

    const linkedNotifications = db
      .prepare(
        `
          SELECT id, source_task_id AS sourceTaskId
          FROM notifications
          WHERE source_task_id = ?
          ORDER BY id ASC
        `
      )
      .all(task.id) as Array<{ id: number; sourceTaskId: number | null }>;

    expect(linkedNotifications).toHaveLength(2);
    expect(linkedNotifications.every((item) => item.sourceTaskId === task.id)).toBe(true);
    expect(
      emittedEvents.some(
        (event) =>
          event.room === `user:${secondUser.id}` &&
          event.event === "notification:new" &&
          (event.payload as { sourceTaskId?: number }).sourceTaskId === task.id
      )
    ).toBe(true);

    const healthRes = createMockResponse();
    healthHandler(
      {
        authUser: adminUser,
        query: {}
      },
      healthRes
    );

    expect(healthRes.statusCode).toBe(200);
    expect((healthRes.body as { health: { activeTasks: number; schedulerEnabled: boolean } }).health.activeTasks).toBe(0);
    expect(
      (healthRes.body as { health: { activeTasks: number; schedulerEnabled: boolean } }).health.schedulerEnabled
    ).toBe(false);

    const logsRes = createMockResponse();
    logsHandler(
      {
        authUser: adminUser,
        query: {
          automation_type: "overdue"
        }
      },
      logsRes
    );

    expect(logsRes.statusCode).toBe(200);
    expect((logsRes.body as { logs: unknown[] }).logs).toHaveLength(0);

    const auditCount = (
      db
        .prepare("SELECT COUNT(*) AS count FROM audit_log WHERE target_type = 'task'")
        .get() as { count: number }
    ).count;
    expect(auditCount).toBeGreaterThanOrEqual(2);
  });
});
