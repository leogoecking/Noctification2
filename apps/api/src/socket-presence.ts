import type { Socket } from "socket.io";
import { Server } from "socket.io";
import type Database from "better-sqlite3";
import type { SocketUser } from "./socket-auth";

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

export const emitOnlineUsersToAdmins = (io: Server): void => {
  const userIds = getOnlineUserIds(io);
  io.to("admins").emit("online_users:update", {
    userIds,
    count: userIds.length
  });
};

export const attachPresenceHandlers = (
  socket: Socket,
  io: Server,
  db: Database.Database,
  user: SocketUser
): void => {
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
};
