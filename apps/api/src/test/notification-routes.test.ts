import path from "node:path";
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "socket.io";
import { createAdminRouter } from "../routes/admin";
import { createMeRouter } from "../routes/me";
import { connectDatabase, nowIso, runMigrations } from "../db";
import type { AppConfig } from "../config";
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

describe("notification routes", () => {
  let db: ReturnType<typeof connectDatabase>;
  let adminRouter: ReturnType<typeof createAdminRouter>;
  let meRouter: ReturnType<typeof createMeRouter>;
  let emittedEvents: Array<{ room: string; event: string; payload: unknown }>;
  let adminUser: { id: number; login: string; name: string; role: "admin" | "user" };
  let regularUser: { id: number; login: string; name: string; role: "admin" | "user" };

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
      .get() as typeof adminUser;
    regularUser = db
      .prepare("SELECT id, login, name, role FROM users WHERE login = 'user'")
      .get() as typeof regularUser;

    adminRouter = createAdminRouter(db, ioStub as unknown as Server, testConfig);
    meRouter = createMeRouter(db, ioStub as unknown as Server, testConfig);
  });

  afterEach(() => {
    db.close();
  });

  it("envia para all apenas usuarios comuns ativos", () => {
    const createNotificationHandler = getRouteHandler(adminRouter, "/notifications", "post");

    const response = createMockResponse();
    createNotificationHandler(
      {
        authUser: adminUser,
        body: {
          title: "Broadcast",
          message: "Mensagem geral",
          priority: "normal",
          recipient_mode: "all",
          recipient_ids: []
        }
      },
      response
    );

    expect(response.statusCode).toBe(201);

    const notificationId = (response.body as { notification: { id: number } }).notification.id;
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
      .all(notificationId) as Array<{ login: string }>;

    expect(recipients.map((item) => item.login)).toEqual(["user"]);
  });

  it("aceita source_task_id opcional em notificacao nova sem quebrar o legado", () => {
    const createNotificationHandler = getRouteHandler(adminRouter, "/notifications", "post");
    const timestamp = nowIso();

    const taskResult = db
      .prepare(
        `
          INSERT INTO tasks (
            title,
            description,
            status,
            priority,
            creator_user_id,
            assignee_user_id,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        "Investigar incidente",
        "Base para notificacao vinculada",
        "new",
        "high",
        adminUser.id,
        regularUser.id,
        timestamp,
        timestamp
      );

    const response = createMockResponse();
    createNotificationHandler(
      {
        authUser: adminUser,
        body: {
          title: "Atualizacao da tarefa",
          message: "Acompanhamento em andamento",
          priority: "high",
          recipient_mode: "users",
          recipient_ids: [regularUser.id],
          source_task_id: Number(taskResult.lastInsertRowid)
        }
      },
      response
    );

    expect(response.statusCode).toBe(201);
    expect((response.body as { notification: { source_task_id: number | null } }).notification.source_task_id).toBe(
      Number(taskResult.lastInsertRowid)
    );

    const stored = db
      .prepare("SELECT source_task_id AS sourceTaskId FROM notifications ORDER BY id DESC LIMIT 1")
      .get() as { sourceTaskId: number | null };

    expect(stored.sourceTaskId).toBe(Number(taskResult.lastInsertRowid));
  });

  it("rejeita filtro de status invalido no historico admin", () => {
    const listHistoryHandler = getRouteHandler(adminRouter, "/notifications", "get");

    const response = createMockResponse();
    listHistoryHandler(
      {
        authUser: adminUser,
        query: {
          status: "invalido"
        }
      },
      response
    );

    expect(response.statusCode).toBe(400);
    expect((response.body as { error: string }).error).toMatch(/status deve ser read ou unread/i);
  });

  it("marca todas como visualizadas sem perder resposta operacional", () => {
    const createNotificationHandler = getRouteHandler(adminRouter, "/notifications", "post");
    const listNotificationsHandler = getRouteHandler(meRouter, "/notifications", "get");
    const respondHandler = getRouteHandler(meRouter, "/notifications/:id/respond", "post");
    const readAllHandler = getRouteHandler(meRouter, "/notifications/read-all", "post");

    const createRes = createMockResponse();
    createNotificationHandler(
      {
        authUser: adminUser,
        body: {
          title: "N1",
          message: "Mensagem 1",
          priority: "high",
          recipient_mode: "users",
          recipient_ids: [regularUser.id]
        }
      },
      createRes
    );

    expect(createRes.statusCode).toBe(201);

    const unreadRes = createMockResponse();
    listNotificationsHandler(
      {
        authUser: regularUser,
        query: {
          status: "unread"
        }
      },
      unreadRes
    );

    const notifications = (unreadRes.body as { notifications: Array<{ id: number }> }).notifications;
    expect(notifications).toHaveLength(1);

    const notificationId = notifications[0].id;
    const respondRes = createMockResponse();
    respondHandler(
      {
        authUser: regularUser,
        params: { id: String(notificationId) },
        body: {
          operational_status: "em_andamento",
          response_message: "Vou verificar"
        }
      },
      respondRes
    );

    expect(respondRes.statusCode).toBe(200);
    expect((respondRes.body as { operationalStatus: string }).operationalStatus).toBe("em_andamento");

    const readAllRes = createMockResponse();
    readAllHandler(
      {
        authUser: regularUser
      },
      readAllRes
    );

    expect(readAllRes.statusCode).toBe(200);
    expect((readAllRes.body as { updatedCount: number }).updatedCount).toBe(0);

    const readRes = createMockResponse();
    listNotificationsHandler(
      {
        authUser: regularUser,
        query: {
          status: "read"
        }
      },
      readRes
    );

    const readNotifications = (readRes.body as {
      notifications: Array<{ operationalStatus: string; responseMessage: string | null }>;
    }).notifications;

    expect(readNotifications).toHaveLength(1);
    expect(readNotifications[0].operationalStatus).toBe("em_andamento");
    expect(readNotifications[0].responseMessage).toBe("Vou verificar");
    expect(emittedEvents.some((item) => item.event === "notification:new")).toBe(true);
    expect(emittedEvents.some((item) => item.event === "notification:read_update")).toBe(true);
  });

  it("preserva status assumida de registros legados mesmo com operational_status antigo", () => {
    const listNotificationsHandler = getRouteHandler(meRouter, "/notifications", "get");
    const listHistoryHandler = getRouteHandler(adminRouter, "/notifications", "get");
    const timestamp = nowIso();

    const notificationResult = db
      .prepare(
        `
          INSERT INTO notifications (title, message, priority, sender_id, recipient_mode, created_at)
          VALUES ('Legado', 'Status assumida antigo', 'normal', ?, 'users', ?)
        `
      )
      .run(adminUser.id, timestamp);

    db.prepare(
      `
        INSERT INTO notification_recipients (
          notification_id,
          user_id,
          delivered_at,
          read_at,
          visualized_at,
          created_at,
          response_status,
          response_at,
          response_message,
          operational_status
        ) VALUES (?, ?, ?, NULL, NULL, ?, 'assumida', ?, 'Recebido', 'recebida')
      `
    ).run(Number(notificationResult.lastInsertRowid), regularUser.id, timestamp, timestamp, timestamp);

    const userRes = createMockResponse();
    listNotificationsHandler(
      {
        authUser: regularUser,
        query: {}
      },
      userRes
    );

    expect(userRes.statusCode).toBe(200);
    expect((userRes.body as { notifications: Array<{ operationalStatus: string; responseStatus: string | null }> }).notifications[0])
      .toMatchObject({
        operationalStatus: "assumida",
        responseStatus: "assumida"
      });

    const adminRes = createMockResponse();
    listHistoryHandler(
      {
        authUser: adminUser,
        query: {}
      },
      adminRes
    );

    expect(adminRes.statusCode).toBe(200);
    expect(
      (adminRes.body as {
        notifications: Array<{ recipients: Array<{ operationalStatus: string }> }>;
      }).notifications[0].recipients[0].operationalStatus
    ).toBe("assumida");
  });
});
