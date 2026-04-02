import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNotificationSocket } from "./useNotificationSocket";
import { subscribeNotificationEvents } from "../lib/notificationEvents";

const socketHandlers = new Map<string, (payload?: unknown) => void>();
const { socketEmit, mockedReleaseSocket, mockSocketState } = vi.hoisted(() => ({
  socketEmit: vi.fn(),
  mockedReleaseSocket: vi.fn(),
  mockSocketState: {
    connected: false
  }
}));

vi.mock("../lib/socket", () => ({
  acquireSocket: () => ({
    get connected() {
      return mockSocketState.connected;
    },
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

const TestHarness = ({
  enabled,
  onError
}: {
  enabled: boolean;
  onError: (message: string) => void;
}) => {
  useNotificationSocket({ enabled, onError });
  return null;
};

describe("useNotificationSocket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socketHandlers.clear();
    mockSocketState.connected = false;
  });

  it("distribui notificacao nova globalmente", async () => {
    const onError = vi.fn();
    const receivedPayloads: unknown[] = [];
    const unsubscribe = subscribeNotificationEvents({
      onNew: (payload) => {
        receivedPayloads.push(payload);
      },
      onReminder: () => undefined
    });

    render(<TestHarness enabled onError={onError} />);

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
    expect(onError).not.toHaveBeenCalled();

    unsubscribe();
  });

  it("se inscreve imediatamente quando o socket compartilhado ja esta conectado", async () => {
    mockSocketState.connected = true;

    render(<TestHarness enabled onError={vi.fn()} />);

    await waitFor(() => expect(socketEmit).toHaveBeenCalledWith("notifications:subscribe", expect.any(Function)));
  });
});
