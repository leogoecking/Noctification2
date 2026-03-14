import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReminderAlertCenter } from "./ReminderAlertCenter";
import { api } from "../lib/api";
import { playReminderAlert } from "../lib/reminderAudio";

const socketHandlers = new Map<string, (payload: unknown) => void>();

vi.mock("../lib/socket", () => ({
  connectSocket: () => ({
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      socketHandlers.set(event, handler);
    }),
    off: vi.fn((event: string) => {
      socketHandlers.delete(event);
    }),
    disconnect: vi.fn()
  })
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
  beforeEach(() => {
    vi.clearAllMocks();
    socketHandlers.clear();
    mockedPlayReminderAlert.mockResolvedValue(true);
    mockedApi.completeReminderOccurrence.mockResolvedValue({
      ok: true,
      completedAt: new Date().toISOString()
    });
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
    expect(onToast).toHaveBeenCalledWith("Lembrete disparado: Tomar agua");
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

    expect(mockedPlayReminderAlert).toHaveBeenLastCalledWith(78);
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
});
