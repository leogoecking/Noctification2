import type { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
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
  markAllNotificationsRead,
  markNotificationRead,
  respondToNotification
} from "./me-notification-actions";
import { parsePositiveId, requireAuthUser } from "./me-route-shared";

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

interface RegisterMeNotificationRoutesParams {
  router: Router;
  db: Database.Database;
  io: Server;
}

export const registerMeNotificationRoutes = ({
  router,
  db,
  io
}: RegisterMeNotificationRoutesParams) => {
  router.get("/notifications", (req, res) => {
    const authUser = requireAuthUser(req.authUser, res);
    if (!authUser) {
      return;
    }

    const { status, error } = parseNotificationListStatus(req.query.status);
    if (error || status === null) {
      res.status(400).json({ error: error ?? "status deve ser read ou unread" });
      return;
    }

    const { whereClause, values } = buildNotificationListFilter(authUser.id, status);

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
    const authUser = requireAuthUser(req.authUser, res);
    if (!authUser) {
      return;
    }

    res.json(markAllNotificationsRead(db, io, authUser.id));
  });

  router.post("/notifications/:id/read", (req, res) => {
    const authUser = requireAuthUser(req.authUser, res);
    if (!authUser) {
      return;
    }

    const notificationId = parsePositiveId(req.params.id);
    if (!notificationId) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const result = markNotificationRead(db, io, {
      notificationId,
      userId: authUser.id
    });
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json(result);
  });

  router.post("/notifications/:id/respond", (req, res) => {
    const authUser = requireAuthUser(req.authUser, res);
    if (!authUser) {
      return;
    }

    const notificationId = parsePositiveId(req.params.id);
    if (!notificationId) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }

    const result = respondToNotification(db, io, {
      notificationId,
      userId: authUser.id,
      body: req.body
    });
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json(result);
  });
};
