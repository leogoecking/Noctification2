import { io, type Socket } from "socket.io-client";

const isLoopbackHost = (hostname: string): boolean => {
  return hostname === "localhost" || hostname === "127.0.0.1";
};

const resolveDefaultSocketUrl = (): string => {
  if (typeof window === "undefined") {
    return "http://localhost:4000";
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:4000`;
};

const resolveSocketUrl = (): string => {
  const configuredValue = import.meta.env.VITE_SOCKET_URL;
  if (!configuredValue || typeof window === "undefined") {
    return resolveDefaultSocketUrl();
  }

  try {
    const configuredUrl = new URL(configuredValue);
    const pageHostname = window.location.hostname;

    if (!isLoopbackHost(pageHostname) && isLoopbackHost(configuredUrl.hostname)) {
      configuredUrl.hostname = pageHostname;
      return configuredUrl.toString();
    }

    return configuredUrl.toString();
  } catch {
    return configuredValue;
  }
};

const SOCKET_URL = resolveSocketUrl().replace(/\/+$/, "");

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
