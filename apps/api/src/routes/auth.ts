import { Router } from "express";
import bcrypt from "bcryptjs";
import type Database from "better-sqlite3";
import { createAccessToken } from "../auth";
import type { AppConfig } from "../config";
import { logAudit } from "../db";
import { authenticate } from "../middleware/auth";

interface LoginRow {
  id: number;
  login: string;
  name: string;
  role: "admin" | "user";
  passwordHash: string;
}

const authCookieOptions = (config: AppConfig) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: false,
  maxAge: config.jwtExpiresHours * 60 * 60 * 1000
});

const clearCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: false
};

export const createAuthRouter = (db: Database.Database, config: AppConfig): Router => {
  const router = Router();

  router.post("/login", async (req, res) => {
    const login = typeof req.body?.login === "string" ? req.body.login.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!login || !password) {
      res.status(400).json({ error: "Login e senha sao obrigatorios" });
      return;
    }

    const user = db
      .prepare(
        `
          SELECT id, login, name, role, password_hash AS passwordHash
          FROM users
          WHERE login = ? AND is_active = 1
        `
      )
      .get(login) as LoginRow | undefined;

    if (!user) {
      res.status(401).json({ error: "Credenciais invalidas" });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: "Credenciais invalidas" });
      return;
    }

    const token = createAccessToken(config, { userId: user.id, role: user.role });
    res.cookie(config.cookieName, token, authCookieOptions(config));

    logAudit(db, {
      actorUserId: user.id,
      eventType: "auth.login",
      targetType: "user",
      targetId: user.id,
      metadata: { login: user.login }
    });

    res.json({
      user: {
        id: user.id,
        login: user.login,
        name: user.name,
        role: user.role
      }
    });
  });

  router.get("/me", authenticate(db, config), (req, res) => {
    const user = req.authUser;
    if (!user) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    res.json({
      user: {
        id: user.id,
        login: user.login,
        name: user.name,
        role: user.role
      }
    });
  });

  router.post("/logout", authenticate(db, config), (req, res) => {
    const user = req.authUser;
    if (user) {
      logAudit(db, {
        actorUserId: user.id,
        eventType: "auth.logout",
        targetType: "user",
        targetId: user.id
      });
    }

    res.clearCookie(config.cookieName, clearCookieOptions);
    res.status(204).send();
  });

  return router;
};
