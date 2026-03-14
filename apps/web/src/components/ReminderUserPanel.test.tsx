import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReminderUserPanel } from "./ReminderUserPanel";
import { api } from "../lib/api";
import { dispatchReminderDue, dispatchReminderUpdated } from "../lib/reminderEvents";

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

describe("ReminderUserPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockedApi.createMyReminder.mockResolvedValue({
      reminder: {
        id: 2,
        userId: 2,
        title: "Alongar",
        description: "",
        startDate: "2026-03-14",
        timeOfDay: "10:00",
        timezone: "America/Bahia",
        repeatType: "none",
        weekdays: [],
        isActive: true,
        lastScheduledFor: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
    mockedApi.updateMyReminder.mockResolvedValue({
      reminder: {
        id: 1,
        userId: 2,
        title: "Tomar agua atualizada",
        description: "Beber 700ml",
        startDate: "2026-03-13",
        timeOfDay: "09:30",
        timezone: "America/Bahia",
        repeatType: "daily",
        weekdays: [],
        isActive: true,
        lastScheduledFor: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
    mockedApi.toggleMyReminder.mockResolvedValue({ ok: true });
    mockedApi.deleteMyReminder.mockResolvedValue(undefined);
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

  it("cria, atualiza, alterna e remove lembrete sem recarregar tudo", async () => {
    render(<ReminderUserPanel onError={vi.fn()} onToast={vi.fn()} />);
    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalledTimes(1));
    const reminderCalls = mockedApi.myReminders.mock.calls.length;
    const occurrenceCalls = mockedApi.myReminderOccurrences.mock.calls.length;

    const formPanel = screen.getByText("Novo lembrete").closest("article");
    expect(formPanel).not.toBeNull();

    fireEvent.change(screen.getByPlaceholderText("Titulo"), {
      target: { value: "Alongar" }
    });
    fireEvent.change(formPanel!.querySelector('input[type="date"]') as HTMLInputElement, {
      target: { value: "2026-03-14" }
    });
    fireEvent.change(formPanel!.querySelector('input[type="time"]') as HTMLInputElement, {
      target: { value: "10:00" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar lembrete" }));

    await waitFor(() => expect(mockedApi.createMyReminder).toHaveBeenCalled());
    expect(screen.getByText("Alongar")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    fireEvent.change(screen.getByPlaceholderText("Titulo"), {
      target: { value: "Tomar agua atualizada" }
    });
    fireEvent.change(screen.getByPlaceholderText("Descricao opcional"), {
      target: { value: "Beber 700ml" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(mockedApi.updateMyReminder).toHaveBeenCalled());
    expect(screen.getByText("Tomar agua atualizada")).toBeInTheDocument();

    const updatedCard = screen.getByText("Tomar agua atualizada").closest("div.rounded-xl");
    expect(updatedCard).not.toBeNull();
    fireEvent.click(updatedCard!.querySelector("button:nth-of-type(2)") as HTMLButtonElement);
    await waitFor(() => expect(mockedApi.toggleMyReminder).toHaveBeenCalledWith(1, false));
    expect(screen.getByText("Inativo")).toBeInTheDocument();

    fireEvent.click(updatedCard!.querySelector("button:nth-of-type(3)") as HTMLButtonElement);
    await waitFor(() => expect(mockedApi.deleteMyReminder).toHaveBeenCalledWith(1));

    expect(mockedApi.myReminders).toHaveBeenCalledTimes(reminderCalls);
    expect(mockedApi.myReminderOccurrences).toHaveBeenCalledTimes(occurrenceCalls);
  });

  it("exibe alerta realtime e conclui a ocorrencia", async () => {
    const onToast = vi.fn();

    render(<ReminderUserPanel onError={vi.fn()} onToast={onToast} />);
    await waitFor(() => expect(mockedApi.myReminderOccurrences).toHaveBeenCalled());

    await act(async () => {
      dispatchReminderDue({
        occurrenceId: 100,
        reminderId: 1,
        userId: 2,
        title: "Tomar agua",
        description: "Beber 500ml",
        scheduledFor: new Date().toISOString(),
        retryCount: 0
      });
    });

    const occurrencesPanel = screen.getByText("Historico de ocorrencias").closest("article");
    expect(occurrencesPanel).not.toBeNull();
    expect(within(occurrencesPanel!).getByText("Tomar agua")).toBeInTheDocument();
    expect(within(occurrencesPanel!).getByText("Pendente")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Concluir" })[0]);

    await waitFor(() => expect(mockedApi.completeReminderOccurrence).toHaveBeenCalledWith(100));
    expect(onToast).toHaveBeenCalledWith("Ocorrencia concluida");
  });

  it("remove ocorrencia da lista filtrada quando o status deixa de atender o filtro", async () => {
    mockedApi.myReminderOccurrences.mockResolvedValueOnce({
      occurrences: [
        {
          id: 200,
          reminderId: 1,
          userId: 2,
          scheduledFor: new Date().toISOString(),
          triggeredAt: new Date().toISOString(),
          status: "pending",
          retryCount: 0,
          nextRetryAt: null,
          completedAt: null,
          expiredAt: null,
          triggerSource: "scheduler",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          title: "Tomar agua",
          description: "Beber 500ml"
        }
      ]
    });

    render(<ReminderUserPanel onError={vi.fn()} onToast={vi.fn()} />);
    await waitFor(() => expect(mockedApi.myReminderOccurrences).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Pendentes" }));
    const occurrencesPanel = screen.getByText("Historico de ocorrencias").closest("article");
    expect(occurrencesPanel).not.toBeNull();
    await waitFor(() =>
      expect(within(occurrencesPanel!).getByText("Tomar agua")).toBeInTheDocument()
    );

    await act(async () => {
      dispatchReminderUpdated({
        occurrenceId: 200,
        reminderId: 1,
        userId: 2,
        status: "completed",
        retryCount: 0,
        completedAt: new Date().toISOString()
      });
    });

    await waitFor(() =>
      expect(within(occurrencesPanel!).queryByText("Tomar agua")).not.toBeInTheDocument()
    );
  });
});
