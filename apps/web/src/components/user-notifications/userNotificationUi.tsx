import type {
  IncomingNotification,
  IncomingReminder
} from "../../lib/notificationEvents";
import type {
  NotificationItem,
  NotificationOperationalStatus,
  NotificationResponseStatus
} from "../../types";

export type FilterMode = "all" | "read" | "unread";

export const RESPONSE_OPTIONS: NotificationResponseStatus[] = [
  "em_andamento",
  "assumida",
  "resolvida"
];

export const OPERATIONAL_STATUS_LABELS: Record<
  NotificationOperationalStatus | NotificationResponseStatus,
  string
> = {
  recebida: "Recebida",
  visualizada: "Visualizada",
  em_andamento: "Em andamento",
  assumida: "Assumida",
  resolvida: "Resolvida"
};

export const FILTER_LABELS: Record<FilterMode, string> = {
  all: "Todas",
  unread: "Nao lidas",
  read: "Lidas"
};

export const PRIORITY_LABELS = {
  normal: "Normal",
  high: "Alta",
  critical: "Critica",
  low: "Baixa"
} as const;

export const RESPONSE_ACTION_STYLES: Record<NotificationResponseStatus, string> = {
  em_andamento: "border-warning/50 bg-warning/10 text-warning hover:border-warning/70",
  assumida: "border-accent/50 bg-accent/10 text-accent hover:border-accent/70",
  resolvida: "border-success/50 bg-success/10 text-success hover:border-success/70"
};

export const formatNotificationDate = (value: string | null): string => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("pt-BR");
};

export const toLocalNotification = (
  payload: IncomingNotification | IncomingReminder
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

export const renderTaskLinkChip = (sourceTaskId: number | null | undefined) => {
  if (!sourceTaskId) {
    return null;
  }

  return (
    <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs text-accent">
      Tarefa #{sourceTaskId}
    </span>
  );
};

