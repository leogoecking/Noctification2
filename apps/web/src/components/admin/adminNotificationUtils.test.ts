import { describe, expect, it } from "vitest";
import {
  applyNotificationReadUpdate,
  matchesHistoryFilters,
  matchesQueueFilters,
  prependNotificationPageItem
} from "./adminNotificationUtils";
import type { NotificationHistoryItem } from "../../types";

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

describe("adminNotificationUtils", () => {
  it("aplica atualizacao de leitura e recalcula os stats", () => {
    const item = buildNotification();

    const next = applyNotificationReadUpdate(item, {
      notificationId: 10,
      userId: 2,
      readAt: "2026-03-21T12:05:00.000Z",
      responseStatus: "em_andamento",
      responseAt: "2026-03-21T12:06:00.000Z"
    });

    expect(next).not.toBe(item);
    expect(next.recipients[0].visualizedAt).toBe("2026-03-21T12:05:00.000Z");
    expect(next.recipients[0].operationalStatus).toBe("em_andamento");
    expect(next.stats.read).toBe(1);
    expect(next.stats.inProgress).toBe(1);
    expect(next.stats.unread).toBe(0);
  });

  it("respeita filtros de fila e historico", () => {
    const item = buildNotification();

    expect(matchesQueueFilters(item, { priority: "high", userId: "2", limit: 20 })).toBe(true);
    expect(matchesQueueFilters(item, { priority: "critical", userId: "", limit: 20 })).toBe(false);

    expect(
      matchesHistoryFilters(item, {
        status: "unread",
        priority: "high",
        userId: "2",
        from: "2026-03-20",
        to: "2026-03-22",
        limit: 100
      })
    ).toBe(true);

    expect(
      matchesHistoryFilters(item, {
        status: "read",
        priority: "",
        userId: "",
        from: "",
        to: "",
        limit: 100
      })
    ).toBe(false);
  });

  it("insere item no topo apenas na primeira pagina", () => {
    const item = buildNotification();
    const existing = [buildNotification({ id: 11 }), buildNotification({ id: 12 })];

    expect(prependNotificationPageItem(existing, item, 2, 1).map((entry) => entry.id)).toEqual([10, 11]);
    expect(prependNotificationPageItem(existing, item, 2, 2).map((entry) => entry.id)).toEqual([11, 12]);
  });
});
