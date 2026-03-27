import type { AuditFilters, HistoryFilters, QueueFilters } from "./types";

export const buildAuditQuery = (filters: AuditFilters, page: number): string => {
  const params = new URLSearchParams();
  params.set("limit", String(filters.limit));
  params.set("page", String(page));
  if (filters.eventType.trim()) {
    params.set("event_type", filters.eventType.trim());
  }
  if (filters.from) {
    params.set("from", new Date(`${filters.from}T00:00:00`).toISOString());
  }
  if (filters.to) {
    params.set("to", new Date(`${filters.to}T23:59:59`).toISOString());
  }

  return `?${params.toString()}`;
};

export const buildQueueQuery = (filters: QueueFilters, page: number): string => {
  const params = new URLSearchParams();
  params.set("scope", "operational_active");
  params.set("limit", String(filters.limit));
  params.set("page", String(page));
  if (filters.priority) {
    params.set("priority", filters.priority);
  }
  if (filters.userId) {
    params.set("user_id", filters.userId);
  }

  return `?${params.toString()}`;
};

export const buildHistoryQuery = (filters: HistoryFilters, page: number): string => {
  const params = new URLSearchParams();
  params.set("limit", String(filters.limit));
  params.set("page", String(page));
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.priority) {
    params.set("priority", filters.priority);
  }
  if (filters.userId) {
    params.set("user_id", filters.userId);
  }
  if (filters.from) {
    params.set("from", new Date(`${filters.from}T00:00:00`).toISOString());
  }
  if (filters.to) {
    params.set("to", new Date(`${filters.to}T23:59:59`).toISOString());
  }

  const query = params.toString();
  return query ? `?${query}` : "";
};
