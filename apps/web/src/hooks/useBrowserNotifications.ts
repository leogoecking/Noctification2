import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface BrowserNotificationInput {
  itemId: number;
  title: string;
  body: string;
  tagPrefix: string;
}

interface NotificationLockRecord {
  ownerId: string;
  expiresAt: number;
}

const LOCK_TTL_MS = 15_000;
const LOCK_RENEW_INTERVAL_MS = 5_000;

const getNotificationLockKey = (namespace: string, itemId: number) =>
  `noctification:browser-notification:${namespace}:${itemId}`;

const getNotificationPermission = (): NotificationPermission | "unsupported" => {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }

  return Notification.permission;
};

interface UseBrowserNotificationsOptions {
  namespace: string;
  onOpen: () => void;
}

export const useBrowserNotifications = ({ namespace, onOpen }: UseBrowserNotificationsOptions) => {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    getNotificationPermission
  );
  const openNotificationsRef = useRef(new Map<number, Notification>());
  const tabIdRef = useRef(`tab-${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    const refreshPermission = () => {
      setPermission(getNotificationPermission());
    };

    window.addEventListener("focus", refreshPermission);
    document.addEventListener("visibilitychange", refreshPermission);

    return () => {
      window.removeEventListener("focus", refreshPermission);
      document.removeEventListener("visibilitychange", refreshPermission);
    };
  }, []);

  useEffect(() => {
    const notifications = openNotificationsRef.current;

    return () => {
      for (const notification of notifications.values()) {
        notification.close();
      }

      notifications.clear();
    };
  }, []);

  useEffect(() => {
    const renewLocks = () => {
      try {
        const now = Date.now();
        for (const itemId of openNotificationsRef.current.keys()) {
          const key = getNotificationLockKey(namespace, itemId);
          window.localStorage.setItem(
            key,
            JSON.stringify({
              ownerId: tabIdRef.current,
              expiresAt: now + LOCK_TTL_MS
            } satisfies NotificationLockRecord)
          );
        }
      } catch {
        // Ignore storage failures and keep local notifications active.
      }
    };

    const timer = window.setInterval(renewLocks, LOCK_RENEW_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [namespace]);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") {
      return "unsupported" as const;
    }

    if (Notification.permission === "granted") {
      setPermission("granted");
      return "granted" as const;
    }

    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);
    return nextPermission;
  }, []);

  const closeLocalNotification = useCallback((itemId: number) => {
    const current = openNotificationsRef.current.get(itemId);
    if (!current) {
      return;
    }

    current.onclose = null;
    current.close();
    openNotificationsRef.current.delete(itemId);
  }, []);

  const releaseNotificationLock = useCallback((itemId: number) => {
    try {
      const key = getNotificationLockKey(namespace, itemId);
      const currentValue = window.localStorage.getItem(key);
      if (!currentValue) {
        return;
      }

      const currentRecord = JSON.parse(currentValue) as NotificationLockRecord;
      if (currentRecord.ownerId === tabIdRef.current) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore storage failures and keep runtime notification cleanup.
    }
  }, [namespace]);

  const closeNotification = useCallback(
    (itemId: number) => {
      closeLocalNotification(itemId);
      releaseNotificationLock(itemId);
    },
    [closeLocalNotification, releaseNotificationLock]
  );

  const claimNotificationLock = useCallback((itemId: number) => {
    try {
      const key = getNotificationLockKey(namespace, itemId);
      const now = Date.now();
      const currentValue = window.localStorage.getItem(key);

      if (currentValue) {
        const currentRecord = JSON.parse(currentValue) as NotificationLockRecord;
        if (currentRecord.expiresAt > now && currentRecord.ownerId !== tabIdRef.current) {
          return false;
        }
      }

      const nextRecord: NotificationLockRecord = {
        ownerId: tabIdRef.current,
        expiresAt: now + LOCK_TTL_MS
      };

      window.localStorage.setItem(key, JSON.stringify(nextRecord));
      return true;
    } catch {
      return true;
    }
  }, [namespace]);

  const notify = useCallback(
    (input: BrowserNotificationInput) => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") {
        return false;
      }

      if (document.visibilityState === "visible") {
        return false;
      }

      if (!claimNotificationLock(input.itemId)) {
        return false;
      }

      closeLocalNotification(input.itemId);

      const notification = new Notification(input.title, {
        body: input.body,
        tag: `${input.tagPrefix}-${input.itemId}`,
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        onOpen();
        notification.close();
      };

      notification.onclose = () => {
        openNotificationsRef.current.delete(input.itemId);
        releaseNotificationLock(input.itemId);
      };

      openNotificationsRef.current.set(input.itemId, notification);
      return true;
    },
    [claimNotificationLock, closeLocalNotification, onOpen, releaseNotificationLock]
  );

  return useMemo(
    () => ({
      permission,
      requestPermission,
      notify,
      closeNotification
    }),
    [closeNotification, notify, permission, requestPermission]
  );
};
