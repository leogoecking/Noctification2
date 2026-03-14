import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface BrowserReminderNotificationInput {
  occurrenceId: number;
  title: string;
  body: string;
}

interface NotificationLockRecord {
  ownerId: string;
  expiresAt: number;
}

const LOCK_TTL_MS = 15_000;

const getNotificationLockKey = (occurrenceId: number) =>
  `noctification:browser-notification:${occurrenceId}`;

const getNotificationPermission = (): NotificationPermission | "unsupported" => {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }

  return Notification.permission;
};

export const useBrowserNotifications = (onOpenReminders: () => void) => {
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

  const releaseNotificationLock = useCallback((occurrenceId: number) => {
    try {
      const key = getNotificationLockKey(occurrenceId);
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
  }, []);

  const closeReminderNotification = useCallback(
    (occurrenceId: number) => {
      const current = openNotificationsRef.current.get(occurrenceId);
      if (current) {
        current.close();
        openNotificationsRef.current.delete(occurrenceId);
      }

      releaseNotificationLock(occurrenceId);
    },
    [releaseNotificationLock]
  );

  const claimNotificationLock = useCallback((occurrenceId: number) => {
    try {
      const key = getNotificationLockKey(occurrenceId);
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
  }, []);

  const notifyReminderDue = useCallback(
    (input: BrowserReminderNotificationInput) => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") {
        return false;
      }

      if (document.visibilityState === "visible") {
        return false;
      }

      if (!claimNotificationLock(input.occurrenceId)) {
        return false;
      }

      closeReminderNotification(input.occurrenceId);

      const notification = new Notification(input.title, {
        body: input.body,
        tag: `reminder-occurrence-${input.occurrenceId}`,
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        onOpenReminders();
        notification.close();
      };

      notification.onclose = () => {
        openNotificationsRef.current.delete(input.occurrenceId);
        releaseNotificationLock(input.occurrenceId);
      };

      openNotificationsRef.current.set(input.occurrenceId, notification);
      return true;
    },
    [claimNotificationLock, closeReminderNotification, onOpenReminders, releaseNotificationLock]
  );

  return useMemo(
    () => ({
      permission,
      requestPermission,
      notifyReminderDue,
      closeReminderNotification
    }),
    [closeReminderNotification, notifyReminderDue, permission, requestPermission]
  );
};
