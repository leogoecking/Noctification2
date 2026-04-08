import { useEffect } from "react";
import { acquireSocket, releaseSocket } from "../lib/socket";
import { dispatchBoardChanged, type BoardChangedPayload } from "../lib/boardEvents";

export const useBoardSocket = () => {
  useEffect(() => {
    const socket = acquireSocket();

    const onBoardChanged = (payload: BoardChangedPayload) => {
      dispatchBoardChanged(payload);
    };

    socket.on("board:changed", onBoardChanged);

    return () => {
      socket.off("board:changed", onBoardChanged);
      releaseSocket(socket);
    };
  }, []);
};
