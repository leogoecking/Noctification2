import type Database from "better-sqlite3";
import { toRecipientOperationalStatusSql, toRecipientVisualizedAtSql } from "./admin-query-input-helpers";
import type { AdminNotificationRow, AdminRecipientRow } from "./admin-query-types";

const isRecipientInProgress = (recipient: AdminRecipientRow): boolean =>
  recipient.operationalStatus === "em_andamento";

const isRecipientAssumed = (recipient: AdminRecipientRow): boolean =>
  recipient.operationalStatus === "assumida";

const isRecipientResolved = (recipient: AdminRecipientRow): boolean =>
  recipient.operationalStatus === "resolvida";

const isRecipientOperationallyPending = (recipient: AdminRecipientRow): boolean =>
  recipient.operationalStatus !== "resolvida";

const buildAdminNotificationStats = (recipients: AdminRecipientRow[]) => ({
  total: recipients.length,
  read: recipients.filter((recipient) => recipient.visualizedAt !== null).length,
  unread: recipients.filter((recipient) => recipient.visualizedAt === null).length,
  responded: recipients.filter((recipient) =>
    ["em_andamento", "assumida", "resolvida"].includes(recipient.operationalStatus)
  ).length,
  received: recipients.filter(
    (recipient) => recipient.operationalStatus === "recebida"
  ).length,
  visualized: recipients.filter(
    (recipient) => recipient.operationalStatus === "visualizada"
  ).length,
  inProgress: recipients.filter(isRecipientInProgress).length,
  assumed: recipients.filter(isRecipientAssumed).length,
  resolved: recipients.filter(isRecipientResolved).length,
  operationalPending: recipients.filter(isRecipientOperationallyPending).length,
  operationalCompleted: recipients.filter(
    (recipient) => !isRecipientOperationallyPending(recipient)
  ).length
});

const fetchRecipientsByNotificationId = (
  db: Database.Database,
  notificationIds: number[]
) => {
  const recipientsByNotificationId = new Map<number, AdminRecipientRow[]>();

  if (notificationIds.length === 0) {
    return recipientsByNotificationId;
  }

  const placeholders = notificationIds.map(() => "?").join(",");
  const recipientRows = db
    .prepare(
      `
        SELECT
          nr.notification_id AS notificationId,
          nr.user_id AS userId,
          u.name,
          u.login,
          ${toRecipientVisualizedAtSql("nr")} AS visualizedAt,
          nr.delivered_at AS deliveredAt,
          ${toRecipientOperationalStatusSql("nr")} AS operationalStatus,
          nr.response_at AS responseAt,
          nr.response_message AS responseMessage
        FROM notification_recipients nr
        INNER JOIN users u ON u.id = nr.user_id
        WHERE nr.notification_id IN (${placeholders})
        ORDER BY nr.notification_id ASC, u.name ASC
      `
    )
    .all(...notificationIds) as AdminRecipientRow[];

  for (const recipient of recipientRows) {
    if (!recipient.notificationId) {
      continue;
    }

    const current = recipientsByNotificationId.get(recipient.notificationId) ?? [];
    current.push({
      userId: recipient.userId,
      name: recipient.name,
      login: recipient.login,
      visualizedAt: recipient.visualizedAt,
      deliveredAt: recipient.deliveredAt,
      operationalStatus: recipient.operationalStatus,
      responseAt: recipient.responseAt,
      responseMessage: recipient.responseMessage
    });
    recipientsByNotificationId.set(recipient.notificationId, current);
  }

  return recipientsByNotificationId;
};

export const fetchAdminNotificationHistory = (params: {
  db: Database.Database;
  whereClause: string;
  values: Array<string | number>;
  limit: number;
  offset: number;
}) => {
  const totalRow = params.db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM notifications n
        ${params.whereClause}
      `
    )
    .get(...params.values) as { total: number };

  const notifications = params.db
    .prepare(
      `
        SELECT
          n.id,
          n.title,
          n.message,
          n.priority,
          n.recipient_mode AS recipientMode,
          n.source_task_id AS sourceTaskId,
          n.created_at AS createdAt,
          n.sender_id AS senderId,
          sender.name AS senderName,
          sender.login AS senderLogin
        FROM notifications n
        INNER JOIN users sender ON sender.id = n.sender_id
        ${params.whereClause}
        ORDER BY n.created_at DESC
        LIMIT ?
        OFFSET ?
      `
    )
    .all(...params.values, params.limit, params.offset) as AdminNotificationRow[];

  const recipientsByNotificationId = fetchRecipientsByNotificationId(
    params.db,
    notifications.map((notification) => notification.id)
  );

  return {
    notifications: notifications.map((notification) => {
      const recipients = recipientsByNotificationId.get(notification.id) ?? [];

      return {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        recipient_mode: notification.recipientMode,
        source_task_id: notification.sourceTaskId,
        created_at: notification.createdAt,
        sender: {
          id: notification.senderId,
          name: notification.senderName,
          login: notification.senderLogin
        },
        recipients,
        stats: buildAdminNotificationStats(recipients)
      };
    }),
    total: totalRow.total
  };
};
