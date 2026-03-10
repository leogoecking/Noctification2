import { Router, type Response } from "express";
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

interface LoginAttemptState {
  count: number;
  windowStartedAt: number;
  blockedUntil: number | null;
}

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_BLOCK_DURATION_MS = 15 * 60 * 1000;

const isSecureCookie = (config: AppConfig): boolean => config.nodeEnv === "production";

const authCookieOptions = (config: AppConfig) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isSecureCookie(config),
  maxAge: config.jwtExpiresHours * 60 * 60 * 1000
});

const clearCookieOptions = (config: AppConfig) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isSecureCookie(config)
});

const normalizeClientIp = (ip: string | undefined): string => {
  if (!ip) {
    return "unknown";
  }

  const trimmed = ip.trim();
  return trimmed.length > 0 ? trimmed : "unknown";
};

const buildAttemptKey = (login: string, ip: string | undefined): string => {
  return `${normalizeClientIp(ip)}:${login.toLowerCase()}`;
};

const cleanupExpiredAttempts = (
  attempts: Map<string, LoginAttemptState>,
  now: number
): void => {
  for (const [key, state] of attempts) {
    const isBlocked = state.blockedUntil !== null && state.blockedUntil > now;
    const isWindowAlive = now - state.windowStartedAt <= LOGIN_ATTEMPT_WINDOW_MS;

    if (!isBlocked && !isWindowAlive) {
      attempts.delete(key);
    }
  }
};

const getBlockedUntil = (
  attempts: Map<string, LoginAttemptState>,
  key: string,
  now: number
): number | null => {
  const state = attempts.get(key);
  if (!state) {
    return null;
  }

  if (state.blockedUntil !== null && state.blockedUntil > now) {
    return state.blockedUntil;
  }

  if (now - state.windowStartedAt > LOGIN_ATTEMPT_WINDOW_MS) {
    attempts.delete(key);
  }

  return null;
};

const registerFailedAttempt = (
  attempts: Map<string, LoginAttemptState>,
  key: string,
  now: number
): LoginAttemptState => {
  const current = attempts.get(key);

  if (!current || now - current.windowStartedAt > LOGIN_ATTEMPT_WINDOW_MS) {
    const freshState: LoginAttemptState = {
      count: 1,
      windowStartedAt: now,
      blockedUntil: null
    };
    attempts.set(key, freshState);
    return freshState;
  }

  const nextCount = current.count + 1;
  const shouldBlock = nextCount > MAX_FAILED_LOGIN_ATTEMPTS;
  const nextState: LoginAttemptState = {
    count: nextCount,
    windowStartedAt: current.windowStartedAt,
    blockedUntil: shouldBlock ? now + LOGIN_BLOCK_DURATION_MS : current.blockedUntil
  };

  attempts.set(key, nextState);
  return nextState;
};

const clearFailedAttempts = (attempts: Map<string, LoginAttemptState>, key: string): void => {
  attempts.delete(key);
};

const respondRateLimited = (res: Response, blockedUntil: number): void => {
  const retryAfterSeconds = Math.max(1, Math.ceil((blockedUntil - Date.now()) / 1000));
  res.setHeader("Retry-After", String(retryAfterSeconds));
  res.status(429).json({ error: "Muitas tentativas de login. Tente novamente em alguns minutos." });
};

export const createAuthRouter = (db: Database.Database, config: AppConfig): Router => {
  const router = Router();
  const loginAttempts = new Map<string, LoginAttemptState>();

  router.post("/login", async (req, res) => {
    const login = typeof req.body?.login === "string" ? req.body.login.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!login || !password) {
      res.status(400).json({ error: "Login e senha sao obrigatorios" });
      return;
    }

    const now = Date.now();
    cleanupExpiredAttempts(loginAttempts, now);

    const attemptKey = buildAttemptKey(login, req.ip);
    const blockedUntil = getBlockedUntil(loginAttempts, attemptKey, now);

    if (blockedUntil !== null) {
      respondRateLimited(res, blockedUntil);
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
      const attempt = registerFailedAttempt(loginAttempts, attemptKey, now);
      if (attempt.blockedUntil !== null) {
        respondRateLimited(res, attempt.blockedUntil);
        return;
      }

      res.status(401).json({ error: "Credenciais invalidas" });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      const attempt = registerFailedAttempt(loginAttempts, attemptKey, now);
      if (attempt.blockedUntil !== null) {
        respondRateLimited(res, attempt.blockedUntil);
        return;
      }

      res.status(401).json({ error: "Credenciais invalidas" });
      return;
    }

    clearFailedAttempts(loginAttempts, attemptKey);

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

    res.clearCookie(config.cookieName, clearCookieOptions(config));
    res.status(204).send();
  });

  return router;
};

