import type { NotificationPriority } from "../types";

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
