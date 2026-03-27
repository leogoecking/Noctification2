import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminHistoryPanel } from "./AdminHistoryPanel";

describe("AdminHistoryPanel", () => {
  it("mostra a tarefa vinculada quando a notificacao possui source_task_id", () => {
    render(
      <AdminHistoryPanel
        historyFilters={{ status: "", priority: "", userId: "", from: "", to: "", limit: 100 }}
        setHistoryFilters={vi.fn()}
        selectableUserTargets={[]}
        lastHistoryRefreshAt={null}
        historyPagination={{ page: 1, limit: 100, total: 1, totalPages: 1 }}
        setHistoryPagination={vi.fn()}
        loadingHistoryAll={false}
        historyAll={[
          {
            id: 10,
            title: "Atualizacao de tarefa",
            message: "Tarefa mudou de estado",
            priority: "high",
            recipient_mode: "users",
            source_task_id: 44,
            created_at: "2026-03-21T12:00:00.000Z",
            sender: { id: 1, name: "Admin", login: "admin" },
            recipients: [],
            stats: {
              total: 0,
              read: 0,
              unread: 0,
              responded: 0,
              inProgress: 0,
              resolved: 0,
              operationalPending: 0,
              operationalCompleted: 0
            }
          }
        ]}
        onApplyFilters={vi.fn()}
        onResetFilters={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText("Tarefa vinculada #44")).toBeInTheDocument();
  });
});
