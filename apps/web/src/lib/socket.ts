import { io, type Socket } from "socket.io-client";
import { resolveRuntimeSocketUrl } from "./runtimeUrls";

const SOCKET_URL = resolveRuntimeSocketUrl(
  import.meta.env.VITE_SOCKET_URL,
  typeof window === "undefined" ? undefined : window.location
).replace(/\/+$/, "");

let sharedSocket: Socket | null = null;
let sharedSocketRefCount = 0;

const createSocket = (): Socket => {
  return io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    withCredentials: true
  });
};

export const acquireSocket = (): Socket => {
  if (!sharedSocket) {
    sharedSocket = createSocket();
  }

  sharedSocketRefCount += 1;
  return sharedSocket;
};

export const releaseSocket = (socket: Socket): void => {
  if (!sharedSocket || socket !== sharedSocket) {
    return;
  }

  sharedSocketRefCount = Math.max(0, sharedSocketRefCount - 1);
  if (sharedSocketRefCount > 0) {
    return;
  }

  sharedSocket.disconnect();
  sharedSocket = null;
};

export const connectSocket = (): Socket => {
  return acquireSocket();
};
