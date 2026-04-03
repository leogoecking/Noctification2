import { useEffect } from "react";
import { acquireSocket, releaseSocket } from "../lib/socket";

export interface BoardViewedPayload {
  messageId: number;
  actorUserId: number;
  actorName: string;
  actorLogin: string;
  viewedAt: string;
}

interface UseOperationsBoardSocketOptions {
  onViewed: (payload: BoardViewedPayload) => void;
}

export const useOperationsBoardSocket = ({ onViewed }: UseOperationsBoardSocketOptions) => {
  useEffect(() => {
    const socket = acquireSocket();

    socket.on("operations_board:viewed", onViewed);

    return () => {
      socket.off("operations_board:viewed", onViewed);
      releaseSocket(socket);
    };
  }, [onViewed]);
};
