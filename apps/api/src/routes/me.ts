import { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../config";
import { logAudit, nowIso } from "../db";
import { authenticate } from "../middleware/auth";
import { emitReadUpdateToAdmins } from "../socket";
import type { NotificationResponseStatus } from "../types";

const RESPONSE_STATUSES: NotificationResponseStatus[] = ["em_andamento", "resolvido"];

interface NotificationRow {
  id: number;
  title: string;
  message: string;
  priority: "low" | "normal" | "high" | "critical";
  createdAt: string;
  senderId: number;
  senderName: string;
  senderLogin: string;
  readAt: string | null;
  deliveredAt: string;
  responseStatus: NotificationResponseStatus | null;
  responseAt: string | null;
  responseMessage: string | null;
}

const isResolved = (responseStatus: NotificationResponseStatus | null): boolean => {
  return responseStatus === "resolvido";
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

    const conditions = ["nr.user_id = ?"];
    const values: Array<number | string> = [req.authUser.id];

    if (status === "read") {
      conditions.push("nr.response_status = 'resolvido'");
    }

    if (status === "unread") {
      conditions.push("IFNULL(nr.response_status, '') != 'resolvido'");
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
            nr.read_at AS readAt,
            nr.delivered_at AS deliveredAt,
            nr.response_status AS responseStatus,
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
        isRead: isResolved(item.responseStatus)
      }))
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
        SET read_at = COALESCE(read_at, ?)
        WHERE notification_id = ?
          AND user_id = ?
      `
    ).run(timestamp, notificationId, req.authUser.id);

    const current = db
      .prepare(
        `
          SELECT
            read_at AS readAt,
            response_status AS responseStatus,
            response_at AS responseAt,
            response_message AS responseMessage
          FROM notification_recipients
          WHERE notification_id = ?
            AND user_id = ?
        `
      )
      .get(notificationId, req.authUser.id) as
      | {
          readAt: string | null;
          responseStatus: NotificationResponseStatus | null;
          responseAt: string | null;
          responseMessage: string | null;
        }
      | undefined;

    if (!current || !current.readAt) {
      res.status(404).json({ error: "Notificacao nao encontrada" });
      return;
    }

    const resolved = isResolved(current.responseStatus);

    emitReadUpdateToAdmins(io, {
      notificationId,
      userId: req.authUser.id,
      readAt: current.readAt,
      responseStatus: current.responseStatus,
      responseAt: current.responseAt
    });

    logAudit(db, {
      actorUserId: req.authUser.id,
      eventType: "notification.read",
      targetType: "notification",
      targetId: notificationId,
      metadata: {
        readAt: current.readAt,
        responseStatus: current.responseStatus,
        responseMessage: current.responseMessage,
        isRead: resolved
      }
    });

    res.json({
      notificationId,
      readAt: current.readAt,
      isRead: resolved
    });
  });

  router.post("/notifications/:id/respond", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const notificationId = Number(req.params.id);
    const responseStatus = req.body?.response_status as NotificationResponseStatus;
    const responseMessage = toOptionalResponseMessage(req.body?.response_message);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    if (!RESPONSE_STATUSES.includes(responseStatus)) {
      res.status(400).json({
        error: "response_status invalido. Use: em_andamento, resolvido"
      });
      return;
    }

    const timestamp = nowIso();

    const existing = db
      .prepare(
        `
          SELECT read_at AS readAt
          FROM notification_recipients
          WHERE notification_id = ?
            AND user_id = ?
        `
      )
      .get(notificationId, req.authUser.id) as { readAt: string | null } | undefined;

    if (!existing) {
      res.status(404).json({ error: "Notificacao nao encontrada" });
      return;
    }

    db.prepare(
      `
        UPDATE notification_recipients
        SET
          response_status = ?,
          response_at = ?,
          response_message = ?,
          read_at = COALESCE(read_at, ?),
          last_reminder_at = NULL,
          reminder_count = 0
        WHERE notification_id = ?
          AND user_id = ?
      `
    ).run(responseStatus, timestamp, responseMessage, timestamp, notificationId, req.authUser.id);

    const readAt = existing.readAt ?? timestamp;
    const resolved = isResolved(responseStatus);

    emitReadUpdateToAdmins(io, {
      notificationId,
      userId: req.authUser.id,
      readAt,
      responseStatus,
      responseAt: timestamp
    });

    logAudit(db, {
      actorUserId: req.authUser.id,
      eventType: "notification.respond",
      targetType: "notification",
      targetId: notificationId,
      metadata: {
        responseStatus,
        responseMessage,
        responseAt: timestamp,
        readAt,
        isRead: resolved
      }
    });

    res.json({
      notificationId,
      readAt,
      responseStatus,
      responseMessage,
      responseAt: timestamp,
      isRead: resolved
    });
  });

  return router;
};
