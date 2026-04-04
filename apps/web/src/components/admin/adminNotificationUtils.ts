import type {
  NotificationHistoryItem,
  NotificationOperationalStatus,
  NotificationResponseStatus
} from "../../types";
import type { HistoryFilters, NotificationRecipient, QueueFilters } from "./types";

export const HISTORY_LIMIT_OPTIONS = [20, 50, 100, 200];

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
