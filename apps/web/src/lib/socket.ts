import { io, type Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";

export const connectSocket = (): Socket => {
  return io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    withCredentials: true
  });
};
