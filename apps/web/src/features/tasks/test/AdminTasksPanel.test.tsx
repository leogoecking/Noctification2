import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminTasksPanel } from "../admin/AdminTasksPanel";
import { api } from "../../../lib/api";
import { buildTaskCommentItem, buildTaskItem, buildUserItem } from "../../../test/fixtures";

vi.mock("../../../lib/api", () => ({
  api: {
    adminTasks: vi.fn(),
    adminTask: vi.fn(),
    createAdminTaskComment: vi.fn(),
    adminTaskHealth: vi.fn(),
    adminTaskMetrics: vi.fn(),
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

const buildMetricsSummary = () => ({
  productivity: {
    windowDays: 7,
    createdInWindow: 3,
    completedInWindow: 2,
    completedOnTime: 1,
    completedLate: 1,
    overdueOpen: 1,
    blockedOpen: 1,
    completionRate: 2 / 3,
    onTimeRate: 0.5,
    avgCycleHours: 4,
    avgStartLagHours: 1
  },
  capacityByAssignee: [
    {
      assigneeKey: "2",
      assigneeLabel: "Operador",
      open: 1,
      critical: 1,
      overdue: 1,
      blocked: 0,
      done: 1,
      completedOnTime: 1,
      completedLate: 0,
      avgCycleHours: 3
    },
    {
      assigneeKey: "unassigned",
      assigneeLabel: "Sem responsavel",
      open: 1,
      critical: 0,
      overdue: 0,
      blocked: 1,
      done: 0,
      completedOnTime: 0,
      completedLate: 0,
      avgCycleHours: null
    }
  ],
  capacityByDepartment: [
    {
      departmentKey: "Suporte",
      departmentLabel: "Suporte",
      open: 1,
      overdue: 1,
      blocked: 0,
      critical: 1,
      members: 1
    }
  ]
});

const buildAdminTask = (overrides: Partial<ReturnType<typeof buildTaskItem>> = {}) =>
  buildTaskItem({
    creatorUserId: 1,
    creatorName: "Admin",
    creatorLogin: "admin",
    assigneeUserId: 2,
    assigneeName: "Operador",
    assigneeLogin: "operador",
    ...overrides
  });

const buildAdminTaskComment = (overrides: Partial<ReturnType<typeof buildTaskCommentItem>> = {}) =>
  buildTaskCommentItem({
    authorUserId: 1,
    authorName: "Admin",
    authorLogin: "admin",
    ...overrides
  });

const renderAdminTasksPanel = () =>
  render(<AdminTasksPanel onError={vi.fn()} onToast={vi.fn()} />);

describe("AdminTasksPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
    window.localStorage.clear();
    mockedApi.adminTaskHealth.mockResolvedValue({
      health: {
        schedulerEnabled: true,
        dueSoonWindowMinutes: 120,
        staleWindowHours: 24,
        activeTasks: 3,
        dueSoonEligible: 1,
        overdueEligible: 1,
        staleEligible: 1,
        blockedEligible: 1,
        recurringEligible: 0,
        dueSoonSentToday: 1,
        overdueSentToday: 2,
        staleSentToday: 1,
        blockedSentToday: 1,
        recurringCreatedToday: 0
      }
    });
    mockedApi.adminTaskMetrics.mockResolvedValue({
      metrics: buildMetricsSummary()
    });
  });

  it("abre o detalhe administrativo da tarefa pelo board", async () => {
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
      users: [buildUserItem()]
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
      timeline: [
        {
          id: "comment:1",
          kind: "comment",
          taskId: 9,
          actorUserId: 1,
          actorName: "Admin",
          actorLogin: "admin",
          eventType: null,
          fromStatus: null,
          toStatus: null,
          body: "Acompanhar escalonamento",
          metadata: null,
          createdAt: "2026-03-21T12:10:00.000Z",
          updatedAt: "2026-03-21T12:10:00.000Z"
        }
      ]
    });

    renderAdminTasksPanel();

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockedApi.adminUsers).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Abrir tarefa Escalar incidente" }));
    await waitFor(() => expect(mockedApi.adminTask).toHaveBeenCalledWith(9));

    expect(screen.getByText("Fila de tarefas")).toBeInTheDocument();
    expect(
      within(screen.getByRole("dialog", { name: "Detalhe da tarefa" })).getByRole("heading", {
        name: "Escalar incidente"
      })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Operador").length).toBeGreaterThan(0);
    expect(screen.getByText("Acompanhar escalonamento")).toBeInTheDocument();
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
      users: [buildUserItem()]
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
      timeline: []
    });
    mockedApi.createAdminTask.mockResolvedValue({
      task: buildAdminTask({ id: 44, title: "Nova tarefa admin" })
    });

    renderAdminTasksPanel();

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Novo" }));
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

  it("fecha o detalhe admin quando a tarefa sai do filtro apos concluir", async () => {
    mockedApi.adminTasks
      .mockResolvedValueOnce({
        tasks: [buildAdminTask({ id: 12, title: "Tarefa 12" })],
        pagination: { page: 1, limit: 100, total: 1, totalPages: 1 }
      })
      .mockResolvedValueOnce({
        tasks: [],
        pagination: { page: 1, limit: 100, total: 0, totalPages: 1 }
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
      task: buildAdminTask({ id: 12, title: "Tarefa 12" }),
      timeline: []
    });
    mockedApi.completeAdminTask.mockResolvedValue({
      task: { ...buildAdminTask({ id: 12, title: "Tarefa 12" }), status: "done" }
    });

    render(<AdminTasksPanel onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockedApi.adminUsers).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Abrir tarefa Tarefa 12" }));
    await waitFor(() => expect(mockedApi.adminTask).toHaveBeenCalledWith(12));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Detalhe da tarefa" })).getByRole("button", {
        name: "Concluir"
      })
    );

    await waitFor(() => expect(mockedApi.completeAdminTask).toHaveBeenCalledWith(12));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Tarefa 12" })).not.toBeInTheDocument()
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
          title: "Task aguardando externo",
          description: "",
          status: "waiting_external",
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
      timeline: []
    });

    render(<AdminTasksPanel onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));

    const newColumn = await screen.findByLabelText("Coluna Nova");
    const waitingColumn = await screen.findByLabelText("Coluna Aguardando externo");

    expect(newColumn).toBeInTheDocument();
    expect(waitingColumn).toBeInTheDocument();
    expect(await within(newColumn).findByText("Nova task admin")).toBeInTheDocument();
    expect(await within(waitingColumn).findByText("Task aguardando externo")).toBeInTheDocument();
  });

  it("permite mudar o status pelo board administrativo", async () => {
    mockedApi.adminTasks
      .mockResolvedValueOnce({
        tasks: [
          {
            id: 11,
            title: "Em espera admin",
            description: "",
            status: "waiting_external",
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
        status: "waiting_external",
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
      timeline: []
    });
    mockedApi.updateAdminTask.mockResolvedValue({
      task: buildAdminTask({ id: 11, title: "Tarefa 11" })
    });

    render(<AdminTasksPanel onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Abrir tarefa Em espera admin" }));
    await waitFor(() => expect(mockedApi.adminTask).toHaveBeenCalledWith(11));
    fireEvent.click(screen.getByRole("button", { name: "Mover para em andamento" }));

    await waitFor(() => expect(mockedApi.updateAdminTask).toHaveBeenCalledWith(11, { status: "in_progress" }));
  });

  it("permite mover a tarefa por drag and drop no board administrativo", async () => {
    mockedApi.adminTasks
      .mockResolvedValueOnce({
        tasks: [
          {
            id: 111,
            title: "Drag admin",
            description: "",
            status: "waiting_external",
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
            id: 111,
            title: "Drag admin",
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
      users: [buildUserItem()]
    });
    mockedApi.adminTask.mockResolvedValue({
      task: buildAdminTask({ id: 111, title: "Drag admin" }),
      timeline: []
    });
    mockedApi.updateAdminTask.mockResolvedValue({
      task: buildAdminTask({ id: 111, title: "Drag admin", status: "in_progress" })
    });

    renderAdminTasksPanel();

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));

    const card = screen.getByRole("button", { name: "Abrir tarefa Drag admin" });
    const targetColumn = screen.getByLabelText("Coluna Em andamento");
    const dataTransfer = {
      effectAllowed: "",
      dropEffect: "",
      data: new Map<string, string>(),
      setData(type: string, value: string) {
        this.data.set(type, value);
      },
      getData(type: string) {
        return this.data.get(type) ?? "";
      }
    };

    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.dragOver(targetColumn, { dataTransfer });
    fireEvent.drop(targetColumn, { dataTransfer });

    await waitFor(() => expect(mockedApi.updateAdminTask).toHaveBeenCalledWith(111, { status: "in_progress" }));
  });

  it("permite atualizar manualmente a fila e o detalhe", async () => {
    mockedApi.adminTasks
      .mockResolvedValueOnce({
        tasks: [
          {
            id: 13,
            title: "Fila antiga",
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
          }
        ],
        pagination: { page: 1, limit: 100, total: 1, totalPages: 1 }
      })
      .mockResolvedValueOnce({
        tasks: [
          {
            id: 13,
            title: "Fila atualizada",
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
    mockedApi.adminTask
      .mockResolvedValueOnce({
        task: {
          id: 13,
          title: "Fila antiga",
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
        timeline: []
      })
      .mockResolvedValueOnce({
        task: {
          id: 13,
          title: "Fila atualizada",
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
        timeline: []
      });

    render(<AdminTasksPanel onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Abrir tarefa Fila antiga" }));
    await waitFor(() => expect(mockedApi.adminTask).toHaveBeenCalledWith(13));
    fireEvent.click(screen.getByRole("button", { name: "Atualizar tarefas" }));

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockedApi.adminTask).toHaveBeenCalledTimes(2));
    expect(screen.getAllByText("Fila atualizada").length).toBeGreaterThan(0);
  });

  it("permite registrar comentario administrativo no detalhe", async () => {
    mockedApi.adminTasks.mockResolvedValue({
      tasks: [
        {
          id: 12,
          title: "Task com comentario",
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
    mockedApi.adminTask
      .mockResolvedValueOnce({
        task: {
          id: 12,
          title: "Task com comentario",
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
        timeline: []
      })
      .mockResolvedValueOnce({
        task: {
          id: 12,
          title: "Task com comentario",
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
          updatedAt: "2026-03-21T12:06:00.000Z",
          archivedAt: null
        },
        timeline: [
          {
            id: "comment:70",
            kind: "comment",
            taskId: 12,
            actorUserId: 1,
            actorName: "Admin",
            actorLogin: "admin",
            eventType: null,
            fromStatus: null,
            toStatus: null,
            body: "Direcionar para equipe correta",
            metadata: null,
            createdAt: "2026-03-21T12:06:00.000Z",
            updatedAt: "2026-03-21T12:06:00.000Z"
          }
        ]
      });
    mockedApi.createAdminTaskComment.mockResolvedValue({
      comment: buildAdminTaskComment({ id: 70 })
    });

    render(<AdminTasksPanel onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Abrir tarefa Task com comentario" }));
    await waitFor(() => expect(mockedApi.adminTask).toHaveBeenCalledWith(12));

    fireEvent.change(screen.getByLabelText("Comentario administrativo da tarefa"), {
      target: { value: "Direcionar para equipe correta" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar comentario" }));

    await waitFor(() =>
      expect(mockedApi.createAdminTaskComment).toHaveBeenCalledWith(12, {
        body: "Direcionar para equipe correta"
      })
    );
    await waitFor(() => expect(mockedApi.adminTask).toHaveBeenCalledTimes(2));
    expect(screen.getAllByText("Direcionar para equipe correta").length).toBeGreaterThan(0);
  });

  it("aplica a fila rapida de sem responsavel no board administrativo", async () => {
    mockedApi.adminTasks.mockResolvedValue({
      tasks: [
        buildAdminTask({
          id: 50,
          title: "Sem responsavel",
          assigneeUserId: null,
          assigneeName: null,
          assigneeLogin: null,
          status: "new"
        }),
        buildAdminTask({
          id: 51,
          title: "Ja distribuida",
          assigneeUserId: 2,
          assigneeName: "Operador",
          assigneeLogin: "operador",
          status: "new"
        })
      ],
      pagination: { page: 1, limit: 100, total: 2, totalPages: 1 }
    });
    mockedApi.adminUsers.mockResolvedValue({
      users: [buildUserItem()]
    });
    mockedApi.adminTask.mockResolvedValue({
      task: buildAdminTask({
        id: 50,
        title: "Sem responsavel",
        assigneeUserId: null,
        assigneeName: null,
        assigneeLogin: null
      }),
      timeline: []
    });

    renderAdminTasksPanel();

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Sem responsavel (1)" }));

    const newColumn = await screen.findByLabelText("Coluna Nova");
    expect(await within(newColumn).findByRole("button", { name: "Abrir tarefa Sem responsavel" })).toBeInTheDocument();
    expect(within(newColumn).queryByText("Ja distribuida")).not.toBeInTheDocument();
  });

  it("exibe saude da automacao e aplica a fila precisa de atencao", async () => {
    mockedApi.adminTasks.mockResolvedValue({
      tasks: [
        buildAdminTask({
          id: 60,
          title: "Atrasada critica",
          dueAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          status: "in_progress",
          updatedAt: new Date().toISOString()
        }),
        buildAdminTask({
          id: 61,
          title: "Fila normal",
          dueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          status: "new",
          updatedAt: new Date().toISOString()
        })
      ],
      pagination: { page: 1, limit: 100, total: 2, totalPages: 1 }
    });
    mockedApi.adminUsers.mockResolvedValue({
      users: [buildUserItem()]
    });
    mockedApi.adminTask.mockResolvedValue({
      task: buildAdminTask({ id: 60, title: "Atrasada critica" }),
      timeline: []
    });

    renderAdminTasksPanel();

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: /Abrir indicadores/ }));
    expect(screen.getByText("Precisa de atencao")).toBeInTheDocument();
    expect(screen.getAllByText("1 atrasadas").length).toBeGreaterThan(0);
    expect(screen.getByText("1 alertas de parada hoje")).toBeInTheDocument();
    expect(screen.getByText("1 alertas de bloqueio hoje")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Precisa de atencao (1)" }));

    const inProgressColumn = await screen.findByLabelText("Coluna Em andamento");
    expect(await within(inProgressColumn).findByText("Atrasada critica")).toBeInTheDocument();
    expect(screen.queryByText("Fila normal")).not.toBeInTheDocument();
  });

  it("mantem a fila operacional quando as metricas falham", async () => {
    mockedApi.adminTaskMetrics.mockRejectedValueOnce(new Error("metrics down"));
    mockedApi.adminTasks.mockResolvedValue({
      tasks: [buildAdminTask({ id: 62, title: "Fila operacional ativa" })],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 }
    });
    mockedApi.adminUsers.mockResolvedValue({
      users: [buildUserItem()]
    });
    mockedApi.adminTask.mockResolvedValue({
      task: buildAdminTask({ id: 62, title: "Fila operacional ativa" }),
      timeline: []
    });

    renderAdminTasksPanel();

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Abrir tarefa Fila operacional ativa" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Abrir indicadores/ }));
    expect(screen.getByText("Metricas indisponiveis no momento.")).toBeInTheDocument();
  });

  it("restaura filtros operacionais salvos do admin", async () => {
    window.localStorage.setItem(
      "tasks:admin:filters",
      JSON.stringify({
        statusFilter: "blocked",
        priorityFilter: "critical",
        assigneeFilter: "2",
        queueFilter: "attention"
      })
    );

    mockedApi.adminTasks.mockResolvedValue({
      tasks: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 1 }
    });
    mockedApi.adminUsers.mockResolvedValue({
      users: [buildUserItem()]
    });
    mockedApi.adminTask.mockResolvedValue({
      task: buildAdminTask(),
      timeline: []
    });

    renderAdminTasksPanel();

    await waitFor(() =>
      expect(mockedApi.adminTasks).toHaveBeenCalledWith("?status=blocked&priority=critical&assignee_user_id=2")
    );
    expect(screen.getByRole("button", { name: "Precisa de atencao (0)" })).toHaveAttribute("aria-pressed", "true");
  });

  it("envia busca textual de tarefas do admin", async () => {
    mockedApi.adminTasks.mockResolvedValue({
      tasks: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 1 }
    });
    mockedApi.adminUsers.mockResolvedValue({
      users: [buildUserItem()]
    });
    mockedApi.adminTask.mockResolvedValue({
      task: buildAdminTask(),
      timeline: []
    });

    renderAdminTasksPanel();

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByPlaceholderText("titulo, descricao ou responsavel"), {
      target: { value: "usuario" }
    });

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenLastCalledWith("?search=usuario"));
  });

  it("aplica mudanca de status em lote no admin", async () => {
    mockedApi.adminTasks.mockResolvedValue({
      tasks: [
        buildAdminTask({ id: 70, title: "Bulk 1", status: "new" }),
        buildAdminTask({ id: 71, title: "Bulk 2", status: "new" })
      ],
      pagination: { page: 1, limit: 100, total: 2, totalPages: 1 }
    });
    mockedApi.adminUsers.mockResolvedValue({
      users: [buildUserItem()]
    });
    mockedApi.adminTask.mockResolvedValue({
      task: buildAdminTask({ id: 70, title: "Bulk 1" }),
      timeline: []
    });
    mockedApi.updateAdminTask.mockResolvedValue({
      task: buildAdminTask({ id: 70, title: "Atualizada" })
    });

    renderAdminTasksPanel();

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByLabelText("Selecionar tarefa Bulk 1"));
    fireEvent.click(screen.getByLabelText("Selecionar tarefa Bulk 2"));
    fireEvent.click(screen.getByRole("button", { name: "Assumir em lote" }));

    await waitFor(() => {
      expect(mockedApi.updateAdminTask).toHaveBeenCalledWith(70, { status: "assumed" });
      expect(mockedApi.updateAdminTask).toHaveBeenCalledWith(71, { status: "assumed" });
    });
  });

  it("exibe metricas de produtividade por janela no admin", async () => {
    const now = Date.now();
    const isoFromNow = (offsetHours: number) => new Date(now + offsetHours * 60 * 60 * 1000).toISOString();

    mockedApi.adminTaskMetrics
      .mockResolvedValueOnce({
        metrics: {
          productivity: {
            windowDays: 7,
            createdInWindow: 3,
            completedInWindow: 2,
            completedOnTime: 1,
            completedLate: 1,
            overdueOpen: 1,
            blockedOpen: 1,
            completionRate: 2 / 3,
            onTimeRate: 0.5,
            avgCycleHours: 25,
            avgStartLagHours: 4
          },
          capacityByAssignee: buildMetricsSummary().capacityByAssignee,
          capacityByDepartment: buildMetricsSummary().capacityByDepartment
        }
      })
      .mockResolvedValueOnce({
        metrics: {
          productivity: {
            windowDays: 30,
            createdInWindow: 4,
            completedInWindow: 3,
            completedOnTime: 2,
            completedLate: 1,
            overdueOpen: 1,
            blockedOpen: 1,
            completionRate: 0.75,
            onTimeRate: 2 / 3,
            avgCycleHours: 20,
            avgStartLagHours: 3
          },
          capacityByAssignee: buildMetricsSummary().capacityByAssignee,
          capacityByDepartment: buildMetricsSummary().capacityByDepartment
        }
      });

    mockedApi.adminTasks.mockResolvedValue({
      tasks: [
        buildAdminTask({
          id: 72,
          title: "Concluida no prazo",
          status: "done",
          priority: "high",
          createdAt: isoFromNow(-72),
          startedAt: isoFromNow(-70),
          completedAt: isoFromNow(-48),
          dueAt: isoFromNow(-44),
          updatedAt: isoFromNow(-48)
        }),
        buildAdminTask({
          id: 73,
          title: "Concluida em atraso",
          status: "done",
          priority: "critical",
          createdAt: isoFromNow(-50),
          startedAt: isoFromNow(-44),
          completedAt: isoFromNow(-24),
          dueAt: isoFromNow(-25),
          updatedAt: isoFromNow(-24)
        }),
        buildAdminTask({
          id: 74,
          title: "Atrasada aberta",
          status: "in_progress",
          createdAt: isoFromNow(-4),
          dueAt: isoFromNow(-2),
          updatedAt: isoFromNow(-3.5)
        }),
        buildAdminTask({
          id: 75,
          title: "Bloqueada aberta",
          status: "blocked",
          createdAt: isoFromNow(-24 * 19),
          updatedAt: isoFromNow(-24)
        }),
        buildAdminTask({
          id: 76,
          title: "Legada fora da janela curta",
          status: "done",
          createdAt: isoFromNow(-24 * 32),
          startedAt: isoFromNow(-24 * 31),
          completedAt: isoFromNow(-24 * 20),
          dueAt: isoFromNow(-24 * 19),
          updatedAt: isoFromNow(-24 * 20)
        })
      ],
      pagination: { page: 1, limit: 100, total: 5, totalPages: 1 }
    });
    mockedApi.adminUsers.mockResolvedValue({
      users: [buildUserItem()]
    });
    mockedApi.adminTask.mockResolvedValue({
      task: buildAdminTask({ id: 72, title: "Concluida no prazo", status: "done" }),
      timeline: []
    });

    renderAdminTasksPanel();

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: /Abrir indicadores/ }));

    const productivitySection = screen.getByText("Janela operacional").closest("article");
    expect(productivitySection).not.toBeNull();

    const productivityScope = within(productivitySection as HTMLElement);
    const deliveryCard = productivityScope.getByText("Entrega").closest("div");
    const flowCard = productivityScope.getByText("Fluxo").closest("div");
    const riskCard = productivityScope.getByText("Risco atual").closest("div");

    expect(deliveryCard).not.toBeNull();
    expect(flowCard).not.toBeNull();
    expect(riskCard).not.toBeNull();

    expect(deliveryCard as HTMLElement).toHaveTextContent("2");
    expect(deliveryCard as HTMLElement).toHaveTextContent("concluidas nos ultimos 7 dias");
    expect(deliveryCard as HTMLElement).toHaveTextContent("1 no prazo");
    expect(deliveryCard as HTMLElement).toHaveTextContent("1 em atraso");
    expect(flowCard as HTMLElement).toHaveTextContent("3");
    expect(flowCard as HTMLElement).toHaveTextContent("criadas nos ultimos 7 dias");
    expect(flowCard as HTMLElement).toHaveTextContent("ciclo medio 25.0h");
    expect(flowCard as HTMLElement).toHaveTextContent("inicio medio 4.0h");
    expect(riskCard as HTMLElement).toHaveTextContent("1");
    expect(riskCard as HTMLElement).toHaveTextContent("1 atrasadas");
    expect(riskCard as HTMLElement).toHaveTextContent("1 bloqueadas");

    fireEvent.click(productivityScope.getByRole("button", { name: "30 dias" }));

    await waitFor(() => expect(mockedApi.adminTaskMetrics).toHaveBeenCalledTimes(2));
    expect(deliveryCard as HTMLElement).toHaveTextContent("3");
    expect(deliveryCard as HTMLElement).toHaveTextContent("concluidas nos ultimos 30 dias");
    expect(flowCard as HTMLElement).toHaveTextContent("4");
    expect(flowCard as HTMLElement).toHaveTextContent("criadas nos ultimos 30 dias");
  });

  it("exibe carga por responsavel no painel administrativo", async () => {
    mockedApi.adminTasks.mockResolvedValue({
      tasks: [
        buildAdminTask({
          id: 80,
          title: "Carga operador",
          assigneeUserId: 2,
          assigneeName: "Operador",
          assigneeLogin: "operador",
          status: "in_progress",
          priority: "critical",
          dueAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        }),
        buildAdminTask({
          id: 81,
          title: "Carga sem responsavel",
          assigneeUserId: null,
          assigneeName: null,
          assigneeLogin: null,
          status: "blocked",
          priority: "normal",
          updatedAt: new Date().toISOString()
        })
      ],
      pagination: { page: 1, limit: 100, total: 2, totalPages: 1 }
    });
    mockedApi.adminUsers.mockResolvedValue({
      users: [buildUserItem()]
    });
    mockedApi.adminTask.mockResolvedValue({
      task: buildAdminTask({ id: 80, title: "Carga operador" }),
      timeline: []
    });

    renderAdminTasksPanel();

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: /Abrir indicadores/ }));
    const capacitySection = screen.getByText("Carga por responsavel ou equipe").closest("article");
    expect(capacitySection).not.toBeNull();

    const capacityScope = within(capacitySection as HTMLElement);
    expect(capacityScope.getByText("Operador")).toBeInTheDocument();
    expect(capacityScope.getByText("Sem responsavel")).toBeInTheDocument();
    expect(capacityScope.getByText("1 atrasadas")).toBeInTheDocument();
    expect(capacityScope.getByText("1 criticas")).toBeInTheDocument();
    expect(capacityScope.getByText("1 bloqueadas")).toBeInTheDocument();
    fireEvent.click(capacityScope.getByRole("button", { name: "Equipe" }));
    expect(capacityScope.getByText("Suporte")).toBeInTheDocument();
  });
});
