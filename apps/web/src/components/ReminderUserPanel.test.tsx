import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReminderUserPanel } from "./ReminderUserPanel";
import { api } from "../lib/api";
import { playReminderAlert } from "../lib/reminderAudio";

const socketHandlers = new Map<string, (payload: unknown) => void>();

vi.mock("../lib/socket", () => ({
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

vi.mock("../lib/reminderAudio", () => ({
  playReminderAlert: vi.fn(() => false)
}));

vi.mock("../lib/api", () => ({
  api: {
    myReminders: vi.fn(),
    myReminderOccurrences: vi.fn(),
    createMyReminder: vi.fn(),
    updateMyReminder: vi.fn(),
    toggleMyReminder: vi.fn(),
    deleteMyReminder: vi.fn(),
    completeReminderOccurrence: vi.fn()
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
const mockedPlayReminderAlert = vi.mocked(playReminderAlert);

describe("ReminderUserPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socketHandlers.clear();
    mockedPlayReminderAlert.mockReturnValue(false);
    mockedApi.myReminders.mockResolvedValue({
      reminders: [
        {
          id: 1,
          userId: 2,
          title: "Tomar agua",
          description: "Beber 500ml",
          startDate: "2026-03-13",
          timeOfDay: "09:00",
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
    mockedApi.myReminderOccurrences.mockResolvedValue({ occurrences: [] });
    mockedApi.completeReminderOccurrence.mockResolvedValue({
      ok: true,
      completedAt: new Date().toISOString()
    });
  });

  it("carrega lembretes e historico inicial", async () => {
    render(<ReminderUserPanel onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalled());
    expect(mockedApi.myReminders).toHaveBeenCalledWith("");
    expect(mockedApi.myReminderOccurrences).toHaveBeenCalledWith("");
    expect(screen.getByText("Tomar agua")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma ocorrencia registrada.")).toBeInTheDocument();
  });

  it("aplica filtros de lembretes e ocorrencias ao consultar a API", async () => {
    render(<ReminderUserPanel onError={vi.fn()} onToast={vi.fn()} />);
    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Inativos" }));
    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenLastCalledWith("?active=false"));

    fireEvent.click(screen.getByRole("button", { name: "Hoje" }));
    await waitFor(() =>
      expect(mockedApi.myReminderOccurrences).toHaveBeenLastCalledWith("?filter=today")
    );
  });

  it("exibe alerta realtime e conclui a ocorrencia", async () => {
    const onToast = vi.fn();

    render(<ReminderUserPanel onError={vi.fn()} onToast={onToast} />);
    await waitFor(() => expect(mockedApi.myReminderOccurrences).toHaveBeenCalled());
    await waitFor(() => expect(socketHandlers.has("reminder:due")).toBe(true));

    const dueHandler = socketHandlers.get("reminder:due");
    expect(dueHandler).toBeTruthy();

    await act(async () => {
      dueHandler?.({
        occurrenceId: 100,
        reminderId: 1,
        userId: 2,
        title: "Tomar agua",
        description: "Beber 500ml",
        scheduledFor: new Date().toISOString(),
        retryCount: 0
      });
    });

    expect(screen.getByText("Lembrete pendente agora")).toBeInTheDocument();
    expect(
      screen.getByText("O navegador bloqueou o som. O alerta visual continua ativo.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar som novamente" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Concluir" })[0]);

    await waitFor(() => expect(mockedApi.completeReminderOccurrence).toHaveBeenCalledWith(100));
    expect(onToast).toHaveBeenCalledWith("Ocorrencia concluida");
  });

  it("permite tentar tocar o som novamente apos bloqueio", async () => {
    const onToast = vi.fn();
    const onError = vi.fn();

    mockedPlayReminderAlert.mockReturnValueOnce(false).mockReturnValueOnce(true);

    render(<ReminderUserPanel onError={onError} onToast={onToast} />);
    await waitFor(() => expect(socketHandlers.has("reminder:due")).toBe(true));

    const dueHandler = socketHandlers.get("reminder:due");

    await act(async () => {
      dueHandler?.({
        occurrenceId: 101,
        reminderId: 1,
        userId: 2,
        title: "Tomar agua",
        description: "Beber 500ml",
        scheduledFor: new Date().toISOString(),
        retryCount: 0
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Tentar som novamente" }));

    expect(mockedPlayReminderAlert).toHaveBeenLastCalledWith(101);
    expect(onToast).toHaveBeenCalledWith("Som do lembrete reproduzido");
    expect(onError).not.toHaveBeenCalledWith("O navegador ainda bloqueou o som do lembrete");
  });
});
