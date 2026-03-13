import { Router } from "express";
import bcrypt from "bcryptjs";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import { logAudit, nowIso } from "../db";
import { authenticate, requireRole } from "../middleware/auth";
import { emitNotificationToUser, getOnlineUserIds } from "../socket";
import { FIXED_ADMIN_LOGIN, type AppConfig } from "../config";
import type {
  NotificationOperationalStatus,
  NotificationPriority,
  RecipientMode,
  UserRole
} from "../types";

const PRIORITIES: NotificationPriority[] = ["low", "normal", "high", "critical"];
const SQLITE_MAX_VARIABLES = 900;

const isFixedAdminLogin = (login: string): boolean => login.toLowerCase() === FIXED_ADMIN_LOGIN;

interface UserRow {
  id: number;
  name: string;
  login: string;
  department: string;
  jobTitle: string;
  role: UserRole;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

interface SenderRow {
  id: number;
  name: string;
  login: string;
}

interface NotificationRow {
  id: number;
  title: string;
  message: string;
  priority: NotificationPriority;
  recipientMode: RecipientMode;
  createdAt: string;
  senderId: number;
  senderName: string;
  senderLogin: string;
}

interface RecipientRow {
  userId: number;
  name: string;
  login: string;
  visualizedAt: string | null;
  deliveredAt: string;
  operationalStatus: NotificationOperationalStatus;
  responseAt: string | null;
  responseMessage: string | null;
}

interface AuditRow {
  id: number;
  eventType: string;
  targetType: string;
  targetId: number | null;
  metadataJson: string | null;
  createdAt: string;
  actorUserId: number | null;
  actorName: string | null;
  actorLogin: string | null;
}

const isRecipientInProgress = (recipient: RecipientRow): boolean =>
  recipient.operationalStatus === "em_andamento";

const isRecipientAssumed = (recipient: RecipientRow): boolean =>
  recipient.operationalStatus === "assumida";

const isRecipientResolved = (recipient: RecipientRow): boolean =>
  recipient.operationalStatus === "resolvida";

const isRecipientOperationallyPending = (recipient: RecipientRow): boolean =>
  recipient.operationalStatus !== "resolvida";

const toNullableString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseUserIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry > 0);

  return Array.from(new Set(normalized));
};

const parseLimit = (value: unknown, fallback: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
};

const parsePage = (value: unknown, fallback = 1): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const parseMetadata = (json: string | null): Record<string, unknown> | null => {
  if (!json) {
    return null;
  }

  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const toRecipientVisualizedAtSql = `COALESCE(nr.visualized_at, nr.read_at)`;

const isUniqueLoginConstraintError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("unique constraint failed") && message.includes("users.login");
};

const fetchActiveUserIds = (db: Database.Database, userIds: number[]): number[] => {
  const uniqueUserIds = Array.from(new Set(userIds));
  if (uniqueUserIds.length === 0) {
    return [];
  }

  const activeUserIds: number[] = [];

  for (let index = 0; index < uniqueUserIds.length; index += SQLITE_MAX_VARIABLES) {
    const chunk = uniqueUserIds.slice(index, index + SQLITE_MAX_VARIABLES);
    const placeholders = chunk.map(() => "?").join(",");
    const rows = db
      .prepare(
        `
          SELECT id
          FROM users
          WHERE is_active = 1
          AND id IN (${placeholders})
        `
      )
      .all(...chunk) as Array<{ id: number }>;

    for (const row of rows) {
      activeUserIds.push(row.id);
    }
  }

  return Array.from(new Set(activeUserIds));
};

export const createAdminRouter = (
  db: Database.Database,
  io: Server,
  config: AppConfig
): Router => {
  const router = Router();

  router.use(authenticate(db, config), requireRole("admin"));

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

  router.get("/audit", (req, res) => {
    const limit = parseLimit(req.query.limit, 100, 500);
    const page = parsePage(req.query.page, 1);
    const offset = (page - 1) * limit;
    const eventType = toNullableString(req.query.event_type);
    const from = toNullableString(req.query.from);
    const to = toNullableString(req.query.to);

    const conditions: string[] = [];
    const values: Array<string | number> = [];

    if (eventType) {
      conditions.push("a.event_type = ?");
      values.push(eventType);
    }

    if (from) {
      conditions.push("a.created_at >= ?");
      values.push(from);
    }

    if (to) {
      conditions.push("a.created_at <= ?");
      values.push(to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const totalRow = db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM audit_log a
          ${whereClause}
        `
      )
      .get(...values) as { total: number };

    const rows = db
      .prepare(
        `
          SELECT
            a.id,
            a.event_type AS eventType,
            a.target_type AS targetType,
            a.target_id AS targetId,
            a.metadata_json AS metadataJson,
            a.created_at AS createdAt,
            a.actor_user_id AS actorUserId,
            u.name AS actorName,
            u.login AS actorLogin
          FROM audit_log a
          LEFT JOIN users u ON u.id = a.actor_user_id
          ${whereClause}
          ORDER BY a.created_at DESC
          LIMIT ?
          OFFSET ?
        `
      )
      .all(...values, limit, offset) as AuditRow[];

    const total = totalRow.total;
    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);

    res.json({
      events: rows.map((row) => ({
        id: row.id,
        event_type: row.eventType,
        target_type: row.targetType,
        target_id: row.targetId,
        created_at: row.createdAt,
        actor: row.actorUserId
          ? {
              id: row.actorUserId,
              name: row.actorName,
              login: row.actorLogin
            }
          : null,
        metadata: parseMetadata(row.metadataJson)
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  });

  router.post("/users", async (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const name = toNullableString(req.body?.name);
    const login = toNullableString(req.body?.login);
    const password = toNullableString(req.body?.password);
    const department = toNullableString(req.body?.department) ?? "";
    const jobTitle = toNullableString(req.body?.job_title) ?? "";
    const roleValue = req.body?.role;
    let role: UserRole = "user";

    if (roleValue !== undefined) {
      if (roleValue !== "admin" && roleValue !== "user") {
        res.status(400).json({ error: "role deve ser admin ou user" });
        return;
      }

      if (roleValue === "admin") {
        res.status(400).json({ error: "Apenas o admin fixo e permitido" });
        return;
      }

      role = "user";
    }

    if (!name || !login || !password) {
      res.status(400).json({ error: "name, login e password sao obrigatorios" });
      return;
    }

    const existing = db.prepare("SELECT id FROM users WHERE login = ?").get(login) as
      | { id: number }
      | undefined;

    if (existing) {
      res.status(409).json({ error: "Login ja existente" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const timestamp = nowIso();

    let result: { lastInsertRowid: number | bigint };

    try {
      result = db
        .prepare(
          `
            INSERT INTO users (
              name,
              login,
              password_hash,
              department,
              job_title,
              role,
              is_active,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
          `
        )
        .run(name, login, hashedPassword, department, jobTitle, role, timestamp, timestamp);
    } catch (error) {
      if (isUniqueLoginConstraintError(error)) {
        res.status(409).json({ error: "Login ja existente" });
        return;
      }

      throw error;
    }

    const created = db
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
          WHERE id = ?
        `
      )
      .get(result.lastInsertRowid) as UserRow;

    logAudit(db, {
      actorUserId: req.authUser.id,
      eventType: "admin.user.create",
      targetType: "user",
      targetId: Number(result.lastInsertRowid),
      metadata: {
        login,
        role
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

    const fixedAdminUser = isFixedAdminLogin(targetUser.login);

    const updates: string[] = [];
    const params: Array<string | number> = [];

    const name = toNullableString(req.body?.name);
    if (name) {
      updates.push("name = ?");
      params.push(name);
    }

    const login = toNullableString(req.body?.login);
    if (login) {
      if (fixedAdminUser && !isFixedAdminLogin(login)) {
        res.status(400).json({ error: "Login do admin fixo nao pode ser alterado" });
        return;
      }

      if (!fixedAdminUser && isFixedAdminLogin(login)) {
        res.status(400).json({ error: "Login reservado para administrador" });
        return;
      }

      updates.push("login = ?");
      params.push(login);
    }

    const department = toNullableString(req.body?.department);
    if (department !== null) {
      updates.push("department = ?");
      params.push(department);
    }

    const jobTitle = toNullableString(req.body?.job_title);
    if (jobTitle !== null) {
      updates.push("job_title = ?");
      params.push(jobTitle);
    }

    const role = req.body?.role;
    if (role !== undefined) {
      if (role !== "admin" && role !== "user") {
        res.status(400).json({ error: "role deve ser admin ou user" });
        return;
      }

      if (fixedAdminUser && role !== "admin") {
        res.status(400).json({ error: "Role do admin fixo nao pode ser alterado" });
        return;
      }

      if (!fixedAdminUser && role === "admin") {
        res.status(400).json({ error: "Apenas o admin fixo e permitido" });
        return;
      }

      updates.push("role = ?");
      params.push(role);
    }

    const password = toNullableString(req.body?.password);
    if (password) {
      if (fixedAdminUser) {
        res.status(400).json({ error: "Senha do admin fixo nao pode ser alterada" });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      updates.push("password_hash = ?");
      params.push(hashedPassword);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: "Nenhum campo valido para atualizar" });
      return;
    }

    updates.push("updated_at = ?");
    params.push(nowIso());
    params.push(userId);

    let result: { changes: number };

    try {
      result = db
        .prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`)
        .run(...params);
    } catch (error) {
      if (isUniqueLoginConstraintError(error)) {
        res.status(409).json({ error: "Login ja existente" });
        return;
      }

      throw error;
    }

    if (result.changes === 0) {
      res.status(404).json({ error: "Usuario nao encontrado" });
      return;
    }

    const updated = db
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
          WHERE id = ?
        `
      )
      .get(userId) as UserRow;

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
    const isActive = req.body?.is_active;

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

  router.post("/notifications", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const title = toNullableString(req.body?.title);
    const message = toNullableString(req.body?.message);
    const priority = req.body?.priority as NotificationPriority;
    const recipientMode = req.body?.recipient_mode as RecipientMode;
    const requestedRecipientIds = parseUserIds(req.body?.recipient_ids);

    if (!title || !message || !PRIORITIES.includes(priority)) {
      res.status(400).json({ error: "title, message e priority validos sao obrigatorios" });
      return;
    }

    if (recipientMode !== "all" && recipientMode !== "users") {
      res.status(400).json({ error: "recipient_mode deve ser all ou users" });
      return;
    }

    let recipientIds: number[] = [];

    if (recipientMode === "all") {
      const rows = db
        .prepare(
          `
            SELECT id
            FROM users
            WHERE is_active = 1
              AND role = 'user'
          `
        )
        .all() as Array<{ id: number }>;
      recipientIds = rows.map((row) => row.id);
    } else {
      recipientIds = requestedRecipientIds;
    }

    if (recipientIds.length === 0) {
      res.status(400).json({ error: "Nenhum destinatario valido" });
      return;
    }

    const validRecipientIds =
      recipientMode === "all"
        ? Array.from(new Set(recipientIds))
        : fetchActiveUserIds(db, recipientIds);

    if (validRecipientIds.length === 0) {
      res.status(400).json({ error: "Destinatarios nao encontrados ou inativos" });
      return;
    }

    const sender = db
      .prepare("SELECT id, name, login FROM users WHERE id = ?")
      .get(req.authUser.id) as SenderRow;

    const createdAt = nowIso();

    const transaction = db.transaction(() => {
      const notificationResult = db
        .prepare(
          `
            INSERT INTO notifications (
              title,
              message,
              priority,
              sender_id,
              recipient_mode,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
          `
        )
        .run(title, message, priority, req.authUser!.id, recipientMode, createdAt);

      const notificationId = Number(notificationResult.lastInsertRowid);

      const recipientStmt = db.prepare(
        `
          INSERT INTO notification_recipients (
            notification_id,
            user_id,
            delivered_at,
            read_at,
            visualized_at,
            operational_status,
            created_at
          ) VALUES (?, ?, ?, NULL, NULL, ?, ?)
        `
      );

      for (const recipientId of validRecipientIds) {
        recipientStmt.run(notificationId, recipientId, createdAt, "recebida", createdAt);
      }

      return notificationId;
    });

    const notificationId = transaction();

    for (const recipientId of validRecipientIds) {
      emitNotificationToUser(io, recipientId, {
        id: notificationId,
        title,
        message,
        priority,
        createdAt,
        sender
      });
    }

    logAudit(db, {
      actorUserId: req.authUser.id,
      eventType: "admin.notification.send",
      targetType: "notification",
      targetId: notificationId,
      metadata: {
        recipientMode,
        recipientIds: validRecipientIds,
        recipientCount: validRecipientIds.length,
        priority,
        sentAt: createdAt
      }
    });

    res.status(201).json({
      notification: {
        id: notificationId,
        title,
        message,
        priority,
        recipient_mode: recipientMode,
        recipient_count: validRecipientIds.length,
        created_at: createdAt
      }
    });
  });

  router.get("/notifications", (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : "";
    const userId = typeof req.query.user_id === "string" ? Number(req.query.user_id) : null;
    const from = typeof req.query.from === "string" ? req.query.from : null;
    const to = typeof req.query.to === "string" ? req.query.to : null;
    const priority = typeof req.query.priority === "string" ? req.query.priority : "";
    const limit = parseLimit(req.query.limit, 200, 500);
    const page = parsePage(req.query.page, 1);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: Array<string | number> = [];

    if (userId && Number.isInteger(userId) && userId > 0) {
      conditions.push(
        "EXISTS (SELECT 1 FROM notification_recipients nr2 WHERE nr2.notification_id = n.id AND nr2.user_id = ?)"
      );
      values.push(userId);
    }

    if (from) {
      conditions.push("n.created_at >= ?");
      values.push(from);
    }

    if (to) {
      conditions.push("n.created_at <= ?");
      values.push(to);
    }

    if (priority !== "") {
      if (!PRIORITIES.includes(priority as NotificationPriority)) {
        res.status(400).json({ error: "priority deve ser low, normal, high ou critical" });
        return;
      }

      conditions.push("n.priority = ?");
      values.push(priority);
    }

    if (status !== "" && status !== "read" && status !== "unread") {
      res.status(400).json({ error: "status deve ser read ou unread" });
      return;
    }

    if (status === "read") {
      conditions.push(
        "NOT EXISTS (SELECT 1 FROM notification_recipients nr3 WHERE nr3.notification_id = n.id AND COALESCE(nr3.visualized_at, nr3.read_at) IS NULL)"
      );
    }

    if (status === "unread") {
      conditions.push(
        "EXISTS (SELECT 1 FROM notification_recipients nr3 WHERE nr3.notification_id = n.id AND COALESCE(nr3.visualized_at, nr3.read_at) IS NULL)"
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const totalRow = db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM notifications n
          ${whereClause}
        `
      )
      .get(...values) as { total: number };

    const notifications = db
      .prepare(
        `
          SELECT
            n.id,
            n.title,
            n.message,
            n.priority,
            n.recipient_mode AS recipientMode,
            n.created_at AS createdAt,
            n.sender_id AS senderId,
            sender.name AS senderName,
            sender.login AS senderLogin
          FROM notifications n
          INNER JOIN users sender ON sender.id = n.sender_id
          ${whereClause}
          ORDER BY n.created_at DESC
          LIMIT ?
          OFFSET ?
        `
      )
      .all(...values, limit, offset) as NotificationRow[];

    const recipientStmt = db.prepare(
      `
        SELECT
          nr.user_id AS userId,
          u.name,
          u.login,
          ${toRecipientVisualizedAtSql} AS visualizedAt,
          nr.delivered_at AS deliveredAt,
          COALESCE(nr.operational_status, CASE
            WHEN nr.response_status = 'resolvido' THEN 'resolvida'
            WHEN nr.response_status = 'em_andamento' THEN 'em_andamento'
            WHEN ${toRecipientVisualizedAtSql} IS NOT NULL THEN 'visualizada'
            ELSE 'recebida'
          END) AS operationalStatus,
          nr.response_at AS responseAt,
          nr.response_message AS responseMessage
        FROM notification_recipients nr
        INNER JOIN users u ON u.id = nr.user_id
        WHERE nr.notification_id = ?
        ORDER BY u.name ASC
      `
    );

    const enriched = notifications
      .map((notification) => {
        const recipients = recipientStmt.all(notification.id) as RecipientRow[];

        const stats = {
          total: recipients.length,
          read: recipients.filter((recipient) => recipient.visualizedAt !== null).length,
          unread: recipients.filter((recipient) => recipient.visualizedAt === null).length,
          responded: recipients.filter((recipient) =>
            ["em_andamento", "assumida", "resolvida"].includes(recipient.operationalStatus)
          ).length,
          received: recipients.filter((recipient) => recipient.operationalStatus === "recebida").length,
          visualized: recipients.filter((recipient) => recipient.operationalStatus === "visualizada").length,
          inProgress: recipients.filter(isRecipientInProgress).length,
          assumed: recipients.filter(isRecipientAssumed).length,
          resolved: recipients.filter(isRecipientResolved).length,
          operationalPending: recipients.filter(isRecipientOperationallyPending).length,
          operationalCompleted: recipients.filter(
            (recipient) => !isRecipientOperationallyPending(recipient)
          ).length
        };

        return {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          recipient_mode: notification.recipientMode,
          created_at: notification.createdAt,
          sender: {
            id: notification.senderId,
            name: notification.senderName,
            login: notification.senderLogin
          },
          recipients,
          stats
        };
      });

    const total = totalRow.total;
    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);

    res.json({
      notifications: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  });

  return router;
};
