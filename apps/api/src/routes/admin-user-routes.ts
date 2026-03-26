import type { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import { logAudit, nowIso } from "../db";
import { getOnlineUserIds } from "../socket";
import type { UserRole } from "../types";
import {
  buildUserUpdate,
  createUserRecord,
  parseCreateUserInput,
  updateUserRecord,
  validateCreateUserInput,
  isFixedAdminLogin,
  type UserRow
} from "./admin-user-helpers";

export const registerAdminUserRoutes = (
  router: Router,
  db: Database.Database,
  io: Server
): void => {
  router.get("/users", (_req, res) => {
    const users = db
      .prepare(
        `
          SELECT
            id,
            name,
            login,
            department,
            job_title AS jobTitle,
            role,
            is_active AS isActive,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM users
          ORDER BY name ASC
        `
      )
      .all() as UserRow[];

    res.json({
      users: users.map((user) => ({
        ...user,
        isActive: user.isActive === 1
      }))
    });
  });

  router.get("/online-users", (_req, res) => {
    const onlineIds = getOnlineUserIds(io);

    if (onlineIds.length === 0) {
      res.json({ users: [], count: 0 });
      return;
    }

    const placeholders = onlineIds.map(() => "?").join(",");
    const users = db
      .prepare(
        `
          SELECT
            id,
            name,
            login,
            role,
            department,
            job_title AS jobTitle
          FROM users
          WHERE id IN (${placeholders})
          ORDER BY name ASC
        `
      )
      .all(...onlineIds) as Array<{
      id: number;
      name: string;
      login: string;
      role: UserRole;
      department: string;
      jobTitle: string;
    }>;

    res.json({
      users,
      count: users.length
    });
  });

  router.post("/users", async (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const parsedInput = parseCreateUserInput(req.body);
    const validation = validateCreateUserInput(db, parsedInput);
    if (!validation.ok) {
      res.status(validation.status).json({ error: validation.error });
      return;
    }

    const createdResult = await createUserRecord(db, validation.value);
    if (!createdResult.ok) {
      res.status(createdResult.status).json({ error: createdResult.error });
      return;
    }

    const { created, userId } = createdResult.value;

    logAudit(db, {
      actorUserId: req.authUser.id,
      eventType: "admin.user.create",
      targetType: "user",
      targetId: userId,
      metadata: {
        login: validation.value.login,
        role: validation.value.role
      }
    });

    res.status(201).json({
      user: {
        ...created,
        isActive: created.isActive === 1
      }
    });
  });

  router.patch("/users/:id", async (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const targetUser = db.prepare("SELECT id, login FROM users WHERE id = ?").get(userId) as
      | { id: number; login: string }
      | undefined;

    if (!targetUser) {
      res.status(404).json({ error: "Usuario nao encontrado" });
      return;
    }

    const updatePlan = await buildUserUpdate(db, {
      userId,
      targetLogin: targetUser.login,
      body: req.body
    });
    if (!updatePlan.ok) {
      res.status(updatePlan.status).json({ error: updatePlan.error });
      return;
    }

    const updatedResult = updateUserRecord(db, {
      userId,
      updates: updatePlan.value.updates,
      values: updatePlan.value.values
    });
    if (!updatedResult.ok) {
      res.status(updatedResult.status).json({ error: updatedResult.error });
      return;
    }

    const { updated } = updatedResult.value;

    logAudit(db, {
      actorUserId: req.authUser.id,
      eventType: "admin.user.update",
      targetType: "user",
      targetId: userId
    });

    res.json({
      user: {
        ...updated,
        isActive: updated.isActive === 1
      }
    });
  });

  router.patch("/users/:id/status", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const userId = Number(req.params.id);
    const isActive = req.body?.is_active ?? req.body?.isActive;

    if (!Number.isInteger(userId) || userId <= 0 || typeof isActive !== "boolean") {
      res.status(400).json({ error: "Payload invalido" });
      return;
    }

    const targetUser = db.prepare("SELECT id, login FROM users WHERE id = ?").get(userId) as
      | { id: number; login: string }
      | undefined;

    if (!targetUser) {
      res.status(404).json({ error: "Usuario nao encontrado" });
      return;
    }

    if (isFixedAdminLogin(targetUser.login) && !isActive) {
      res.status(400).json({ error: "Admin fixo nao pode ser desativado" });
      return;
    }

    if (req.authUser.id === userId && !isActive) {
      res.status(400).json({ error: "Voce nao pode desativar o proprio usuario" });
      return;
    }

    const result = db
      .prepare(
        `
          UPDATE users
          SET is_active = ?, updated_at = ?
          WHERE id = ?
        `
      )
      .run(isActive ? 1 : 0, nowIso(), userId);

    if (result.changes === 0) {
      res.status(404).json({ error: "Usuario nao encontrado" });
      return;
    }

    if (!isActive) {
      io.in(`user:${userId}`).disconnectSockets(true);
    }

    logAudit(db, {
      actorUserId: req.authUser.id,
      eventType: "admin.user.status",
      targetType: "user",
      targetId: userId,
      metadata: { isActive }
    });

    res.status(204).send();
  });
};
