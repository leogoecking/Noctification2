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

export interface NotificationPushPayload {
  id: number;
  title: string;
  message: string;
  priority: NotificationPriority;
  createdAt: string;
  sender: {
    id: number;
    name: string;
    login: string;
  };
}

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

export const setupSocket = (
  server: HttpServer,
  db: Database.Database,
  config: AppConfig
): Server => {
  const io = new Server(server, {
    cors: {
      origin: config.corsOrigin,
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
            WHERE user_id = ? AND read_at IS NULL
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

  return io;
};

export const emitNotificationToUser = (
  io: Server,
  userId: number,
  payload: NotificationPushPayload
): void => {
  io.to(`user:${userId}`).emit("notification:new", payload);
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
