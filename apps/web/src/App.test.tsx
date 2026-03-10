import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { api } from "./lib/api";

vi.mock("./lib/api", () => ({
  api: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    myNotifications: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    respondNotification: vi.fn(),
    adminUsers: vi.fn(),
    adminOnlineUsers: vi.fn(),
    adminAudit: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    toggleUserStatus: vi.fn(),
    sendNotification: vi.fn(),
    adminNotifications: vi.fn()
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

describe("App routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.me.mockRejectedValue(new Error("Nao autenticado"));
  });

  it("renderiza tela de admin em /admin/login", async () => {
    window.history.replaceState({}, "", "/admin/login");

    render(<App />);

    await waitFor(() => expect(mockedApi.me).toHaveBeenCalled());
    expect(screen.getByText("Acesso administrativo")).toBeInTheDocument();
    const loginInput = screen.getByLabelText("Login") as HTMLInputElement;
    expect(loginInput.value).toBe("admin");
  });

  it("renderiza tela de usuario em /login", async () => {
    window.history.replaceState({}, "", "/login");

    render(<App />);

    await waitFor(() => expect(mockedApi.me).toHaveBeenCalled());
    expect(screen.getByText("Acesso interno")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar conta" })).toBeInTheDocument();
  });
});
