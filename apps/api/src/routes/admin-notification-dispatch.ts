import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../config";
import { sendWebPushNotificationToUser } from "../push/service";
import { emitNotificationCreatedToAdmins, emitNotificationToUser } from "../socket";
import type {
  AdminNotificationPayload,
  SenderRow
} from "./admin-notification-types";

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
    notificationPayload: AdminNotificationPayload;
  }
): void => {
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
