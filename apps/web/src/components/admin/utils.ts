import type { NotificationHistoryItem } from "../../types";
import type { NotificationRecipient } from "./types";

export const AUDIT_LIMIT_OPTIONS = [10, 20, 50, 100];
export const HISTORY_LIMIT_OPTIONS = [20, 50, 100, 200];

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
    return "Sem metadados";
  }

  const entries = Object.entries(metadata).slice(0, 3);
  if (entries.length === 0) {
    return "Sem metadados";
  }

  return entries.map(([key, value]) => `${key}: ${formatAuditValue(value)}`).join(" | ");
};

export const responseStatusLabel = (status: "em_andamento" | "resolvido" | null): string => {
  if (status === "em_andamento") {
    return "Em andamento";
  }

  if (status === "resolvido") {
    return "Resolvido";
  }

  return "Sem resposta";
};

export const hasRecipientResponse = (recipient: NotificationRecipient): boolean => {
  return recipient.responseStatus !== null || Boolean(recipient.responseMessage?.trim());
};

export const isRecipientInProgress = (recipient: NotificationRecipient): boolean =>
  recipient.responseStatus === "em_andamento";

export const isNotificationOperationallyActive = (item: NotificationHistoryItem): boolean =>
  item.stats.operationalPending > 0;

export const isNotificationOperationallyCompleted = (item: NotificationHistoryItem): boolean =>
  item.stats.total > 0 && item.stats.operationalPending === 0;
