import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNotificationSocket } from "./useNotificationSocket";
import { subscribeNotificationEvents } from "../lib/notificationEvents";
import { playSystemAlert } from "../lib/reminderAudio";

const socketHandlers = new Map<string, (payload?: unknown) => void>();
const { socketEmit, mockedReleaseSocket } = vi.hoisted(() => ({
  socketEmit: vi.fn(),
  mockedReleaseSocket: vi.fn()
}));

vi.mock("../lib/socket", () => ({
  acquireSocket: () => ({
    on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
      socketHandlers.set(event, handler);
    }),
    off: vi.fn((event: string) => {
      socketHandlers.delete(event);
    }),
    emit: socketEmit,
    disconnect: vi.fn()
  }),
  releaseSocket: mockedReleaseSocket
}));

vi.mock("../lib/reminderAudio", () => ({
  playSystemAlert: vi.fn(async () => true)
}));

const TestHarness = ({
  enabled,
  onError,
  onToast
}: {
  enabled: boolean;
  onError: (message: string) => void;
  onToast: (message: string) => void;
}) => {
  useNotificationSocket({ enabled, onError, onToast });
  return null;
};

describe("useNotificationSocket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socketHandlers.clear();
  });

  it("distribui notificacao nova globalmente e toca alerta", async () => {
    const onToast = vi.fn();
    const onError = vi.fn();
    const receivedPayloads: unknown[] = [];
    const unsubscribe = subscribeNotificationEvents({
      onNew: (payload) => {
        receivedPayloads.push(payload);
      },
      onReminder: () => undefined
    });

    render(<TestHarness enabled onError={onError} onToast={onToast} />);

    await waitFor(() => expect(socketHandlers.has("notification:new")).toBe(true));

    socketHandlers.get("notification:new")?.({
      id: 11,
      title: "Teste",
      message: "Mensagem",
      priority: "critical",
      createdAt: new Date().toISOString(),
      sender: {
        id: 1,
        name: "Admin",
        login: "admin"
      }
    });

    await waitFor(() => expect(receivedPayloads).toHaveLength(1));
    expect(onToast).toHaveBeenCalledWith("Nova notificacao: Teste");
    expect(playSystemAlert).toHaveBeenCalledWith(11, "critical");
    expect(onError).not.toHaveBeenCalled();

    unsubscribe();
  });
});
