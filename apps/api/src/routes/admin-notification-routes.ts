import type { Router } from "express";
import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import { logAudit, nowIso } from "../db";
import type { AppConfig } from "../config";
import type { NotificationPriority, RecipientMode } from "../types";
import {
  buildAdminNotificationPayload,
  createAdminNotificationRecord,
  dispatchAdminNotification,
  fetchRecipientUsers,
  isValidSourceTaskId,
  parseUserIds,
  resolveNotificationRecipientIds,
  type SenderRow
} from "./admin-notification-helpers";
import {
  buildAdminNotificationWhere,
  fetchAdminNotificationHistory,
  parseAdminNotificationListQuery
} from "./admin-query-helpers";
import { parseLimit, parsePage } from "./admin-route-shared";
import { toNullableString } from "./admin-user-helpers";

const PRIORITIES: NotificationPriority[] = ["low", "normal", "high", "critical"];

export const createAdminNotificationRoutes = (
  router: Router,
  db: Database.Database,
  io: Server,
  config: AppConfig
): void => {
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
    const sourceTaskIdRaw = req.body?.source_task_id ?? req.body?.sourceTaskId;
    const sourceTaskId =
      sourceTaskIdRaw === undefined || sourceTaskIdRaw === null || sourceTaskIdRaw === ""
        ? null
        : Number(sourceTaskIdRaw);

    if (!title || !message || !PRIORITIES.includes(priority)) {
      res.status(400).json({ error: "title, message e priority validos sao obrigatorios" });
      return;
    }

    if (recipientMode !== "all" && recipientMode !== "users") {
      res.status(400).json({ error: "recipient_mode deve ser all ou users" });
      return;
    }

    if (
      sourceTaskId !== null &&
      (!Number.isInteger(sourceTaskId) ||
        sourceTaskId <= 0 ||
        !isValidSourceTaskId(db, sourceTaskId))
    ) {
      res.status(400).json({ error: "source_task_id deve referenciar uma tarefa valida" });
      return;
    }

    const validRecipientIds = resolveNotificationRecipientIds(
      db,
      recipientMode,
      requestedRecipientIds
    );

    if (validRecipientIds.length === 0) {
      res.status(400).json({
        error:
          recipientMode === "all"
            ? "Nenhum destinatario valido"
            : "Destinatarios nao encontrados ou inativos"
      });
      return;
    }

    const sender = db
      .prepare("SELECT id, name, login FROM users WHERE id = ?")
      .get(req.authUser.id) as SenderRow;

    const createdAt = nowIso();

    const notificationId = createAdminNotificationRecord(db, {
      title,
      message,
      priority,
      senderId: req.authUser.id,
      recipientMode,
      sourceTaskId,
      recipientIds: validRecipientIds,
      createdAt
    });
    const recipientUsers = fetchRecipientUsers(db, validRecipientIds);
    const notificationPayload = buildAdminNotificationPayload({
      notificationId,
      title,
      message,
      priority,
      recipientMode,
      sourceTaskId,
      createdAt,
      sender,
      recipientUsers
    });

    dispatchAdminNotification(db, io, config, {
      notificationId,
      title,
      message,
      sourceTaskId,
      createdAt,
      sender,
      recipientIds: validRecipientIds,
      notificationPayload
    });

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
        sourceTaskId,
        sentAt: createdAt
      }
    });

    res.status(201).json({
      notification: {
        ...notificationPayload,
        recipient_count: validRecipientIds.length
      }
    });
  });

  router.get("/notifications", (req, res) => {
    const limit = parseLimit(req.query.limit, 200, 500);
    const page = parsePage(req.query.page, 1);
    const offset = (page - 1) * limit;

    const parsed = parseAdminNotificationListQuery(req.query, PRIORITIES);
    if (!parsed.ok) {
      res.status(parsed.statusCode).json({ error: parsed.error });
      return;
    }

    const { whereClause, values } = buildAdminNotificationWhere(parsed.value);
    const { notifications, total } = fetchAdminNotificationHistory({
      db,
      whereClause,
      values,
      limit,
      offset
    });
    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);

    res.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  });
};
