import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReminderUserPanel } from "./ReminderUserPanel";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    archiveMyStaleReminders: vi.fn(),
    myReminders: vi.fn(),
    myReminderOccurrences: vi.fn(),
    createMyReminder: vi.fn(),
    updateMyReminder: vi.fn(),
    toggleMyReminder: vi.fn(),
    deleteMyReminder: vi.fn(),
    completeReminderOccurrence: vi.fn(),
    createMyOperationsBoardMessage: vi.fn()
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
  const getReminderBoardPanel = () => {
    const panel = screen.getByText("Organizacao visual dos lembretes").closest("article") as HTMLElement | null;
    expect(panel).not.toBeNull();
    return panel!;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockedApi.archiveMyStaleReminders.mockResolvedValue({ archivedCount: 0 });
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
    expect(mockedApi.archiveMyStaleReminders).toHaveBeenCalledTimes(1);
    expect(mockedApi.myReminders).toHaveBeenCalledWith("");
    await waitFor(() => expect(screen.getByText("Tomar agua")).toBeInTheDocument());
    expect(screen.queryByText("Biblioteca operacional")).not.toBeInTheDocument();
    expect(screen.queryByText("Historico de ocorrencias")).not.toBeInTheDocument();
    expect(screen.queryByText("Ocorrencias pendentes agora")).not.toBeInTheDocument();
  });

  it("renderiza somente o quadro para organizar os lembretes", async () => {
    render(<ReminderUserPanel onError={vi.fn()} onToast={vi.fn()} />);
    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalled());
    expect(getReminderBoardPanel()).toBeInTheDocument();
    expect(screen.getByText("Entrada rapida")).toBeInTheDocument();
    expect(screen.getByText("Em organizacao")).toBeInTheDocument();
    expect(screen.getByText("Referencia")).toBeInTheDocument();
  });

  it("cria, atualiza, alterna e remove lembrete sem recarregar tudo", async () => {
    render(<ReminderUserPanel onError={vi.fn()} onToast={vi.fn()} />);
    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalledTimes(1));
    const reminderCalls = mockedApi.myReminders.mock.calls.length;
    const occurrenceCalls = mockedApi.myReminderOccurrences.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Novo lembrete" }));

    const formPanel = screen.getByText("Nova nota operacional").closest("article");
    expect(formPanel).not.toBeNull();

    fireEvent.change(screen.getByPlaceholderText("Titulo da nota"), {
      target: { value: "Alongar" }
    });
    fireEvent.change(formPanel!.querySelector('input[type="date"]') as HTMLInputElement, {
      target: { value: "2026-03-14" }
    });
    fireEvent.change(formPanel!.querySelector('input[type="time"]') as HTMLInputElement, {
      target: { value: "10:00" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar nota" }));

    await waitFor(() => expect(mockedApi.createMyReminder).toHaveBeenCalled());
    expect(within(getReminderBoardPanel()).getByText("Alongar")).toBeInTheDocument();

    fireEvent.click(within(getReminderBoardPanel()).getAllByRole("button", { name: "Editar" })[0]);
    fireEvent.change(screen.getByPlaceholderText("Titulo da nota"), {
      target: { value: "Tomar agua atualizada" }
    });
    fireEvent.change(screen.getByPlaceholderText("Descricao, passos, contatos ou procedimento"), {
      target: { value: "Beber 700ml" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nota" }));

    await waitFor(() => expect(mockedApi.updateMyReminder).toHaveBeenCalled());
    expect(within(getReminderBoardPanel()).getByText("Tomar agua atualizada")).toBeInTheDocument();

    expect(mockedApi.myReminders).toHaveBeenCalledTimes(reminderCalls);
    expect(mockedApi.myReminderOccurrences).toHaveBeenCalledTimes(occurrenceCalls);
  });

  it("permite montar checklist nativa no compositor", async () => {
    render(<ReminderUserPanel onError={vi.fn()} onToast={vi.fn()} />);
    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Novo lembrete" }));
    fireEvent.click(screen.getByRole("button", { name: "Lista" }));
    fireEvent.change(screen.getByPlaceholderText("Titulo da nota"), {
      target: { value: "Checklist de abertura" }
    });

    const checklistInputs = screen.getAllByPlaceholderText("Descreva o item");
    fireEvent.change(checklistInputs[0], {
      target: { value: "Abrir painel principal" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar item" }));
    await waitFor(() =>
      expect(screen.getAllByPlaceholderText("Descreva o item")).toHaveLength(2)
    );
    fireEvent.change(screen.getAllByPlaceholderText("Descreva o item")[1], {
      target: { value: "Validar alarmes" }
    });
    fireEvent.click(screen.getByLabelText("Checklist item 2"));
    fireEvent.click(screen.getByLabelText("Mover item 2 para cima"));
    fireEvent.click(screen.getByLabelText("Duplicar item 1"));
    await waitFor(() =>
      expect(screen.getAllByPlaceholderText("Descreva o item")).toHaveLength(3)
    );
    const removableInput = screen.getAllByPlaceholderText("Descreva o item")[2];
    fireEvent.change(removableInput, {
      target: { value: "" }
    });
    fireEvent.keyDown(removableInput, {
      key: "Backspace"
    });
    await waitFor(() =>
      expect(screen.getAllByPlaceholderText("Descreva o item")).toHaveLength(2)
    );
    fireEvent.click(screen.getByRole("button", { name: "Adicionar item" }));
    await waitFor(() =>
      expect(screen.getAllByPlaceholderText("Descreva o item")).toHaveLength(3)
    );
    fireEvent.change(screen.getAllByPlaceholderText("Descreva o item")[2], {
      target: { value: "Checar comunicacao" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar nota" }));

    await waitFor(() => expect(mockedApi.createMyReminder).toHaveBeenCalled());
    expect(mockedApi.createMyReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        noteKind: "checklist",
        checklistItems: [
          { checked: true, label: "Validar alarmes" },
          { checked: true, label: "Validar alarmes" },
          { checked: false, label: "Checar comunicacao" }
        ]
      })
    );
  });

  it("mostra checklist no quadro com progresso e itens", async () => {
    mockedApi.myReminders.mockResolvedValueOnce({
      reminders: [
        {
          id: 10,
          userId: 2,
          title: "Checklist de abertura",
          description: "- [x] Validar alarmes\n- [ ] Checar comunicacao",
          startDate: "2026-03-13",
          timeOfDay: "08:30",
          timezone: "America/Bahia",
          repeatType: "none",
          weekdays: [],
          isActive: true,
          noteKind: "checklist",
          pinned: false,
          tag: "",
          color: "emerald",
          checklistItems: [
            { checked: true, label: "Validar alarmes" },
            { checked: false, label: "Checar comunicacao" }
          ],
          lastScheduledFor: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    });

    render(<ReminderUserPanel onError={vi.fn()} onToast={vi.fn()} />);
    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalled());

    const boardPanel = getReminderBoardPanel();
    expect(within(boardPanel).getByText("Checklist de abertura")).toBeInTheDocument();
    expect(within(boardPanel).getByText("1/2 itens concluídos")).toBeInTheDocument();
    expect(within(boardPanel).getByText("Validar alarmes")).toBeInTheDocument();
    expect(within(boardPanel).getByText("Checar comunicacao")).toBeInTheDocument();
  });

  it("permite marcar checklist direto no quadro", async () => {
    mockedApi.myReminders.mockResolvedValueOnce({
      reminders: [
        {
          id: 10,
          userId: 2,
          title: "Checklist de abertura",
          description: "- [x] Validar alarmes\n- [ ] Checar comunicacao",
          startDate: "2026-03-13",
          timeOfDay: "08:30",
          timezone: "America/Bahia",
          repeatType: "none",
          weekdays: [],
          isActive: true,
          noteKind: "checklist",
          pinned: false,
          tag: "",
          color: "emerald",
          checklistItems: [
            { checked: true, label: "Validar alarmes" },
            { checked: false, label: "Checar comunicacao" }
          ],
          lastScheduledFor: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    });
    mockedApi.updateMyReminder.mockResolvedValueOnce({
      reminder: {
        id: 10,
        userId: 2,
        title: "Checklist de abertura",
        description: "- [x] Validar alarmes\n- [x] Checar comunicacao",
        startDate: "2026-03-13",
        timeOfDay: "08:30",
        timezone: "America/Bahia",
        repeatType: "none",
        weekdays: [],
        isActive: true,
        noteKind: "checklist",
        pinned: false,
        tag: "",
        color: "emerald",
        checklistItems: [
          { checked: true, label: "Validar alarmes" },
          { checked: true, label: "Checar comunicacao" }
        ],
        lastScheduledFor: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });

    render(<ReminderUserPanel onError={vi.fn()} onToast={vi.fn()} />);
    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalled());

    fireEvent.click(within(getReminderBoardPanel()).getByRole("button", { name: /Checar comunicacao/ }));

    await waitFor(() => expect(mockedApi.updateMyReminder).toHaveBeenCalled());
    expect(mockedApi.updateMyReminder).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        noteKind: "checklist",
        checklistItems: [
          { checked: true, label: "Validar alarmes" },
          { checked: true, label: "Checar comunicacao" }
        ]
      })
    );
  });

  it("permite fixar nota direto pelo card do quadro", async () => {
    const onToast = vi.fn();
    mockedApi.updateMyReminder.mockResolvedValueOnce({
      reminder: {
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
        noteKind: "alarm",
        pinned: true,
        tag: "",
        color: "slate",
        checklistItems: [],
        lastScheduledFor: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });

    render(<ReminderUserPanel onError={vi.fn()} onToast={onToast} />);
    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalled());
    await waitFor(() => expect(within(getReminderBoardPanel()).getByText("Tomar agua")).toBeInTheDocument());

    const reminderCard = within(getReminderBoardPanel())
      .getByText("Tomar agua")
      .closest("div.rounded-xl") as HTMLElement | null;
    expect(reminderCard).not.toBeNull();
    fireEvent.click(within(reminderCard!).getByRole("button", { name: "Fixar" }));

    await waitFor(() => expect(mockedApi.updateMyReminder).toHaveBeenCalled());
    expect(onToast).toHaveBeenCalledWith("Nota fixada");
  });

  it("abre a edicao pelo card do quadro", async () => {
    render(<ReminderUserPanel onError={vi.fn()} onToast={vi.fn()} />);
    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalled());
    await waitFor(() => expect(within(getReminderBoardPanel()).getByText("Tomar agua")).toBeInTheDocument());

    const reminderCard = within(getReminderBoardPanel())
      .getByText("Tomar agua")
      .closest("div.rounded-xl") as HTMLElement | null;
    expect(reminderCard).not.toBeNull();
    fireEvent.click(within(reminderCard!).getByRole("button", { name: "Editar" }));

    expect(screen.getByDisplayValue("Tomar agua")).toBeInTheDocument();
  });
});
