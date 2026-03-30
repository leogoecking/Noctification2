import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserDashboard } from "./UserDashboard";
import { api } from "../lib/api";
import type { NotificationItem, OperationsBoardMessageItem } from "../types";

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
    myReminders: vi.fn(),
    myReminderOccurrences: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    respondNotification: vi.fn(),
    myOperationsBoard: vi.fn(),
    myOperationsBoardMessage: vi.fn(),
    createMyOperationsBoardMessage: vi.fn(),
    updateMyOperationsBoardMessage: vi.fn(),
    createMyOperationsBoardComment: vi.fn()
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

const buildBoardMessage = (overrides: Partial<OperationsBoardMessageItem> = {}): OperationsBoardMessageItem => ({
  id: 1,
  title: "Turno da madrugada",
  body: "Monitorar o enlace principal",
  status: "active",
  authorUserId: 2,
  authorName: "Usuario",
  authorLogin: "user",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  resolvedAt: null,
  ...overrides
});

describe("UserDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.myOperationsBoard.mockResolvedValue({
      messages: [buildBoardMessage()]
    });
    mockedApi.myReminders.mockResolvedValue({
      reminders: [
        {
          id: 1,
          userId: 2,
          title: "Checklist de turno",
          description: "Revisar painel principal",
          startDate: "2026-03-29",
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
    mockedApi.myReminderOccurrences.mockResolvedValue({
      occurrences: [
        {
          id: 1,
          reminderId: 1,
          userId: 2,
          scheduledFor: new Date().toISOString(),
          triggeredAt: null,
          status: "pending",
          retryCount: 0,
          nextRetryAt: null,
          completedAt: null,
          expiredAt: null,
          triggerSource: "scheduler",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          title: "Checklist de turno",
          description: "Revisar painel principal"
        }
      ]
    });
    mockedApi.myOperationsBoardMessage.mockResolvedValue({
      message: buildBoardMessage(),
      timeline: [
        {
          id: 10,
          messageId: 1,
          actorUserId: 2,
          actorName: "Usuario",
          actorLogin: "user",
          eventType: "created",
          body: null,
          metadata: null,
          createdAt: new Date().toISOString()
        }
      ]
    });
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
        onOpenTasks={vi.fn()}
        onOpenReminders={vi.fn()}
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
        onOpenTasks={vi.fn()}
        onOpenReminders={vi.fn()}
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

  it("mostra o identificador da tarefa vinculada no detalhe da notificacao", async () => {
    mockedApi.myNotifications.mockResolvedValue({
      notifications: [
        {
          ...buildNotification(7, false),
          sourceTaskId: 22
        }
      ]
    });

    render(
      <UserDashboard
        user={{ id: 2, login: "user", name: "Usuario", role: "user" }}
        isNotificationsPage
        onOpenAllNotifications={vi.fn()}
        onBackToDashboard={vi.fn()}
        onOpenTasks={vi.fn()}
        onOpenReminders={vi.fn()}
        onError={vi.fn()}
        onToast={vi.fn()}
      />
    );

    await waitFor(() => expect(mockedApi.myNotifications).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /Notificacao 7/i }));

    expect(screen.getByText("Tarefa vinculada #22")).toBeInTheDocument();
  });

  it("carrega o mural operacional e abre o detalhe do recado", async () => {
    mockedApi.myNotifications.mockResolvedValue({
      notifications: [buildNotification(1, false)]
    });

    render(
      <UserDashboard
        user={{ id: 2, login: "user", name: "Usuario", role: "user" }}
        isNotificationsPage={false}
        onOpenAllNotifications={vi.fn()}
        onBackToDashboard={vi.fn()}
        onOpenTasks={vi.fn()}
        onOpenReminders={vi.fn()}
        onError={vi.fn()}
        onToast={vi.fn()}
      />
    );

    await waitFor(() => expect(mockedApi.myOperationsBoard).toHaveBeenCalledWith("?status=active&limit=6"));
    expect(mockedApi.myReminders).toHaveBeenCalledWith("?active=true");
    expect(mockedApi.myReminderOccurrences).toHaveBeenCalledWith("?status=pending");
    expect(screen.getByTestId("operations-board-rail")).toBeInTheDocument();
    expect(screen.getByText("Turno da madrugada")).toBeInTheDocument();
    expect(screen.getByText("Agenda e lembretes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Turno da madrugada/i }));

    await waitFor(() => expect(mockedApi.myOperationsBoardMessage).toHaveBeenCalledWith(1));
    expect(await screen.findByText("Comentario rapido")).toBeInTheDocument();
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

    const view = render(
      <UserDashboard
        user={{ id: 2, login: "user", name: "Usuario", role: "user" }}
        isNotificationsPage
        onOpenAllNotifications={vi.fn()}
        onBackToDashboard={vi.fn()}
        onOpenTasks={vi.fn()}
        onOpenReminders={vi.fn()}
        onError={vi.fn()}
        onToast={vi.fn()}
      />
    );

    await waitFor(() => expect(mockedApi.myNotifications).toHaveBeenCalledWith(""));

    fireEvent.click(screen.getByRole("button", { name: "Nao lidas" }));

    await waitFor(() => expect(mockedApi.myNotifications).toHaveBeenCalledWith("?status=unread"));

    view.rerender(
      <UserDashboard
        user={{ id: 2, login: "user", name: "Usuario", role: "user" }}
        isNotificationsPage={false}
        onOpenAllNotifications={vi.fn()}
        onBackToDashboard={vi.fn()}
        onOpenTasks={vi.fn()}
        onOpenReminders={vi.fn()}
        onError={vi.fn()}
        onToast={vi.fn()}
      />
    );

    await waitFor(() => expect(mockedApi.myNotifications).toHaveBeenLastCalledWith(""));
  });
});
