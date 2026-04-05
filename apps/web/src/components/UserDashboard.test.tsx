import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserDashboard } from "./UserDashboard";
import { api } from "../lib/api";
import type { NotificationItem } from "../types";
import type { NotificationSoundPrefsHandle } from "../hooks/useNotificationSoundPrefs";
import { DEFAULT_SOUNDS } from "../lib/notificationSoundPrefs";

const mockSoundPrefs: NotificationSoundPrefsHandle = {
  prefs: { masterOn: true, sounds: { ...DEFAULT_SOUNDS }, customAudios: {} },
  toggleMaster: vi.fn(),
  setSound: vi.fn(),
  setCustom: vi.fn(),
  removeCustom: vi.fn(),
  playSoundForPriority: vi.fn(),
};

vi.mock("../lib/socket", () => ({
  acquireSocket: () => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn()
  }),
  releaseSocket: vi.fn()
}));

vi.mock("./OperationsBoardRail", () => ({
  OperationsBoardRail: ({ currentUserName }: { currentUserName: string }) => (
    <div data-testid="operations-board-rail">
      <span>Mural operacional</span>
      <span>{currentUserName}</span>
    </div>
  )
}));

vi.mock("../lib/api", () => ({
  api: {
    myNotifications: vi.fn(),
    myReminders: vi.fn(),
    myReminderOccurrences: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    respondNotification: vi.fn(),
    getMySettings: vi.fn().mockResolvedValue({ value: null }),
    updateMySettings: vi.fn().mockResolvedValue({ value: null }),
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

const waitForNotificationsReady = async () => {
  await waitFor(() => expect(mockedApi.myNotifications).toHaveBeenCalled());
};

const renderUserDashboard = async (
  overrides: Partial<React.ComponentProps<typeof UserDashboard>> = {}
) => {
  const view = render(
    <UserDashboard
      user={{ id: 2, login: "user", name: "Usuario", role: "user" }}
      isNotificationsPage={false}
      onOpenAllNotifications={vi.fn()}
      onBackToDashboard={vi.fn()}
      onError={vi.fn()}
      onToast={vi.fn()}
      soundPrefs={mockSoundPrefs}
      {...overrides}
    />
  );

  await waitForNotificationsReady();
  return view;
};

const buildNotification = (id: number, isVisualized: boolean): NotificationItem => ({
  id,
  title: `Notificacao ${id}`,
  message: `Mensagem ${id}`,
  priority: "normal" as const,
  sourceTaskId: null,
  createdAt: new Date(Date.now() - id * 1000).toISOString(),
  senderId: 1,
  senderName: "Admin",
  senderLogin: "admin",
  visualizedAt: isVisualized ? new Date().toISOString() : null,
  deliveredAt: new Date().toISOString(),
  operationalStatus: isVisualized ? "visualizada" : "recebida",
  responseAt: null,
  responseMessage: null,
  isVisualized
});

describe("UserDashboard", () => {
  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra somente 10 itens no dropdown e CTA para pagina completa", async () => {
    mockedApi.myNotifications.mockResolvedValue({
      notifications: Array.from({ length: 12 }).map((_, index) => buildNotification(index + 1, index > 2))
    });

    const onOpenAllNotifications = vi.fn();

    await renderUserDashboard({
      onOpenAllNotifications
    });

    fireEvent.click(screen.getByTestId("notif-bell-btn"));

    const dropdownList = screen.getByTestId("notif-dropdown-list");
    expect(within(dropdownList).getAllByRole("button").length).toBe(10);

    fireEvent.click(screen.getByTestId("view-all-notifications-btn"));
    expect(onOpenAllNotifications).toHaveBeenCalledTimes(1);
  });

  it("marca todas como lidas na pagina completa", async () => {
    mockedApi.myNotifications.mockResolvedValue({
      notifications: [buildNotification(1, false), buildNotification(2, true)]
    });
    mockedApi.markAllRead.mockResolvedValue({
      updatedCount: 1,
      visualizedAt: new Date().toISOString()
    });

    await renderUserDashboard({
      isNotificationsPage: true
    });
    expect(screen.getByTestId("unread-counter")).toHaveTextContent("Não lidas: 1");

    fireEvent.click(screen.getByTestId("mark-all-read-btn"));

    await waitFor(() => expect(mockedApi.markAllRead).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("unread-counter")).toHaveTextContent("Não lidas: 0");
  });

  it("mostra o identificador da tarefa vinculada no detalhe da notificacao", async () => {
    mockedApi.myNotifications.mockResolvedValue({
      notifications: [
        {
          ...buildNotification(7, false),
          sourceTaskId: 22
        }
      ]
    });

    await renderUserDashboard({
      isNotificationsPage: true
    });

    fireEvent.click(screen.getByRole("button", { name: /Notificacao 7/i }));

    expect(screen.getByText("Tarefa vinculada #22")).toBeInTheDocument();
  });

  it("renderiza o mural operacional dentro do dashboard", async () => {
    mockedApi.myNotifications.mockResolvedValue({
      notifications: [buildNotification(1, false)]
    });

    await renderUserDashboard();

    expect(screen.getByTestId("operations-board-rail")).toBeInTheDocument();
    expect(screen.getByText("Mural operacional")).toBeInTheDocument();
    expect(screen.getByText("Usuario")).toBeInTheDocument();
  });

  it("reseta o filtro ao voltar da central completa para o painel", async () => {
    mockedApi.myNotifications
      .mockResolvedValueOnce({
        notifications: [buildNotification(1, false)]
      })
      .mockResolvedValueOnce({
        notifications: [buildNotification(1, false)]
      })
      .mockResolvedValueOnce({
        notifications: [buildNotification(1, false), buildNotification(2, false)]
      });

    const view = await renderUserDashboard({
      isNotificationsPage: true
    });

    await waitFor(() => expect(mockedApi.myNotifications).toHaveBeenCalledWith(""));

    fireEvent.click(screen.getByRole("button", { name: "Nao lidas" }));

    await waitFor(() => expect(mockedApi.myNotifications).toHaveBeenCalledWith("?status=unread"));

    view.rerender(
      <UserDashboard
        user={{ id: 2, login: "user", name: "Usuario", role: "user" }}
        isNotificationsPage={false}
        onOpenAllNotifications={vi.fn()}
        onBackToDashboard={vi.fn()}
        onError={vi.fn()}
        onToast={vi.fn()}
        soundPrefs={mockSoundPrefs}
      />
    );

    await waitFor(() => expect(mockedApi.myNotifications).toHaveBeenLastCalledWith(""));
  });
});
