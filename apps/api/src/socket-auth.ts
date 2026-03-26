import { parse as parseCookie } from "cookie";
import type Database from "better-sqlite3";
import type { Socket } from "socket.io";
import { verifyAccessToken } from "./auth";
import type { AppConfig } from "./config";
import type { UserRole } from "./types";

export interface SocketUser {
  id: number;
  role: UserRole;
}

export const authenticateSocketConnection = (
  socket: Socket,
  db: Database.Database,
  config: AppConfig
): SocketUser => {
  const rawCookie = socket.handshake.headers.cookie ?? "";
  const cookies = parseCookie(rawCookie);
  const token = cookies[config.cookieName];

  if (!token) {
    throw new Error("Nao autenticado");
  }

  const payload = verifyAccessToken(config, token);
  if (!payload) {
    throw new Error("Token invalido");
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
    throw new Error("Usuario invalido");
  }

  return user;
};
