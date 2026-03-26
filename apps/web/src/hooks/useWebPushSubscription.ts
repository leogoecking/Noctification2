import { useEffect, useRef } from "react";
import { api } from "../lib/api";

const NOTIFICATION_PERMISSION_EVENT =
  "noctification:browser-notification:permission-changed";

const urlBase64ToArrayBuffer = (base64String: string): ArrayBuffer => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const decoded = window.atob(normalized);
  const bytes = new Uint8Array(decoded.length);

  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }

  return bytes.buffer;
};

const toSubscriptionPayload = (subscription: PushSubscription) => {
  const json = subscription.toJSON() as {
    endpoint?: string;
    expirationTime?: number | null;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };

  return {
    endpoint: json.endpoint ?? subscription.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: {
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? ""
    }
  };
};

interface UseWebPushSubscriptionOptions {
  enabled: boolean;
  onError: (message: string) => void;
}

export const useWebPushSubscription = ({
  enabled,
  onError
}: UseWebPushSubscriptionOptions) => {
  const syncInFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator) ||
      typeof PushManager === "undefined" ||
      typeof Notification === "undefined"
    ) {
      return;
    }

    let cancelled = false;

    const syncSubscription = async () => {
      if (syncInFlightRef.current || cancelled) {
        return;
      }

      syncInFlightRef.current = true;

      try {
        const config = await api.webPushConfig();
        if (!config.enabled || !config.vapidPublicKey) {
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const currentSubscription = await registration.pushManager.getSubscription();

        if (Notification.permission === "denied") {
          if (currentSubscription) {
            await api.removeWebPushSubscription(currentSubscription.endpoint);
            await currentSubscription.unsubscribe();
          }
          return;
        }

        if (Notification.permission !== "granted") {
          return;
        }

        const activeSubscription =
          currentSubscription ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToArrayBuffer(config.vapidPublicKey)
          }));

        const payload = toSubscriptionPayload(activeSubscription);
        if (!payload.endpoint || !payload.keys.p256dh || !payload.keys.auth) {
          throw new Error("Subscription Web Push incompleta");
        }

        await api.saveWebPushSubscription(payload);
      } catch (error) {
        if (!cancelled) {
          onError(
            error instanceof Error
              ? `Falha ao registrar notificacoes push: ${error.message}`
              : "Falha ao registrar notificacoes push"
          );
        }
      } finally {
        syncInFlightRef.current = false;
      }
    };

    const handlePermissionChanged = () => {
      void syncSubscription();
    };

    void syncSubscription();

    window.addEventListener("focus", handlePermissionChanged);
    window.addEventListener(
      NOTIFICATION_PERMISSION_EVENT,
      handlePermissionChanged as EventListener
    );
    document.addEventListener("visibilitychange", handlePermissionChanged);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handlePermissionChanged);
      window.removeEventListener(
        NOTIFICATION_PERMISSION_EVENT,
        handlePermissionChanged as EventListener
      );
      document.removeEventListener("visibilitychange", handlePermissionChanged);
    };
  }, [enabled, onError]);
};
