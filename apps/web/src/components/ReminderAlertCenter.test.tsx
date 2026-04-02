import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReminderAlertCenter } from "./ReminderAlertCenter";
import { api } from "../lib/api";
import { playReminderAlert } from "../lib/reminderAudio";
const socketHandlers = new Map<string, (payload: unknown) => void>();
const notificationInstances: FakeNotification[] = [];

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

vi.mock("../lib/socket", () => ({
  acquireSocket: () => ({
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      socketHandlers.set(event, handler);
    }),
    off: vi.fn((event: string) => {
      socketHandlers.delete(event);
    }),
    disconnect: vi.fn()
  }),
  releaseSocket: vi.fn(),
}));

vi.mock("../lib/reminderAudio", () => ({
  playReminderAlert: vi.fn(async () => true)
}));

vi.mock("../lib/api", () => ({
  api: {
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

describe("ReminderAlertCenter", () => {
  const originalNotification = window.Notification;
  const originalVisibilityState = Object.getOwnPropertyDescriptor(document, "visibilityState");
  const originalFocus = window.focus;

  beforeEach(() => {
    vi.clearAllMocks();
    socketHandlers.clear();
    notificationInstances.length = 0;
    mockedPlayReminderAlert.mockResolvedValue(true);
    mockedApi.completeReminderOccurrence.mockResolvedValue({
      ok: true,
      completedAt: new Date().toISOString()
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

  it("mostra alerta e toca audio fora da pagina de lembretes", async () => {
    const onToast = vi.fn();

    render(
      <ReminderAlertCenter
        isVisible
        onError={vi.fn()}
        onToast={onToast}
        onOpenReminders={vi.fn()}
      />
    );

    await waitFor(() => expect(socketHandlers.has("reminder:due")).toBe(true));

    await act(async () => {
      socketHandlers.get("reminder:due")?.({
        occurrenceId: 77,
        reminderId: 4,
        userId: 2,
        title: "Tomar agua",
        description: "Beber 500ml",
        scheduledFor: new Date().toISOString(),
        retryCount: 0
      });
    });

    expect(mockedPlayReminderAlert).toHaveBeenCalledWith(77, "default");
    expect(screen.getByText("Lembrete pendente agora")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir lembretes" })).toBeInTheDocument();
    expect(onToast).not.toHaveBeenCalled();
  });

  it("fecha apenas visualmente o pop-up sem concluir a ocorrencia", async () => {
    render(
      <ReminderAlertCenter
        isVisible
        onError={vi.fn()}
        onToast={vi.fn()}
        onOpenReminders={vi.fn()}
      />
    );

    await waitFor(() => expect(socketHandlers.has("reminder:due")).toBe(true));

    await act(async () => {
      socketHandlers.get("reminder:due")?.({
        occurrenceId: 90,
        reminderId: 4,
        userId: 2,
        title: "Tomar agua",
        description: "Beber 500ml",
        scheduledFor: new Date().toISOString(),
        retryCount: 0
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Fechar pop-up" }));

    expect(screen.queryByText("Lembrete pendente agora")).not.toBeInTheDocument();
    expect(mockedApi.completeReminderOccurrence).not.toHaveBeenCalled();
  });

  it("atualiza o mesmo pop-up por occurrenceId em vez de empilhar retries identicos", async () => {
    render(
      <ReminderAlertCenter
        isVisible
        onError={vi.fn()}
        onToast={vi.fn()}
        onOpenReminders={vi.fn()}
      />
    );

    await waitFor(() => expect(socketHandlers.has("reminder:due")).toBe(true));

    await act(async () => {
      socketHandlers.get("reminder:due")?.({
        occurrenceId: 91,
        reminderId: 4,
        userId: 2,
        title: "Alongar",
        description: "",
        scheduledFor: new Date().toISOString(),
        retryCount: 0
      });
    });

    await act(async () => {
      socketHandlers.get("reminder:due")?.({
        occurrenceId: 91,
        reminderId: 4,
        userId: 2,
        title: "Alongar",
        description: "",
        scheduledFor: new Date().toISOString(),
        retryCount: 1
      });
    });

    expect(screen.getAllByText("Lembrete pendente agora")).toHaveLength(1);
    expect(screen.getByText(/Tentativas:\s*1/)).toBeInTheDocument();
  });

  it("reabre o pop-up da mesma ocorrencia quando chega retry depois de fechamento visual", async () => {
    render(
      <ReminderAlertCenter
        isVisible
        onError={vi.fn()}
        onToast={vi.fn()}
        onOpenReminders={vi.fn()}
      />
    );

    await waitFor(() => expect(socketHandlers.has("reminder:due")).toBe(true));

    await act(async () => {
      socketHandlers.get("reminder:due")?.({
        occurrenceId: 92,
        reminderId: 4,
        userId: 2,
        title: "Alongar",
        description: "",
        scheduledFor: new Date().toISOString(),
        retryCount: 0
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Fechar pop-up" }));
    expect(screen.queryByText("Lembrete pendente agora")).not.toBeInTheDocument();

    await act(async () => {
      socketHandlers.get("reminder:due")?.({
        occurrenceId: 92,
        reminderId: 4,
        userId: 2,
        title: "Alongar",
        description: "",
        scheduledFor: new Date().toISOString(),
        retryCount: 1
      });
    });

    expect(screen.getByText("Lembrete pendente agora")).toBeInTheDocument();
    expect(screen.getByText(/Tentativas:\s*1/)).toBeInTheDocument();
  });

  it("cria notificacao nativa quando a aba esta em background e a permissao foi concedida", async () => {
    FakeNotification.permission = "granted";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden"
    });
    const onOpenReminders = vi.fn();

    render(
      <ReminderAlertCenter
        isVisible
        onError={vi.fn()}
        onToast={vi.fn()}
        onOpenReminders={onOpenReminders}
      />
    );

    await waitFor(() => expect(socketHandlers.has("reminder:due")).toBe(true));

    await act(async () => {
      socketHandlers.get("reminder:due")?.({
        occurrenceId: 81,
        reminderId: 4,
        userId: 2,
        title: "Tomar agua",
        description: "Beber 500ml",
        scheduledFor: new Date().toISOString(),
        retryCount: 0
      });
    });

    expect(notificationInstances).toHaveLength(1);
    expect(notificationInstances[0].tag).toBe("reminder-occurrence-81");

    notificationInstances[0].onclick?.();
    expect(window.focus).toHaveBeenCalled();
    expect(onOpenReminders).toHaveBeenCalled();
  });

  it("solicita permissao de notificacao via acao do usuario", async () => {
    FakeNotification.permission = "default";
    FakeNotification.requestPermission.mockResolvedValue("granted");

    render(
      <ReminderAlertCenter
        isVisible
        onError={vi.fn()}
        onToast={vi.fn()}
        onOpenReminders={vi.fn()}
      />
    );

    await waitFor(() => expect(socketHandlers.has("reminder:due")).toBe(true));

    await act(async () => {
      socketHandlers.get("reminder:due")?.({
        occurrenceId: 82,
        reminderId: 4,
        userId: 2,
        title: "Alongar",
        description: "",
        scheduledFor: new Date().toISOString(),
        retryCount: 0
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Ativar notificacoes do navegador" }));

    await waitFor(() => expect(FakeNotification.requestPermission).toHaveBeenCalled());
  });

  it("nao oferece ativacao quando a permissao do navegador foi negada", async () => {
    FakeNotification.permission = "denied";

    render(
      <ReminderAlertCenter
        isVisible
        onError={vi.fn()}
        onToast={vi.fn()}
        onOpenReminders={vi.fn()}
      />
    );

    await waitFor(() => expect(socketHandlers.has("reminder:due")).toBe(true));

    await act(async () => {
      socketHandlers.get("reminder:due")?.({
        occurrenceId: 83,
        reminderId: 4,
        userId: 2,
        title: "Alongar",
        description: "",
        scheduledFor: new Date().toISOString(),
        retryCount: 0
      });
    });

    expect(screen.queryByRole("button", { name: "Ativar notificacoes do navegador" })).not.toBeInTheDocument();
    expect(
      screen.getByText("A permissao de notificacoes do navegador esta bloqueada. O alerta visual continua ativo.")
    ).toBeInTheDocument();
  });

  it("permite tentar o som novamente quando o navegador bloqueia autoplay", async () => {
    const onToast = vi.fn();
    const onError = vi.fn();

    mockedPlayReminderAlert.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    render(
      <ReminderAlertCenter
        isVisible
        onError={onError}
        onToast={onToast}
        onOpenReminders={vi.fn()}
      />
    );

    await waitFor(() => expect(socketHandlers.has("reminder:due")).toBe(true));

    await act(async () => {
      socketHandlers.get("reminder:due")?.({
        occurrenceId: 78,
        reminderId: 4,
        userId: 2,
        title: "Alongar",
        description: "",
        scheduledFor: new Date().toISOString(),
        retryCount: 0
      });
    });

    expect(
      screen.getByText("O navegador bloqueou o som. O alerta visual continua ativo.")
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Tentar som novamente" }));
    });

    expect(mockedPlayReminderAlert).toHaveBeenLastCalledWith(78, "default");
    await waitFor(() => expect(onToast).toHaveBeenCalledWith("Som do lembrete reproduzido"));
    expect(onError).not.toHaveBeenCalledWith("O navegador ainda bloqueou o som do lembrete");
  });

  it("usa o perfil de retry quando o lembrete retorna apos 10 minutos", async () => {
    render(
      <ReminderAlertCenter
        isVisible
        onError={vi.fn()}
        onToast={vi.fn()}
        onOpenReminders={vi.fn()}
      />
    );

    await waitFor(() => expect(socketHandlers.has("reminder:due")).toBe(true));

    await act(async () => {
      socketHandlers.get("reminder:due")?.({
        occurrenceId: 79,
        reminderId: 4,
        userId: 2,
        title: "Alongar",
        description: "",
        scheduledFor: new Date().toISOString(),
        retryCount: 1
      });
    });

    expect(mockedPlayReminderAlert).toHaveBeenCalledWith(79, "retry");
  });

  it("fecha a notificacao nativa quando a ocorrencia deixa de estar pendente", async () => {
    FakeNotification.permission = "granted";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden"
    });

    render(
      <ReminderAlertCenter
        isVisible
        onError={vi.fn()}
        onToast={vi.fn()}
        onOpenReminders={vi.fn()}
      />
    );

    await waitFor(() => expect(socketHandlers.has("reminder:due")).toBe(true));

    await act(async () => {
      socketHandlers.get("reminder:due")?.({
        occurrenceId: 83,
        reminderId: 4,
        userId: 2,
        title: "Tomar agua",
        description: "Beber 500ml",
        scheduledFor: new Date().toISOString(),
        retryCount: 0
      });
    });

    const closeSpy = vi.spyOn(notificationInstances[0], "close");

    await act(async () => {
      socketHandlers.get("reminder:updated")?.({
        occurrenceId: 83,
        reminderId: 4,
        userId: 2,
        status: "completed",
        retryCount: 0,
        completedAt: new Date().toISOString()
      });
    });

    expect(closeSpy).toHaveBeenCalled();
  });
});
