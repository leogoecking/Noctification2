import type { IncomingReminderDue } from "../../lib/reminderEvents";
import type { ReminderOccurrenceItem } from "../../types";

export interface ReminderVisualAlert {
  occurrence: ReminderOccurrenceItem;
  audioBlocked: boolean;
  dismissed: boolean;
}

export const buildOccurrenceFromDue = (
  payload: IncomingReminderDue
): ReminderOccurrenceItem => ({
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

interface ReminderBrowserStatusProps {
  permission: NotificationPermission | "unsupported";
  onRequestPermission: () => void;
}

export const ReminderBrowserStatus = ({
  permission,
  onRequestPermission
}: ReminderBrowserStatusProps) => {
  if (permission === "default") {
    return (
      <div className="mt-2 space-y-2">
        <p className="text-xs text-textMuted">
          Ative notificacoes do navegador para receber alertas quando a aba estiver em segundo plano.
        </p>
        <button
          className="rounded-lg border border-accent/60 px-3 py-2 text-xs text-accent"
          onClick={onRequestPermission}
          type="button"
        >
          Ativar notificacoes do navegador
        </button>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <p className="mt-2 text-xs text-warning">
        A permissao de notificacoes do navegador esta bloqueada. O alerta visual continua ativo.
      </p>
    );
  }

  if (permission === "unsupported") {
    return (
      <p className="mt-2 text-xs text-warning">
        Este acesso nao expoe a API `Notification` do navegador. O alerta visual continua ativo.
      </p>
    );
  }

  return null;
};

interface ReminderAudioStatusProps {
  audioBlocked: boolean;
  onRetry: () => void;
}

export const ReminderAudioStatus = ({
  audioBlocked,
  onRetry
}: ReminderAudioStatusProps) => {
  if (!audioBlocked) {
    return null;
  }

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-warning">
        O navegador bloqueou o som. O alerta visual continua ativo.
      </p>
      <button
        className="rounded-lg border border-warning/60 px-3 py-2 text-xs text-warning"
        onClick={onRetry}
        type="button"
      >
        Tentar som novamente
      </button>
    </div>
  );
};

interface ReminderAlertCardProps {
  alert: ReminderVisualAlert;
  permission: NotificationPermission | "unsupported";
  onRequestPermission: () => void;
  onRetryAudio: () => void;
  onComplete: () => void;
  onOpenReminders: () => void;
  onDismiss: () => void;
}

export const ReminderAlertCard = ({
  alert,
  permission,
  onRequestPermission,
  onRetryAudio,
  onComplete,
  onOpenReminders,
  onDismiss
}: ReminderAlertCardProps) => (
  <article className="rounded-[1.5rem] border border-warning/40 bg-warning/10 p-4 shadow-[0_18px_40px_rgba(10,16,30,0.12)]">
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

        <ReminderBrowserStatus
          permission={permission}
          onRequestPermission={onRequestPermission}
        />
        <ReminderAudioStatus
          audioBlocked={alert.audioBlocked}
          onRetry={onRetryAudio}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="btn-success text-xs"
          onClick={onComplete}
          type="button"
        >
          Concluir
        </button>
        <button
          className="rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-xs text-textMain transition hover:bg-panelAlt"
          onClick={onOpenReminders}
          type="button"
        >
          Abrir lembretes
        </button>
        <button
          className="rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-xs text-textMuted transition hover:bg-panelAlt hover:text-textMain"
          onClick={onDismiss}
          type="button"
        >
          Fechar pop-up
        </button>
      </div>
    </div>
  </article>
);
