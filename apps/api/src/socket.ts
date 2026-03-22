import type { Server as HttpServer } from "node:http";
import { parse as parseCookie } from "cookie";
import { Server } from "socket.io";
import type Database from "better-sqlite3";
import { verifyAccessToken } from "./auth";
import type { AppConfig } from "./config";
import type {
  NotificationPriority,
  NotificationResponseStatus,
  UserRole
} from "./types";

interface SocketUser {
  id: number;
  role: UserRole;
}

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

export interface NotificationPushPayload {
  id: number;
  title: string;
  message: string;
  priority: NotificationPriority;
  sourceTaskId: number | null;
  createdAt: string;
  sender: {
    id: number;
    name: string;
    login: string;
  };
}

export interface NotificationAdminPayload {
  id: number;
  title: string;
  message: string;
  priority: NotificationPriority;
  recipient_mode: "all" | "users";
  source_task_id: number | null;
  created_at: string;
  sender: {
    id: number;
    name: string;
    login: string;
  };
  recipients: Array<{
    userId: number;
    name: string;
    login: string;
    visualizedAt: string | null;
    deliveredAt: string;
    operationalStatus: "recebida" | "visualizada" | "em_andamento" | "assumida" | "resolvida";
    responseAt: string | null;
    responseMessage: string | null;
  }>;
  stats: {
    total: number;
    read: number;
    unread: number;
    responded: number;
    received: number;
    visualized: number;
    inProgress: number;
    assumed: number;
    resolved: number;
    operationalPending: number;
    operationalCompleted: number;
  };
}

export interface ReminderDuePayload {
  occurrenceId: number;
  reminderId: number;
  userId: number;
  title: string;
  description: string;
  scheduledFor: string;
  retryCount: number;
}

export interface ReminderUpdatedPayload {
  occurrenceId: number;
  reminderId: number;
  userId: number;
  status: "pending" | "completed" | "expired" | "cancelled";
  retryCount: number;
  completedAt?: string | null;
  expiredAt?: string | null;
}

const REMINDER_INTERVAL_MS = 30 * 60 * 1000;

const nowIso = (): string => new Date().toISOString();

const isCorsOriginAllowed = (allowedOrigins: Set<string>, origin?: string): boolean => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.has("*")) {
    return true;
  }

  return allowedOrigins.has(origin);
};

export const getOnlineUserIds = (io: Server): number[] => {
  const ids = new Set<number>();

  for (const [room, sockets] of io.sockets.adapter.rooms) {
    if (!room.startsWith("user:") || sockets.size === 0) {
      continue;
    }

    const parsed = Number(room.slice(5));
    if (Number.isInteger(parsed) && parsed > 0) {
      ids.add(parsed);
    }
  }

  return Array.from(ids).sort((a, b) => a - b);
};

const emitOnlineUsersToAdmins = (io: Server): void => {
  const userIds = getOnlineUserIds(io);
  io.to("admins").emit("online_users:update", {
    userIds,
    count: userIds.length
  });
};

const emitProgressReminders = (io: Server, db: Database.Database): void => {
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

export const setupSocket = (
  server: HttpServer,
  db: Database.Database,
  config: AppConfig
): Server => {
  const allowedOrigins = new Set(config.corsOrigins);

  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        callback(null, isCorsOriginAllowed(allowedOrigins, origin));
      },
      credentials: true
    }
  });

  io.use((socket, next) => {
    const rawCookie = socket.handshake.headers.cookie ?? "";
    const cookies = parseCookie(rawCookie);
    const token = cookies[config.cookieName];

    if (!token) {
      next(new Error("Nao autenticado"));
      return;
    }

    const payload = verifyAccessToken(config, token);
    if (!payload) {
      next(new Error("Token invalido"));
      return;
    }

    const user = db
      .prepare(
        `
          SELECT id, role
          FROM users
          WHERE id = ? AND is_active = 1
        `
      )
      .get(payload.sub) as SocketUser | undefined;

    if (!user) {
      next(new Error("Usuario invalido"));
      return;
    }

    socket.data.user = user;
    next();
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser;
    socket.join(`user:${user.id}`);

    if (user.role === "admin") {
      socket.join("admins");
    }

    emitOnlineUsersToAdmins(io);

    socket.on("notifications:subscribe", (ack?: (response: { ok: boolean; unreadCount: number }) => void) => {
      const row = db
        .prepare(
          `
            SELECT COUNT(*) AS unreadCount
            FROM notification_recipients
            WHERE user_id = ?
              AND COALESCE(visualized_at, read_at) IS NULL
          `
        )
        .get(user.id) as { unreadCount: number };

      if (typeof ack === "function") {
        ack({ ok: true, unreadCount: row.unreadCount });
      }
    });

    socket.on("disconnect", () => {
      emitOnlineUsersToAdmins(io);
    });
  });

  const reminderTimer = setInterval(() => {
    emitProgressReminders(io, db);
  }, 60 * 1000);

  server.on("close", () => {
    clearInterval(reminderTimer);
  });

  return io;
};

export const emitNotificationToUser = (
  io: Server,
  userId: number,
  payload: NotificationPushPayload
): void => {
  io.to(`user:${userId}`).emit("notification:new", payload);
};

export const emitReminderDue = (io: Server, payload: ReminderDuePayload): void => {
  io.to(`user:${payload.userId}`).emit("reminder:due", payload);
  io.to("admins").emit("reminder:due", payload);
};

export const emitReminderUpdated = (io: Server, payload: ReminderUpdatedPayload): void => {
  io.to(`user:${payload.userId}`).emit("reminder:updated", payload);
  io.to("admins").emit("reminder:updated", payload);
};

export const emitReadUpdateToAdmins = (
  io: Server,
  payload: {
    notificationId: number;
    userId: number;
    readAt: string;
    responseStatus?: NotificationResponseStatus | null;
    responseAt?: string | null;
  }
): void => {
  io.to("admins").emit("notification:read_update", payload);
};

export const emitNotificationCreatedToAdmins = (
  io: Server,
  payload: NotificationAdminPayload
): void => {
  io.to("admins").emit("notification:created", payload);
};
