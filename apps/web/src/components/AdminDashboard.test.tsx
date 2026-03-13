import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboard } from "./AdminDashboard";
import { api } from "../lib/api";

vi.mock("../lib/socket", () => ({
  connectSocket: () => ({
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn()
  })
}));

vi.mock("../lib/api", () => ({
  api: {
    adminUsers: vi.fn(),
    adminOnlineUsers: vi.fn(),
    adminAudit: vi.fn(),
    adminNotifications: vi.fn(),
    sendNotification: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    toggleUserStatus: vi.fn()
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

describe("AdminDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.adminUsers.mockResolvedValue({
      users: [
        {
          id: 1,
          name: "Admin",
          login: "admin",
          department: "NOC",
          jobTitle: "Coordenador",
          role: "admin",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 2,
          name: "Operador",
          login: "operador",
          department: "Suporte",
          jobTitle: "Analista",
          role: "user",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    });
    mockedApi.adminNotifications.mockResolvedValue({
      notifications: [],
      pagination: {
        page: 1,
        limit: 100,
        total: 0,
        totalPages: 1
      }
    });
    mockedApi.adminOnlineUsers.mockResolvedValue({
      users: [
        {
          id: 2,
          name: "Operador",
          login: "operador",
          role: "user",
          department: "Suporte",
          jobTitle: "Analista"
        }
      ],
      count: 1
    });
    mockedApi.adminAudit.mockResolvedValue({
      events: [
        {
          id: 10,
          event_type: "admin.notification.send",
          target_type: "notification",
          target_id: 55,
          created_at: new Date().toISOString(),
          actor: {
            id: 1,
            name: "Admin",
            login: "admin"
          },
          metadata: {
            recipientCount: 1,
            priority: "high"
          }
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      }
    });
  });

  it("renderiza usuarios online e auditoria no dashboard", async () => {
    render(<AdminDashboard onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminOnlineUsers).toHaveBeenCalled());
    await waitFor(() => expect(mockedApi.adminAudit).toHaveBeenCalled());

    expect(screen.getByText("Usuarios online agora")).toBeInTheDocument();
    expect(screen.getByText("Operador")).toBeInTheDocument();
    expect(screen.getByText("Auditoria recente")).toBeInTheDocument();
    expect(screen.getByText("admin.notification.send")).toBeInTheDocument();
  });

  it("abre a aba de auditoria com os eventos carregados", async () => {
    render(<AdminDashboard onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminAudit).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Auditoria" }));

    expect(screen.getByText("Rastreamento de acessos, leitura e operacao administrativa")).toBeInTheDocument();
    expect(screen.getByText("Metadados: recipientCount: 1 | priority: high")).toBeInTheDocument();
  });

  it("aplica filtros de auditoria ao consultar a API", async () => {
    render(<AdminDashboard onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminAudit).toHaveBeenCalled());
    const initialAuditCalls = mockedApi.adminAudit.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Auditoria" }));

    fireEvent.change(screen.getByPlaceholderText("Ex: auth.login"), {
      target: { value: "auth.login" }
    });
    fireEvent.change(screen.getByLabelText("De"), {
      target: { value: "2026-03-10" }
    });
    fireEvent.change(screen.getByLabelText("Ate"), {
      target: { value: "2026-03-13" }
    });
    fireEvent.change(screen.getByLabelText("Limite"), {
      target: { value: "50" }
    });

    expect(mockedApi.adminAudit).toHaveBeenCalledTimes(initialAuditCalls);

    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    await waitFor(() => expect(mockedApi.adminAudit.mock.calls.length).toBeGreaterThan(initialAuditCalls));

    const lastCall = mockedApi.adminAudit.mock.calls.at(-1)?.[0];
    expect(lastCall).toContain("?limit=50");
    expect(lastCall).toContain("event_type=auth.login");
    expect(lastCall).toContain("from=");
    expect(lastCall).toContain("to=");
  });

  it("navega para a proxima pagina da auditoria", async () => {
    mockedApi.adminAudit
      .mockResolvedValueOnce({
        events: [
          {
            id: 10,
            event_type: "admin.notification.send",
            target_type: "notification",
            target_id: 55,
            created_at: new Date().toISOString(),
            actor: { id: 1, name: "Admin", login: "admin" },
            metadata: null
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 30,
          totalPages: 2
        }
      })
      .mockResolvedValueOnce({
        events: [],
        pagination: {
          page: 2,
          limit: 20,
          total: 30,
          totalPages: 2
        }
      });

    render(<AdminDashboard onError={vi.fn()} onToast={vi.fn()} />);
    await waitFor(() => expect(mockedApi.adminAudit).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Auditoria" }));
    fireEvent.click(screen.getByRole("button", { name: "Proxima pagina" }));

    await waitFor(() => {
      const lastCall = mockedApi.adminAudit.mock.calls.at(-1)?.[0];
      expect(lastCall).toContain("page=2");
    });
  });

  it("mantem notificacao em andamento fora da lista de concluidas", async () => {
    mockedApi.adminNotifications
      .mockResolvedValueOnce({
        notifications: [
          {
            id: 99,
            title: "Falha no enlace",
            message: "Investigar evento",
            priority: "high",
            recipient_mode: "users",
            created_at: new Date().toISOString(),
            sender: {
              id: 1,
              name: "Admin",
              login: "admin"
            },
            recipients: [
              {
                userId: 2,
                name: "Operador",
                login: "operador",
                visualizedAt: new Date().toISOString(),
                deliveredAt: new Date().toISOString(),
                operationalStatus: "em_andamento",
                responseAt: new Date().toISOString(),
                responseMessage: "Analisando"
              }
            ],
            stats: {
              total: 1,
              read: 1,
              unread: 0,
              responded: 1,
              inProgress: 1,
              resolved: 0,
              operationalPending: 1,
              operationalCompleted: 0
            }
          }
        ],
        pagination: {
          page: 1,
          limit: 200,
          total: 1,
          totalPages: 1
        }
      })
      .mockResolvedValueOnce({
        notifications: [
          {
            id: 99,
            title: "Falha no enlace",
            message: "Investigar evento",
            priority: "high",
            recipient_mode: "users",
            created_at: new Date().toISOString(),
            sender: {
              id: 1,
              name: "Admin",
              login: "admin"
            },
            recipients: [
              {
                userId: 2,
                name: "Operador",
                login: "operador",
                visualizedAt: new Date().toISOString(),
                deliveredAt: new Date().toISOString(),
                operationalStatus: "em_andamento",
                responseAt: new Date().toISOString(),
                responseMessage: "Analisando"
              }
            ],
            stats: {
              total: 1,
              read: 1,
              unread: 0,
              responded: 1,
              inProgress: 1,
              resolved: 0,
              operationalPending: 1,
              operationalCompleted: 0
            }
          }
        ],
        pagination: {
          page: 1,
          limit: 100,
          total: 1,
          totalPages: 1
        }
      });

    render(<AdminDashboard onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminNotifications).toHaveBeenCalled());

    expect(screen.getAllByText("Em andamento: 1").length).toBeGreaterThan(0);
    expect(screen.getByText("Falha no enlace")).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma notificacao operacionalmente concluida.")).toBeInTheDocument();
  });

  it("aplica filtros no historico de notificacoes ao consultar a API", async () => {
    render(<AdminDashboard onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminNotifications).toHaveBeenCalled());
    const initialNotificationCalls = mockedApi.adminNotifications.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Historico notificacoes" }));

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "unread" }
    });
    fireEvent.change(screen.getByLabelText("Prioridade"), {
      target: { value: "critical" }
    });
    fireEvent.change(screen.getByLabelText("Usuario"), {
      target: { value: "2" }
    });
    fireEvent.change(screen.getByLabelText("De"), {
      target: { value: "2026-03-10" }
    });
    fireEvent.change(screen.getByLabelText("Ate"), {
      target: { value: "2026-03-13" }
    });

    const historySection = screen.getByText("Historico de notificacoes").closest("article");
    expect(historySection).not.toBeNull();

    fireEvent.change(within(historySection as HTMLElement).getByLabelText("Limite"), {
      target: { value: "50" }
    });

    expect(mockedApi.adminNotifications).toHaveBeenCalledTimes(initialNotificationCalls);

    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    await waitFor(() =>
      expect(mockedApi.adminNotifications.mock.calls.length).toBeGreaterThan(initialNotificationCalls)
    );

    const lastCall = mockedApi.adminNotifications.mock.calls.at(-1)?.[0];
    expect(lastCall).toContain("limit=50");
    expect(lastCall).toContain("status=unread");
    expect(lastCall).toContain("priority=critical");
    expect(lastCall).toContain("user_id=2");
    expect(lastCall).toContain("from=");
    expect(lastCall).toContain("to=");
  });
});
