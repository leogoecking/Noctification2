import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { connectDatabase, nowIso, runMigrations } from "../db";

describe("task foundation migrations", () => {
  let db: ReturnType<typeof connectDatabase>;

  beforeEach(() => {
    db = connectDatabase(":memory:");
    runMigrations(db, path.resolve(process.cwd(), "migrations"));
  });

  afterEach(() => {
    db.close();
  });

  it("aplica o schema passivo de tasks sem quebrar notificacoes e lembretes", () => {
    const appliedMigration = db
      .prepare("SELECT filename FROM schema_migrations WHERE filename = ?")
      .get("012_tasks_foundation.sql") as { filename: string } | undefined;
    const appliedNotificationLinkMigration = db
      .prepare("SELECT filename FROM schema_migrations WHERE filename = ?")
      .get("013_notification_task_links.sql") as { filename: string } | undefined;
    const appliedTaskAutomationMigration = db
      .prepare("SELECT filename FROM schema_migrations WHERE filename = ?")
      .get("014_task_automation_logs.sql") as { filename: string } | undefined;
    const appliedTaskRecurrenceMigration = db
      .prepare("SELECT filename FROM schema_migrations WHERE filename = ?")
      .get("015_task_recurrence.sql") as { filename: string } | undefined;
    const appliedTaskCommentsMigration = db
      .prepare("SELECT filename FROM schema_migrations WHERE filename = ?")
      .get("016_task_comments.sql") as { filename: string } | undefined;
    const appliedTaskStatusWorkflowMigration = db
      .prepare("SELECT filename FROM schema_migrations WHERE filename = ?")
      .get("020_task_status_workflow.sql") as { filename: string } | undefined;

    expect(appliedMigration?.filename).toBe("012_tasks_foundation.sql");
    expect(appliedNotificationLinkMigration?.filename).toBe("013_notification_task_links.sql");
    expect(appliedTaskAutomationMigration?.filename).toBe("014_task_automation_logs.sql");
    expect(appliedTaskRecurrenceMigration?.filename).toBe("015_task_recurrence.sql");
    expect(appliedTaskCommentsMigration?.filename).toBe("016_task_comments.sql");
    expect(appliedTaskStatusWorkflowMigration?.filename).toBe("020_task_status_workflow.sql");

    const tasksTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tasks'")
      .get() as { name: string } | undefined;
    const taskEventsTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'task_events'")
      .get() as { name: string } | undefined;
    const taskAutomationLogsTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'task_automation_logs'")
      .get() as { name: string } | undefined;
    const taskCommentsTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'task_comments'")
      .get() as { name: string } | undefined;

    expect(tasksTable?.name).toBe("tasks");
    expect(taskEventsTable?.name).toBe("task_events");
    expect(taskAutomationLogsTable?.name).toBe("task_automation_logs");
    expect(taskCommentsTable?.name).toBe("task_comments");

    const timestamp = nowIso();

    db.prepare(
      `
        INSERT INTO users (name, login, password_hash, department, job_title, role, is_active, created_at, updated_at)
        VALUES
          ('Admin', 'admin', 'hash-1', 'NOC', 'Coordenador', 'admin', 1, ?, ?),
          ('Usuario', 'user', 'hash-2', 'Suporte', 'Analista', 'user', 1, ?, ?)
      `
    ).run(timestamp, timestamp, timestamp, timestamp);

    const adminUser = db.prepare("SELECT id FROM users WHERE login = 'admin'").get() as { id: number };
    const regularUser = db.prepare("SELECT id FROM users WHERE login = 'user'").get() as { id: number };

    const notificationResult = db
      .prepare(
        `
          INSERT INTO notifications (title, message, priority, sender_id, recipient_mode, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .run("Aviso operacional", "Mensagem legada", "high", adminUser.id, "users", timestamp);

    db.prepare(
      `
        INSERT INTO notification_recipients (notification_id, user_id, delivered_at, created_at)
        VALUES (?, ?, ?, ?)
      `
    ).run(Number(notificationResult.lastInsertRowid), regularUser.id, timestamp, timestamp);

    db.prepare(
      `
        INSERT INTO reminders (
          user_id,
          title,
          description,
          start_date,
          time_of_day,
          timezone,
          repeat_type,
          weekdays_json,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      regularUser.id,
      "Lembrete existente",
      "Continuar funcionando",
      "2026-03-21",
      "09:00",
      "America/Bahia",
      "none",
      "[]",
      1,
      timestamp,
      timestamp
    );

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
            due_at,
            repeat_type,
            repeat_weekdays_json,
            source_notification_id,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        "Investigar alerta",
        "Transformacao passiva para task",
        "new",
        "high",
        adminUser.id,
        regularUser.id,
        "2026-03-22T12:00:00.000Z",
        "weekly",
        "[1,3,5]",
        Number(notificationResult.lastInsertRowid),
        timestamp,
        timestamp
      );

    db.prepare(
      `
        INSERT INTO task_events (
          task_id,
          actor_user_id,
          event_type,
          to_status,
          metadata_json,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `
    ).run(
      Number(taskResult.lastInsertRowid),
      adminUser.id,
      "created",
      "new",
      JSON.stringify({ source: "migration-test" }),
      timestamp
    );

    db.prepare(
      `
        INSERT INTO task_comments (
          task_id,
          author_user_id,
          body,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?)
      `
    ).run(
      Number(taskResult.lastInsertRowid),
      regularUser.id,
      "Primeiro comentario operacional",
      timestamp,
      timestamp
    );

    const linkedNotificationResult = db
      .prepare(
        `
          INSERT INTO notifications (
            title,
            message,
            priority,
            sender_id,
            recipient_mode,
            source_task_id,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        "Atualizacao de tarefa",
        "Notificacao vinculada opcionalmente",
        "normal",
        adminUser.id,
        "users",
        Number(taskResult.lastInsertRowid),
        timestamp
      );

    const counts = {
      notifications: (db.prepare("SELECT COUNT(*) AS count FROM notifications").get() as { count: number }).count,
      reminders: (db.prepare("SELECT COUNT(*) AS count FROM reminders").get() as { count: number }).count,
      tasks: (db.prepare("SELECT COUNT(*) AS count FROM tasks").get() as { count: number }).count,
      taskEvents: (db.prepare("SELECT COUNT(*) AS count FROM task_events").get() as { count: number }).count,
      taskComments: (db.prepare("SELECT COUNT(*) AS count FROM task_comments").get() as { count: number }).count
    };

    expect(counts).toEqual({
      notifications: 2,
      reminders: 1,
      tasks: 1,
      taskEvents: 1,
      taskComments: 1
    });

    const insertedTask = db
      .prepare(
        `
          SELECT
            status,
            priority,
            creator_user_id AS creatorUserId,
            assignee_user_id AS assigneeUserId,
            repeat_type AS repeatType,
            repeat_weekdays_json AS repeatWeekdaysJson,
            source_notification_id AS sourceNotificationId
          FROM tasks
          WHERE id = ?
        `
      )
      .get(Number(taskResult.lastInsertRowid)) as {
      status: string;
      priority: string;
      creatorUserId: number;
      assigneeUserId: number;
      repeatType: string;
      repeatWeekdaysJson: string;
      sourceNotificationId: number;
    };

    expect(insertedTask).toMatchObject({
      status: "new",
      priority: "high",
      creatorUserId: adminUser.id,
      assigneeUserId: regularUser.id,
      repeatType: "weekly",
      repeatWeekdaysJson: "[1,3,5]",
      sourceNotificationId: Number(notificationResult.lastInsertRowid)
    });

    const insertedLinkedNotification = db
      .prepare(
        `
          SELECT source_task_id AS sourceTaskId
          FROM notifications
          WHERE id = ?
        `
      )
      .get(Number(linkedNotificationResult.lastInsertRowid)) as {
      sourceTaskId: number | null;
    };

    expect(insertedLinkedNotification.sourceTaskId).toBe(Number(taskResult.lastInsertRowid));
  });
});
