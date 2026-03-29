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
    expect(screen.getByRole("heading", { name: "Escalar incidente" })).toBeInTheDocument();
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
      timeline: []
    });

    render(<AdminTasksPanel onError={vi.fn()} onToast={vi.fn()} />);

    await waitFor(() => expect(mockedApi.adminTasks).toHaveBeenCalledTimes(1));

    const newColumn = await screen.findByLabelText("Coluna Nova");
    const waitingColumn = await screen.findByLabelText("Coluna Aguardando");

    expect(newColumn).toBeInTheDocument();
    expect(waitingColumn).toBeInTheDocument();
    expect(await within(newColumn).findByText("Nova task admin")).toBeInTheDocument();
    expect(await within(waitingColumn).findByText("Task aguardando")).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Em andamento" }));

    await waitFor(() => expect(mockedApi.updateAdminTask).toHaveBeenCalledWith(11, { status: "in_progress" }));
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
});
