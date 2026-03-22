import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskUserPanel } from "./TaskUserPanel";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
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

describe("TaskUserPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    render(
      <TaskUserPanel
        user={{ id: 2, login: "user", name: "Usuario", role: "user" }}
        onError={vi.fn()}
        onToast={vi.fn()}
      />
    );

    await waitFor(() => expect(mockedApi.myTasks).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Abrir tarefa Investigar falha" }));
    await waitFor(() => expect(mockedApi.myTask).toHaveBeenCalledWith(1));

    expect(screen.getByRole("heading", { name: "Investigar falha" })).toBeInTheDocument();
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
      task: {
        id: 22
      }
    });

    render(
      <TaskUserPanel
        user={{ id: 2, login: "user", name: "Usuario", role: "user" }}
        onError={vi.fn()}
        onToast={vi.fn()}
      />
    );

    await waitFor(() => expect(mockedApi.myTasks).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /Abrir formulario/ }));
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

    const newColumn = screen.getByLabelText("Coluna Nova");
    const inProgressColumn = screen.getByLabelText("Coluna Em andamento");

    expect(newColumn).toBeInTheDocument();
    expect(inProgressColumn).toBeInTheDocument();
    expect(within(newColumn).getByText("Nova tarefa")).toBeInTheDocument();
    expect(within(inProgressColumn).getAllByText("Em andamento").length).toBeGreaterThan(0);
  });

  it("permite mudar o status pelo board", async () => {
    mockedApi.myTasks
      .mockResolvedValueOnce({
        tasks: [
          {
            id: 3,
            title: "Aguardando retorno",
            description: "",
            status: "waiting",
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
            title: "Aguardando retorno",
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
        title: "Aguardando retorno",
        description: "",
        status: "waiting",
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
      task: { id: 3 }
    });

    render(
      <TaskUserPanel
        user={{ id: 2, login: "user", name: "Usuario", role: "user" }}
        onError={vi.fn()}
        onToast={vi.fn()}
      />
    );

    await waitFor(() => expect(mockedApi.myTasks).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Abrir tarefa Aguardando retorno" }));
    await waitFor(() => expect(mockedApi.myTask).toHaveBeenCalledWith(3));
    fireEvent.click(screen.getByRole("button", { name: "Em andamento" }));

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
      comment: { id: 91 }
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
});
