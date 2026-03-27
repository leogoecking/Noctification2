import { Router } from "express";
import type Database from "better-sqlite3";
import { createAccessToken, verifyAccessToken } from "../auth";
import type { AppConfig } from "../config";
import { logAudit, nowIso } from "../db";
import { authenticate } from "../middleware/auth";
import { createLoginAttemptTracker, respondRateLimited } from "./auth-login-attempts";
import {
  authCookieOptions,
  clearCookieOptions,
  createRegisteredUser,
  findActiveUserById,
  findActiveUserByLogin,
  getRoleMismatchMessage,
  isFixedAdminLogin,
  loginExists,
  normalizeLoginPayload,
  normalizeRegisterPayload,
  verifyUserPassword
} from "./auth-route-helpers";

export const createAuthRouter = (db: Database.Database, config: AppConfig): Router => {
  const router = Router();
  const loginAttempts = createLoginAttemptTracker();

  router.post("/register", async (req, res) => {
    const { name, login, password } = normalizeRegisterPayload(req.body);

    if (!name || !login || !password.trim()) {
      res.status(400).json({ error: "name, login e password sao obrigatorios" });
      return;
    }

    if (isFixedAdminLogin(config, login)) {
      res.status(400).json({ error: "Login reservado para administrador" });
      return;
    }

    if (loginExists(db, login)) {
      res.status(409).json({ error: "Login ja existente" });
      return;
    }

    const timestamp = nowIso();
    const userId = await createRegisteredUser(db, { name, login, password, timestamp });
    const token = createAccessToken(config, { userId, role: "user" });
    res.cookie(config.cookieName, token, authCookieOptions(config));

    logAudit(db, {
      actorUserId: userId,
      eventType: "auth.register",
      targetType: "user",
      targetId: userId,
      metadata: { login }
    });

    res.status(201).json({
      user: {
        id: userId,
        login,
        name,
        role: "user"
      }
    });
  });

  router.post("/login", async (req, res) => {
    const { login, password, expectedRole } = normalizeLoginPayload(req.body);

    if (!login || !password) {
      res.status(400).json({ error: "Login e senha sao obrigatorios" });
      return;
    }

    if (expectedRole === "invalid") {
      res.status(400).json({ error: "expected_role deve ser admin ou user" });
      return;
    }

    const now = Date.now();
    const attemptKey = loginAttempts.getAttemptKey(login, req.ip);
    const blockedUntil = loginAttempts.getBlockedUntil(attemptKey, now);

    if (blockedUntil !== null) {
      respondRateLimited(res, blockedUntil);
      return;
    }

    const user = findActiveUserByLogin(db, login);

    if (!user) {
      const attempt = loginAttempts.registerFailedAttempt(attemptKey, now);
      if (attempt.blockedUntil !== null) {
        respondRateLimited(res, attempt.blockedUntil);
        return;
      }

      res.status(401).json({ error: "Credenciais invalidas" });
      return;
    }

    const validPassword = await verifyUserPassword(config, user, password);

    if (!validPassword) {
      const attempt = loginAttempts.registerFailedAttempt(attemptKey, now);
      if (attempt.blockedUntil !== null) {
        respondRateLimited(res, attempt.blockedUntil);
        return;
      }

      res.status(401).json({ error: "Credenciais invalidas" });
      return;
    }

    loginAttempts.clearFailedAttempts(attemptKey);

    if (expectedRole && user.role !== expectedRole) {
      res.status(403).json({ error: getRoleMismatchMessage(expectedRole) });
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

  router.post("/logout", (req, res) => {
    const token = req.cookies?.[config.cookieName] as string | undefined;
    if (token) {
      const payload = verifyAccessToken(config, token);
      if (payload) {
        const user = findActiveUserById(db, payload.sub);

        if (user) {
          req.authUser = {
            id: user.id,
            login: user.login,
            name: user.name,
            role: user.role
          };
        }
      }
    }

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
