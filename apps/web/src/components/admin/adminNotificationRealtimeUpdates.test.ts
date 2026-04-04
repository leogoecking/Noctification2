import { describe, expect, it } from "vitest";
import type { NotificationHistoryItem, PaginationInfo } from "../../types";
import {
  applyCreatedNotificationUpdate,
  applyHistoryFiltersState,
  applyQueueFiltersState,
  applyReadUpdateCollections,
  resetHistoryFiltersState,
  resetQueueFiltersState
} from "./adminNotificationRealtimeUpdates";
import type { HistoryFilters, QueueFilters } from "./types";

const buildPagination = (limit: number): PaginationInfo => ({
  page: 1,
  limit,
  total: 0,
  totalPages: 1
});

const buildNotification = (
  overrides: Partial<NotificationHistoryItem> = {}
): NotificationHistoryItem => ({
  id: 10,
  title: "Falha",
  message: "Investigar",
  priority: "high",
  recipient_mode: "users",
  created_at: "2026-03-21T12:00:00.000Z",
  sender: { id: 1, name: "Admin", login: "admin" },
  recipients: [
    {
      userId: 2,
      name: "Operador",
      login: "operador",
      visualizedAt: null,
      deliveredAt: "2026-03-21T12:00:00.000Z",
      operationalStatus: "recebida",
      responseStatus: null,
      responseAt: null,
      responseMessage: null
    }
  ],
  stats: {
    total: 1,
    read: 0,
    unread: 1,
    responded: 0,
    received: 1,
    visualized: 0,
    inProgress: 0,
    assumed: 0,
    resolved: 0,
    operationalPending: 1,
    operationalCompleted: 0
  },
  ...overrides
});

describe("adminNotificationRealtimeUpdates", () => {
  it("insere notificacao criada nas colecoes que combinam com os filtros", () => {
    const item = buildNotification();
    const queueFilters: QueueFilters = { priority: "high", userId: "", limit: 20 };
    const historyFilters: HistoryFilters = {
      status: "unread",
      priority: "high",
      userId: "",
      from: "",
      to: "",
      limit: 100
    };

    const next = applyCreatedNotificationUpdate({
      item,
      queue: { items: [], pagination: buildPagination(20) },
      queueFilters,
      history: { items: [], pagination: buildPagination(100) },
      historyFilters
    });

    expect(next.queue.items.map((entry) => entry.id)).toEqual([10]);
    expect(next.history.items.map((entry) => entry.id)).toEqual([10]);
    expect(next.queue.pagination.total).toBe(1);
    expect(next.history.pagination.total).toBe(1);
  });

  it("reconcilia atualizacao de leitura nas duas colecoes", () => {
    const item = buildNotification();

    const next = applyReadUpdateCollections({
      payload: {
        notificationId: 10,
        userId: 2,
        readAt: "2026-03-21T12:05:00.000Z",
        responseStatus: "resolvida",
        responseAt: "2026-03-21T12:06:00.000Z"
      },
      queue: { items: [item], pagination: { ...buildPagination(20), total: 1 } },
      history: { items: [item], pagination: { ...buildPagination(100), total: 1 } },
      historyFilters: {
        status: "",
        priority: "",
        userId: "",
        from: "",
        to: "",
        limit: 100
      }
    });

    expect(next.queue.items[0].stats.operationalPending).toBe(0);
    expect(next.queue.pagination.total).toBe(0);
    expect(next.history.items[0].stats.read).toBe(1);
    expect(next.history.items[0].stats.resolved).toBe(1);
  });

  it("aplica e reseta filtros com a paginacao esperada", () => {
    const historyPagination = { ...buildPagination(100), page: 3 };
    const queuePagination = { ...buildPagination(20), page: 4 };

    expect(
      applyHistoryFiltersState(historyPagination, {
        status: "read",
        priority: "",
        userId: "",
        from: "",
        to: "",
        limit: 50
      }).pagination
    ).toMatchObject({ page: 1, limit: 50 });

    expect(
      applyQueueFiltersState(queuePagination, {
        priority: "critical",
        userId: "2",
        limit: 10
      }).pagination
    ).toMatchObject({ page: 1, limit: 10 });

    expect(resetHistoryFiltersState(historyPagination).pagination).toMatchObject({ page: 1, limit: 100 });
    expect(resetQueueFiltersState(queuePagination).pagination).toMatchObject({ page: 1, limit: 20 });
  });
});
