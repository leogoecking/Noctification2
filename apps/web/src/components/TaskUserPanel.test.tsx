import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskUserPanel } from "./TaskUserPanel";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    myTasks: vi.fn(),
    myTask: vi.fn(),
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

  it("carrega lista inicial e detalhe da primeira tarefa", async () => {
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
      events: [
        {
          id: 10,
          taskId: 1,
          actorUserId: 2,
          actorName: "Usuario",
          actorLogin: "user",
          eventType: "created",
          fromStatus: null,
          toStatus: "new",
          metadata: null,
          createdAt: "2026-03-21T12:00:00.000Z"
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
    await waitFor(() => expect(mockedApi.myTask).toHaveBeenCalledWith(1));

    expect(screen.getByRole("heading", { name: "Investigar falha" })).toBeInTheDocument();
    expect(screen.getByText("Timeline inicial")).toBeInTheDocument();
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
      events: []
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
      events: []
    });

    render(
      <TaskUserPanel
        user={{ id: 2, login: "user", name: "Usuario", role: "user" }}
        onError={vi.fn()}
        onToast={vi.fn()}
      />
    );

    await waitFor(() => expect(mockedApi.myTasks).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Board" }));

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
      events: []
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

    fireEvent.click(screen.getByRole("button", { name: "Board" }));
    fireEvent.click(within(screen.getByLabelText("Coluna Aguardando")).getByRole("button", { name: "Em andamento" }));

    await waitFor(() => expect(mockedApi.updateMyTask).toHaveBeenCalledWith(3, { status: "in_progress" }));
  });
});
