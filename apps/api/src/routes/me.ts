import { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../config";
import { logAudit, nowIso } from "../db";
import { authenticate } from "../middleware/auth";
import { emitReadUpdateToAdmins } from "../socket";
import type { NotificationOperationalStatus, NotificationResponseStatus } from "../types";

const RESPONSE_STATUSES: NotificationResponseStatus[] = ["em_andamento", "assumida", "resolvida"];

interface NotificationRow {
  id: number;
  title: string;
  message: string;
  priority: "low" | "normal" | "high" | "critical";
  createdAt: string;
  senderId: number;
  senderName: string;
  senderLogin: string;
  visualizedAt: string | null;
  deliveredAt: string;
  operationalStatus: NotificationOperationalStatus;
  responseAt: string | null;
  responseMessage: string | null;
}

const isNotificationVisualized = (visualizedAt: string | null): boolean => visualizedAt !== null;

const isNotificationOperationallyPending = (operationalStatus: NotificationOperationalStatus): boolean =>
  operationalStatus !== "resolvida";

const toVisualizedAtSql = `COALESCE(nr.visualized_at, nr.read_at)`;
const toCurrentVisualizedAtSql = `COALESCE(visualized_at, read_at)`;

const toOperationalStatusSql = `
  CASE
    WHEN nr.response_status = 'resolvido' THEN 'resolvida'
    WHEN nr.response_status = 'assumida' THEN 'assumida'
    WHEN nr.response_status = 'em_andamento' THEN 'em_andamento'
    ELSE COALESCE(nr.operational_status, CASE
      WHEN ${toVisualizedAtSql} IS NOT NULL THEN 'visualizada'
      ELSE 'recebida'
    END)
  END
`;

const toCurrentOperationalStatusSql = `
  CASE
    WHEN response_status = 'resolvido' THEN 'resolvida'
    WHEN response_status = 'assumida' THEN 'assumida'
    WHEN response_status = 'em_andamento' THEN 'em_andamento'
    ELSE COALESCE(operational_status, CASE
      WHEN ${toCurrentVisualizedAtSql} IS NOT NULL THEN 'visualizada'
      ELSE 'recebida'
    END)
  END
`;

const toResponseStatus = (
  operationalStatus: NotificationOperationalStatus
): NotificationResponseStatus | null => {
  if (
    operationalStatus === "em_andamento" ||
    operationalStatus === "assumida" ||
    operationalStatus === "resolvida"
  ) {
    return operationalStatus;
  }

  return null;
};

const toOptionalResponseMessage = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const createMeRouter = (db: Database.Database, io: Server, config: AppConfig): Router => {
  const router = Router();

  router.use(authenticate(db, config));

  router.get("/notifications", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const status = typeof req.query.status === "string" ? req.query.status : "";

    if (status !== "" && status !== "read" && status !== "unread") {
      res.status(400).json({ error: "status deve ser read ou unread" });
      return;
    }

    const conditions = ["nr.user_id = ?"];
    const values: Array<number | string> = [req.authUser.id];

    if (status === "read") {
      conditions.push(`${toVisualizedAtSql} IS NOT NULL`);
    }

    if (status === "unread") {
      conditions.push(`${toVisualizedAtSql} IS NULL`);
    }

    const notifications = db
      .prepare(
        `
          SELECT
            n.id,
            n.title,
            n.message,
            n.priority,
            n.created_at AS createdAt,
            n.sender_id AS senderId,
            sender.name AS senderName,
            sender.login AS senderLogin,
            ${toVisualizedAtSql} AS visualizedAt,
            nr.delivered_at AS deliveredAt,
            ${toOperationalStatusSql} AS operationalStatus,
            nr.response_at AS responseAt,
            nr.response_message AS responseMessage
          FROM notification_recipients nr
          INNER JOIN notifications n ON n.id = nr.notification_id
          INNER JOIN users sender ON sender.id = n.sender_id
          WHERE ${conditions.join(" AND ")}
          ORDER BY n.created_at DESC
          LIMIT 200
        `
      )
      .all(...values) as NotificationRow[];

    res.json({
      notifications: notifications.map((item) => ({
        ...item,
        responseStatus: toResponseStatus(item.operationalStatus),
        isVisualized: isNotificationVisualized(item.visualizedAt),
        isOperationallyPending: isNotificationOperationallyPending(item.operationalStatus)
      }))
    });
  });

  router.post("/notifications/read-all", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const unreadRows = db
      .prepare(
        `
          SELECT
            notification_id AS notificationId,
            ${toCurrentOperationalStatusSql} AS operationalStatus,
            response_at AS responseAt
          FROM notification_recipients
          WHERE user_id = ?
            AND ${toCurrentVisualizedAtSql} IS NULL
        `
      )
      .all(req.authUser.id) as Array<{
      notificationId: number;
      operationalStatus: NotificationOperationalStatus;
      responseAt: string | null;
    }>;

    if (unreadRows.length === 0) {
      res.json({ updatedCount: 0, visualizedAt: null });
      return;
    }

    const timestamp = nowIso();

    const result = db
      .prepare(
        `
          UPDATE notification_recipients
          SET
            visualized_at = ?,
            read_at = COALESCE(read_at, ?),
            operational_status = CASE
              WHEN ${toCurrentOperationalStatusSql} = 'recebida' THEN 'visualizada'
              ELSE ${toCurrentOperationalStatusSql}
            END
          WHERE user_id = ?
            AND ${toCurrentVisualizedAtSql} IS NULL
        `
      )
      .run(timestamp, timestamp, req.authUser.id);

    for (const row of unreadRows) {
      emitReadUpdateToAdmins(io, {
        notificationId: row.notificationId,
        userId: req.authUser.id,
        readAt: timestamp,
        responseStatus: toResponseStatus(row.operationalStatus),
        responseAt: row.responseAt
      });
    }

    logAudit(db, {
      actorUserId: req.authUser.id,
      eventType: "notification.read_all",
      targetType: "user",
      targetId: req.authUser.id,
      metadata: {
        updatedCount: result.changes,
        visualizedAt: timestamp
      }
    });

    res.json({
      updatedCount: result.changes,
      visualizedAt: timestamp
    });
  });

  router.post("/notifications/:id/read", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const timestamp = nowIso();

    db.prepare(
      `
        UPDATE notification_recipients
        SET
          visualized_at = COALESCE(visualized_at, read_at, ?),
          read_at = COALESCE(read_at, visualized_at, ?),
          operational_status = CASE
            WHEN ${toCurrentOperationalStatusSql} = 'recebida' THEN 'visualizada'
            ELSE ${toCurrentOperationalStatusSql}
          END
        WHERE notification_id = ?
          AND user_id = ?
      `
    ).run(timestamp, timestamp, notificationId, req.authUser.id);

    const current = db
      .prepare(
        `
          SELECT
            ${toCurrentVisualizedAtSql} AS visualizedAt,
            ${toCurrentOperationalStatusSql} AS operationalStatus,
            response_at AS responseAt,
            response_message AS responseMessage
          FROM notification_recipients
          WHERE notification_id = ?
            AND user_id = ?
        `
      )
      .get(notificationId, req.authUser.id) as
      | {
          visualizedAt: string | null;
          operationalStatus: NotificationOperationalStatus;
          responseAt: string | null;
          responseMessage: string | null;
        }
      | undefined;

    if (!current || !current.visualizedAt) {
      res.status(404).json({ error: "Notificacao nao encontrada" });
      return;
    }

    emitReadUpdateToAdmins(io, {
      notificationId,
      userId: req.authUser.id,
      readAt: current.visualizedAt,
      responseStatus: toResponseStatus(current.operationalStatus),
      responseAt: current.responseAt
    });

    logAudit(db, {
      actorUserId: req.authUser.id,
      eventType: "notification.read",
      targetType: "notification",
      targetId: notificationId,
      metadata: {
        visualizedAt: current.visualizedAt,
        operationalStatus: current.operationalStatus,
        responseStatus: toResponseStatus(current.operationalStatus),
        responseMessage: current.responseMessage,
        isVisualized: true
      }
    });

    res.json({
      notificationId,
      visualizedAt: current.visualizedAt,
      operationalStatus: current.operationalStatus,
      responseStatus: toResponseStatus(current.operationalStatus),
      isVisualized: true,
      isOperationallyPending: isNotificationOperationallyPending(current.operationalStatus)
    });
  });

  router.post("/notifications/:id/respond", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const notificationId = Number(req.params.id);
    const operationalStatus = (req.body?.operational_status ??
      req.body?.response_status) as NotificationResponseStatus;
    const responseMessage = toOptionalResponseMessage(
      req.body?.response_message ?? req.body?.responseMessage ?? req.body?.message
    );

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    if (!RESPONSE_STATUSES.includes(operationalStatus)) {
      res.status(400).json({
        error: "operational_status invalido. Use: em_andamento, assumida, resolvida"
      });
      return;
    }

    const timestamp = nowIso();

    const existing = db
      .prepare(
        `
          SELECT ${toCurrentVisualizedAtSql} AS visualizedAt
          FROM notification_recipients
          WHERE notification_id = ?
            AND user_id = ?
        `
      )
      .get(notificationId, req.authUser.id) as { visualizedAt: string | null } | undefined;

    if (!existing) {
      res.status(404).json({ error: "Notificacao nao encontrada" });
      return;
    }

    db.prepare(
      `
        UPDATE notification_recipients
        SET
          operational_status = ?,
          response_status = CASE
            WHEN ? = 'resolvida' THEN 'resolvido'
            WHEN ? = 'assumida' THEN NULL
            ELSE ?
          END,
          response_at = ?,
          response_message = ?,
          visualized_at = COALESCE(visualized_at, read_at, ?),
          read_at = COALESCE(read_at, visualized_at, ?),
          last_reminder_at = NULL,
          reminder_count = 0
        WHERE notification_id = ?
          AND user_id = ?
      `
    ).run(
      operationalStatus,
      operationalStatus,
      operationalStatus,
      operationalStatus,
      timestamp,
      responseMessage,
      timestamp,
      timestamp,
      notificationId,
      req.authUser.id
    );

    const visualizedAt = existing.visualizedAt ?? timestamp;

    emitReadUpdateToAdmins(io, {
      notificationId,
      userId: req.authUser.id,
      readAt: visualizedAt,
      responseStatus: operationalStatus,
      responseAt: timestamp
    });

    logAudit(db, {
      actorUserId: req.authUser.id,
      eventType: "notification.respond",
      targetType: "notification",
      targetId: notificationId,
      metadata: {
        operationalStatus,
        responseStatus: operationalStatus,
        responseMessage,
        responseAt: timestamp,
        visualizedAt,
        isVisualized: true
      }
    });

    res.json({
      notificationId,
      visualizedAt,
      operationalStatus,
      responseStatus: operationalStatus,
      responseMessage,
      responseAt: timestamp,
      isVisualized: true,
      isOperationallyPending: isNotificationOperationallyPending(operationalStatus)
    });
  });

  return router;
};
