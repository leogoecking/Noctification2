import { Server } from "socket.io";
import type Database from "better-sqlite3";
import type { NotificationPriority } from "./types";

interface ReminderRow {
  notificationId: number;
  userId: number;
  title: string;
  message: string;
  priority: NotificationPriority;
  sourceTaskId: number | null;
  createdAt: string;
  senderId: number;
  senderName: string;
  senderLogin: string;
  reminderCount: number;
}

const REMINDER_INTERVAL_MS = 30 * 60 * 1000;

const nowIso = (): string => new Date().toISOString();

export const emitProgressReminders = (io: Server, db: Database.Database): void => {
  const cutoff = new Date(Date.now() - REMINDER_INTERVAL_MS).toISOString();
  const reminderRows = db
    .prepare(
      `
        SELECT
          nr.notification_id AS notificationId,
          nr.user_id AS userId,
          nr.reminder_count AS reminderCount,
          n.title,
          n.message,
          n.priority,
          n.source_task_id AS sourceTaskId,
          n.created_at AS createdAt,
          sender.id AS senderId,
          sender.name AS senderName,
          sender.login AS senderLogin
        FROM notification_recipients nr
        INNER JOIN notifications n ON n.id = nr.notification_id
        INNER JOIN users sender ON sender.id = n.sender_id
        WHERE CASE
          WHEN nr.response_status = 'resolvido' THEN 'resolvida'
          WHEN nr.response_status = 'assumida' THEN 'assumida'
          WHEN nr.response_status = 'em_andamento' THEN 'em_andamento'
          ELSE COALESCE(nr.operational_status, CASE
            WHEN COALESCE(nr.visualized_at, nr.read_at) IS NOT NULL THEN 'visualizada'
            ELSE 'recebida'
          END)
        END IN ('em_andamento', 'assumida')
          AND COALESCE(nr.last_reminder_at, nr.response_at, nr.visualized_at, nr.read_at, nr.created_at) <= ?
      `
    )
    .all(cutoff) as ReminderRow[];

  if (reminderRows.length === 0) {
    return;
  }

  const updateReminder = db.prepare(
    `
      UPDATE notification_recipients
      SET
        last_reminder_at = ?,
        reminder_count = COALESCE(reminder_count, 0) + 1
      WHERE notification_id = ?
        AND user_id = ?
        AND CASE
          WHEN response_status = 'resolvido' THEN 'resolvida'
          WHEN response_status = 'assumida' THEN 'assumida'
          WHEN response_status = 'em_andamento' THEN 'em_andamento'
          ELSE COALESCE(operational_status, CASE
            WHEN COALESCE(visualized_at, read_at) IS NOT NULL THEN 'visualizada'
            ELSE 'recebida'
          END)
        END IN ('em_andamento', 'assumida')
    `
  );

  const timestamp = nowIso();

  for (const row of reminderRows) {
    const room = io.sockets.adapter.rooms.get(`user:${row.userId}`);
    if (!room || room.size === 0) {
      continue;
    }

    io.to(`user:${row.userId}`).emit("notification:reminder", {
      id: row.notificationId,
      title: row.title,
      message: row.message,
      priority: row.priority,
      sourceTaskId: row.sourceTaskId,
      createdAt: row.createdAt,
      reminderCount: row.reminderCount + 1,
      sender: {
        id: row.senderId,
        name: row.senderName,
        login: row.senderLogin
      }
    });

    updateReminder.run(timestamp, row.notificationId, row.userId);
  }
};

export const startReminderEmitter = (server: NodeJS.EventEmitter, io: Server, db: Database.Database): void => {
  const reminderTimer = setInterval(() => {
    emitProgressReminders(io, db);
  }, 60 * 1000);

  server.on("close", () => {
    clearInterval(reminderTimer);
  });
};
