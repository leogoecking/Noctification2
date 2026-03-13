import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRemindersPanel } from "./AdminRemindersPanel";
import { api } from "../../lib/api";

vi.mock("../../lib/socket", () => ({
  connectSocket: () => ({
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn()
  })
}));

vi.mock("../../lib/api", () => ({
  api: {
    adminReminderHealth: vi.fn(),
    adminReminders: vi.fn(),
    adminReminderOccurrences: vi.fn(),
    adminReminderLogs: vi.fn(),
    toggleAdminReminder: vi.fn()
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
}));

const mockedApi = vi.mocked(api);

describe("AdminRemindersPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.adminReminderHealth.mockResolvedValue({
      health: {
        totalReminders: 1,
        activeReminders: 1,
        pendingOccurrences: 1,
        completedToday: 0,
        expiredToday: 0,
        deliveriesToday: 2,
        retriesToday: 1
      }
    });
    mockedApi.adminReminders.mockResolvedValue({
      reminders: [
        {
          id: 1,
          userId: 7,
          userName: "Maria Silva",
          userLogin: "maria",
          title: "Checklist",
          description: "",
          startDate: "2026-03-13",
          timeOfDay: "08:00",
          timezone: "America/Bahia",
          repeatType: "daily",
          weekdays: [],
          isActive: true,
          lastScheduledFor: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    });
    mockedApi.adminReminderOccurrences.mockResolvedValue({
      occurrences: [
        {
          id: 10,
          reminderId: 1,
          userId: 7,
          userName: "Maria Silva",
          userLogin: "maria",
          scheduledFor: new Date().toISOString(),
          triggeredAt: new Date().toISOString(),
          status: "pending",
          retryCount: 1,
          nextRetryAt: null,
          completedAt: null,
          expiredAt: null,
          triggerSource: "scheduler",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          title: "Checklist",
          description: ""
        }
      ]
    });
    mockedApi.adminReminderLogs.mockResolvedValue({
      logs: [
        {
          id: 99,
          reminderId: 1,
          occurrenceId: 10,
          userId: 7,
          userName: "Maria Silva",
          userLogin: "maria",
          eventType: "reminder.occurrence.delivered",
          metadata: { retryCount: 0 },
          createdAt: new Date().toISOString()
        }
      ]
    });
  });

  it("carrega resumo e listas de lembretes", async () => {
    render(<AdminRemindersPanel onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminReminderHealth).toHaveBeenCalled());
    await waitFor(() => expect(mockedApi.adminReminders).toHaveBeenCalledWith(""));
    await waitFor(() => expect(mockedApi.adminReminderOccurrences).toHaveBeenCalledWith(""));
    await waitFor(() => expect(mockedApi.adminReminderLogs).toHaveBeenCalledWith(""));
    await waitFor(() => expect(screen.getAllByText("Checklist").length).toBeGreaterThan(0));
    expect(screen.getAllByText("Pendentes").length).toBeGreaterThan(0);
    expect(screen.getByText("Disparos hoje")).toBeInTheDocument();
    expect(screen.getByText("reminder.occurrence.delivered")).toBeInTheDocument();
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes("Maria Silva (maria)") ?? false)
        .length
    ).toBeGreaterThan(0);
  });

  it("aplica filtros administrativos ao consultar a API", async () => {
    render(<AdminRemindersPanel onError={vi.fn()} onToast={vi.fn()} />);
    await waitFor(() => expect(mockedApi.adminReminders).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText("Usuario ou login"), {
      target: { value: "maria" }
    });

    await waitFor(() =>
      expect(mockedApi.adminReminders).toHaveBeenLastCalledWith("?user_search=maria")
    );
    await waitFor(() =>
      expect(mockedApi.adminReminderOccurrences).toHaveBeenLastCalledWith("?user_search=maria")
    );
    await waitFor(() =>
      expect(mockedApi.adminReminderLogs).toHaveBeenLastCalledWith("?user_search=maria")
    );

    fireEvent.click(screen.getByRole("button", { name: "Inativos" }));
    await waitFor(() =>
      expect(mockedApi.adminReminders).toHaveBeenLastCalledWith("?user_search=maria&active=false")
    );

    fireEvent.click(screen.getByRole("button", { name: "Expiradas" }));
    await waitFor(() =>
      expect(mockedApi.adminReminderOccurrences).toHaveBeenLastCalledWith(
        "?user_search=maria&status=expired"
      )
    );

    fireEvent.click(screen.getByRole("button", { name: "Retries" }));
    await waitFor(() =>
      expect(mockedApi.adminReminderLogs).toHaveBeenLastCalledWith(
        "?user_search=maria&event_type=reminder.occurrence.retried"
      )
    );
  });
});
