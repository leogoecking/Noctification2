import type { PaginationInfo } from "../../types";
import type { AuditFilters, HistoryFilters, QueueFilters } from "./types";

export const createAuditFilters = (): AuditFilters => ({
  eventType: "",
  from: "",
  to: "",
  limit: 20
});

export const createHistoryFilters = (): HistoryFilters => ({
  status: "",
  priority: "",
  userId: "",
  from: "",
  to: "",
  limit: 100
});

export const createQueueFilters = (): QueueFilters => ({
  priority: "",
  userId: "",
  limit: 20
});

export const createPagination = (limit: number): PaginationInfo => ({
  page: 1,
  limit,
  total: 0,
  totalPages: 1
});
