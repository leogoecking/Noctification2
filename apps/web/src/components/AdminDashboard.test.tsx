import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboard } from "./AdminDashboard";
import { api } from "../lib/api";

const socketHandlers = new Map<string, (payload?: unknown) => void>();

vi.mock("../lib/socket", () => ({
  acquireSocket: () => ({
    on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
      socketHandlers.set(event, handler);
    }),
    off: vi.fn((event: string) => {
      socketHandlers.delete(event);
    }),
    disconnect: vi.fn()
  }),
  releaseSocket: vi.fn(),
  connectSocket: vi.fn()
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
    socketHandlers.clear();
    mockedApi.sendNotification.mockResolvedValue({ notification: undefined });
    mockedApi.createUser.mockResolvedValue({
      user: {
        id: 3,
        name: "Novo Usuario",
        login: "novo.usuario",
        department: "Campo",
        jobTitle: "Tecnico",
        role: "user",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
    mockedApi.updateUser.mockResolvedValue({
      user: {
        id: 2,
        name: "Operador Atualizado",
        login: "operador",
        department: "NOC",
        jobTitle: "Especialista",
        role: "user",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
    mockedApi.toggleUserStatus.mockResolvedValue(undefined);
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

  it("atualiza usuarios online pelo payload do socket sem recarregar auditoria e historico", async () => {
    render(<AdminDashboard onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminOnlineUsers).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(socketHandlers.has("online_users:update")).toBe(true));

    const auditCalls = mockedApi.adminAudit.mock.calls.length;
    const historyCalls = mockedApi.adminNotifications.mock.calls.length;

    await act(async () => {
      socketHandlers.get("online_users:update")?.({
        users: [
          {
            id: 3,
            name: "Plantonista",
            login: "plantao",
            role: "user",
            department: "Operacoes",
            jobTitle: "Analista"
          }
        ]
      });
    });

    await waitFor(() => expect(screen.getByText("Plantonista")).toBeInTheDocument());
    expect(mockedApi.adminAudit).toHaveBeenCalledTimes(auditCalls);
    expect(mockedApi.adminNotifications).toHaveBeenCalledTimes(historyCalls);
  });

  it("nao recarrega auditoria ao receber atualizacao de leitura", async () => {
    mockedApi.adminNotifications.mockResolvedValueOnce({
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
              visualizedAt: null,
              deliveredAt: new Date().toISOString(),
              operationalStatus: "recebida",
              responseAt: null,
              responseMessage: null
            }
          ],
          stats: {
            total: 1,
            read: 0,
            unread: 1,
            responded: 0,
            inProgress: 0,
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
    });

    render(<AdminDashboard onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(socketHandlers.has("notification:read_update")).toBe(true));
    const auditCalls = mockedApi.adminAudit.mock.calls.length;
    const historyCalls = mockedApi.adminNotifications.mock.calls.length;

    await act(async () => {
      socketHandlers.get("notification:read_update")?.({
        notificationId: 99,
        userId: 2,
        readAt: new Date().toISOString()
      });
    });

    expect(mockedApi.adminNotifications).toHaveBeenCalledTimes(historyCalls);
    expect(mockedApi.adminAudit).toHaveBeenCalledTimes(auditCalls);
  });

  it("remove do historico filtrado por nao visualizadas quando a notificacao deixa de atender o filtro", async () => {
    mockedApi.adminNotifications
      .mockResolvedValueOnce({
        notifications: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1
        }
      })
      .mockResolvedValueOnce({
        notifications: [
          {
            id: 77,
            title: "Fila critica",
            message: "Acao",
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
                visualizedAt: null,
                deliveredAt: new Date().toISOString(),
                operationalStatus: "recebida",
                responseAt: null,
                responseMessage: null
              }
            ],
            stats: {
              total: 1,
              read: 0,
              unread: 1,
              responded: 0,
              inProgress: 0,
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

    fireEvent.click(screen.getByRole("button", { name: "Historico notificacoes" }));
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "unread" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    await waitFor(() => expect(screen.getByText("Fila critica")).toBeInTheDocument());

    await act(async () => {
      socketHandlers.get("notification:read_update")?.({
        notificationId: 77,
        userId: 2,
        readAt: new Date().toISOString()
      });
    });

    await waitFor(() => expect(screen.queryByText("Fila critica")).not.toBeInTheDocument());
  });

  it("insere notificacao criada por socket sem recarregar listas", async () => {
    render(<AdminDashboard onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(socketHandlers.has("notification:created")).toBe(true));
    const historyCalls = mockedApi.adminNotifications.mock.calls.length;

    await act(async () => {
      socketHandlers.get("notification:created")?.({
        id: 321,
        title: "Nova critica",
        message: "Acao imediata",
        priority: "critical",
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
            visualizedAt: null,
            deliveredAt: new Date().toISOString(),
            operationalStatus: "recebida",
            responseAt: null,
            responseMessage: null
          }
        ],
        stats: {
          total: 1,
          read: 0,
          unread: 1,
          responded: 0,
          received: 1,
          visualized: 0,
          inProgress: 0,
          assumed: 0,
          resolved: 0,
          operationalPending: 1,
          operationalCompleted: 0
        }
      });
    });

    await waitFor(() => expect(screen.getByText("Nova critica")).toBeInTheDocument());
    expect(mockedApi.adminNotifications).toHaveBeenCalledTimes(historyCalls);
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

  it("aplica filtros na fila operacional ao consultar a API", async () => {
    render(<AdminDashboard onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminNotifications).toHaveBeenCalled());
    const initialCalls = mockedApi.adminNotifications.mock.calls.length;

    fireEvent.change(screen.getByLabelText("Usuario"), {
      target: { value: "2" }
    });
    fireEvent.change(screen.getByLabelText("Prioridade"), {
      target: { value: "critical" }
    });
    fireEvent.change(screen.getByLabelText("Limite"), {
      target: { value: "10" }
    });

    expect(mockedApi.adminNotifications).toHaveBeenCalledTimes(initialCalls);

    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    await waitFor(() => {
      const lastCall = mockedApi.adminNotifications.mock.calls.at(-1)?.[0];
      expect(lastCall).toContain("scope=operational_active");
      expect(lastCall).toContain("user_id=2");
      expect(lastCall).toContain("priority=critical");
      expect(lastCall).toContain("limit=10");
      expect(lastCall).toContain("page=1");
    });
  });

  it("envia notificacao sem recarregar fila e historico por completo", async () => {
    mockedApi.sendNotification.mockResolvedValueOnce({
      notification: {
        id: 501,
        title: "Teste local",
        message: "Mensagem local",
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
            visualizedAt: null,
            deliveredAt: new Date().toISOString(),
            operationalStatus: "recebida",
            responseAt: null,
            responseMessage: null
          }
        ],
        stats: {
          total: 1,
          read: 0,
          unread: 1,
          responded: 0,
          received: 1,
          visualized: 0,
          inProgress: 0,
          assumed: 0,
          resolved: 0,
          operationalPending: 1,
          operationalCompleted: 0
        }
      }
    });

    render(<AdminDashboard onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminNotifications).toHaveBeenCalled());
    const historyCalls = mockedApi.adminNotifications.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Enviar notificacao" }));
    fireEvent.change(screen.getByPlaceholderText("Titulo"), {
      target: { value: "Teste local" }
    });
    fireEvent.change(screen.getByPlaceholderText("Mensagem"), {
      target: { value: "Mensagem local" }
    });
    fireEvent.change(screen.getAllByRole("combobox")[1], {
      target: { value: "users" }
    });
    fireEvent.click(screen.getByLabelText("Operador (operador)"));
    const sendPanel = screen.getByPlaceholderText("Titulo").closest("article");
    expect(sendPanel).not.toBeNull();
    fireEvent.click(within(sendPanel!).getByRole("button", { name: "Enviar notificacao" }));

    await waitFor(() => expect(mockedApi.sendNotification).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Teste local")).toBeInTheDocument());
    expect(mockedApi.adminNotifications).toHaveBeenCalledTimes(historyCalls);
  });

  it("cria usuario sem recarregar a lista completa", async () => {
    render(<AdminDashboard onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminUsers).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Usuarios" }));
    const usersCalls = mockedApi.adminUsers.mock.calls.length;

    const createPanel = screen.getByText("Cadastrar usuario").closest("article");
    expect(createPanel).not.toBeNull();

    fireEvent.change(within(createPanel!).getByPlaceholderText("Nome"), {
      target: { value: "Novo Usuario" }
    });
    fireEvent.change(within(createPanel!).getByPlaceholderText("Login"), {
      target: { value: "novo.usuario" }
    });
    fireEvent.change(within(createPanel!).getByPlaceholderText("Senha"), {
      target: { value: "senha-segura" }
    });
    fireEvent.change(within(createPanel!).getByPlaceholderText("Setor"), {
      target: { value: "Campo" }
    });
    fireEvent.change(within(createPanel!).getByPlaceholderText("Funcao"), {
      target: { value: "Tecnico" }
    });
    fireEvent.click(within(createPanel!).getByRole("button", { name: "Cadastrar" }));

    await waitFor(() => expect(mockedApi.createUser).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Novo Usuario")).toBeInTheDocument());
    expect(mockedApi.adminUsers).toHaveBeenCalledTimes(usersCalls);
  });

  it("atualiza usuario sem recarregar a lista completa", async () => {
    render(<AdminDashboard onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminUsers).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Usuarios" }));
    const usersCalls = mockedApi.adminUsers.mock.calls.length;

    const editPanel = screen.getByText("Editar usuario").closest("article");
    expect(editPanel).not.toBeNull();

    fireEvent.change(within(editPanel!).getByDisplayValue("Selecione"), {
      target: { value: "2" }
    });
    fireEvent.change(within(editPanel!).getByPlaceholderText("Nome"), {
      target: { value: "Operador Atualizado" }
    });
    fireEvent.change(within(editPanel!).getByPlaceholderText("Setor"), {
      target: { value: "NOC" }
    });
    fireEvent.change(within(editPanel!).getByPlaceholderText("Funcao"), {
      target: { value: "Especialista" }
    });
    fireEvent.click(within(editPanel!).getByRole("button", { name: "Salvar alteracoes" }));

    await waitFor(() => expect(mockedApi.updateUser).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Operador Atualizado")).toBeInTheDocument());
    expect(mockedApi.adminUsers).toHaveBeenCalledTimes(usersCalls);
  });

  it("altera status do usuario sem recarregar a lista completa", async () => {
    render(<AdminDashboard onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminUsers).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Usuarios" }));
    const usersCalls = mockedApi.adminUsers.mock.calls.length;

    fireEvent.click(screen.getAllByRole("button", { name: "Desativar" })[1]);

    await waitFor(() => expect(mockedApi.toggleUserStatus).toHaveBeenCalledWith(2, false));
    expect(mockedApi.adminUsers).toHaveBeenCalledTimes(usersCalls);
    expect(screen.getByRole("button", { name: "Ativar" })).toBeInTheDocument();
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
