import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReminderUserPanel } from "./ReminderUserPanel";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    archiveMyStaleReminders: vi.fn(),
    myReminders: vi.fn(),
    createMyReminder: vi.fn(),
    updateMyReminder: vi.fn(),
    deleteMyReminder: vi.fn()
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
          noteKind: "alarm",
          pinned: false,
          tag: "",
          color: "slate",
          checklistItems: [],
          lastScheduledFor: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    });
    mockedApi.createMyReminder.mockResolvedValue({
      reminder: {
        id: 2,
        userId: 2,
        title: "Alongar",
        description: "Levantamento rapido",
        startDate: "2026-03-14",
        timeOfDay: "10:00",
        timezone: "America/Bahia",
        repeatType: "none",
        weekdays: [],
        isActive: true,
        noteKind: "note",
        pinned: false,
        tag: "",
        color: "sky",
        checklistItems: [],
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
        noteKind: "alarm",
        pinned: false,
        tag: "",
        color: "slate",
        checklistItems: [],
        lastScheduledFor: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
    mockedApi.deleteMyReminder.mockResolvedValue(undefined);
  });

  it("carrega lembretes e renderiza a nova secao", async () => {
    render(<ReminderUserPanel onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalledWith(""));
    expect(mockedApi.archiveMyStaleReminders).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Meus lembretes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "⊞ Grade" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "≡ Lista" })).toBeInTheDocument();
    expect(await screen.findByText("Tomar agua")).toBeInTheDocument();
  });

  it("cria e atualiza nota pela composicao inline", async () => {
    render(<ReminderUserPanel onError={vi.fn()} onToast={vi.fn()} />);
    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "+ Nova nota" }));
    fireEvent.change(screen.getByPlaceholderText("Título da nota…"), {
      target: { value: "Alongar" }
    });
    fireEvent.change(screen.getByPlaceholderText("Escreva aqui…"), {
      target: { value: "Levantamento rapido" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));

    await waitFor(() => expect(mockedApi.createMyReminder).toHaveBeenCalled());
    expect(await screen.findByText("Alongar")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Tomar agua"));
    fireEvent.change(screen.getByDisplayValue("Tomar agua"), {
      target: { value: "Tomar agua atualizada" }
    });
    fireEvent.change(screen.getByDisplayValue("Beber 500ml"), {
      target: { value: "Beber 700ml" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(mockedApi.updateMyReminder).toHaveBeenCalled());
    expect(await screen.findByText("Tomar agua atualizada")).toBeInTheDocument();
  });

  it("filtra checklists e permite marcar item direto no card", async () => {
    mockedApi.myReminders.mockResolvedValueOnce({
      reminders: [
        {
          id: 10,
          userId: 2,
          title: "Checklist de abertura",
          description: "",
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

    fireEvent.click(screen.getByRole("button", { name: /☑ Listas/i }));

    expect(await screen.findByText("Checklist de abertura")).toBeInTheDocument();
    expect(screen.getByText("1 de 2 feitos")).toBeInTheDocument();
    expect(screen.queryByText("- [x] Validar alarmes")).not.toBeInTheDocument();
    expect(screen.queryByText("- [ ] Checar comunicacao")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Checar comunicacao"));

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

  it("adiciona um novo item de checklist ao pressionar enter", async () => {
    render(<ReminderUserPanel onError={vi.fn()} onToast={vi.fn()} />);
    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "+ Nova nota" }));
    fireEvent.click(screen.getByRole("button", { name: "☑ Checklist" }));

    const firstChecklistInput = screen.getByLabelText("Texto do item 1");
    fireEvent.change(firstChecklistInput, {
      target: { value: "Validar alarmes" }
    });
    fireEvent.keyDown(firstChecklistInput, {
      key: "Enter",
      code: "Enter"
    });

    expect(await screen.findByLabelText("Texto do item 2")).toBeInTheDocument();
  });

  it("permite fixar lembrete no card e alternar para modo lista", async () => {
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

    const card = screen.getByText("Tomar agua").closest('[role="button"]') as HTMLElement | null;
    expect(card).not.toBeNull();
    fireEvent.click(within(card!).getByRole("button", { name: "Fixar" }));

    await waitFor(() => expect(mockedApi.updateMyReminder).toHaveBeenCalled());
    expect(onToast).toHaveBeenCalledWith("Nota fixada");

    fireEvent.click(screen.getByRole("button", { name: "≡ Lista" }));
    expect(screen.getByRole("button", { name: "≡ Lista" })).toBeInTheDocument();
  });

  it("permite arquivar lembrete pelo editor", async () => {
    const onToast = vi.fn();
    render(<ReminderUserPanel onError={vi.fn()} onToast={onToast} />);
    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalled());

    fireEvent.click(screen.getByText("Tomar agua"));
    fireEvent.click(screen.getByRole("button", { name: "Arquivar" }));

    await waitFor(() => expect(mockedApi.deleteMyReminder).toHaveBeenCalledWith(1));
    expect(onToast).toHaveBeenCalledWith("Nota arquivada");
  });
});
