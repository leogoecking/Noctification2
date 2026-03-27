import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../config";
import { sendWebPushNotificationToUser } from "../push/service";
import {
  emitNotificationCreatedToAdmins,
  emitNotificationToUser
} from "../socket";
import type {
  NotificationPriority,
  RecipientMode
} from "../types";

const SQLITE_MAX_VARIABLES = 900;

export interface SenderRow {
  id: number;
  name: string;
  login: string;
}

interface RecipientUserRow {
  id: number;
  name: string;
  login: string;
}

export const parseUserIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry > 0);

  return Array.from(new Set(normalized));
};

export const fetchActiveUserIds = (
  db: Database.Database,
  userIds: number[]
): number[] => {
  const uniqueUserIds = Array.from(new Set(userIds));
  if (uniqueUserIds.length === 0) {
    return [];
  }

  const activeUserIds: number[] = [];

  for (
    let index = 0;
    index < uniqueUserIds.length;
    index += SQLITE_MAX_VARIABLES
  ) {
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

export const resolveNotificationRecipientIds = (
  db: Database.Database,
  recipientMode: RecipientMode,
  requestedRecipientIds: number[]
) => {
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

    return rows.map((row) => row.id);
  }

  return fetchActiveUserIds(db, requestedRecipientIds);
};

export const isValidSourceTaskId = (
  db: Database.Database,
  sourceTaskId: number | null
): boolean => {
  if (sourceTaskId === null) {
    return true;
  }

  return Boolean(
    db
      .prepare("SELECT id FROM tasks WHERE id = ? AND archived_at IS NULL")
      .get(sourceTaskId)
  );
};

export const createAdminNotificationRecord = (
  db: Database.Database,
  params: {
    title: string;
    message: string;
    priority: NotificationPriority;
    senderId: number;
    recipientMode: RecipientMode;
    sourceTaskId: number | null;
    recipientIds: number[];
    createdAt: string;
  }
) => {
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
            source_task_id,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        params.title,
        params.message,
        params.priority,
        params.senderId,
        params.recipientMode,
        params.sourceTaskId,
        params.createdAt
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
        ) VALUES (?, ?, ?, NULL, NULL, ?, ?)
      `
    );

    for (const recipientId of params.recipientIds) {
      recipientStmt.run(
        notificationId,
        recipientId,
        params.createdAt,
        "recebida",
        params.createdAt
      );
    }

    return notificationId;
  });

  return transaction();
};

export const fetchRecipientUsers = (
  db: Database.Database,
  userIds: number[]
): Array<{ id: number; name: string; login: string }> => {
  const recipientUsers: RecipientUserRow[] = [];

  for (let index = 0; index < userIds.length; index += SQLITE_MAX_VARIABLES) {
    const chunk = userIds.slice(index, index + SQLITE_MAX_VARIABLES);
    const placeholders = chunk.map(() => "?").join(",");
    const rows = db
      .prepare(
        `
          SELECT id, name, login
          FROM users
          WHERE id IN (${placeholders})
          ORDER BY name ASC
        `
      )
      .all(...chunk) as RecipientUserRow[];

    recipientUsers.push(...rows);
  }

  return recipientUsers;
};

export const buildAdminNotificationPayload = (params: {
  notificationId: number;
  title: string;
  message: string;
  priority: NotificationPriority;
  recipientMode: RecipientMode;
  sourceTaskId: number | null;
  createdAt: string;
  sender: SenderRow;
  recipientUsers: Array<{ id: number; name: string; login: string }>;
}) => {
  const recipients = params.recipientUsers.map((recipient) => ({
    userId: recipient.id,
    name: recipient.name,
    login: recipient.login,
    visualizedAt: null,
    deliveredAt: params.createdAt,
    operationalStatus: "recebida" as const,
    responseAt: null,
    responseMessage: null
  }));

  return {
    id: params.notificationId,
    title: params.title,
    message: params.message,
    priority: params.priority,
    recipient_mode: params.recipientMode,
    source_task_id: params.sourceTaskId,
    created_at: params.createdAt,
    sender: params.sender,
    recipients,
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
};

export const dispatchAdminNotification = (
  db: Database.Database,
  io: Server,
  config: AppConfig,
  params: {
    notificationId: number;
    title: string;
    message: string;
    sourceTaskId: number | null;
    createdAt: string;
    sender: SenderRow;
    recipientIds: number[];
    notificationPayload: ReturnType<typeof buildAdminNotificationPayload>;
  }
) => {
  for (const recipientId of params.recipientIds) {
    emitNotificationToUser(io, recipientId, {
      id: params.notificationId,
      title: params.title,
      message: params.message,
      priority: params.notificationPayload.priority,
      sourceTaskId: params.sourceTaskId,
      createdAt: params.createdAt,
      sender: params.sender
    });

    void sendWebPushNotificationToUser(db, config, recipientId, {
      title: `Notificacao: ${params.title}`,
      body:
        params.message.trim() ||
        `Recebida em ${new Date(params.createdAt).toLocaleString("pt-BR")}`,
      tag: `notification-${params.notificationId}`,
      url: "/notifications",
      notificationId: params.notificationId,
      kind: "notification"
    });
  }

  emitNotificationCreatedToAdmins(io, params.notificationPayload);
};
