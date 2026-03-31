import type {
  NotificationHistoryItem,
  NotificationOperationalStatus,
  NotificationResponseStatus
} from "../../types";
import type { HistoryFilters, NotificationRecipient, QueueFilters } from "./types";

export const AUDIT_LIMIT_OPTIONS = [10, 20, 50, 100];
export const HISTORY_LIMIT_OPTIONS = [20, 50, 100, 200];

export const AUDIT_LABELS = {
  actor: "Responsavel",
  target: "Alvo",
  category: "Categoria",
  details: "Detalhes",
  systemActor: "Sistema",
  noMetadata: "Sem detalhes adicionais"
} as const;

const AUDIT_METADATA_LABELS: Record<string, string> = {
  recipientCount: "Destinatarios",
  recipientIds: "IDs dos destinatarios",
  recipientUserIds: "IDs dos destinatarios",
  retryCount: "Tentativas",
  priority: "Prioridade",
  source: "Origem",
  responseStatus: "Status de resposta",
  operationalStatus: "Status operacional",
  previousStatus: "Status anterior",
  nextStatus: "Novo status",
  responseMessage: "Mensagem de resposta",
  message: "Mensagem",
  login: "Login",
  scheduledFor: "Agendado para",
  occurrenceId: "Ocorrencia",
  reminderId: "Lembrete",
  userId: "Usuario",
  notificationId: "Notificacao"
};

export const formatDate = (value: string | null): string => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("pt-BR");
};

const formatAuditValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "-";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "-";
    }

    return value
      .map((item) => {
        if (typeof item === "number" && Number.isInteger(item)) {
          return `#${item}`;
        }

        if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
          return String(item);
        }

        try {
          return JSON.stringify(item);
        } catch {
          return "[valor nao serializavel]";
        }
      })
      .join(", ");
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "[valor nao serializavel]";
  }
};

export const summarizeAuditMetadata = (metadata: Record<string, unknown> | null): string => {
  if (!metadata) {
    return AUDIT_LABELS.noMetadata;
  }

  const entries = Object.entries(metadata).slice(0, 3);
  if (entries.length === 0) {
    return AUDIT_LABELS.noMetadata;
  }

  return entries
    .map(([key, value]) => `${AUDIT_METADATA_LABELS[key] ?? key}: ${formatAuditValue(value)}`)
    .join(" | ");
};

const AUDIT_EVENT_LABELS: Record<string, string> = {
  "auth.login": "Login realizado",
  "auth.logout": "Logout realizado",
  "auth.register": "Conta criada",
  "admin.user.create": "Usuario criado",
  "admin.user.update": "Usuario atualizado",
  "admin.user.status": "Status de usuario alterado",
  "admin.notification.send": "Notificacao enviada",
  "notification.respond": "Notificacao respondida",
  "reminder.created": "Lembrete criado",
  "reminder.updated": "Lembrete atualizado",
  "reminder.deleted": "Lembrete arquivado",
  "reminder.occurrence.created": "Ocorrencia de lembrete criada",
  "reminder.occurrence.delivered": "Lembrete disparado",
  "reminder.occurrence.retried": "Lembrete reenviado",
  "reminder.occurrence.completed": "Lembrete concluido",
  "reminder.occurrence.expired": "Lembrete expirado",
  "reminder.occurrence.cancelled": "Ocorrencia cancelada"
};

export const formatAuditEventType = (eventType: string): string => {
  const mapped = AUDIT_EVENT_LABELS[eventType];
  if (mapped) {
    return mapped;
  }

  const normalized = eventType
    .replace(/[._]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");

  return normalized || eventType;
};

export const formatAuditTargetType = (targetType: string): string => {
  switch (targetType) {
    case "user":
      return "Usuario";
    case "notification":
      return "Notificacao";
    case "reminder":
      return "Lembrete";
    case "occurrence":
      return "Ocorrencia";
    case "session":
      return "Sessao";
    default:
      return targetType
        .replace(/[._]+/g, " ")
        .trim()
        .split(/\s+/)
        .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
        .join(" ");
  }
};

export const formatAuditActor = (
  actor: { name: string; login: string } | null
): string => {
  return actor ? `${actor.name} (${actor.login})` : AUDIT_LABELS.systemActor;
};

export const getAuditCategory = (
  eventType: string
): { label: string; className: string } => {
  if (eventType.startsWith("auth.")) {
    return {
      label: "Autenticacao",
      className: "bg-sky-500/15 text-sky-200 border border-sky-500/30"
    };
  }

  if (eventType.startsWith("admin.user.")) {
    return {
      label: "Usuarios",
      className: "bg-amber-500/15 text-amber-200 border border-amber-500/30"
    };
  }

  if (eventType.startsWith("admin.notification.")) {
    return {
      label: "Notificacoes",
      className: "bg-yellow-500/15 text-yellow-200 border border-yellow-500/30"
    };
  }

  if (eventType.startsWith("reminder.")) {
    return {
      label: "Lembretes",
      className: "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
    };
  }

  return {
    label: "Sistema",
    className: "border border-outlineSoft/70 bg-panel text-textMain"
  };
};

export const operationalStatusLabel = (status: NotificationOperationalStatus): string => {
  switch (status) {
    case "recebida":
      return "Recebida";
    case "visualizada":
      return "Visualizada";
    case "em_andamento":
      return "Em andamento";
    case "assumida":
      return "Assumida";
    case "resolvida":
      return "Resolvida";
    default:
      return status;
  }
};

export const hasRecipientResponse = (recipient: NotificationRecipient): boolean => {
  return (
    recipient.operationalStatus === "em_andamento" ||
    recipient.operationalStatus === "assumida" ||
    recipient.operationalStatus === "resolvida" ||
    Boolean(recipient.responseMessage?.trim())
  );
};

export const isRecipientInProgress = (recipient: NotificationRecipient): boolean =>
  recipient.operationalStatus === "em_andamento";

export const isNotificationOperationallyActive = (item: NotificationHistoryItem): boolean =>
  item.stats.operationalPending > 0;

export const isNotificationOperationallyCompleted = (item: NotificationHistoryItem): boolean =>
  item.stats.total > 0 && item.stats.operationalPending === 0;

const toOperationalStatusFromUpdate = (
  responseStatus: NotificationResponseStatus | null | undefined,
  visualizedAt: string | null
): NotificationOperationalStatus => {
  if (responseStatus === "resolvida") {
    return "resolvida";
  }

  if (responseStatus === "assumida") {
    return "assumida";
  }

  if (responseStatus === "em_andamento") {
    return "em_andamento";
  }

  return visualizedAt ? "visualizada" : "recebida";
};

const buildNotificationStats = (recipients: NotificationRecipient[]) => ({
  total: recipients.length,
  read: recipients.filter((recipient) => recipient.visualizedAt !== null).length,
  unread: recipients.filter((recipient) => recipient.visualizedAt === null).length,
  responded: recipients.filter((recipient) =>
    ["em_andamento", "assumida", "resolvida"].includes(recipient.operationalStatus)
  ).length,
  received: recipients.filter((recipient) => recipient.operationalStatus === "recebida").length,
  visualized: recipients.filter((recipient) => recipient.operationalStatus === "visualizada").length,
  inProgress: recipients.filter((recipient) => recipient.operationalStatus === "em_andamento").length,
  assumed: recipients.filter((recipient) => recipient.operationalStatus === "assumida").length,
  resolved: recipients.filter((recipient) => recipient.operationalStatus === "resolvida").length,
  operationalPending: recipients.filter((recipient) => recipient.operationalStatus !== "resolvida").length,
  operationalCompleted: recipients.filter((recipient) => recipient.operationalStatus === "resolvida")
    .length
});

const notificationHasUser = (item: NotificationHistoryItem, userId: string): boolean => {
  if (!userId) {
    return true;
  }

  const parsed = Number(userId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return true;
  }

  return item.recipients.some((recipient) => recipient.userId === parsed);
};

export const matchesQueueFilters = (
  item: NotificationHistoryItem,
  filters: QueueFilters
): boolean => {
  if (!isNotificationOperationallyActive(item)) {
    return false;
  }

  if (filters.priority && item.priority !== filters.priority) {
    return false;
  }

  return notificationHasUser(item, filters.userId);
};

export const matchesHistoryFilters = (
  item: NotificationHistoryItem,
  filters: HistoryFilters
): boolean => {
  if (filters.status === "read" && item.stats.unread > 0) {
    return false;
  }

  if (filters.status === "unread" && item.stats.unread === 0) {
    return false;
  }

  if (filters.priority && item.priority !== filters.priority) {
    return false;
  }

  if (!notificationHasUser(item, filters.userId)) {
    return false;
  }

  const createdAt = new Date(item.created_at).getTime();
  if (filters.from) {
    const from = new Date(`${filters.from}T00:00:00`).getTime();
    if (createdAt < from) {
      return false;
    }
  }

  if (filters.to) {
    const to = new Date(`${filters.to}T23:59:59`).getTime();
    if (createdAt > to) {
      return false;
    }
  }

  return true;
};

export const prependNotificationPageItem = (
  items: NotificationHistoryItem[],
  item: NotificationHistoryItem,
  limit: number,
  page: number
): NotificationHistoryItem[] => {
  if (page !== 1) {
    return items;
  }

  return [item, ...items.filter((entry) => entry.id !== item.id)].slice(0, limit);
};

export const applyNotificationReadUpdate = (
  item: NotificationHistoryItem,
  update: {
    notificationId: number;
    userId: number;
    readAt?: string | null;
    responseStatus?: NotificationResponseStatus | null;
    responseAt?: string | null;
  }
): NotificationHistoryItem => {
  if (item.id !== update.notificationId) {
    return item;
  }

  let changed = false;
  const recipients = item.recipients.map((recipient) => {
    if (recipient.userId !== update.userId) {
      return recipient;
    }

    changed = true;
    const visualizedAt = update.readAt ?? recipient.visualizedAt;
    return {
      ...recipient,
      visualizedAt,
      operationalStatus: toOperationalStatusFromUpdate(update.responseStatus, visualizedAt),
      responseStatus: update.responseStatus ?? recipient.responseStatus ?? null,
      responseAt: update.responseAt ?? recipient.responseAt
    };
  });

  if (!changed) {
    return item;
  }

  return {
    ...item,
    recipients,
    stats: buildNotificationStats(recipients)
  };
};
