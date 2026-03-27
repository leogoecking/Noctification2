import type Database from "better-sqlite3";
import type {
  NotificationOperationalStatus,
  NotificationPriority
} from "../types";

interface AdminNotificationRow {
  id: number;
  title: string;
  message: string;
  priority: NotificationPriority;
  recipientMode: "all" | "users";
  sourceTaskId: number | null;
  createdAt: string;
  senderId: number;
  senderName: string;
  senderLogin: string;
}

interface AdminRecipientRow {
  notificationId?: number;
  userId: number;
  name: string;
  login: string;
  visualizedAt: string | null;
  deliveredAt: string;
  operationalStatus: NotificationOperationalStatus;
  responseAt: string | null;
  responseMessage: string | null;
}

const isRecipientInProgress = (recipient: AdminRecipientRow): boolean =>
  recipient.operationalStatus === "em_andamento";

const isRecipientAssumed = (recipient: AdminRecipientRow): boolean =>
  recipient.operationalStatus === "assumida";

const isRecipientResolved = (recipient: AdminRecipientRow): boolean =>
  recipient.operationalStatus === "resolvida";

const isRecipientOperationallyPending = (recipient: AdminRecipientRow): boolean =>
  recipient.operationalStatus !== "resolvida";

export const toRecipientVisualizedAtSql = (alias: string): string =>
  `COALESCE(${alias}.visualized_at, ${alias}.read_at)`;

export const toRecipientOperationalStatusSql = (alias: string): string => {
  const visualizedAtSql = toRecipientVisualizedAtSql(alias);
  return `CASE
    WHEN ${alias}.response_status = 'resolvido' THEN 'resolvida'
    WHEN ${alias}.response_status = 'assumida' THEN 'assumida'
    WHEN ${alias}.response_status = 'em_andamento' THEN 'em_andamento'
    ELSE COALESCE(${alias}.operational_status, CASE
      WHEN ${visualizedAtSql} IS NOT NULL THEN 'visualizada'
      ELSE 'recebida'
    END)
  END`;
};

export const parseAdminNotificationListQuery = (
  query: Record<string, unknown> | undefined,
  priorities: NotificationPriority[]
) => {
  const status = typeof query?.status === "string" ? query.status : "";
  const scope = typeof query?.scope === "string" ? query.scope : "";
  const userId = typeof query?.user_id === "string" ? Number(query.user_id) : null;
  const from = typeof query?.from === "string" ? query.from : null;
  const to = typeof query?.to === "string" ? query.to : null;
  const priority = typeof query?.priority === "string" ? query.priority : "";

  if (priority !== "" && !priorities.includes(priority as NotificationPriority)) {
    return {
      ok: false as const,
      statusCode: 400,
      error: "priority deve ser low, normal, high ou critical"
    };
  }

  if (status !== "" && status !== "read" && status !== "unread") {
    return {
      ok: false as const,
      statusCode: 400,
      error: "status deve ser read ou unread"
    };
  }

  if (scope !== "" && scope !== "operational_active" && scope !== "operational_completed") {
    return {
      ok: false as const,
      statusCode: 400,
      error: "scope deve ser operational_active ou operational_completed"
    };
  }

  return {
    ok: true as const,
    value: {
      status: status as "" | "read" | "unread",
      scope: scope as "" | "operational_active" | "operational_completed",
      userId,
      from,
      to,
      priority: priority as "" | NotificationPriority
    }
  };
};

export const buildAdminNotificationWhere = (params: {
  status: "" | "read" | "unread";
  scope: "" | "operational_active" | "operational_completed";
  userId: number | null;
  from: string | null;
  to: string | null;
  priority: "" | NotificationPriority;
}) => {
  const conditions: string[] = [];
  const values: Array<string | number> = [];

  if (params.userId && Number.isInteger(params.userId) && params.userId > 0) {
    conditions.push(
      "EXISTS (SELECT 1 FROM notification_recipients nr2 WHERE nr2.notification_id = n.id AND nr2.user_id = ?)"
    );
    values.push(params.userId);
  }

  if (params.from) {
    conditions.push("n.created_at >= ?");
    values.push(params.from);
  }

  if (params.to) {
    conditions.push("n.created_at <= ?");
    values.push(params.to);
  }

  if (params.priority !== "") {
    conditions.push("n.priority = ?");
    values.push(params.priority);
  }

  if (params.status === "read") {
    conditions.push(
      `NOT EXISTS (
        SELECT 1
        FROM notification_recipients nr3
        WHERE nr3.notification_id = n.id
          AND ${toRecipientVisualizedAtSql("nr3")} IS NULL
      )`
    );
  }

  if (params.status === "unread") {
    conditions.push(
      `EXISTS (
        SELECT 1
        FROM notification_recipients nr3
        WHERE nr3.notification_id = n.id
          AND ${toRecipientVisualizedAtSql("nr3")} IS NULL
      )`
    );
  }

  if (params.scope === "operational_active") {
    conditions.push(
      `EXISTS (
        SELECT 1
        FROM notification_recipients nr4
        WHERE nr4.notification_id = n.id
          AND ${toRecipientOperationalStatusSql("nr4")} != 'resolvida'
      )`
    );
  }

  if (params.scope === "operational_completed") {
    conditions.push(
      `EXISTS (
        SELECT 1
        FROM notification_recipients nr4
        WHERE nr4.notification_id = n.id
      )`
    );
    conditions.push(
      `NOT EXISTS (
        SELECT 1
        FROM notification_recipients nr5
        WHERE nr5.notification_id = n.id
          AND ${toRecipientOperationalStatusSql("nr5")} != 'resolvida'
      )`
    );
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    values
  };
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

  const notificationIds = notifications.map((notification) => notification.id);
  const recipientsByNotificationId = new Map<number, AdminRecipientRow[]>();

  if (notificationIds.length > 0) {
    const placeholders = notificationIds.map(() => "?").join(",");
    const recipientRows = params.db
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
  }

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
        stats: {
          total: recipients.length,
          read: recipients.filter((recipient) => recipient.visualizedAt !== null).length,
          unread: recipients.filter((recipient) => recipient.visualizedAt === null).length,
          responded: recipients.filter((recipient) =>
            ["em_andamento", "assumida", "resolvida"].includes(
              recipient.operationalStatus
            )
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
        }
      };
    }),
    total: totalRow.total
  };
};
