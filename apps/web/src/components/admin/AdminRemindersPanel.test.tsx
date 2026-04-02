import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRemindersPanel } from "./AdminRemindersPanel";
import { api } from "../../lib/api";

vi.mock("../../lib/api", () => ({
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

describe("AdminRemindersPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockedApi.archiveMyStaleReminders.mockResolvedValue({ archivedCount: 0 });
    mockedApi.myReminders.mockResolvedValue({
      reminders: [
        {
          id: 1,
          userId: 1,
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
    mockedApi.createMyReminder.mockResolvedValue({
      reminder: {
        id: 2,
        userId: 1,
        title: "Novo lembrete",
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
        userId: 1,
        title: "Checklist revisada",
        description: "- [x] Validar alarmes\n- [x] Checar comunicacao",
        startDate: "2026-03-13",
        timeOfDay: "08:30",
        timezone: "America/Bahia",
        repeatType: "none",
        weekdays: [],
        isActive: true,
        noteKind: "checklist",
        pinned: true,
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
    mockedApi.deleteMyReminder.mockResolvedValue(undefined);
  });

  it("renderiza o painel admin com a nova experiencia de lembretes", async () => {
    render(<AdminRemindersPanel onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalledWith(""));
    expect(screen.getByText("Meus lembretes")).toBeInTheDocument();
    expect(await screen.findByText("Checklist de abertura")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "⊞ Grade" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "≡ Lista" })).toBeInTheDocument();
  });

  it("cria e edita lembrete pelo compositor inline no admin", async () => {
    render(<AdminRemindersPanel onError={vi.fn()} onToast={vi.fn()} />);
    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "+ Nova nota" }));
    fireEvent.change(screen.getByPlaceholderText("Título da nota…"), {
      target: { value: "Novo lembrete" }
    });
    fireEvent.change(screen.getByPlaceholderText("Escreva aqui…"), {
      target: { value: "Levantamento rapido" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));

    await waitFor(() => expect(mockedApi.createMyReminder).toHaveBeenCalled());
    expect(await screen.findByText("Novo lembrete")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Checklist de abertura"));
    fireEvent.change(screen.getByDisplayValue("Checklist de abertura"), {
      target: { value: "Checklist revisada" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Checklist item 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(mockedApi.updateMyReminder).toHaveBeenCalled());
  });

  it("filtra checklist e permite marcar item no painel admin", async () => {
    render(<AdminRemindersPanel onError={vi.fn()} onToast={vi.fn()} />);
    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /☑ Listas/i }));

    expect(await screen.findByText("Checklist de abertura")).toBeInTheDocument();
    expect(screen.getByText("1 de 2 feitos")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Checar comunicacao"));

    await waitFor(() => expect(mockedApi.updateMyReminder).toHaveBeenCalled());
    expect(mockedApi.updateMyReminder).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        noteKind: "checklist",
        checklistItems: [
          { checked: true, label: "Validar alarmes" },
          { checked: true, label: "Checar comunicacao" }
        ]
      })
    );
  });

  it("adiciona novo item de checklist com enter no admin", async () => {
    render(<AdminRemindersPanel onError={vi.fn()} onToast={vi.fn()} />);
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

  it("permite fixar e arquivar lembrete no admin", async () => {
    const onToast = vi.fn();
    render(<AdminRemindersPanel onError={vi.fn()} onToast={onToast} />);
    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalled());

    const card = screen.getByText("Checklist de abertura").closest('[role="button"]') as HTMLElement | null;
    expect(card).not.toBeNull();
    fireEvent.click(within(card!).getByRole("button", { name: "Fixar" }));

    await waitFor(() => expect(mockedApi.updateMyReminder).toHaveBeenCalled());
    expect(onToast).toHaveBeenCalledWith("Nota fixada");

    fireEvent.click(screen.getByText("Checklist revisada"));
    fireEvent.click(screen.getByRole("button", { name: "Arquivar" }));

    await waitFor(() => expect(mockedApi.deleteMyReminder).toHaveBeenCalledWith(1));
  });
});
