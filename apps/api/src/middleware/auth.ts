import type { NextFunction, Request, Response } from "express";
import type Database from "better-sqlite3";
import { verifyAccessToken } from "../auth";
import type { AppConfig } from "../config";
import type { UserRole } from "../types";

interface UserRow {
  id: number;
  login: string;
  name: string;
  role: UserRole;
}

export const authenticate = (db: Database.Database, config: AppConfig) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = req.cookies?.[config.cookieName] as string | undefined;
    if (!token) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const payload = verifyAccessToken(config, token);
    if (!payload) {
      res.status(401).json({ error: "Token invalido" });
      return;
    }

    const user = db
      .prepare(
        `
          SELECT id, login, name, role
          FROM users
          WHERE id = ? AND is_active = 1
        `
      )
      .get(payload.sub) as UserRow | undefined;

    if (!user) {
      res.status(401).json({ error: "Usuario inativo ou inexistente" });
      return;
    }

    req.authUser = user;
    next();
  };
};

export const requireRole = (role: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authUser || req.authUser.role !== role) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    next();
  };
};
