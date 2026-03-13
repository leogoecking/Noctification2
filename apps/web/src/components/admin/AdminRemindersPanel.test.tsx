import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRemindersPanel } from "./AdminRemindersPanel";
import { api } from "../../lib/api";

const socketHandlers = new Map<string, (payload: unknown) => void>();

vi.mock("../../lib/socket", () => ({
  connectSocket: () => ({
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      socketHandlers.set(event, handler);
    }),
    off: vi.fn((event: string) => {
      socketHandlers.delete(event);
    }),
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
    socketHandlers.clear();
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
    mockedApi.toggleAdminReminder.mockResolvedValue({ ok: true });
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

  it("altera status do lembrete sem recarregar tudo", async () => {
    render(<AdminRemindersPanel onError={vi.fn()} onToast={vi.fn()} />);
    await waitFor(() => expect(mockedApi.adminReminders).toHaveBeenCalledTimes(1));
    const reminderCalls = mockedApi.adminReminders.mock.calls.length;
    const occurrenceCalls = mockedApi.adminReminderOccurrences.mock.calls.length;
    const logCalls = mockedApi.adminReminderLogs.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Desativar" }));

    await waitFor(() => expect(mockedApi.toggleAdminReminder).toHaveBeenCalledWith(1, false));
    expect(screen.getByRole("button", { name: "Ativar" })).toBeInTheDocument();
    expect(mockedApi.adminReminders).toHaveBeenCalledTimes(reminderCalls);
    expect(mockedApi.adminReminderOccurrences).toHaveBeenCalledTimes(occurrenceCalls);
    expect(mockedApi.adminReminderLogs).toHaveBeenCalledTimes(logCalls);
  });

  it("aplica evento realtime de lembrete sem recarregar tudo", async () => {
    const onToast = vi.fn();
    render(<AdminRemindersPanel onError={vi.fn()} onToast={onToast} />);

    await waitFor(() => expect(socketHandlers.has("reminder:due")).toBe(true));
    const reminderCalls = mockedApi.adminReminders.mock.calls.length;
    const occurrenceCalls = mockedApi.adminReminderOccurrences.mock.calls.length;
    const logCalls = mockedApi.adminReminderLogs.mock.calls.length;

    await act(async () => {
      socketHandlers.get("reminder:due")?.({
        occurrenceId: 55,
        reminderId: 1,
        userId: 7,
        title: "Checklist",
        description: "",
        scheduledFor: new Date().toISOString(),
        retryCount: 1
      });
    });

    expect(onToast).toHaveBeenCalledWith("Lembrete reenviado para usuario #7: Checklist");
    expect(screen.getByText("reminder.occurrence.retried")).toBeInTheDocument();
    expect(mockedApi.adminReminders).toHaveBeenCalledTimes(reminderCalls);
    expect(mockedApi.adminReminderOccurrences).toHaveBeenCalledTimes(occurrenceCalls);
    expect(mockedApi.adminReminderLogs).toHaveBeenCalledTimes(logCalls);
  });

  it("remove ocorrencia da lista filtrada quando o status deixa de atender o filtro", async () => {
    render(<AdminRemindersPanel onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(socketHandlers.has("reminder:updated")).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: "Pendentes" }));
    const occurrencesPanel = screen.getByText("Ocorrencias recentes").closest("article");
    expect(occurrencesPanel).not.toBeNull();
    await waitFor(() =>
      expect(within(occurrencesPanel!).getByText("Checklist")).toBeInTheDocument()
    );

    await act(async () => {
      socketHandlers.get("reminder:updated")?.({
        occurrenceId: 10,
        reminderId: 1,
        userId: 7,
        status: "completed",
        retryCount: 1,
        completedAt: new Date().toISOString()
      });
    });

    await waitFor(() =>
      expect(within(occurrencesPanel!).queryByText("Checklist")).not.toBeInTheDocument()
    );
  });
});
