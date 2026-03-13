import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserDashboard } from "./UserDashboard";
import { api } from "../lib/api";

vi.mock("../lib/socket", () => ({
  connectSocket: () => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn()
  })
}));

vi.mock("../lib/api", () => ({
  api: {
    myNotifications: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    respondNotification: vi.fn()
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

const buildNotification = (id: number, isVisualized: boolean) => ({
  id,
  title: `Notificacao ${id}`,
  message: `Mensagem ${id}`,
  priority: "normal" as const,
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra somente 10 itens no dropdown e CTA para pagina completa", async () => {
    mockedApi.myNotifications.mockResolvedValue({
      notifications: Array.from({ length: 12 }).map((_, index) => buildNotification(index + 1, index > 2))
    });

    const onOpenAllNotifications = vi.fn();

    render(
      <UserDashboard
        user={{ id: 2, login: "user", name: "Usuario", role: "user" }}
        isNotificationsPage={false}
        onOpenAllNotifications={onOpenAllNotifications}
        onBackToDashboard={vi.fn()}
        onError={vi.fn()}
        onToast={vi.fn()}
      />
    );

    await waitFor(() => expect(mockedApi.myNotifications).toHaveBeenCalled());

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

    render(
      <UserDashboard
        user={{ id: 2, login: "user", name: "Usuario", role: "user" }}
        isNotificationsPage
        onOpenAllNotifications={vi.fn()}
        onBackToDashboard={vi.fn()}
        onError={vi.fn()}
        onToast={vi.fn()}
      />
    );

    await waitFor(() => expect(mockedApi.myNotifications).toHaveBeenCalled());
    expect(screen.getByTestId("unread-counter")).toHaveTextContent("Nao lidas: 1");

    fireEvent.click(screen.getByTestId("mark-all-read-btn"));

    await waitFor(() => expect(mockedApi.markAllRead).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("unread-counter")).toHaveTextContent("Nao lidas: 0");
  });
});
