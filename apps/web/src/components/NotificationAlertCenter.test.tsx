import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationAlertCenter } from "./NotificationAlertCenter";
import { dispatchNotificationUpdated } from "../lib/notificationEvents";
import { playSystemAlert } from "../lib/reminderAudio";
import { api } from "../lib/api";

class FakeNotification {
  static permission: NotificationPermission = "default";
  static requestPermission = vi.fn(async () => FakeNotification.permission);
  title: string;
  body: string;
  tag?: string;
  requireInteraction?: boolean;
  onclick: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(title: string, options?: NotificationOptions) {
    this.title = title;
    this.body = options?.body ?? "";
    this.tag = options?.tag;
    this.requireInteraction = options?.requireInteraction;
    notificationInstances.push(this);
  }

  close() {
    this.onclose?.();
  }
}

const notificationInstances: FakeNotification[] = [];

vi.mock("../lib/reminderAudio", () => ({
  playSystemAlert: vi.fn(async () => true)
}));

vi.mock("../lib/api", () => ({
  api: {
    markRead: vi.fn()
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
}));

const mockedPlaySystemAlert = vi.mocked(playSystemAlert);
const mockedApi = vi.mocked(api);

describe("NotificationAlertCenter", () => {
  const originalNotification = window.Notification;
  const originalVisibilityState = Object.getOwnPropertyDescriptor(document, "visibilityState");
  const originalFocus = window.focus;

  beforeEach(() => {
    vi.clearAllMocks();
    notificationInstances.length = 0;
    mockedPlaySystemAlert.mockResolvedValue(true);
    mockedApi.markRead.mockResolvedValue({
      notificationId: 11,
      visualizedAt: new Date().toISOString(),
      operationalStatus: "visualizada",
      responseStatus: null,
      isVisualized: true,
      isOperationallyPending: false
    });
    FakeNotification.permission = "default";
    FakeNotification.requestPermission.mockImplementation(async () => FakeNotification.permission);
    Object.defineProperty(window, "Notification", {
      configurable: true,
      writable: true,
      value: FakeNotification
    });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible"
    });
    window.focus = vi.fn();
  });

  afterEach(() => {
    Object.defineProperty(window, "Notification", {
      configurable: true,
      writable: true,
      value: originalNotification
    });
    if (originalVisibilityState) {
      Object.defineProperty(document, "visibilityState", originalVisibilityState);
    }
    window.focus = originalFocus;
  });

  it("mostra pop-up persistente para notificacao nova", async () => {
    const onToast = vi.fn();
    render(
      <NotificationAlertCenter
        isVisible
        onError={vi.fn()}
        onToast={onToast}
        onOpenNotifications={vi.fn()}
      />
    );

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent("noctification:notification:new", {
          detail: {
            id: 11,
            title: "Nova tarefa",
            message: "Verifique o painel",
            priority: "high",
            createdAt: new Date().toISOString(),
            sender: { id: 1, name: "Admin", login: "admin" }
          }
        })
      );
    });

    expect(screen.getByText("Nova notificacao")).toBeInTheDocument();
    expect(screen.getByText("Nova tarefa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir notificacoes" })).toBeInTheDocument();
    expect(mockedPlaySystemAlert).toHaveBeenCalledWith(11, "default");
    expect(onToast).toHaveBeenCalledWith("Nova notificacao: Nova tarefa");
  });

  it("atualiza o mesmo pop-up em retries sem empilhar duplicatas", async () => {
    render(
      <NotificationAlertCenter
        isVisible
        onError={vi.fn()}
        onToast={vi.fn()}
        onOpenNotifications={vi.fn()}
      />
    );

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent("noctification:notification:new", {
          detail: {
            id: 12,
            title: "Checklist",
            message: "",
            priority: "normal",
            createdAt: new Date().toISOString(),
            sender: { id: 1, name: "Admin", login: "admin" }
          }
        })
      );
    });

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent("noctification:notification:reminder", {
          detail: {
            id: 12,
            title: "Checklist",
            message: "",
            priority: "normal",
            createdAt: new Date().toISOString(),
            reminderCount: 2,
            sender: { id: 1, name: "Admin", login: "admin" }
          }
        })
      );
    });

    expect(screen.getAllByText("Notificacao pendente")).toHaveLength(1);
    expect(screen.getByText(/Reenvios:\s*2/)).toBeInTheDocument();
  });

  it("cria notificacao nativa quando a aba esta em background", async () => {
    FakeNotification.permission = "granted";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden"
    });
    const onOpenNotifications = vi.fn();

    render(
      <NotificationAlertCenter
        isVisible
        onError={vi.fn()}
        onToast={vi.fn()}
        onOpenNotifications={onOpenNotifications}
      />
    );

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent("noctification:notification:new", {
          detail: {
            id: 13,
            title: "Nova tarefa",
            message: "Verifique o painel",
            priority: "critical",
            createdAt: new Date().toISOString(),
            sender: { id: 1, name: "Admin", login: "admin" }
          }
        })
      );
    });

    expect(notificationInstances).toHaveLength(1);
    expect(notificationInstances[0].tag).toBe("notification-13");

    notificationInstances[0].onclick?.();
    expect(window.focus).toHaveBeenCalled();
    expect(onOpenNotifications).toHaveBeenCalled();
  });

  it("fecha o pop-up quando a notificacao e marcada como visualizada", async () => {
    render(
      <NotificationAlertCenter
        isVisible
        onError={vi.fn()}
        onToast={vi.fn()}
        onOpenNotifications={vi.fn()}
      />
    );

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent("noctification:notification:new", {
          detail: {
            id: 14,
            title: "Nova tarefa",
            message: "Verifique o painel",
            priority: "normal",
            createdAt: new Date().toISOString(),
            sender: { id: 1, name: "Admin", login: "admin" }
          }
        })
      );
    });

    act(() => {
      dispatchNotificationUpdated({
        id: 14,
        visualizedAt: new Date().toISOString(),
        operationalStatus: "visualizada",
        isVisualized: true
      });
    });

    await waitFor(() => {
      expect(screen.queryByText("Nova tarefa")).not.toBeInTheDocument();
    });
  });

  it("permite marcar como visualizada com confirmacao no backend", async () => {
    const onToast = vi.fn();
    render(
      <NotificationAlertCenter
        isVisible
        onError={vi.fn()}
        onToast={onToast}
        onOpenNotifications={vi.fn()}
      />
    );

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent("noctification:notification:new", {
          detail: {
            id: 15,
            title: "Nova tarefa",
            message: "Verifique o painel",
            priority: "normal",
            createdAt: new Date().toISOString(),
            sender: { id: 1, name: "Admin", login: "admin" }
          }
        })
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Marcar como visualizada" }));
    });

    expect(mockedApi.markRead).toHaveBeenCalledWith(15);
    await waitFor(() => expect(onToast).toHaveBeenCalledWith("Notificacao marcada como visualizada"));
  });
});
