import type {
  IncomingNotification,
  IncomingReminder
} from "../../lib/notificationEvents";
import type { NotificationItem } from "../../types";

export interface NotificationVisualAlert {
  notification: NotificationItem;
  reminderCount: number;
  audioBlocked: boolean;
  dismissed: boolean;
}

export const buildNotificationFromNew = (
  payload: IncomingNotification
): NotificationItem => ({
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

export const buildNotificationFromReminder = (
  payload: IncomingReminder
): NotificationItem => ({
  ...buildNotificationFromNew(payload),
  operationalStatus: "em_andamento"
});

interface NotificationBrowserBannerProps {
  permission: NotificationPermission | "unsupported";
  onRequestPermission: () => void;
}

export const NotificationBrowserBanner = ({
  permission,
  onRequestPermission
}: NotificationBrowserBannerProps) => {
  if (permission === "default") {
    return (
      <article className="rounded-[1.5rem] border border-accent/30 bg-panel p-4 shadow-[0_18px_40px_rgba(10,16,30,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-sm text-textMain">Notificacoes do navegador</p>
            <p className="mt-1 text-xs text-textMuted">
              Ative para continuar recebendo alertas quando a aba estiver em segundo plano.
            </p>
          </div>
          <button
            className="rounded-lg border border-accent/60 px-3 py-2 text-xs text-accent"
            onClick={onRequestPermission}
            type="button"
          >
            Ativar
          </button>
        </div>
      </article>
    );
  }

  if (permission === "denied") {
    return (
      <article className="rounded-[1.5rem] border border-warning/35 bg-panel p-4 shadow-[0_18px_40px_rgba(10,16,30,0.12)]">
        <p className="font-display text-sm text-textMain">Permissao do navegador bloqueada</p>
        <p className="mt-1 text-xs text-warning">
          Os pop-ups nativos estao bloqueados. O alerta visual continua ativo.
        </p>
      </article>
    );
  }

  if (permission === "unsupported") {
    return (
      <article className="rounded-[1.5rem] border border-warning/35 bg-panel p-4 shadow-[0_18px_40px_rgba(10,16,30,0.12)]">
        <p className="font-display text-sm text-textMain">Notificacoes nativas indisponiveis</p>
        <p className="mt-1 text-xs text-warning">
          Este acesso nao expoe a API `Notification` do navegador. Use `localhost` em desenvolvimento ou publique com HTTPS para receber pop-ups nativos.
        </p>
      </article>
    );
  }

  return null;
};

interface NotificationAudioBannerProps {
  onRetry: () => void;
}

export const NotificationAudioBanner = ({
  onRetry
}: NotificationAudioBannerProps) => (
  <article className="rounded-[1.5rem] border border-warning/35 bg-panel p-4 shadow-[0_18px_40px_rgba(10,16,30,0.12)]">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-display text-sm text-textMain">Som bloqueado</p>
        <p className="mt-1 text-xs text-warning">
          O navegador bloqueou o audio de uma ou mais notificacoes.
        </p>
      </div>
      <button
        className="rounded-lg border border-warning/60 px-3 py-2 text-xs text-warning"
        onClick={onRetry}
        type="button"
      >
        Tentar som novamente
      </button>
    </div>
  </article>
);

interface NotificationAlertCardProps {
  alert: NotificationVisualAlert;
  onOpenNotifications: () => void;
  onMarkAsVisualized: () => void;
  onDismiss: () => void;
}

export const NotificationAlertCard = ({
  alert,
  onOpenNotifications,
  onMarkAsVisualized,
  onDismiss
}: NotificationAlertCardProps) => (
  <article className="rounded-[1.5rem] border border-accent/35 bg-panel p-4 shadow-[0_18px_40px_rgba(10,16,30,0.12)]">
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
          <span className="rounded-full bg-warning/20 px-2 py-1 text-xs text-warning">
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
          className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain transition hover:bg-panel"
          onClick={onMarkAsVisualized}
          type="button"
        >
          Marcar como visualizada
        </button>
      )}
      <button
        className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMuted transition hover:bg-panel hover:text-textMain"
        onClick={onDismiss}
        type="button"
      >
        Fechar pop-up
      </button>
    </div>
  </article>
);
