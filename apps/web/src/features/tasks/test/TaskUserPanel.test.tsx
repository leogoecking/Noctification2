import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskUserPanel } from "../components/TaskUserPanel";
import { api } from "../../../lib/api";
import { buildAuthUser, buildTaskCommentItem, buildTaskItem } from "../../../test/fixtures";

vi.mock("../../../lib/api", () => ({
  api: {
    myTasks: vi.fn(),
    myTask: vi.fn(),
    createMyTaskComment: vi.fn(),
    createMyTask: vi.fn(),
    updateMyTask: vi.fn(),
    completeMyTask: vi.fn(),
    cancelMyTask: vi.fn()
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

const renderTaskUserPanel = () =>
  render(
    <TaskUserPanel user={buildAuthUser()} onError={vi.fn()} onToast={vi.fn()} />
  );

describe("TaskUserPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("abre o detalhe da tarefa pelo board", async () => {
    mockedApi.myTasks.mockResolvedValue({
      tasks: [
        {
          id: 1,
          title: "Investigar falha",
          description: "Coletar evidencias",
          status: "new",
          priority: "high",
          creatorUserId: 2,
          creatorName: "Usuario",
          creatorLogin: "user",
          assigneeUserId: 2,
          assigneeName: "Usuario",
          assigneeLogin: "user",
          dueAt: "2026-03-30T10:00:00.000Z",
          repeatType: "daily",
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
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 }
    });
    mockedApi.myTask.mockResolvedValue({
      task: {
        id: 1,
        title: "Investigar falha",
        description: "Coletar evidencias",
        status: "new",
        priority: "high",
        creatorUserId: 2,
        creatorName: "Usuario",
        creatorLogin: "user",
        assigneeUserId: 2,
        assigneeName: "Usuario",
        assigneeLogin: "user",
        dueAt: "2026-03-30T10:00:00.000Z",
        repeatType: "daily",
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
          taskId: 1,
          actorUserId: 2,
          actorName: "Usuario",
          actorLogin: "user",
          eventType: null,
          fromStatus: null,
          toStatus: null,
          body: "Primeiro comentario",
          metadata: null,
          createdAt: "2026-03-21T12:10:00.000Z",
          updatedAt: "2026-03-21T12:10:00.000Z"
        },
        {
          id: "event:10",
          kind: "event",
          taskId: 1,
          actorUserId: 2,
          actorName: "Usuario",
          actorLogin: "user",
          eventType: "created",
          fromStatus: null,
          toStatus: "new",
          body: null,
          metadata: null,
          createdAt: "2026-03-21T12:00:00.000Z",
          updatedAt: null
        }
      ]
    });

    renderTaskUserPanel();

    await waitFor(() => expect(mockedApi.myTasks).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Abrir tarefa Investigar falha" }));
    await waitFor(() => expect(mockedApi.myTask).toHaveBeenCalledWith(1));

    expect(
      within(screen.getByRole("dialog", { name: "Detalhe da tarefa" })).getByRole("heading", {
        name: "Investigar falha"
      })
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Primeiro comentario")).toBeInTheDocument());
    expect(screen.getByText("Historico da tarefa")).toBeInTheDocument();
    expect(screen.getByText("Criacao")).toBeInTheDocument();
  });

  it("envia criacao com atribuicao ao proprio usuario quando marcado", async () => {
    mockedApi.myTasks
      .mockResolvedValueOnce({
        tasks: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 1 }
      })
      .mockResolvedValueOnce({
        tasks: [
          {
            id: 22,
            title: "Nova tarefa",
            description: "",
            status: "new",
            priority: "normal",
            creatorUserId: 2,
            creatorName: "Usuario",
            creatorLogin: "user",
            assigneeUserId: 2,
            assigneeName: "Usuario",
            assigneeLogin: "user",
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
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 }
      });
    mockedApi.myTask.mockResolvedValue({
      task: {
        id: 22,
        title: "Nova tarefa",
        description: "",
        status: "new",
        priority: "normal",
        creatorUserId: 2,
        creatorName: "Usuario",
        creatorLogin: "user",
        assigneeUserId: 2,
        assigneeName: "Usuario",
        assigneeLogin: "user",
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
    mockedApi.createMyTask.mockResolvedValue({
      task: buildTaskItem({ id: 22, title: "Tarefa 22" })
    });

    renderTaskUserPanel();

    await waitFor(() => expect(mockedApi.myTasks).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Novo" }));
    fireEvent.change(screen.getByPlaceholderText("Titulo da tarefa"), {
      target: { value: "Nova tarefa" }
    });
    fireEvent.change(screen.getByLabelText("Recorrencia da tarefa"), {
      target: { value: "weekly" }
    });
    fireEvent.click(screen.getByLabelText("Dia da recorrencia Segunda"));
    fireEvent.click(screen.getByLabelText("Dia da recorrencia Quarta"));
    fireEvent.click(screen.getByRole("button", { name: "Criar tarefa" }));

    await waitFor(() =>
      expect(mockedApi.createMyTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Nova tarefa",
          repeat_type: "weekly",
          weekdays: expect.arrayContaining([1, 3]),
          assignee_user_id: 2
        })
      )
    );
  });

  it("fecha o detalhe quando a tarefa sai do filtro apos concluir", async () => {
    mockedApi.myTasks
      .mockResolvedValueOnce({
        tasks: [buildTaskItem({ id: 7, title: "Tarefa 7" })],
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 }
      })
      .mockResolvedValueOnce({
        tasks: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 1 }
      });
    mockedApi.myTask.mockResolvedValue({
      task: buildTaskItem({ id: 7, title: "Tarefa 7" }),
      timeline: []
    });
    mockedApi.completeMyTask.mockResolvedValue({
      task: { ...buildTaskItem({ id: 7, title: "Tarefa 7" }), status: "done" }
    });

    renderTaskUserPanel();

    await waitFor(() => expect(mockedApi.myTasks).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Abrir tarefa Tarefa 7" }));
    await waitFor(() => expect(mockedApi.myTask).toHaveBeenCalledWith(7));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Detalhe da tarefa" })).getByRole("button", {
        name: "Concluir"
      })
    );

    await waitFor(() => expect(mockedApi.completeMyTask).toHaveBeenCalledWith(7));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Tarefa 7" })).not.toBeInTheDocument()
    );
  });

  it("alterna para o board e agrupa tarefas por status", async () => {
    mockedApi.myTasks.mockResolvedValue({
      tasks: [
        {
          id: 1,
          title: "Nova tarefa",
          description: "",
          status: "new",
          priority: "normal",
          creatorUserId: 2,
          creatorName: "Usuario",
          creatorLogin: "user",
          assigneeUserId: 2,
          assigneeName: "Usuario",
          assigneeLogin: "user",
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
          id: 2,
          title: "Em andamento",
          description: "",
          status: "in_progress",
          priority: "high",
          creatorUserId: 2,
          creatorName: "Usuario",
          creatorLogin: "user",
          assigneeUserId: 2,
          assigneeName: "Usuario",
          assigneeLogin: "user",
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
      pagination: { page: 1, limit: 50, total: 2, totalPages: 1 }
    });
    mockedApi.myTask.mockResolvedValue({
      task: {
        id: 1,
        title: "Nova tarefa",
        description: "",
        status: "new",
        priority: "normal",
        creatorUserId: 2,
        creatorName: "Usuario",
        creatorLogin: "user",
        assigneeUserId: 2,
        assigneeName: "Usuario",
        assigneeLogin: "user",
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

    render(
      <TaskUserPanel
        user={{ id: 2, login: "user", name: "Usuario", role: "user" }}
        onError={vi.fn()}
        onToast={vi.fn()}
      />
    );

    await waitFor(() => expect(mockedApi.myTasks).toHaveBeenCalledTimes(1));

    const newColumn = await screen.findByLabelText("Coluna Nova");
    const inProgressColumn = await screen.findByLabelText("Coluna Em andamento");

    expect(newColumn).toBeInTheDocument();
    expect(inProgressColumn).toBeInTheDocument();
    expect(await within(newColumn).findByText("Nova tarefa")).toBeInTheDocument();
    expect((await within(inProgressColumn).findAllByText("Em andamento")).length).toBeGreaterThan(0);
  });

  it("permite mudar o status pelo board", async () => {
    mockedApi.myTasks
      .mockResolvedValueOnce({
        tasks: [
          {
            id: 3,
            title: "Aguardando externo",
            description: "",
            status: "waiting_external",
            priority: "normal",
            creatorUserId: 2,
            creatorName: "Usuario",
            creatorLogin: "user",
            assigneeUserId: 2,
            assigneeName: "Usuario",
            assigneeLogin: "user",
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
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 }
      })
      .mockResolvedValueOnce({
        tasks: [
          {
            id: 3,
            title: "Aguardando externo",
            description: "",
            status: "in_progress",
            priority: "normal",
            creatorUserId: 2,
            creatorName: "Usuario",
            creatorLogin: "user",
            assigneeUserId: 2,
            assigneeName: "Usuario",
            assigneeLogin: "user",
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
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 }
      });
    mockedApi.myTask.mockResolvedValue({
      task: {
        id: 3,
        title: "Aguardando externo",
        description: "",
        status: "waiting_external",
        priority: "normal",
        creatorUserId: 2,
        creatorName: "Usuario",
        creatorLogin: "user",
        assigneeUserId: 2,
        assigneeName: "Usuario",
        assigneeLogin: "user",
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
    mockedApi.updateMyTask.mockResolvedValue({
      task: buildTaskItem({ id: 3, title: "Tarefa 3" })
    });

    renderTaskUserPanel();

    await waitFor(() => expect(mockedApi.myTasks).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Abrir tarefa Aguardando externo" }));
    await waitFor(() => expect(mockedApi.myTask).toHaveBeenCalledWith(3));
    fireEvent.click(screen.getByRole("button", { name: "Mover para em andamento" }));

    await waitFor(() => expect(mockedApi.updateMyTask).toHaveBeenCalledWith(3, { status: "in_progress" }));
  });

  it("permite atualizar manualmente a lista e o detalhe", async () => {
    mockedApi.myTasks
      .mockResolvedValueOnce({
        tasks: [
          {
            id: 5,
            title: "Status antigo",
            description: "",
            status: "new",
            priority: "normal",
            creatorUserId: 2,
            creatorName: "Usuario",
            creatorLogin: "user",
            assigneeUserId: 2,
            assigneeName: "Usuario",
            assigneeLogin: "user",
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
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 }
      })
      .mockResolvedValueOnce({
        tasks: [
          {
            id: 5,
            title: "Status novo",
            description: "",
            status: "in_progress",
            priority: "normal",
            creatorUserId: 2,
            creatorName: "Usuario",
            creatorLogin: "user",
            assigneeUserId: 2,
            assigneeName: "Usuario",
            assigneeLogin: "user",
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
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 }
      });
    mockedApi.myTask
      .mockResolvedValueOnce({
        task: {
          id: 5,
          title: "Status antigo",
          description: "",
          status: "new",
          priority: "normal",
          creatorUserId: 2,
          creatorName: "Usuario",
          creatorLogin: "user",
          assigneeUserId: 2,
          assigneeName: "Usuario",
          assigneeLogin: "user",
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
          id: 5,
          title: "Status novo",
          description: "",
          status: "in_progress",
          priority: "normal",
          creatorUserId: 2,
          creatorName: "Usuario",
          creatorLogin: "user",
          assigneeUserId: 2,
          assigneeName: "Usuario",
          assigneeLogin: "user",
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

    render(
      <TaskUserPanel
        user={{ id: 2, login: "user", name: "Usuario", role: "user" }}
        onError={vi.fn()}
        onToast={vi.fn()}
      />
    );

    await waitFor(() => expect(mockedApi.myTasks).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Abrir tarefa Status antigo" }));
    await waitFor(() => expect(mockedApi.myTask).toHaveBeenCalledWith(5));
    fireEvent.click(screen.getByRole("button", { name: "Atualizar tarefas" }));

    await waitFor(() => expect(mockedApi.myTasks).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockedApi.myTask).toHaveBeenCalledTimes(2));
    expect(screen.getAllByText("Status novo").length).toBeGreaterThan(0);
  });

  it("permite registrar comentario no detalhe da tarefa", async () => {
    mockedApi.myTasks.mockResolvedValue({
      tasks: [
        {
          id: 7,
          title: "Registrar contexto",
          description: "",
          status: "new",
          priority: "normal",
          creatorUserId: 2,
          creatorName: "Usuario",
          creatorLogin: "user",
          assigneeUserId: 2,
          assigneeName: "Usuario",
          assigneeLogin: "user",
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
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 }
    });
    mockedApi.myTask
      .mockResolvedValueOnce({
        task: {
          id: 7,
          title: "Registrar contexto",
          description: "",
          status: "new",
          priority: "normal",
          creatorUserId: 2,
          creatorName: "Usuario",
          creatorLogin: "user",
          assigneeUserId: 2,
          assigneeName: "Usuario",
          assigneeLogin: "user",
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
          id: 7,
          title: "Registrar contexto",
          description: "",
          status: "new",
          priority: "normal",
          creatorUserId: 2,
          creatorName: "Usuario",
          creatorLogin: "user",
          assigneeUserId: 2,
          assigneeName: "Usuario",
          assigneeLogin: "user",
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
        timeline: [
          {
            id: "comment:91",
            kind: "comment",
            taskId: 7,
            actorUserId: 2,
            actorName: "Usuario",
            actorLogin: "user",
            eventType: null,
            fromStatus: null,
            toStatus: null,
            body: "Comentario de acompanhamento",
            metadata: null,
            createdAt: "2026-03-21T12:05:00.000Z",
            updatedAt: "2026-03-21T12:05:00.000Z"
          }
        ]
      });
    mockedApi.createMyTaskComment.mockResolvedValue({
      comment: buildTaskCommentItem({ id: 91 })
    });

    render(
      <TaskUserPanel
        user={{ id: 2, login: "user", name: "Usuario", role: "user" }}
        onError={vi.fn()}
        onToast={vi.fn()}
      />
    );

    await waitFor(() => expect(mockedApi.myTasks).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Abrir tarefa Registrar contexto" }));
    await waitFor(() => expect(mockedApi.myTask).toHaveBeenCalledWith(7));

    fireEvent.change(screen.getByLabelText("Comentario da tarefa"), {
      target: { value: "Comentario de acompanhamento" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar comentario" }));

    await waitFor(() =>
      expect(mockedApi.createMyTaskComment).toHaveBeenCalledWith(7, {
        body: "Comentario de acompanhamento"
      })
    );
    await waitFor(() => expect(mockedApi.myTask).toHaveBeenCalledTimes(2));
    expect(screen.getAllByText("Comentario de acompanhamento").length).toBeGreaterThan(0);
  });

  it("aplica a fila rapida de atrasadas no board", async () => {
    const now = Date.now();

    mockedApi.myTasks.mockResolvedValue({
      tasks: [
        buildTaskItem({
          id: 30,
          title: "Tarefa vencida",
          dueAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
          status: "in_progress",
          priority: "high"
        }),
        buildTaskItem({
          id: 31,
          title: "Tarefa futura",
          dueAt: new Date(now + 27 * 60 * 60 * 1000).toISOString(),
          status: "new"
        })
      ],
      pagination: { page: 1, limit: 50, total: 2, totalPages: 1 }
    });
    mockedApi.myTask.mockResolvedValue({
      task: buildTaskItem({ id: 30, title: "Tarefa vencida" }),
      timeline: []
    });

    renderTaskUserPanel();

    await waitFor(() => expect(mockedApi.myTasks).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Atrasadas (1)" }));

    expect(screen.getByText("Tarefa vencida")).toBeInTheDocument();
    expect(screen.queryByText("Tarefa futura")).not.toBeInTheDocument();
    expect(screen.getByText("Atrasada")).toBeInTheDocument();
  });

  it("restaura filtros operacionais salvos do usuario", async () => {
    window.localStorage.setItem(
      "tasks:user:filters",
      JSON.stringify({
        statusFilter: "blocked",
        priorityFilter: "high",
        queueFilter: "stale"
      })
    );

    mockedApi.myTasks.mockResolvedValue({
      tasks: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 1 }
    });

    renderTaskUserPanel();

    await waitFor(() => expect(mockedApi.myTasks).toHaveBeenCalledWith("?status=blocked&priority=high"));
    expect(screen.getByRole("button", { name: "Paradas 24h+ (0)" })).toHaveAttribute("aria-pressed", "true");
  });

  it("envia busca textual de tarefas do usuario", async () => {
    mockedApi.myTasks.mockResolvedValue({
      tasks: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 1 }
    });

    renderTaskUserPanel();

    await waitFor(() => expect(mockedApi.myTasks).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByPlaceholderText("titulo ou descricao"), {
      target: { value: "falha" }
    });

    await waitFor(() => expect(mockedApi.myTasks).toHaveBeenLastCalledWith("?search=falha"));
  });
});
