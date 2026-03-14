import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { playReminderAlert } from "../lib/reminderAudio";
import {
  connectSocket
} from "../lib/socket";
import {
  dispatchReminderDue,
  dispatchReminderUpdated,
  type IncomingReminderDue,
  type IncomingReminderUpdated
} from "../lib/reminderEvents";
import type { ReminderOccurrenceItem } from "../types";

interface ReminderAlertCenterProps {
  isVisible: boolean;
  onError: (message: string) => void;
  onToast: (message: string) => void;
  onOpenReminders: () => void;
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
  const [activeAlert, setActiveAlert] = useState<ReminderOccurrenceItem | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);

  useEffect(() => {
    const socket = connectSocket();

    const onReminderDue = (payload: IncomingReminderDue) => {
      const occurrence = buildOccurrenceFromDue(payload);
      const audioProfile = payload.retryCount > 0 ? "retry" : "default";
      setActiveAlert(occurrence);
      onToast(
        payload.retryCount > 0
          ? `Lembrete novamente pendente: ${payload.title}`
          : `Lembrete disparado: ${payload.title}`
      );

      void (async () => {
        const played = await playReminderAlert(payload.occurrenceId, audioProfile);

        dispatchReminderDue({
          ...payload,
          audioBlocked: !played
        });

        setAudioBlocked(!played);
      })();
    };

    const onReminderUpdated = (payload: IncomingReminderUpdated) => {
      dispatchReminderUpdated(payload);

      setActiveAlert((prev) => {
        if (!prev || prev.id !== payload.occurrenceId) {
          return prev;
        }

        if (payload.status !== "pending") {
          return null;
        }

        return {
          ...prev,
          retryCount: payload.retryCount,
          completedAt: payload.completedAt ?? prev.completedAt,
          expiredAt: payload.expiredAt ?? prev.expiredAt,
          updatedAt: new Date().toISOString()
        };
      });
    };

    const onConnectError = () => {
      onError("Falha na conexao em tempo real dos lembretes");
    };

    socket.on("reminder:due", onReminderDue);
    socket.on("reminder:updated", onReminderUpdated);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("reminder:due", onReminderDue);
      socket.off("reminder:updated", onReminderUpdated);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, [onError, onToast]);

  const retryAlertSound = async () => {
    if (!activeAlert) {
      return;
    }

    const played = await playReminderAlert(activeAlert.id);
    setAudioBlocked(!played);

    if (played) {
      onToast("Som do lembrete reproduzido");
      return;
    }

    onError("O navegador ainda bloqueou o som do lembrete");
  };

  const completeOccurrence = async () => {
    if (!activeAlert) {
      return;
    }

    try {
      await api.completeReminderOccurrence(activeAlert.id);
      setActiveAlert(null);
      onToast("Ocorrencia concluida");
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao concluir ocorrencia");
    }
  };

  if (!isVisible || !activeAlert) {
    return null;
  }

  return (
    <aside className="fixed bottom-20 right-4 z-40 w-full max-w-md rounded-2xl border border-warning/60 bg-warning/10 p-4 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-base text-textMain">Lembrete pendente agora</p>
          <p className="mt-1 font-semibold text-textMain">{activeAlert.title}</p>
          {activeAlert.description && (
            <p className="mt-1 text-sm text-textMuted">{activeAlert.description}</p>
          )}
          <p className="mt-2 text-xs text-textMuted">
            Agendado para {new Date(activeAlert.scheduledFor).toLocaleString("pt-BR")} | Tentativas:{" "}
            {activeAlert.retryCount}
          </p>
          {audioBlocked && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-warning">
                O navegador bloqueou o som. O alerta visual continua ativo.
              </p>
              <button
                className="rounded-lg border border-warning/60 px-3 py-2 text-xs text-warning"
                onClick={() => {
                  void retryAlertSound();
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
            onClick={completeOccurrence}
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
        </div>
      </div>
    </aside>
  );
};
