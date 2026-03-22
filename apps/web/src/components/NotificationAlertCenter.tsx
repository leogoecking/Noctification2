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

interface NotificationAlertCenterProps {
  isVisible: boolean;
  onError: (message: string) => void;
  onToast: (message: string) => void;
  onOpenNotifications: () => void;
}

interface NotificationVisualAlert {
  notification: NotificationItem;
  reminderCount: number;
  audioBlocked: boolean;
  dismissed: boolean;
}

const buildNotificationFromNew = (payload: IncomingNotification): NotificationItem => ({
  id: payload.id,
  title: payload.title,
  message: payload.message,
  priority: payload.priority,
  sourceTaskId: payload.sourceTaskId ?? null,
  createdAt: payload.createdAt,
  senderId: payload.sender.id,
  senderName: payload.sender.name,
  senderLogin: payload.sender.login,
  visualizedAt: null,
  deliveredAt: payload.createdAt,
  operationalStatus: "recebida",
  responseAt: null,
  responseMessage: null,
  isVisualized: false
});

const buildNotificationFromReminder = (payload: IncomingReminder): NotificationItem => ({
  ...buildNotificationFromNew(payload),
  operationalStatus: "em_andamento"
});

export const NotificationAlertCenter = ({
  isVisible,
  onError,
  onToast,
  onOpenNotifications
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
        const played = await playSystemAlert(payload.id, profile);
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
    [notify, upsertAlert]
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
      {permission === "default" && (
        <article className="rounded-2xl border border-accent/40 bg-panel p-4 shadow-lg shadow-black/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-sm text-textMain">Notificacoes do navegador</p>
              <p className="mt-1 text-xs text-textMuted">
                Ative para continuar recebendo alertas quando a aba estiver em segundo plano.
              </p>
            </div>
            <button
              className="rounded-lg border border-accent/60 px-3 py-2 text-xs text-accent"
              onClick={() => {
                void requestPermission();
              }}
              type="button"
            >
              Ativar
            </button>
          </div>
        </article>
      )}

      {permission === "denied" && (
        <article className="rounded-2xl border border-warning/40 bg-panel p-4 shadow-lg shadow-black/30">
          <p className="font-display text-sm text-textMain">Permissao do navegador bloqueada</p>
          <p className="mt-1 text-xs text-warning">
            Os pop-ups nativos estao bloqueados. O alerta visual continua ativo.
          </p>
        </article>
      )}

      {hasBlockedAudio && (
        <article className="rounded-2xl border border-warning/40 bg-panel p-4 shadow-lg shadow-black/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-sm text-textMain">Som bloqueado</p>
              <p className="mt-1 text-xs text-warning">
                O navegador bloqueou o audio de uma ou mais notificacoes.
              </p>
            </div>
            <button
              className="rounded-lg border border-warning/60 px-3 py-2 text-xs text-warning"
              onClick={() => {
                void retryBlockedAlertSounds();
              }}
              type="button"
            >
              Tentar som novamente
            </button>
          </div>
        </article>
      )}

      {visibleAlerts.map((alert) => (
        <article
          key={alert.notification.id}
          className="rounded-2xl border border-accent/50 bg-panel p-4 shadow-lg shadow-black/30"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-base text-textMain">
                {alert.reminderCount > 0 ? "Notificacao pendente" : "Nova notificacao"}
              </p>
              <p className="mt-1 font-semibold text-textMain">{alert.notification.title}</p>
              {alert.notification.message && (
                <p className="mt-1 text-sm text-textMuted">{alert.notification.message}</p>
              )}
              <p className="mt-2 text-xs text-textMuted">
                Recebida em {new Date(alert.notification.createdAt).toLocaleString("pt-BR")}
                {alert.reminderCount > 0 ? ` | Reenvios: ${alert.reminderCount}` : ""}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span
                className={`rounded-full px-2 py-1 text-[11px] ${
                  alert.notification.priority === "critical"
                    ? "bg-danger/20 text-danger"
                    : alert.notification.priority === "high"
                      ? "bg-warning/20 text-warning"
                      : "bg-accent/20 text-accent"
                }`}
              >
                {alert.notification.priority}
              </span>
              {alert.audioBlocked && (
                <span className="rounded-full bg-warning/20 px-2 py-1 text-[10px] text-warning">
                  Som bloqueado
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary" onClick={onOpenNotifications} type="button">
              Abrir notificacoes
            </button>
            {!alert.notification.isVisualized && (
              <button
                className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain transition hover:border-slate-500"
                onClick={() => {
                  void markAsVisualized(alert);
                }}
                type="button"
              >
                Marcar como visualizada
              </button>
            )}
            <button
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMuted transition hover:border-slate-500 hover:text-textMain"
              onClick={() => dismissAlert(alert.notification.id)}
              type="button"
            >
              Fechar pop-up
            </button>
          </div>
        </article>
      ))}
    </aside>
  );
};
