import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminTasksPanel } from "./AdminTasksPanel";
import { api } from "../../lib/api";

vi.mock("../../lib/api", () => ({
  api: {
    adminTasks: vi.fn(),
    adminTask: vi.fn(),
    adminTaskHealth: vi.fn(),
    adminTaskAutomationLogs: vi.fn(),
    adminUsers: vi.fn(),
    createAdminTask: vi.fn(),
    updateAdminTask: vi.fn(),
    completeAdminTask: vi.fn(),
    cancelAdminTask: vi.fn()
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

describe("AdminTasksPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.adminTaskHealth.mockResolvedValue({
      health: {
        schedulerEnabled: true,
        dueSoonWindowMinutes: 120,
        staleWindowHours: 24,
        activeTasks: 3,
        dueSoonEligible: 1,
        overdueEligible: 2,
        staleEligible: 1,
        recurringEligible: 1,
        dueSoonSentToday: 2,
        overdueSentToday: 1,
        staleSentToday: 1,
        recurringCreatedToday: 1
      }
    });
    mockedApi.adminTaskAutomationLogs.mockResolvedValue({
      logs: [
        {
          id: 1,
          taskId: 9,
          taskTitle: "Escalar incidente",
          automationType: "due_soon",
          dedupeKey: "due_soon:2026-03-30T10:00:00.000Z",
          notificationId: 77,
          metadata: null,
          createdAt: "2026-03-21T12:00:00.000Z"
        }
      ]
    });
  });

  it("carrega tarefas e usuarios ativos", async () => {
    mockedApi.adminTasks.mockResolvedValue({
      tasks: [
        {
          id: 9,
          title: "Escalar incidente",
          description: "Validar impacto",
          status: "new",
          priority: "critical",
          creatorUserId: 1,
          creatorName: "Admin",
          creatorLogin: "admin",
          assigneeUserId: 2,
          assigneeName: "Operador",
          assigneeLogin: "operador",
          dueAt: "2026-03-30T10:00:00.000Z",
          repeatType: "monthly",
          repeatWeekdays: [],
          startedAt: null,
          completedAt: null,
          cancelledAt: null,
          recurrenceSourceTaskId: null,
          sourceNotificationId: null,
          createdAt: "2026-03-21T12:00:00.000Z",
          updatedAt: "2026-03-21T12:00:00.000Z",
          archivedAt: null
        }
      ],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 }
    });
    mockedApi.adminUsers.mockResolvedValue({
      users: [
        {
          id: 2,
          name: "Operador",
          login: "operador",
          department: "Suporte",
          jobTitle: "Analista",
          role: "user",
          isActive: true,
          createdAt: "2026-03-21T12:00:00.000Z",
          updatedAt: "2026-03-21T12:00:00.000Z"
        }
      ]
    });
    mockedApi.adminTask.mockResolvedValue({
      task: {
        id: 9,
        title: "Escalar incidente",
        description: "Validar impacto",
        status: "new",
        priority: "critical",
        creatorUserId: 1,
        creatorName: "Admin",
        creatorLogin: "admin",
        assigneeUserId: 2,
        assigneeName: "Operador",
        assigneeLogin: "operador",
        dueAt: "2026-03-30T10:00:00.000Z",
        repeatType: "monthly",
        repeatWeekdays: [],
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        recurrenceSourceTaskId: null,
        sourceNotificationId: null,
        createdAt: "2026-03-21T12:00:00.000Z",
        updatedAt: "2026-03-21T12:00:00.000Z",
        archivedAt: null
      },
      events: []
    });

    render(<AdminTasksPanel onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockedApi.adminTaskHealth).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockedApi.adminTaskAutomationLogs).toHaveBeenCalledWith("?limit=20"));
    await waitFor(() => expect(mockedApi.adminUsers).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockedApi.adminTask).toHaveBeenCalledWith(9));

    expect(screen.getByText("Fila de tarefas")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Escalar incidente" })).toBeInTheDocument();
    expect(screen.getAllByText("Operador").length).toBeGreaterThan(0);
    expect(screen.getByText("Logs de automacao")).toBeInTheDocument();
    expect(screen.getByText(/Prazo proximo na tarefa #9/)).toBeInTheDocument();
  });

  it("cria tarefa administrativa com responsavel selecionado", async () => {
    mockedApi.adminTasks
      .mockResolvedValueOnce({
        tasks: [],
        pagination: { page: 1, limit: 100, total: 0, totalPages: 1 }
      })
      .mockResolvedValueOnce({
        tasks: [
          {
            id: 44,
            title: "Nova tarefa admin",
            description: "",
            status: "new",
            priority: "normal",
            creatorUserId: 1,
            creatorName: "Admin",
            creatorLogin: "admin",
            assigneeUserId: 2,
            assigneeName: "Operador",
            assigneeLogin: "operador",
            dueAt: null,
            repeatType: "weekly",
            repeatWeekdays: [1, 3, 5],
            startedAt: null,
            completedAt: null,
            cancelledAt: null,
            recurrenceSourceTaskId: null,
            sourceNotificationId: null,
            createdAt: "2026-03-21T12:00:00.000Z",
            updatedAt: "2026-03-21T12:00:00.000Z",
            archivedAt: null
          }
        ],
        pagination: { page: 1, limit: 100, total: 1, totalPages: 1 }
      });
    mockedApi.adminUsers.mockResolvedValue({
      users: [
        {
          id: 2,
          name: "Operador",
          login: "operador",
          department: "Suporte",
          jobTitle: "Analista",
          role: "user",
          isActive: true,
          createdAt: "2026-03-21T12:00:00.000Z",
          updatedAt: "2026-03-21T12:00:00.000Z"
        }
      ]
    });
    mockedApi.adminTask.mockResolvedValue({
      task: {
        id: 44,
        title: "Nova tarefa admin",
        description: "",
        status: "new",
        priority: "normal",
        creatorUserId: 1,
        creatorName: "Admin",
        creatorLogin: "admin",
        assigneeUserId: 2,
        assigneeName: "Operador",
        assigneeLogin: "operador",
        dueAt: null,
        repeatType: "weekly",
        repeatWeekdays: [1, 3, 5],
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        recurrenceSourceTaskId: null,
        sourceNotificationId: null,
        createdAt: "2026-03-21T12:00:00.000Z",
        updatedAt: "2026-03-21T12:00:00.000Z",
        archivedAt: null
      },
      events: []
    });
    mockedApi.createAdminTask.mockResolvedValue({
      task: { id: 44 }
    });

    render(<AdminTasksPanel onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText("Titulo da tarefa"), {
      target: { value: "Nova tarefa admin" }
    });
    fireEvent.change(screen.getByLabelText("Recorrencia da tarefa admin"), {
      target: { value: "weekly" }
    });
    fireEvent.click(screen.getByLabelText("Dia da recorrencia admin Domingo"));
    fireEvent.click(screen.getByLabelText("Dia da recorrencia admin Quarta"));
    fireEvent.change(screen.getByLabelText("Responsavel da tarefa"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar tarefa" }));

    await waitFor(() =>
      expect(mockedApi.createAdminTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Nova tarefa admin",
          repeat_type: "weekly",
          weekdays: expect.arrayContaining([0, 3]),
          assignee_user_id: 2
        })
      )
    );
  });

  it("alterna para o board e distribui tarefas por coluna de status", async () => {
    mockedApi.adminTasks.mockResolvedValue({
      tasks: [
        {
          id: 9,
          title: "Nova task admin",
          description: "",
          status: "new",
          priority: "normal",
          creatorUserId: 1,
          creatorName: "Admin",
          creatorLogin: "admin",
          assigneeUserId: 2,
          assigneeName: "Operador",
          assigneeLogin: "operador",
          dueAt: null,
          repeatType: "none",
          repeatWeekdays: [],
          startedAt: null,
          completedAt: null,
          cancelledAt: null,
          recurrenceSourceTaskId: null,
          sourceNotificationId: null,
          createdAt: "2026-03-21T12:00:00.000Z",
          updatedAt: "2026-03-21T12:00:00.000Z",
          archivedAt: null
        },
        {
          id: 10,
          title: "Task aguardando",
          description: "",
          status: "waiting",
          priority: "high",
          creatorUserId: 1,
          creatorName: "Admin",
          creatorLogin: "admin",
          assigneeUserId: null,
          assigneeName: null,
          assigneeLogin: null,
          dueAt: null,
          repeatType: "none",
          repeatWeekdays: [],
          startedAt: null,
          completedAt: null,
          cancelledAt: null,
          recurrenceSourceTaskId: null,
          sourceNotificationId: null,
          createdAt: "2026-03-21T12:00:00.000Z",
          updatedAt: "2026-03-21T12:00:00.000Z",
          archivedAt: null
        }
      ],
      pagination: { page: 1, limit: 100, total: 2, totalPages: 1 }
    });
    mockedApi.adminUsers.mockResolvedValue({
      users: [
        {
          id: 2,
          name: "Operador",
          login: "operador",
          department: "Suporte",
          jobTitle: "Analista",
          role: "user",
          isActive: true,
          createdAt: "2026-03-21T12:00:00.000Z",
          updatedAt: "2026-03-21T12:00:00.000Z"
        }
      ]
    });
    mockedApi.adminTask.mockResolvedValue({
      task: {
        id: 9,
        title: "Nova task admin",
        description: "",
        status: "new",
        priority: "normal",
        creatorUserId: 1,
        creatorName: "Admin",
        creatorLogin: "admin",
        assigneeUserId: 2,
        assigneeName: "Operador",
        assigneeLogin: "operador",
        dueAt: null,
        repeatType: "none",
        repeatWeekdays: [],
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        recurrenceSourceTaskId: null,
        sourceNotificationId: null,
        createdAt: "2026-03-21T12:00:00.000Z",
        updatedAt: "2026-03-21T12:00:00.000Z",
        archivedAt: null
      },
      events: []
    });

    render(<AdminTasksPanel onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Board" }));

    const newColumn = screen.getByLabelText("Coluna Nova");
    const waitingColumn = screen.getByLabelText("Coluna Aguardando");

    expect(newColumn).toBeInTheDocument();
    expect(waitingColumn).toBeInTheDocument();
    expect(within(newColumn).getByText("Nova task admin")).toBeInTheDocument();
    expect(within(waitingColumn).getByText("Task aguardando")).toBeInTheDocument();
  });

  it("permite mudar o status pelo board administrativo", async () => {
    mockedApi.adminTasks
      .mockResolvedValueOnce({
        tasks: [
          {
            id: 11,
            title: "Em espera admin",
            description: "",
            status: "waiting",
            priority: "normal",
            creatorUserId: 1,
            creatorName: "Admin",
            creatorLogin: "admin",
            assigneeUserId: 2,
            assigneeName: "Operador",
            assigneeLogin: "operador",
            dueAt: null,
            repeatType: "none",
            repeatWeekdays: [],
            startedAt: null,
            completedAt: null,
            cancelledAt: null,
            recurrenceSourceTaskId: null,
            sourceNotificationId: null,
            createdAt: "2026-03-21T12:00:00.000Z",
            updatedAt: "2026-03-21T12:00:00.000Z",
            archivedAt: null
          }
        ],
        pagination: { page: 1, limit: 100, total: 1, totalPages: 1 }
      })
      .mockResolvedValueOnce({
        tasks: [
          {
            id: 11,
            title: "Em espera admin",
            description: "",
            status: "in_progress",
            priority: "normal",
            creatorUserId: 1,
            creatorName: "Admin",
            creatorLogin: "admin",
            assigneeUserId: 2,
            assigneeName: "Operador",
            assigneeLogin: "operador",
            dueAt: null,
            repeatType: "none",
            repeatWeekdays: [],
            startedAt: null,
            completedAt: null,
            cancelledAt: null,
            recurrenceSourceTaskId: null,
            sourceNotificationId: null,
            createdAt: "2026-03-21T12:00:00.000Z",
            updatedAt: "2026-03-21T12:05:00.000Z",
            archivedAt: null
          }
        ],
        pagination: { page: 1, limit: 100, total: 1, totalPages: 1 }
      });
    mockedApi.adminUsers.mockResolvedValue({
      users: [
        {
          id: 2,
          name: "Operador",
          login: "operador",
          department: "Suporte",
          jobTitle: "Analista",
          role: "user",
          isActive: true,
          createdAt: "2026-03-21T12:00:00.000Z",
          updatedAt: "2026-03-21T12:00:00.000Z"
        }
      ]
    });
    mockedApi.adminTask.mockResolvedValue({
      task: {
        id: 11,
        title: "Em espera admin",
        description: "",
        status: "in_progress",
        priority: "normal",
        creatorUserId: 1,
        creatorName: "Admin",
        creatorLogin: "admin",
        assigneeUserId: 2,
        assigneeName: "Operador",
        assigneeLogin: "operador",
        dueAt: null,
        repeatType: "none",
        repeatWeekdays: [],
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        recurrenceSourceTaskId: null,
        sourceNotificationId: null,
        createdAt: "2026-03-21T12:00:00.000Z",
        updatedAt: "2026-03-21T12:05:00.000Z",
        archivedAt: null
      },
      events: []
    });
    mockedApi.updateAdminTask.mockResolvedValue({
      task: { id: 11 }
    });

    render(<AdminTasksPanel onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Board" }));
    fireEvent.click(within(screen.getByLabelText("Coluna Aguardando")).getByRole("button", { name: "Em andamento" }));

    await waitFor(() => expect(mockedApi.updateAdminTask).toHaveBeenCalledWith(11, { status: "in_progress" }));
  });

  it("aplica filtro de logs de automacao ao consultar a API", async () => {
    render(<AdminTasksPanel onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminTaskAutomationLogs).toHaveBeenCalledWith("?limit=20"));

    fireEvent.change(screen.getByLabelText("Filtro de automacao de tarefa"), {
      target: { value: "overdue" }
    });

    await waitFor(() =>
      expect(mockedApi.adminTaskAutomationLogs).toHaveBeenLastCalledWith(
        "?automation_type=overdue&limit=20"
      )
    );
  });
});
