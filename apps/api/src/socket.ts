import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type Database from "better-sqlite3";
import type { AppConfig } from "./config";
import type {
  NotificationPriority,
  NotificationResponseStatus
} from "./types";
import { authenticateSocketConnection, type SocketUser } from "./socket-auth";
import { attachPresenceHandlers } from "./socket-presence";
import { startReminderEmitter } from "./socket-reminders";

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

const isCorsOriginAllowed = (allowedOrigins: Set<string>, origin?: string): boolean => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.has("*")) {
    return true;
  }

  return allowedOrigins.has(origin);
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
    try {
      socket.data.user = authenticateSocketConnection(socket, db, config);
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error("Falha na autenticacao do socket"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser;
    attachPresenceHandlers(socket, io, db, user);
  });

  startReminderEmitter(server, io, db);

  return io;
};

export { getOnlineUserIds } from "./socket-presence";

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
