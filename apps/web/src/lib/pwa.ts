export interface ServiceWorkerLocationLike {
  protocol: string;
  hostname: string;
  isSecureContext: boolean;
}

export interface ServiceWorkerLike {
  register(scriptUrl: string): Promise<unknown>;
}

const isLocalhostHost = (hostname: string): boolean => {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
};

export const canRegisterServiceWorker = ({
  protocol,
  hostname,
  isSecureContext
}: ServiceWorkerLocationLike): boolean => {
  if (protocol === "https:" && isSecureContext) {
    return true;
  }

  return isLocalhostHost(hostname);
};

export const registerAppServiceWorker = async (
  serviceWorker: ServiceWorkerLike | undefined,
  locationLike: ServiceWorkerLocationLike
): Promise<{ status: "registered" | "skipped" | "failed"; error?: unknown }> => {
  if (!serviceWorker) {
    return { status: "skipped" };
  }

  if (!canRegisterServiceWorker(locationLike)) {
    return { status: "skipped" };
  }

  try {
    await serviceWorker.register("/sw.js");
    return { status: "registered" };
  } catch (error) {
    console.error("[pwa] service worker registration failed", error);
    return { status: "failed", error };
  }
};
