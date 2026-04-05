import type Database from "better-sqlite3";
import type { NotificationPriority, RecipientMode } from "../types";
import type {
  AdminNotificationPayload,
  RecipientUserRow,
  SenderRow
} from "./admin-notification-types";

export const isValidSourceTaskId = (
  db: Database.Database,
  sourceTaskId: number | null
): boolean => {
  if (sourceTaskId === null) {
    return true;
  }

  return Boolean(
    db.prepare("SELECT id FROM tasks WHERE id = ? AND archived_at IS NULL").get(sourceTaskId)
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
): number => {
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

export const buildAdminNotificationPayload = (params: {
  notificationId: number;
  title: string;
  message: string;
  priority: NotificationPriority;
  recipientMode: RecipientMode;
  sourceTaskId: number | null;
  createdAt: string;
  sender: SenderRow;
  recipientUsers: RecipientUserRow[];
}): AdminNotificationPayload => {
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
