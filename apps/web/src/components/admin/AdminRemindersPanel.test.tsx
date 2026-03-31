import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRemindersPanel } from "./AdminRemindersPanel";
import { api } from "../../lib/api";

vi.mock("../../lib/api", () => ({
  api: {
    myReminders: vi.fn(),
    archiveMyStaleReminders: vi.fn(),
    createMyReminder: vi.fn(),
    updateMyReminder: vi.fn(),
    deleteMyReminder: vi.fn(),
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

describe("AdminRemindersPanel", () => {
  const getReminderBoardPanel = () => {
    const panel = screen.getByText("Organizacao visual dos lembretes").closest("article") as HTMLElement | null;
    expect(panel).not.toBeNull();
    return panel!;
  };

  const getReminderCardByTitle = (title: string) => {
    const card = within(getReminderBoardPanel())
      .getByText((_content, element) => element?.tagName === "P" && element.textContent === title)
      .closest("div.rounded-xl") as HTMLElement | null;
    expect(card).not.toBeNull();
    return card!;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockedApi.myReminders.mockResolvedValue({
      reminders: [
        {
          id: 1,
          userId: 1,
          title: "Checklist",
          description: "- [x] Validar alarmes\n- [ ] Checar comunicacao",
          startDate: "2026-03-13",
          timeOfDay: "08:00",
          timezone: "America/Bahia",
          repeatType: "none",
          weekdays: [],
          checklistItems: [
            { checked: true, label: "Validar alarmes" },
            { checked: false, label: "Checar comunicacao" }
          ],
          noteKind: "checklist",
          pinned: false,
          tag: "",
          color: "emerald",
          isActive: true,
          lastScheduledFor: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    });
    mockedApi.archiveMyStaleReminders.mockResolvedValue({
      archivedCount: 0
    });
    mockedApi.createMyReminder.mockResolvedValue({
      reminder: {
        id: 2,
        userId: 1,
        title: "Novo lembrete",
        description: "",
        startDate: "2026-03-14",
        timeOfDay: "10:00",
        timezone: "America/Bahia",
        repeatType: "none",
        weekdays: [],
        checklistItems: [],
        noteKind: "note",
        pinned: false,
        tag: "",
        color: "slate",
        isActive: true,
        lastScheduledFor: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
    mockedApi.updateMyReminder.mockResolvedValue({
      reminder: {
        id: 1,
        userId: 1,
        title: "Checklist atualizada",
        description: "- [x] Validar alarmes\n- [x] Checar comunicacao",
        startDate: "2026-03-13",
        timeOfDay: "08:00",
        timezone: "America/Bahia",
        repeatType: "none",
        weekdays: [],
        checklistItems: [
          { checked: true, label: "Validar alarmes" },
          { checked: true, label: "Checar comunicacao" }
        ],
        noteKind: "checklist",
        pinned: true,
        tag: "",
        color: "emerald",
        isActive: true,
        lastScheduledFor: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
    mockedApi.deleteMyReminder.mockResolvedValue(undefined);
    mockedApi.createMyOperationsBoardMessage.mockResolvedValue({
      message: {
        id: 1,
        title: "x",
        body: "x",
        status: "active",
        authorUserId: 1,
        authorName: "Admin",
        authorLogin: "admin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resolvedAt: null
      }
    });
  });

  it("carrega o quadro admin como lembretes pessoais", async () => {
    render(<AdminRemindersPanel onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalledWith(""));
    await waitFor(() =>
      expect(within(getReminderBoardPanel()).getByRole("button", { name: /Checar comunicacao/ })).toBeInTheDocument()
    );
  });

  it("cria lembrete pessoal no painel admin", async () => {
    render(<AdminRemindersPanel onError={vi.fn()} onToast={vi.fn()} />);
    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Novo lembrete admin" }));
    fireEvent.change(screen.getByPlaceholderText("Titulo da nota"), {
      target: { value: "Novo lembrete" }
    });
    const formPanel = screen.getByText("Nova nota operacional").closest("article");
    expect(formPanel).not.toBeNull();
    fireEvent.change(formPanel!.querySelector('input[type="date"]') as HTMLInputElement, {
      target: { value: "2026-03-14" }
    });
    fireEvent.change(formPanel!.querySelector('input[type="time"]') as HTMLInputElement, {
      target: { value: "10:00" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar nota" }));

    await waitFor(() => expect(mockedApi.createMyReminder).toHaveBeenCalled());
    expect(mockedApi.createMyReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Novo lembrete"
      })
    );
    expect(within(getReminderCardByTitle("Novo lembrete")).getByText("Novo lembrete")).toBeInTheDocument();
  });

  it("permite fixar e arquivar direto no quadro admin", async () => {
    const onToast = vi.fn();
    render(<AdminRemindersPanel onError={vi.fn()} onToast={onToast} />);
    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalled());

    const reminderCard = getReminderCardByTitle("Checklist");

    fireEvent.click(within(reminderCard!).getByRole("button", { name: "Fixar" }));
    await waitFor(() => expect(mockedApi.updateMyReminder).toHaveBeenCalled());
    expect(onToast).toHaveBeenCalledWith("Nota fixada");

    fireEvent.click(within(reminderCard!).getByRole("button", { name: "Arquivar" }));
    await waitFor(() => expect(mockedApi.deleteMyReminder).toHaveBeenCalledWith(1));
  });

  it("permite marcar checklist e enviar ao mural pelo quadro admin", async () => {
    render(<AdminRemindersPanel onError={vi.fn()} onToast={vi.fn()} />);
    await waitFor(() => expect(mockedApi.myReminders).toHaveBeenCalled());

    fireEvent.click(within(getReminderBoardPanel()).getByRole("button", { name: /Checar comunicacao/ }));
    await waitFor(() => expect(mockedApi.updateMyReminder).toHaveBeenCalled());

    const reminderCard = getReminderCardByTitle("Checklist atualizada");
    fireEvent.click(within(reminderCard!).getByRole("button", { name: "No mural" }));
    await waitFor(() => expect(mockedApi.createMyOperationsBoardMessage).toHaveBeenCalled());
  });
});
