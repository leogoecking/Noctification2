import { useCallback, useState } from "react";
import { api, ApiError } from "../lib/api";
import { playReminderAlert } from "../lib/reminderAudio";
import {
  dispatchReminderDue,
  dispatchReminderUpdated,
  type IncomingReminderDue,
  type IncomingReminderUpdated
} from "../lib/reminderEvents";
import { useBrowserNotifications } from "../hooks/useBrowserNotifications";
import { useReminderSocket } from "../hooks/useReminderSocket";
import type { ReminderOccurrenceItem } from "../types";
import {
  buildOccurrenceFromDue,
  ReminderAlertCard,
  type ReminderVisualAlert
} from "./reminder-alerts/reminderAlertUi";

interface ReminderAlertCenterProps {
  isVisible: boolean;
  onError: (message: string) => void;
  onToast: (message: string) => void;
  onOpenReminders: () => void;
}

export const ReminderAlertCenter = ({
  isVisible,
  onError,
  onToast,
  onOpenReminders
}: ReminderAlertCenterProps) => {
  const [alerts, setAlerts] = useState<ReminderVisualAlert[]>([]);
  const { permission, requestPermission, notify, closeNotification } = useBrowserNotifications({
    namespace: "reminder",
    onOpen: onOpenReminders
  });

  const upsertAlert = useCallback((nextOccurrence: ReminderOccurrenceItem, audioBlocked: boolean) => {
    setAlerts((prev) => {
      const existing = prev.find((item) => item.occurrence.id === nextOccurrence.id);
      if (!existing) {
        return [{ occurrence: nextOccurrence, audioBlocked, dismissed: false }, ...prev];
      }

      return prev.map((item) =>
        item.occurrence.id === nextOccurrence.id
          ? {
              ...item,
              occurrence: {
                ...item.occurrence,
                ...nextOccurrence
              },
              audioBlocked,
              dismissed: false
            }
          : item
      );
    });
  }, []);

  const removeAlert = useCallback((occurrenceId: number) => {
    setAlerts((prev) => prev.filter((item) => item.occurrence.id !== occurrenceId));
  }, []);

  const dismissAlert = useCallback((occurrenceId: number) => {
    setAlerts((prev) =>
      prev.map((item) =>
        item.occurrence.id === occurrenceId ? { ...item, dismissed: true } : item
      )
    );
  }, []);

  const onReminderDue = useCallback(
    (payload: IncomingReminderDue) => {
      const occurrence = buildOccurrenceFromDue(payload);
      const audioProfile = payload.retryCount > 0 ? "retry" : "default";
      upsertAlert(occurrence, false);

      void (async () => {
        const played = await playReminderAlert(payload.occurrenceId, audioProfile);
        const body =
          payload.description.trim() || `Agendado para ${new Date(payload.scheduledFor).toLocaleString("pt-BR")}`;

        dispatchReminderDue({
          ...payload,
          audioBlocked: !played
        });

        notify({
          itemId: payload.occurrenceId,
          title:
            payload.retryCount > 0 ? `Lembrete pendente: ${payload.title}` : `Lembrete: ${payload.title}`,
          body,
          tagPrefix: "reminder-occurrence"
        });

        upsertAlert(
          {
            ...occurrence,
            updatedAt: new Date().toISOString()
          },
          !played
        );
      })();
    },
    [notify, upsertAlert]
  );

  const onReminderUpdated = useCallback(
    (payload: IncomingReminderUpdated) => {
      dispatchReminderUpdated(payload);
      if (payload.status !== "pending") {
        closeNotification(payload.occurrenceId);
      }

      setAlerts((prev) =>
        prev.flatMap((item) => {
          if (item.occurrence.id !== payload.occurrenceId) {
            return [item];
          }
          if (payload.status !== "pending") {
            return [];
          }

          return [
            {
              ...item,
              occurrence: {
                ...item.occurrence,
                retryCount: payload.retryCount,
                completedAt: payload.completedAt ?? item.occurrence.completedAt,
                expiredAt: payload.expiredAt ?? item.occurrence.expiredAt,
                updatedAt: new Date().toISOString()
              }
            }
          ];
        })
      );
    },
    [closeNotification]
  );

  const onSocketError = useCallback(() => {
    onError("Falha na conexao em tempo real dos lembretes");
  }, [onError]);

  useReminderSocket({
    onDue: onReminderDue,
    onUpdated: onReminderUpdated,
    onError: onSocketError
  });

  const retryAlertSound = async (alert: ReminderVisualAlert) => {
    const played = await playReminderAlert(
      alert.occurrence.id,
      alert.occurrence.retryCount > 0 ? "retry" : "default"
    );
    setAlerts((prev) =>
      prev.map((item) =>
        item.occurrence.id === alert.occurrence.id ? { ...item, audioBlocked: !played } : item
      )
    );

    if (played) {
      onToast("Som do lembrete reproduzido");
      return;
    }

    onError("O navegador ainda bloqueou o som do lembrete");
  };

  const completeOccurrence = async (alert: ReminderVisualAlert) => {
    try {
      await api.completeReminderOccurrence(alert.occurrence.id);
      closeNotification(alert.occurrence.id);
      dispatchReminderUpdated({
        occurrenceId: alert.occurrence.id,
        reminderId: alert.occurrence.reminderId,
        userId: alert.occurrence.userId,
        status: "completed",
        retryCount: alert.occurrence.retryCount,
        completedAt: new Date().toISOString()
      });
      removeAlert(alert.occurrence.id);
      onToast("Ocorrencia concluida");
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao concluir ocorrencia");
    }
  };

  const visibleAlerts = alerts.filter((item) => !item.dismissed);

  if (!isVisible || visibleAlerts.length === 0) {
    return null;
  }

  return (
    <aside className="fixed bottom-20 right-4 z-40 flex w-full max-w-md flex-col gap-3">
      {visibleAlerts.map((alert) => (
        <ReminderAlertCard
          key={alert.occurrence.id}
          alert={alert}
          permission={permission}
          onRequestPermission={() => {
            void requestPermission();
          }}
          onRetryAudio={() => {
            void retryAlertSound(alert);
          }}
          onComplete={() => {
            void completeOccurrence(alert);
          }}
          onOpenReminders={onOpenReminders}
          onDismiss={() => dismissAlert(alert.occurrence.id)}
        />
      ))}
    </aside>
  );
};
