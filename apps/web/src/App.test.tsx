import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { api, ApiError } from "./lib/api";

vi.mock("./lib/api", () => ({
  api: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    myNotifications: vi.fn(),
    myTasks: vi.fn(),
    myTask: vi.fn(),
    createMyTask: vi.fn(),
    updateMyTask: vi.fn(),
    completeMyTask: vi.fn(),
    cancelMyTask: vi.fn(),
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
    adminNotifications: vi.fn(),
    adminTasks: vi.fn(),
    adminTask: vi.fn(),
    createAdminTask: vi.fn(),
    updateAdminTask: vi.fn(),
    completeAdminTask: vi.fn(),
    cancelAdminTask: vi.fn(),
    myReminders: vi.fn(),
    createMyReminder: vi.fn(),
    updateMyReminder: vi.fn(),
    toggleMyReminder: vi.fn(),
    deleteMyReminder: vi.fn(),
    myReminderOccurrences: vi.fn(),
    completeReminderOccurrence: vi.fn(),
    adminReminders: vi.fn(),
    adminReminderOccurrences: vi.fn(),
    adminReminderHealth: vi.fn(),
    adminReminderLogs: vi.fn(),
    toggleAdminReminder: vi.fn()
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
    vi.stubEnv("VITE_ENABLE_APR_MODULE", "false");
    mockedApi.me.mockRejectedValue(new Error("Nao autenticado"));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renderiza tela de admin em /admin/login", async () => {
    window.history.replaceState({}, "", "/admin/login");

    render(<App />);

    await waitFor(() => expect(mockedApi.me).toHaveBeenCalled());
    expect(screen.getByText("Acesso administrativo")).toBeInTheDocument();
    const loginInput = (await screen.findByLabelText("Login")) as HTMLInputElement;
    expect(loginInput.value).toBe("admin");
  });

  it("renderiza tela de usuario em /login", async () => {
    window.history.replaceState({}, "", "/login");

    render(<App />);

    await waitFor(() => expect(mockedApi.me).toHaveBeenCalled());
    expect(screen.getByText("Acesso interno")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar conta" })).toBeInTheDocument();
  });

  it("envia expected_role ao backend e mantem usuario fora da sessao quando a rota diverge", async () => {
    window.history.replaceState({}, "", "/login");
    mockedApi.login.mockRejectedValueOnce(
      new ApiError("Use /login para acesso de usuario", 403)
    );

    render(<App />);

    await waitFor(() => expect(mockedApi.me).toHaveBeenCalledTimes(1));

    const loginInput = await screen.findByLabelText("Login");
    const passwordInput = await screen.findByLabelText("Senha");

    fireEvent.change(loginInput, { target: { value: "admin" } });
    fireEvent.change(passwordInput, { target: { value: "admin" } });
    fireEvent.submit(passwordInput.closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(mockedApi.login).toHaveBeenCalledWith("admin", "admin", "user");
    });
    expect(await screen.findByText("Use /login para acesso de usuario")).toBeInTheDocument();
    expect(mockedApi.logout).not.toHaveBeenCalled();
    expect(screen.queryByText("Console Administrativo")).toBeNull();
  });

  it("faz logout compensatorio se receber usuario com role divergente", async () => {
    const adminUser = {
      id: 1,
      login: "admin",
      name: "Administrador",
      role: "admin" as const
    };

    window.history.replaceState({}, "", "/login");
    mockedApi.login.mockResolvedValueOnce({ user: adminUser });
    mockedApi.logout.mockResolvedValueOnce(undefined);

    render(<App />);

    await waitFor(() => expect(mockedApi.me).toHaveBeenCalledTimes(1));

    const loginInput = await screen.findByLabelText("Login");
    const passwordInput = await screen.findByLabelText("Senha");

    fireEvent.change(loginInput, { target: { value: "admin" } });
    fireEvent.change(passwordInput, { target: { value: "admin" } });
    fireEvent.submit(passwordInput.closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(mockedApi.login).toHaveBeenCalledWith("admin", "admin", "user");
    });
    await waitFor(() => {
      expect(mockedApi.logout).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByText("Use /admin/login para acesso administrativo")).toBeInTheDocument();
    });
    expect(screen.queryByText("AdminDashboardMock")).toBeNull();
  });

  it("renderiza painel de tarefas em /tasks para usuario autenticado", async () => {
    window.history.replaceState({}, "", "/tasks");
    mockedApi.me.mockResolvedValueOnce({
      user: {
        id: 2,
        login: "user",
        name: "Usuario",
        role: "user"
      }
    });
    mockedApi.myTasks.mockResolvedValueOnce({
      tasks: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 1 }
    });

    render(<App />);

    await waitFor(() => expect(mockedApi.me).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockedApi.myTasks).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("heading", { level: 1, name: "Tarefas" })).toBeInTheDocument();
    expect(screen.getByText("Acompanhamento da sua fila operacional")).toBeInTheDocument();
  });

  it("redireciona admin de /apr para dashboard quando o modulo nao esta ativo", async () => {
    window.history.replaceState({}, "", "/apr");
    mockedApi.me.mockResolvedValueOnce({
      user: {
        id: 1,
        login: "admin",
        name: "Administrador",
        role: "admin"
      }
    });

    render(<App />);

    await waitFor(() => expect(mockedApi.me).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Dashboard operacional")).toBeInTheDocument();
  });
});
