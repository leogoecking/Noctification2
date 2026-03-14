import { useEffect } from "react";
import { notifySocketErrorOnce } from "../lib/socketError";
import { acquireSocket, releaseSocket } from "../lib/socket";
import type { IncomingReminderDue, IncomingReminderUpdated } from "../lib/reminderEvents";

interface UseReminderSocketOptions {
  onDue: (payload: IncomingReminderDue) => void;
  onUpdated: (payload: IncomingReminderUpdated) => void;
  onError: () => void;
}

export const useReminderSocket = ({ onDue, onUpdated, onError }: UseReminderSocketOptions) => {
  useEffect(() => {
    const socket = acquireSocket();
    const onConnectError = () => {
      notifySocketErrorOnce(onError, "Falha na conexao em tempo real dos lembretes");
    };

    socket.on("reminder:due", onDue);
    socket.on("reminder:updated", onUpdated);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("reminder:due", onDue);
      socket.off("reminder:updated", onUpdated);
      socket.off("connect_error", onConnectError);
      releaseSocket(socket);
    };
  }, [onDue, onError, onUpdated]);
};
