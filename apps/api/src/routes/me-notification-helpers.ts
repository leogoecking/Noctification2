import type Database from "better-sqlite3";
import type {
  NotificationOperationalStatus,
  NotificationResponseStatus
} from "../types";

export const RESPONSE_STATUSES: NotificationResponseStatus[] = [
  "em_andamento",
  "assumida",
  "resolvida"
];

export const isNotificationVisualized = (visualizedAt: string | null): boolean =>
  visualizedAt !== null;

export const isNotificationOperationallyPending = (
  operationalStatus: NotificationOperationalStatus
): boolean => operationalStatus !== "resolvida";

export const toVisualizedAtSql = `COALESCE(nr.visualized_at, nr.read_at)`;
export const toCurrentVisualizedAtSql = `COALESCE(visualized_at, read_at)`;

export const toOperationalStatusSql = `
  CASE
    WHEN nr.response_status = 'resolvido' THEN 'resolvida'
    WHEN nr.response_status = 'assumida' THEN 'assumida'
    WHEN nr.response_status = 'em_andamento' THEN 'em_andamento'
    ELSE COALESCE(nr.operational_status, CASE
      WHEN ${toVisualizedAtSql} IS NOT NULL THEN 'visualizada'
      ELSE 'recebida'
    END)
  END
`;

export const toCurrentOperationalStatusSql = `
  CASE
    WHEN response_status = 'resolvido' THEN 'resolvida'
    WHEN response_status = 'assumida' THEN 'assumida'
    WHEN response_status = 'em_andamento' THEN 'em_andamento'
    ELSE COALESCE(operational_status, CASE
      WHEN ${toCurrentVisualizedAtSql} IS NOT NULL THEN 'visualizada'
      ELSE 'recebida'
    END)
  END
`;

export const toResponseStatus = (
  operationalStatus: NotificationOperationalStatus
): NotificationResponseStatus | null => {
  if (
    operationalStatus === "em_andamento" ||
    operationalStatus === "assumida" ||
    operationalStatus === "resolvida"
  ) {
    return operationalStatus;
  }

  return null;
};

export const toOptionalResponseMessage = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const parseNotificationListStatus = (value: unknown) => {
  const status = typeof value === "string" ? value : "";
  if (status !== "" && status !== "read" && status !== "unread") {
    return {
      status: null,
      error: "status deve ser read ou unread"
    };
  }

  return {
    status: status as "" | "read" | "unread",
    error: null
  };
};

export const buildNotificationListFilter = (userId: number, status: "" | "read" | "unread") => {
  const conditions = ["nr.user_id = ?"];
  const values: Array<number | string> = [userId];

  if (status === "read") {
    conditions.push(`${toVisualizedAtSql} IS NOT NULL`);
  }

  if (status === "unread") {
    conditions.push(`${toVisualizedAtSql} IS NULL`);
  }

  return {
    whereClause: conditions.join(" AND "),
    values
  };
};

export const getUnreadNotificationState = (db: Database.Database, userId: number) =>
  db.prepare(
    `
      SELECT
        notification_id AS notificationId,
        ${toCurrentOperationalStatusSql} AS operationalStatus,
        response_at AS responseAt
      FROM notification_recipients
      WHERE user_id = ?
        AND ${toCurrentVisualizedAtSql} IS NULL
    `
  ).all(userId) as Array<{
    notificationId: number;
    operationalStatus: NotificationOperationalStatus;
    responseAt: string | null;
  }>;

export const getCurrentNotificationState = (
  db: Database.Database,
  notificationId: number,
  userId: number
) =>
  db.prepare(
    `
      SELECT
        ${toCurrentVisualizedAtSql} AS visualizedAt,
        ${toCurrentOperationalStatusSql} AS operationalStatus,
        response_at AS responseAt,
        response_message AS responseMessage
      FROM notification_recipients
      WHERE notification_id = ?
        AND user_id = ?
    `
  ).get(notificationId, userId) as
    | {
        visualizedAt: string | null;
        operationalStatus: NotificationOperationalStatus;
        responseAt: string | null;
        responseMessage: string | null;
      }
    | undefined;
