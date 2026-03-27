import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import { logAudit, nowIso } from "../db";
import { emitReadUpdateToAdmins } from "../socket";
import type { NotificationResponseStatus } from "../types";
import {
  getCurrentNotificationState,
  getUnreadNotificationState,
  isNotificationOperationallyPending,
  RESPONSE_STATUSES,
  toCurrentOperationalStatusSql,
  toCurrentVisualizedAtSql,
  toOptionalResponseMessage,
  toResponseStatus
} from "./me-notification-helpers";

export const markAllNotificationsRead = (
  db: Database.Database,
  io: Server,
  userId: number
): { updatedCount: number; visualizedAt: string | null } => {
  const unreadRows = getUnreadNotificationState(db, userId);

  if (unreadRows.length === 0) {
    return { updatedCount: 0, visualizedAt: null };
  }

  const timestamp = nowIso();

  const result = db
    .prepare(
      `
        UPDATE notification_recipients
        SET
          visualized_at = ?,
          read_at = COALESCE(read_at, ?),
          operational_status = CASE
            WHEN ${toCurrentOperationalStatusSql} = 'recebida' THEN 'visualizada'
            ELSE ${toCurrentOperationalStatusSql}
          END
        WHERE user_id = ?
          AND ${toCurrentVisualizedAtSql} IS NULL
      `
    )
    .run(timestamp, timestamp, userId);

  for (const row of unreadRows) {
    emitReadUpdateToAdmins(io, {
      notificationId: row.notificationId,
      userId,
      readAt: timestamp,
      responseStatus: toResponseStatus(row.operationalStatus),
      responseAt: row.responseAt
    });
  }

  logAudit(db, {
    actorUserId: userId,
    eventType: "notification.read_all",
    targetType: "user",
    targetId: userId,
    metadata: {
      updatedCount: result.changes,
      visualizedAt: timestamp
    }
  });

  return {
    updatedCount: result.changes,
    visualizedAt: timestamp
  };
};

export const markNotificationRead = (
  db: Database.Database,
  io: Server,
  params: {
    notificationId: number;
    userId: number;
  }
):
  | {
      notificationId: number;
      visualizedAt: string;
      operationalStatus: string;
      responseStatus: NotificationResponseStatus | null;
      isVisualized: true;
      isOperationallyPending: boolean;
    }
  | { error: string; status: number } => {
  const timestamp = nowIso();

  db.prepare(
    `
      UPDATE notification_recipients
      SET
        visualized_at = COALESCE(visualized_at, read_at, ?),
        read_at = COALESCE(read_at, visualized_at, ?),
        operational_status = CASE
          WHEN ${toCurrentOperationalStatusSql} = 'recebida' THEN 'visualizada'
          ELSE ${toCurrentOperationalStatusSql}
        END
      WHERE notification_id = ?
        AND user_id = ?
    `
  ).run(timestamp, timestamp, params.notificationId, params.userId);

  const current = getCurrentNotificationState(db, params.notificationId, params.userId);

  if (!current || !current.visualizedAt) {
    return { error: "Notificacao nao encontrada", status: 404 };
  }

  const responseStatus = toResponseStatus(current.operationalStatus);

  emitReadUpdateToAdmins(io, {
    notificationId: params.notificationId,
    userId: params.userId,
    readAt: current.visualizedAt,
    responseStatus,
    responseAt: current.responseAt
  });

  logAudit(db, {
    actorUserId: params.userId,
    eventType: "notification.read",
    targetType: "notification",
    targetId: params.notificationId,
    metadata: {
      visualizedAt: current.visualizedAt,
      operationalStatus: current.operationalStatus,
      responseStatus,
      responseMessage: current.responseMessage,
      isVisualized: true
    }
  });

  return {
    notificationId: params.notificationId,
    visualizedAt: current.visualizedAt,
    operationalStatus: current.operationalStatus,
    responseStatus,
    isVisualized: true,
    isOperationallyPending: isNotificationOperationallyPending(current.operationalStatus)
  };
};

export const respondToNotification = (
  db: Database.Database,
  io: Server,
  params: {
    notificationId: number;
    userId: number;
    body: Record<string, unknown> | undefined;
  }
):
  | {
      notificationId: number;
      visualizedAt: string;
      operationalStatus: NotificationResponseStatus;
      responseStatus: NotificationResponseStatus;
      responseMessage: string | null;
      responseAt: string;
      isVisualized: true;
      isOperationallyPending: boolean;
    }
  | { error: string; status: number } => {
  const operationalStatus = (params.body?.operational_status ??
    params.body?.response_status) as NotificationResponseStatus;
  const responseMessage = toOptionalResponseMessage(
    params.body?.response_message ?? params.body?.responseMessage ?? params.body?.message
  );

  if (!RESPONSE_STATUSES.includes(operationalStatus)) {
    return {
      error: "operational_status invalido. Use: em_andamento, assumida, resolvida",
      status: 400
    };
  }

  const timestamp = nowIso();
  const existing = db
    .prepare(
      `
        SELECT ${toCurrentVisualizedAtSql} AS visualizedAt
        FROM notification_recipients
        WHERE notification_id = ?
          AND user_id = ?
      `
    )
    .get(params.notificationId, params.userId) as { visualizedAt: string | null } | undefined;

  if (!existing) {
    return { error: "Notificacao nao encontrada", status: 404 };
  }

  db.prepare(
    `
      UPDATE notification_recipients
      SET
        operational_status = ?,
        response_status = CASE
          WHEN ? = 'resolvida' THEN 'resolvido'
          WHEN ? = 'assumida' THEN NULL
          ELSE ?
        END,
        response_at = ?,
        response_message = ?,
        visualized_at = COALESCE(visualized_at, read_at, ?),
        read_at = COALESCE(read_at, visualized_at, ?),
        last_reminder_at = NULL,
        reminder_count = 0
      WHERE notification_id = ?
        AND user_id = ?
    `
  ).run(
    operationalStatus,
    operationalStatus,
    operationalStatus,
    operationalStatus,
    timestamp,
    responseMessage,
    timestamp,
    timestamp,
    params.notificationId,
    params.userId
  );

  const visualizedAt = existing.visualizedAt ?? timestamp;

  emitReadUpdateToAdmins(io, {
    notificationId: params.notificationId,
    userId: params.userId,
    readAt: visualizedAt,
    responseStatus: operationalStatus,
    responseAt: timestamp
  });

  logAudit(db, {
    actorUserId: params.userId,
    eventType: "notification.respond",
    targetType: "notification",
    targetId: params.notificationId,
    metadata: {
      operationalStatus,
      responseStatus: operationalStatus,
      responseMessage,
      responseAt: timestamp,
      visualizedAt,
      isVisualized: true
    }
  });

  return {
    notificationId: params.notificationId,
    visualizedAt,
    operationalStatus,
    responseStatus: operationalStatus,
    responseMessage,
    responseAt: timestamp,
    isVisualized: true,
    isOperationallyPending: isNotificationOperationallyPending(operationalStatus)
  };
};
