import { useEffect } from "react";
import { connectSocket } from "../lib/socket";
import type { IncomingReminderDue, IncomingReminderUpdated } from "../lib/reminderEvents";

interface UseReminderSocketOptions {
  onDue: (payload: IncomingReminderDue) => void;
  onUpdated: (payload: IncomingReminderUpdated) => void;
  onError: () => void;
}

export const useReminderSocket = ({ onDue, onUpdated, onError }: UseReminderSocketOptions) => {
  useEffect(() => {
    const socket = connectSocket();

    socket.on("reminder:due", onDue);
    socket.on("reminder:updated", onUpdated);
    socket.on("connect_error", onError);

    return () => {
      socket.off("reminder:due", onDue);
      socket.off("reminder:updated", onUpdated);
      socket.off("connect_error", onError);
      socket.disconnect();
    };
  }, [onDue, onError, onUpdated]);
};
