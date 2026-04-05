import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import {
  dispatchNotificationUpdated,
  subscribeNotificationEvents,
  type IncomingNotification,
  type IncomingNotificationUpdated,
  type IncomingReminder
} from "../lib/notificationEvents";
import { playSystemAlert } from "../lib/reminderAudio";
import { useBrowserNotifications } from "../hooks/useBrowserNotifications";
import type { NotificationItem } from "../types";
import {
  buildNotificationFromNew,
  buildNotificationFromReminder,
  NotificationAlertCard,
  NotificationAudioBanner,
  NotificationBrowserBanner,
  type NotificationVisualAlert
} from "./notification-alerts/notificationAlertUi";

interface NotificationAlertCenterProps {
  isVisible: boolean;
  onError: (message: string) => void;
  onToast: (message: string) => void;
  onOpenNotifications: () => void;
  onPlaySound?: (priority: "low" | "normal" | "high" | "critical") => void;
}

export const NotificationAlertCenter = ({
  isVisible,
  onError,
  onToast,
  onOpenNotifications,
  onPlaySound,
}: NotificationAlertCenterProps) => {
  const [alerts, setAlerts] = useState<NotificationVisualAlert[]>([]);
  const { permission, requestPermission, notify, closeNotification } = useBrowserNotifications({
    namespace: "notification",
    onOpen: onOpenNotifications
  });

  const upsertAlert = useCallback(
    (notification: NotificationItem, reminderCount: number, audioBlocked: boolean) => {
      setAlerts((prev) => {
        const existing = prev.find((item) => item.notification.id === notification.id);
        if (!existing) {
          return [{ notification, reminderCount, audioBlocked, dismissed: false }, ...prev];
        }

        return prev.map((item) =>
          item.notification.id === notification.id
            ? {
                ...item,
                notification: {
                  ...item.notification,
                  ...notification
                },
                reminderCount,
                audioBlocked,
                dismissed: false
              }
            : item
        );
      });
    },
    []
  );

  const dismissAlert = useCallback((notificationId: number) => {
    setAlerts((prev) =>
      prev.map((item) =>
        item.notification.id === notificationId ? { ...item, dismissed: true } : item
      )
    );
  }, []);

  const removeAlert = useCallback(
    (notificationId: number) => {
      closeNotification(notificationId);
      setAlerts((prev) => prev.filter((item) => item.notification.id !== notificationId));
    },
    [closeNotification]
  );

  const handleIncomingNotification = useCallback(
    (payload: IncomingNotification, reminderCount: number, profile: "default" | "retry" | "critical") => {
      const nextNotification =
        reminderCount > 0 ? buildNotificationFromReminder(payload as IncomingReminder) : buildNotificationFromNew(payload);

      upsertAlert(nextNotification, reminderCount, false);

      void (async () => {
        let played: boolean;
        if (onPlaySound) {
          onPlaySound(payload.priority);
          played = true;
        } else {
          played = await playSystemAlert(payload.id, profile);
        }
        const body =
          payload.message.trim() || `Recebida em ${new Date(payload.createdAt).toLocaleString("pt-BR")}`;

        notify({
          itemId: payload.id,
          title: reminderCount > 0 ? `Notificacao pendente: ${payload.title}` : `Notificacao: ${payload.title}`,
          body,
          tagPrefix: "notification"
        });

        upsertAlert(
          {
            ...nextNotification,
            createdAt: payload.createdAt
          },
          reminderCount,
          !played
        );
      })();
    },
    [notify, onPlaySound, upsertAlert]
  );

  const onUpdated = useCallback(
    (payload: IncomingNotificationUpdated) => {
      setAlerts((prev) =>
        prev.flatMap((item) => {
          if (item.notification.id !== payload.id) {
            return [item];
          }

          const nextNotification = {
            ...item.notification,
            visualizedAt: payload.visualizedAt,
            operationalStatus: payload.operationalStatus as NotificationItem["operationalStatus"],
            responseAt: payload.responseAt ?? item.notification.responseAt,
            responseMessage: payload.responseMessage ?? item.notification.responseMessage,
            isVisualized: payload.isVisualized
          };

          if (payload.isVisualized) {
            closeNotification(payload.id);
            return [];
          }

          return [{ ...item, notification: nextNotification }];
        })
      );
    },
    [closeNotification]
  );

  useEffect(() => {
    return subscribeNotificationEvents({
      onNew: (payload) => handleIncomingNotification(payload, 0, payload.priority === "critical" ? "critical" : "default"),
      onReminder: (payload) => handleIncomingNotification(payload, payload.reminderCount, "retry"),
      onUpdated
    });
  }, [handleIncomingNotification, onUpdated]);

  const retryBlockedAlertSounds = async () => {
    const blockedAlerts = alerts.filter((item) => !item.dismissed && item.audioBlocked);

    if (blockedAlerts.length === 0) {
      return;
    }

    let playedCount = 0;
    for (const alert of blockedAlerts) {
      const played = await playSystemAlert(
        alert.notification.id,
        alert.reminderCount > 0
          ? "retry"
          : alert.notification.priority === "critical"
            ? "critical"
            : "default"
      );

      if (played) {
        playedCount += 1;
      }

      setAlerts((prev) =>
        prev.map((item) =>
          item.notification.id === alert.notification.id ? { ...item, audioBlocked: !played } : item
        )
      );
    }

    if (playedCount > 0) {
      onToast(
        playedCount === blockedAlerts.length
          ? "Som das notificacoes reproduzido"
          : `Som reproduzido em ${playedCount} notificacao(oes)`
      );
      return;
    }

    onError("O navegador ainda bloqueou o som das notificacoes");
  };

  const markAsVisualized = async (alert: NotificationVisualAlert) => {
    try {
      const response = await api.markRead(alert.notification.id);
      dispatchNotificationUpdated({
        id: alert.notification.id,
        visualizedAt: response.visualizedAt,
        operationalStatus: response.operationalStatus,
        isVisualized: response.isVisualized
      });
      removeAlert(alert.notification.id);
      onToast("Notificacao marcada como visualizada");
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao marcar notificacao como visualizada");
    }
  };

  const visibleAlerts = alerts.filter((item) => !item.dismissed);
  const hasBlockedAudio = visibleAlerts.some((item) => item.audioBlocked);

  if (!isVisible || visibleAlerts.length === 0) {
    return null;
  }

  return (
    <aside className="fixed bottom-20 right-4 z-40 flex w-full max-w-md flex-col gap-3">
      {permission !== "granted" && (
        <NotificationBrowserBanner
          permission={permission}
          onRequestPermission={() => {
            void requestPermission();
          }}
        />
      )}

      {hasBlockedAudio && (
        <NotificationAudioBanner
          onRetry={() => {
            void retryBlockedAlertSounds();
          }}
        />
      )}

      {visibleAlerts.map((alert) => (
        <NotificationAlertCard
          key={alert.notification.id}
          alert={alert}
          onOpenNotifications={onOpenNotifications}
          onMarkAsVisualized={() => {
            void markAsVisualized(alert);
          }}
          onDismiss={() => dismissAlert(alert.notification.id)}
        />
      ))}
    </aside>
  );
};
