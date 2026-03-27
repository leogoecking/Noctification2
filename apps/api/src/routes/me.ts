import { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../config";
import { authenticate } from "../middleware/auth";
import { getWebPushConfigResponse } from "../push/service";
import type { NotificationOperationalStatus } from "../types";
import {
  buildNotificationListFilter,
  isNotificationOperationallyPending,
  isNotificationVisualized,
  parseNotificationListStatus,
  toOperationalStatusSql,
  toResponseStatus,
  toVisualizedAtSql
} from "./me-notification-helpers";
import {
  deleteUserWebPushSubscription,
  saveUserWebPushSubscription
} from "./me-web-push-helpers";
import {
  markAllNotificationsRead,
  markNotificationRead,
  respondToNotification
} from "./me-notification-actions";

interface NotificationRow {
  id: number;
  title: string;
  message: string;
  priority: "low" | "normal" | "high" | "critical";
  sourceTaskId: number | null;
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

export const createMeRouter = (db: Database.Database, io: Server, config: AppConfig): Router => {
  const router = Router();

  router.use(authenticate(db, config));

  router.get("/web-push/config", (_req, res) => {
    res.json(getWebPushConfigResponse(config));
  });

  router.put("/web-push/subscription", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const result = saveUserWebPushSubscription(db, config, {
      userId: req.authUser.id,
      body: req.body,
      userAgent:
        typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null
    });
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json({ ok: true });
  });

  router.delete("/web-push/subscription", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const result = deleteUserWebPushSubscription(db, {
      userId: req.authUser.id,
      body: req.body
    });
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json(result);
  });

  router.get("/notifications", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const { status, error } = parseNotificationListStatus(req.query.status);
    if (error || status === null) {
      res.status(400).json({ error: error ?? "status deve ser read ou unread" });
      return;
    }

    const { whereClause, values } = buildNotificationListFilter(req.authUser.id, status);

    const notifications = db
      .prepare(
        `
          SELECT
            n.id,
            n.title,
            n.message,
            n.priority,
            n.source_task_id AS sourceTaskId,
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
          WHERE ${whereClause}
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

    res.json(markAllNotificationsRead(db, io, req.authUser.id));
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

    const result = markNotificationRead(db, io, {
      notificationId,
      userId: req.authUser.id
    });
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  router.post("/notifications/:id/respond", (req, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    const notificationId = Number(req.params.id);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const result = respondToNotification(db, io, {
      notificationId,
      userId: req.authUser.id,
      body: req.body
    });
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json(result);
  });

  return router;
};
