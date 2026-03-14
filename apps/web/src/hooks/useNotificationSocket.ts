import { useEffect } from "react";
import { dispatchNotificationNew, dispatchNotificationReminder } from "../lib/notificationEvents";
import { playSystemAlert } from "../lib/reminderAudio";
import { notifySocketErrorOnce } from "../lib/socketError";
import { acquireSocket, releaseSocket } from "../lib/socket";
import type { IncomingNotification, IncomingReminder } from "../lib/notificationEvents";

interface UseNotificationSocketOptions {
  enabled: boolean;
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

export const useNotificationSocket = ({
  enabled,
  onError,
  onToast
}: UseNotificationSocketOptions) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const socket = acquireSocket();

    const onConnect = () => {
      socket.emit("notifications:subscribe", () => undefined);
    };

    const onNotificationNew = (payload: IncomingNotification) => {
      dispatchNotificationNew(payload);
      onToast(`Nova notificacao: ${payload.title}`);
      void playSystemAlert(
        payload.id,
        payload.priority === "critical" ? "critical" : "default"
      );
    };

    const onNotificationReminder = (payload: IncomingReminder) => {
      dispatchNotificationReminder(payload);
      onToast(`Lembrete (${payload.reminderCount}): ${payload.title} ainda em andamento`);
      void playSystemAlert(payload.id, "retry");
    };

    const onConnectError = () => {
      notifySocketErrorOnce(onError, "Falha na conexao em tempo real");
    };

    socket.on("connect", onConnect);
    socket.on("notification:new", onNotificationNew);
    socket.on("notification:reminder", onNotificationReminder);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("notification:new", onNotificationNew);
      socket.off("notification:reminder", onNotificationReminder);
      socket.off("connect_error", onConnectError);
      releaseSocket(socket);
    };
  }, [enabled, onError, onToast]);
};
