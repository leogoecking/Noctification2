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

interface ReminderAlertCenterProps {
  isVisible: boolean;
  onError: (message: string) => void;
  onToast: (message: string) => void;
  onOpenReminders: () => void;
}

interface ReminderVisualAlert {
  occurrence: ReminderOccurrenceItem;
  audioBlocked: boolean;
  dismissed: boolean;
}

const buildOccurrenceFromDue = (payload: IncomingReminderDue): ReminderOccurrenceItem => ({
  id: payload.occurrenceId,
  reminderId: payload.reminderId,
  userId: payload.userId,
  scheduledFor: payload.scheduledFor,
  triggeredAt: new Date().toISOString(),
  status: "pending",
  retryCount: payload.retryCount,
  nextRetryAt: null,
  completedAt: null,
  expiredAt: null,
  triggerSource: "socket",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  title: payload.title,
  description: payload.description
});

export const ReminderAlertCenter = ({
  isVisible,
  onError,
  onToast,
  onOpenReminders
}: ReminderAlertCenterProps) => {
  const [alerts, setAlerts] = useState<ReminderVisualAlert[]>([]);
  const { permission, requestPermission, notifyReminderDue, closeReminderNotification } =
    useBrowserNotifications(onOpenReminders);

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
      onToast(
        payload.retryCount > 0
          ? `Lembrete novamente pendente: ${payload.title}`
          : `Lembrete disparado: ${payload.title}`
      );

      void (async () => {
        const played = await playReminderAlert(payload.occurrenceId, audioProfile);
        const body =
          payload.description.trim() || `Agendado para ${new Date(payload.scheduledFor).toLocaleString("pt-BR")}`;

        dispatchReminderDue({
          ...payload,
          audioBlocked: !played
        });

        notifyReminderDue({
          occurrenceId: payload.occurrenceId,
          title:
            payload.retryCount > 0 ? `Lembrete pendente: ${payload.title}` : `Lembrete: ${payload.title}`,
          body
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
    [notifyReminderDue, onToast, upsertAlert]
  );

  const onReminderUpdated = useCallback(
    (payload: IncomingReminderUpdated) => {
      dispatchReminderUpdated(payload);
      if (payload.status !== "pending") {
        closeReminderNotification(payload.occurrenceId);
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
    [closeReminderNotification]
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
      closeReminderNotification(alert.occurrence.id);
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
        <article
          key={alert.occurrence.id}
          className="rounded-2xl border border-warning/60 bg-warning/10 p-4 shadow-lg"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-base text-textMain">Lembrete pendente agora</p>
              <p className="mt-1 font-semibold text-textMain">{alert.occurrence.title}</p>
              {alert.occurrence.description && (
                <p className="mt-1 text-sm text-textMuted">{alert.occurrence.description}</p>
              )}
              <p className="mt-2 text-xs text-textMuted">
                Agendado para {new Date(alert.occurrence.scheduledFor).toLocaleString("pt-BR")} | Tentativas:{" "}
                {alert.occurrence.retryCount}
              </p>
              {permission !== "granted" && permission !== "unsupported" && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-textMuted">
                    Ative notificacoes do navegador para receber alertas quando a aba estiver em segundo plano.
                  </p>
                  <button
                    className="rounded-lg border border-accent/60 px-3 py-2 text-xs text-accent"
                    onClick={() => {
                      void requestPermission();
                    }}
                    type="button"
                  >
                    Ativar notificacoes do navegador
                  </button>
                </div>
              )}
              {permission === "denied" && (
                <p className="mt-2 text-xs text-warning">
                  A permissao de notificacoes do navegador esta bloqueada. O alerta visual continua ativo.
                </p>
              )}
              {alert.audioBlocked && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-warning">
                    O navegador bloqueou o som. O alerta visual continua ativo.
                  </p>
                  <button
                    className="rounded-lg border border-warning/60 px-3 py-2 text-xs text-warning"
                    onClick={() => {
                      void retryAlertSound(alert);
                    }}
                    type="button"
                  >
                    Tentar som novamente
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg bg-success px-3 py-2 text-xs font-semibold text-slate-900"
                onClick={() => {
                  void completeOccurrence(alert);
                }}
                type="button"
              >
                Concluir
              </button>
              <button
                className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-textMain"
                onClick={onOpenReminders}
                type="button"
              >
                Abrir lembretes
              </button>
              <button
                className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-textMuted"
                onClick={() => dismissAlert(alert.occurrence.id)}
                type="button"
              >
                Fechar pop-up
              </button>
            </div>
          </div>
        </article>
      ))}
    </aside>
  );
};
