import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import { logAudit, nowIso } from "../db";
import type { AppConfig } from "../config";
import { sendWebPushNotificationToUser } from "../push/service";
import {
  emitNotificationCreatedToAdmins,
  emitNotificationToUser,
  type NotificationAdminPayload,
  type NotificationPushPayload
} from "../socket";
import type { NotificationPriority } from "../types";

const SQLITE_MAX_VARIABLES = 900;

interface SenderRow {
  id: number;
  name: string;
  login: string;
}

interface RecipientUserRow {
  id: number;
  name: string;
  login: string;
}

export interface TaskLinkedNotificationDispatch {
  recipientIds: number[];
  pushPayload: NotificationPushPayload;
  adminPayload: NotificationAdminPayload;
}

const fetchActiveRecipientUsers = (
  db: Database.Database,
  userIds: number[]
): RecipientUserRow[] => {
  const uniqueUserIds = Array.from(new Set(userIds.filter((value) => Number.isInteger(value) && value > 0)));
  if (uniqueUserIds.length === 0) {
    return [];
  }

  const recipients: RecipientUserRow[] = [];

  for (let index = 0; index < uniqueUserIds.length; index += SQLITE_MAX_VARIABLES) {
    const chunk = uniqueUserIds.slice(index, index + SQLITE_MAX_VARIABLES);
    const placeholders = chunk.map(() => "?").join(",");
    const rows = db
      .prepare(
        `
          SELECT id, name, login
          FROM users
          WHERE is_active = 1
            AND role = 'user'
            AND id IN (${placeholders})
          ORDER BY name ASC
        `
      )
      .all(...chunk) as RecipientUserRow[];
    recipients.push(...rows);
  }

  return recipients;
};

const fetchSender = (db: Database.Database, actorUserId: number): SenderRow | undefined =>
  db.prepare("SELECT id, name, login FROM users WHERE id = ?").get(actorUserId) as SenderRow | undefined;

export const createTaskLinkedNotification = (
  db: Database.Database,
  params: {
    actorUserId: number;
    sourceTaskId: number;
    title: string;
    message: string;
    priority: NotificationPriority;
    recipientIds: number[];
    auditEventType: string;
    auditMetadata?: Record<string, unknown>;
    createdAt?: string;
  }
): TaskLinkedNotificationDispatch | null => {
  const sender = fetchSender(db, params.actorUserId);
  if (!sender) {
    return null;
  }

  const recipients = fetchActiveRecipientUsers(db, params.recipientIds);
  if (recipients.length === 0) {
    return null;
  }

  const createdAt = params.createdAt ?? nowIso();
  const notificationResult = db
    .prepare(
      `
        INSERT INTO notifications (
          title,
          message,
          priority,
          sender_id,
          recipient_mode,
          source_task_id,
          created_at
        ) VALUES (?, ?, ?, ?, 'users', ?, ?)
      `
    )
    .run(
      params.title,
      params.message,
      params.priority,
      params.actorUserId,
      params.sourceTaskId,
      createdAt
    );

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
      ) VALUES (?, ?, ?, NULL, NULL, 'recebida', ?)
    `
  );

  for (const recipient of recipients) {
    recipientStmt.run(notificationId, recipient.id, createdAt, createdAt);
  }

  const adminPayload: NotificationAdminPayload = {
    id: notificationId,
    title: params.title,
    message: params.message,
    priority: params.priority,
    recipient_mode: "users",
    source_task_id: params.sourceTaskId,
    created_at: createdAt,
    sender,
    recipients: recipients.map((recipient) => ({
      userId: recipient.id,
      name: recipient.name,
      login: recipient.login,
      visualizedAt: null,
      deliveredAt: createdAt,
      operationalStatus: "recebida",
      responseAt: null,
      responseMessage: null
    })),
    stats: {
      total: recipients.length,
      read: 0,
      unread: recipients.length,
      responded: 0,
      received: recipients.length,
      visualized: 0,
      inProgress: 0,
      assumed: 0,
      resolved: 0,
      operationalPending: recipients.length,
      operationalCompleted: 0
    }
  };

  logAudit(db, {
    actorUserId: params.actorUserId,
    eventType: params.auditEventType,
    targetType: "notification",
    targetId: notificationId,
    metadata: {
      sourceTaskId: params.sourceTaskId,
      recipientCount: recipients.length,
      recipientIds: recipients.map((recipient) => recipient.id),
      ...params.auditMetadata
    }
  });

  return {
    recipientIds: recipients.map((recipient) => recipient.id),
    pushPayload: {
      id: notificationId,
      title: params.title,
      message: params.message,
      priority: params.priority,
      sourceTaskId: params.sourceTaskId,
      createdAt,
      sender
    },
    adminPayload
  };
};

export const dispatchTaskLinkedNotification = (
  db: Database.Database,
  config: AppConfig,
  io: Server,
  notification: TaskLinkedNotificationDispatch
): void => {
  for (const recipientId of notification.recipientIds) {
    emitNotificationToUser(io, recipientId, notification.pushPayload);
    void sendWebPushNotificationToUser(db, config, recipientId, {
      title: `Notificacao: ${notification.pushPayload.title}`,
      body:
        notification.pushPayload.message.trim() ||
        `Recebida em ${new Date(notification.pushPayload.createdAt).toLocaleString("pt-BR")}`,
      tag: `notification-${notification.pushPayload.id}`,
      url: notification.pushPayload.sourceTaskId ? "/tasks" : "/notifications",
      notificationId: notification.pushPayload.id,
      kind: "notification"
    });
  }

  emitNotificationCreatedToAdmins(io, notification.adminPayload);
};

export const dispatchTaskLinkedNotificationIfPresent = (
  db: Database.Database,
  config: AppConfig,
  io: Server | null,
  notification: TaskLinkedNotificationDispatch | null
): void => {
  if (!io || !notification) {
    return;
  }

  dispatchTaskLinkedNotification(db, config, io, notification);
};

export const dispatchTaskLinkedNotifications = (
  db: Database.Database,
  config: AppConfig,
  io: Server | null,
  notifications: Array<TaskLinkedNotificationDispatch | null>
): void => {
  if (!io) {
    return;
  }

  for (const notification of notifications) {
    if (notification) {
      dispatchTaskLinkedNotification(db, config, io, notification);
    }
  }
};
