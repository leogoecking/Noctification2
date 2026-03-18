export interface RuntimeLocationLike {
  protocol: string;
  hostname: string;
  port?: string;
  origin?: string;
}

const VITE_DEV_SERVER_PORT = "5173";

const isLoopbackHost = (hostname: string): boolean => {
  return hostname === "localhost" || hostname === "127.0.0.1";
};

const toOrigin = (location: RuntimeLocationLike): string => {
  if (location.origin) {
    return location.origin.replace(/\/+$/, "");
  }

  const normalizedPort = location.port ? `:${location.port}` : "";
  return `${location.protocol}//${location.hostname}${normalizedPort}`;
};

const resolveDevApiBase = (location: RuntimeLocationLike): string => {
  return `${location.protocol}//${location.hostname}:4000/api/v1`;
};

const resolveDevSocketUrl = (location: RuntimeLocationLike): string => {
  return `${location.protocol}//${location.hostname}:4000`;
};

export const resolveRuntimeApiBase = (
  configuredValue: string | undefined,
  location?: RuntimeLocationLike
): string => {
  if (!location) {
    return "http://localhost:4000/api/v1";
  }

  if (!configuredValue) {
    if (location.port === VITE_DEV_SERVER_PORT) {
      return resolveDevApiBase(location);
    }

    return `${toOrigin(location)}/api/v1`;
  }

  try {
    const configuredUrl = new URL(configuredValue);

    if (!isLoopbackHost(location.hostname) && isLoopbackHost(configuredUrl.hostname)) {
      configuredUrl.hostname = location.hostname;
      return configuredUrl.toString();
    }

    return configuredUrl.toString();
  } catch {
    return configuredValue;
  }
};

export const resolveRuntimeSocketUrl = (
  configuredValue: string | undefined,
  location?: RuntimeLocationLike
): string => {
  if (!location) {
    return "http://localhost:4000";
  }

  if (!configuredValue) {
    if (location.port === VITE_DEV_SERVER_PORT) {
      return resolveDevSocketUrl(location);
    }

    return toOrigin(location);
  }

  try {
    const configuredUrl = new URL(configuredValue);

    if (!isLoopbackHost(location.hostname) && isLoopbackHost(configuredUrl.hostname)) {
      configuredUrl.hostname = location.hostname;
      return configuredUrl.toString();
    }

    return configuredUrl.toString();
  } catch {
    return configuredValue;
  }
};
