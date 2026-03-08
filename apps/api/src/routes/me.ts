import { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../config";
import { logAudit, nowIso } from "../db";
import { authenticate } from "../middleware/auth";
import { emitReadUpdateToAdmins } from "../socket";

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
}

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
      conditions.push("nr.read_at IS NOT NULL");
    }

    if (status === "unread") {
      conditions.push("nr.read_at IS NULL");
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
            nr.delivered_at AS deliveredAt
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
        isRead: item.readAt !== null
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
    const update = db
      .prepare(
        `
          UPDATE notification_recipients
          SET read_at = ?
          WHERE notification_id = ?
            AND user_id = ?
            AND read_at IS NULL
        `
      )
      .run(timestamp, notificationId, req.authUser.id);

    if (update.changes === 0) {
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

      res.json({
        notificationId,
        readAt: existing.readAt
      });
      return;
    }

    emitReadUpdateToAdmins(io, {
      notificationId,
      userId: req.authUser.id,
      readAt: timestamp
    });

    logAudit(db, {
      actorUserId: req.authUser.id,
      eventType: "notification.read",
      targetType: "notification",
      targetId: notificationId,
      metadata: {
        readAt: timestamp
      }
    });

    res.json({
      notificationId,
      readAt: timestamp
    });
  });

  return router;
};
