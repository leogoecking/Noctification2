import { io, type Socket } from "socket.io-client";

const resolveDefaultSocketUrl = (): string => {
  if (typeof window === "undefined") {
    return "http://localhost:4000";
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:4000`;
};

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL ?? resolveDefaultSocketUrl()).replace(/\/+$/, "");

export const connectSocket = (): Socket => {
  return io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    withCredentials: true
  });
};
