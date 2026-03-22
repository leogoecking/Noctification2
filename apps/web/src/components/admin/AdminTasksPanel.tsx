import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { api, ApiError } from "../../lib/api";
import type {
  TaskItem,
  TaskPriority,
  TaskRepeatType,
  TaskStatus,
  TaskTimelineItem,
  UserItem
} from "../../types";
import {
  TASK_BOARD_COLUMNS,
  buildTaskTimelineSummary,
  buildTaskRecurrenceSummary,
  formatTaskDateTime,
  isTaskTimelineAutomatic,
  TASK_PRIORITY_BADGES,
  TASK_PRIORITY_LABELS,
  TASK_REPEAT_LABELS,
  TASK_STATUS_BADGES,
  TASK_STATUS_LABELS,
  toApiDueAt,
  toDateTimeLocalValue,
  WEEKDAY_SHORT_LABELS
} from "../tasks/taskUi";

interface AdminTasksPanelProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

type AdminTaskFilterStatus = "" | TaskStatus;
type AdminTaskFilterPriority = "" | TaskPriority;

type TaskAdminFormState = {
  id: number;
  title: string;
  description: string;
  priority: TaskPriority;
  dueAt: string;
  repeatType: TaskRepeatType;
  weekdays: number[];
  assigneeUserId: string;
};

const EMPTY_FORM: TaskAdminFormState = {
  id: 0,
  title: "",
  description: "",
  priority: "normal",
  dueAt: "",
  repeatType: "none",
  weekdays: [],
  assigneeUserId: ""
};

export const AdminTasksPanel = ({ onError, onToast }: AdminTasksPanelProps) => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [taskTimeline, setTaskTimeline] = useState<TaskTimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [form, setForm] = useState<TaskAdminFormState>(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState<AdminTaskFilterStatus>("");
  const [priorityFilter, setPriorityFilter] = useState<AdminTaskFilterPriority>("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const loadRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();

    if (statusFilter) {
      params.set("status", statusFilter);
    }

    if (priorityFilter) {
      params.set("priority", priorityFilter);
    }

    if (assigneeFilter) {
      params.set("assignee_user_id", assigneeFilter);
    }

    const query = params.toString();
    return query ? `?${query}` : "";
  }, [assigneeFilter, priorityFilter, statusFilter]);

  const loadTasks = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);

    try {
      const [tasksResponse, usersResponse] = await Promise.all([api.adminTasks(buildQuery()), api.adminUsers()]);
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      const nextTasks = tasksResponse.tasks as TaskItem[];
      setTasks(nextTasks);
      setUsers((usersResponse.users as UserItem[]).filter((user) => user.isActive));
      setSelectedTask((current) => (current ? nextTasks.find((task) => task.id === current.id) ?? null : null));
    } catch (error) {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      onError(error instanceof ApiError ? error.message : "Falha ao carregar tarefas administrativas");
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [buildQuery, onError]);

  const loadTaskDetail = useCallback(
    async (taskId: number) => {
      const requestId = detailRequestIdRef.current + 1;
      detailRequestIdRef.current = requestId;
      setDetailLoading(true);

      try {
        const response = await api.adminTask(taskId);
        if (requestId !== detailRequestIdRef.current) {
          return;
        }

        const nextTask = response.task as TaskItem;
        setSelectedTask(nextTask);
        setTasks((current) =>
          current.some((task) => task.id === nextTask.id)
            ? current.map((task) => (task.id === nextTask.id ? nextTask : task))
            : current
        );
        setTaskTimeline(response.timeline as TaskTimelineItem[]);
      } catch (error) {
        if (requestId !== detailRequestIdRef.current) {
          return;
        }

        onError(error instanceof ApiError ? error.message : "Falha ao carregar detalhe da tarefa");
      } finally {
        if (requestId === detailRequestIdRef.current) {
          setDetailLoading(false);
        }
      }
    },
    [onError]
  );

  const refreshTaskViews = useCallback(async () => {
    await loadTasks();

    if (selectedTask) {
      await loadTaskDetail(selectedTask.id);
    }
  }, [loadTaskDetail, loadTasks, selectedTask]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshTaskViews();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshTaskViews]);

  useEffect(() => {
    if (!selectedTask) {
      setTaskTimeline([]);
      setCommentBody("");
      return;
    }

    void loadTaskDetail(selectedTask.id);
  }, [loadTaskDetail, selectedTask?.id]);

  useEffect(() => {
    if (!selectedTask) {
      return;
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedTask(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedTask]);

  const taskStats = useMemo(
    () => ({
      total: tasks.length,
      open: tasks.filter((task) => task.status !== "done" && task.status !== "cancelled").length,
      done: tasks.filter((task) => task.status === "done").length,
      unassigned: tasks.filter((task) => task.assigneeUserId === null).length
    }),
    [tasks]
  );

  const boardColumns = useMemo(
    () =>
      TASK_BOARD_COLUMNS.map((status) => ({
        status,
        label: TASK_STATUS_LABELS[status],
        tasks: tasks.filter((task) => task.status === status)
      })),
    [tasks]
  );

  const startEditing = useCallback((task: TaskItem) => {
    setForm({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueAt: toDateTimeLocalValue(task.dueAt),
      repeatType: task.repeatType,
      weekdays: task.repeatWeekdays,
      assigneeUserId: task.assigneeUserId ? String(task.assigneeUserId) : ""
    });
  }, []);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
  }, []);

  const reloadAndSelect = useCallback(
    async (taskId: number, successMessage: string) => {
      await loadTasks();
      await loadTaskDetail(taskId);
      onToast(successMessage);
    },
    [loadTaskDetail, loadTasks, onToast]
  );

  const saveTask = useCallback(async () => {
    if (!form.title.trim()) {
      onError("Informe um titulo para a tarefa");
      return;
    }

    const payload = {
      title: form.title,
      description: form.description,
      priority: form.priority,
      due_at: toApiDueAt(form.dueAt),
      repeat_type: form.repeatType,
      weekdays: form.repeatType === "weekly" ? form.weekdays : [],
      assignee_user_id: form.assigneeUserId ? Number(form.assigneeUserId) : null
    };

    try {
      if (form.id > 0) {
        const response = await api.updateAdminTask(form.id, payload);
        resetForm();
        await reloadAndSelect((response.task as TaskItem).id, "Tarefa atualizada");
        return;
      }

      const response = await api.createAdminTask(payload);
      resetForm();
      await reloadAndSelect((response.task as TaskItem).id, "Tarefa criada");
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao salvar tarefa");
    }
  }, [form, onError, reloadAndSelect, resetForm]);

  const updateTaskStatus = useCallback(
    async (taskId: number, status: "new" | "in_progress" | "waiting") => {
      try {
        await api.updateAdminTask(taskId, { status });
        await reloadAndSelect(taskId, `Status atualizado para ${TASK_STATUS_LABELS[status]}`);
      } catch (error) {
        onError(error instanceof ApiError ? error.message : "Falha ao atualizar status");
      }
    },
    [onError, reloadAndSelect]
  );

  const completeTask = useCallback(
    async (taskId: number) => {
      try {
        await api.completeAdminTask(taskId);
        await reloadAndSelect(taskId, "Tarefa concluida");
      } catch (error) {
        onError(error instanceof ApiError ? error.message : "Falha ao concluir tarefa");
      }
    },
    [onError, reloadAndSelect]
  );

  const cancelTask = useCallback(
    async (taskId: number) => {
      try {
        await api.cancelAdminTask(taskId);
        await reloadAndSelect(taskId, "Tarefa cancelada");
      } catch (error) {
        onError(error instanceof ApiError ? error.message : "Falha ao cancelar tarefa");
      }
    },
    [onError, reloadAndSelect]
  );

  const submitComment = useCallback(async () => {
    if (!selectedTask) {
      return;
    }

    const body = commentBody.trim();
    if (!body) {
      onError("Informe um comentario antes de enviar");
      return;
    }

    setCommentSaving(true);
    try {
      await api.createAdminTaskComment(selectedTask.id, { body });
      setCommentBody("");
      await loadTaskDetail(selectedTask.id);
      onToast("Comentario registrado");
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao registrar comentario");
    } finally {
      setCommentSaving(false);
    }
  }, [commentBody, loadTaskDetail, onError, onToast, selectedTask]);

  const runBoardAction = useCallback(
    (event: MouseEvent<HTMLButtonElement>, action: () => void) => {
      event.stopPropagation();
      void action();
    },
    []
  );

  const openTaskFromBoard = useCallback((task: TaskItem) => {
    setSelectedTask(task);
  }, []);

  const onBoardCardKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>, task: TaskItem) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedTask(task);
    }
  }, []);

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-slate-700 bg-panel p-4">
        <h3 className="font-display text-lg text-textMain">Tarefas</h3>
        <p className="text-sm text-textMuted">Operacao, atribuicao e acompanhamento de tarefas</p>
      </header>

      <article className="rounded-2xl border border-slate-700 bg-panel p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Visao rapida</p>
            <h4 className="mt-1 font-display text-base text-textMain">Fila atual</h4>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-panelAlt px-3 py-1.5 text-textMain">{taskStats.total} no filtro</span>
            <span className="rounded-full bg-accent/10 px-3 py-1.5 text-accent">{taskStats.open} abertas</span>
            <span className="rounded-full bg-success/20 px-3 py-1.5 text-success">{taskStats.done} concluidas</span>
            <span className="rounded-full bg-warning/20 px-3 py-1.5 text-warning">
              {taskStats.unassigned} sem responsavel
            </span>
          </div>
        </div>
      </article>

      <div className="space-y-4">
          <article className="space-y-3 rounded-2xl border border-slate-700 bg-panel p-4">
            <div>
              <h4 className="font-display text-base text-textMain">
                {form.id > 0 ? "Editar tarefa" : "Nova tarefa administrativa"}
              </h4>
              <p className="text-sm text-textMuted">Cadastro e atribuicao da tarefa</p>
            </div>

            <input
              className="input"
              placeholder="Titulo da tarefa"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
            <textarea
              className="input min-h-24"
              placeholder="Descricao opcional"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />

            <div className="grid gap-3 md:grid-cols-3">
              <select
                className="input"
                aria-label="Prioridade da tarefa admin"
                value={form.priority}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, priority: event.target.value as TaskPriority }))
                }
              >
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="critical">Critica</option>
              </select>
              <input
                className="input"
                aria-label="Prazo da tarefa admin"
                type="datetime-local"
                value={form.dueAt}
                onChange={(event) => setForm((prev) => ({ ...prev, dueAt: event.target.value }))}
              />
              <select
                className="input"
                aria-label="Responsavel da tarefa"
                value={form.assigneeUserId}
                onChange={(event) => setForm((prev) => ({ ...prev, assigneeUserId: event.target.value }))}
              >
                <option value="">Sem responsavel</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.login})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <select
                aria-label="Recorrencia da tarefa admin"
                className="input"
                value={form.repeatType}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    repeatType: event.target.value as TaskRepeatType,
                    weekdays: event.target.value === "weekly" ? prev.weekdays : []
                  }))
                }
              >
                <option value="none">{TASK_REPEAT_LABELS.none}</option>
                <option value="daily">{TASK_REPEAT_LABELS.daily}</option>
                <option value="weekly">{TASK_REPEAT_LABELS.weekly}</option>
                <option value="monthly">{TASK_REPEAT_LABELS.monthly}</option>
                <option value="weekdays">{TASK_REPEAT_LABELS.weekdays}</option>
              </select>

              {form.repeatType === "weekly" && (
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_SHORT_LABELS.map((item) => (
                    <button
                      key={item.value}
                      aria-label={`Dia da recorrencia admin ${item.full}`}
                      className={`rounded-lg border px-3 py-2 text-xs ${
                        form.weekdays.includes(item.value)
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-slate-600 text-textMuted"
                      }`}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          weekdays: prev.weekdays.includes(item.value)
                            ? prev.weekdays.filter((value) => value !== item.value)
                            : [...prev.weekdays, item.value].sort((a, b) => a - b)
                        }))
                      }
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={saveTask} type="button">
                {form.id > 0 ? "Salvar tarefa" : "Criar tarefa"}
              </button>
              {form.id > 0 && (
                <button
                  className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain"
                  onClick={resetForm}
                  type="button"
                >
                  Cancelar edicao
                </button>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-panel p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-display text-base text-textMain">Fila de tarefas</h4>
                <p className="text-sm text-textMuted">Filtros e visao por status</p>
              </div>
              <span className="rounded-full bg-accent/10 px-3 py-1.5 text-xs text-accent">Board</span>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain"
                onClick={() => void refreshTaskViews()}
                type="button"
              >
                Atualizar tarefas
              </button>
              <div className="grid flex-1 gap-2 sm:grid-cols-3">
                <select
                  className="input min-w-36"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as AdminTaskFilterStatus)}
                >
                  <option value="">Todos os status</option>
                  <option value="new">Nova</option>
                  <option value="in_progress">Em andamento</option>
                  <option value="waiting">Aguardando</option>
                  <option value="done">Concluida</option>
                  <option value="cancelled">Cancelada</option>
                </select>
                <select
                  className="input min-w-36"
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value as AdminTaskFilterPriority)}
                >
                  <option value="">Todas as prioridades</option>
                  <option value="low">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="critical">Critica</option>
                </select>
                <select
                  className="input min-w-36"
                  value={assigneeFilter}
                  onChange={(event) => setAssigneeFilter(event.target.value)}
                >
                  <option value="">Todos os responsaveis</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading && <p className="text-sm text-textMuted">Carregando tarefas...</p>}
            {!loading && tasks.length === 0 && (
              <p className="text-sm text-textMuted">Nenhuma tarefa encontrada para os filtros atuais.</p>
            )}

            <div className="flex gap-3 overflow-x-auto pb-2">
              {boardColumns.map((column) => (
                <section
                  key={column.status}
                  aria-label={`Coluna ${column.label}`}
                  className="min-h-40 min-w-[240px] flex-1 rounded-2xl border border-slate-700 bg-panelAlt/50 p-3"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] ${TASK_STATUS_BADGES[column.status]}`}>
                      {column.label}
                    </span>
                    <span className="text-xs text-textMuted">{column.tasks.length}</span>
                  </div>

                  <div className="space-y-2">
                    {column.tasks.length === 0 && (
                      <p className="rounded-xl border border-dashed border-slate-600 px-3 py-4 text-xs text-textMuted">
                        Nenhuma tarefa nesta coluna.
                      </p>
                    )}

                    {column.tasks.map((task) => (
                      <div
                        key={task.id}
                        aria-label={`Abrir tarefa ${task.title}`}
                        className={`w-full cursor-pointer rounded-xl border p-3 text-left transition ${
                          selectedTask?.id === task.id
                            ? "border-accent bg-accent/10"
                            : "border-slate-700 bg-panel hover:border-slate-500"
                        }`}
                        onClick={() => openTaskFromBoard(task)}
                        onKeyDown={(event) => onBoardCardKeyDown(event, task)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 break-words text-sm font-medium text-textMain">{task.title}</p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${TASK_PRIORITY_BADGES[task.priority]}`}
                          >
                            {TASK_PRIORITY_LABELS[task.priority]}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-textMuted">
                          <span>Responsavel: {task.assigneeName || "Nao atribuido"}</span>
                          <span>Prazo: {formatTaskDateTime(task.dueAt)}</span>
                        </div>
                        <p className="mt-2 text-[11px] text-textMuted">
                          {selectedTask?.id === task.id ? "Aberta no detalhe" : "Clique para abrir"}
                        </p>
                        {selectedTask?.id === task.id && task.status !== "done" && task.status !== "cancelled" && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {task.status !== "new" && (
                              <button
                                className="rounded-md border border-slate-600 px-2 py-1 text-[10px] text-textMuted"
                                onClick={(event) => runBoardAction(event, () => updateTaskStatus(task.id, "new"))}
                                type="button"
                              >
                                Nova
                              </button>
                            )}
                            {task.status !== "in_progress" && (
                              <button
                                className="rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-[10px] text-warning"
                                onClick={(event) =>
                                  runBoardAction(event, () => updateTaskStatus(task.id, "in_progress"))
                                }
                                type="button"
                              >
                                Em andamento
                              </button>
                            )}
                            {task.status !== "waiting" && (
                              <button
                                className="rounded-md border border-slate-600 px-2 py-1 text-[10px] text-textMuted"
                                onClick={(event) => runBoardAction(event, () => updateTaskStatus(task.id, "waiting"))}
                                type="button"
                              >
                                Aguardar
                              </button>
                            )}
                            <button
                              className="rounded-md bg-success px-2 py-1 text-[10px] font-semibold text-slate-900"
                              onClick={(event) => runBoardAction(event, () => completeTask(task.id))}
                              type="button"
                            >
                              Concluir
                            </button>
                            <button
                              className="rounded-md border border-danger/50 bg-danger/10 px-2 py-1 text-[10px] text-danger"
                              onClick={(event) => runBoardAction(event, () => cancelTask(task.id))}
                              type="button"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </article>
      </div>

      {selectedTask && (
        <div
          aria-label="Overlay de detalhe da tarefa"
          className="fixed inset-0 z-40 flex justify-end bg-slate-950/70 p-3 sm:p-6"
          onClick={() => setSelectedTask(null)}
        >
          <aside
            aria-label="Detalhe da tarefa"
            aria-modal="true"
            className="h-full w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-panel p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-accent">Detalhe da tarefa</p>
                  <h4 className="mt-1 font-display text-lg text-textMain">{selectedTask.title}</h4>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] ${TASK_STATUS_BADGES[selectedTask.status]}`}>
                    {TASK_STATUS_LABELS[selectedTask.status]}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] ${TASK_PRIORITY_BADGES[selectedTask.priority]}`}>
                    {TASK_PRIORITY_LABELS[selectedTask.priority]}
                  </span>
                  <button
                    aria-label="Fechar detalhe da tarefa"
                    className="rounded-full border border-slate-600 px-3 py-1 text-xs text-textMain"
                    onClick={() => setSelectedTask(null)}
                    type="button"
                  >
                    Fechar
                  </button>
                </div>
              </div>

              <p className="whitespace-pre-wrap text-sm text-textMain">
                {selectedTask.description || "Sem descricao registrada"}
              </p>

              <div className="rounded-2xl bg-panelAlt/70 p-4">
                <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,120px),1fr]">
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Responsavel</dt>
                  <dd className="text-sm text-textMain">{selectedTask.assigneeName || "Nao atribuido"}</dd>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Criada por</dt>
                  <dd className="text-sm text-textMain">{selectedTask.creatorName || "-"}</dd>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Prazo</dt>
                  <dd className="text-sm text-textMain">{formatTaskDateTime(selectedTask.dueAt)}</dd>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Recorrencia</dt>
                  <dd className="text-sm text-textMain">
                    {buildTaskRecurrenceSummary(selectedTask.repeatType, selectedTask.repeatWeekdays)}
                  </dd>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Atualizada em</dt>
                  <dd className="text-sm text-textMain">{formatTaskDateTime(selectedTask.updatedAt)}</dd>
                </dl>
              </div>

              {selectedTask.status !== "done" && selectedTask.status !== "cancelled" && (
                <div className="space-y-2 rounded-2xl border border-slate-700 bg-panelAlt/60 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Acoes rapidas</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      className="rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent"
                      onClick={() => startEditing(selectedTask)}
                      type="button"
                    >
                      Editar
                    </button>
                    <button
                      className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning"
                      onClick={() => updateTaskStatus(selectedTask.id, "in_progress")}
                      type="button"
                    >
                      Marcar em andamento
                    </button>
                    <button
                      className="rounded-xl border border-slate-600 px-3 py-2 text-sm text-textMain"
                      onClick={() => updateTaskStatus(selectedTask.id, "waiting")}
                      type="button"
                    >
                      Marcar aguardando
                    </button>
                    <button
                      className="rounded-xl bg-success px-3 py-2 text-sm font-semibold text-slate-900"
                      onClick={() => completeTask(selectedTask.id)}
                      type="button"
                    >
                      Concluir
                    </button>
                    <button
                      className="rounded-xl border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger sm:col-span-2"
                      onClick={() => cancelTask(selectedTask.id)}
                      type="button"
                    >
                      Cancelar tarefa
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="rounded-2xl border border-slate-700 bg-panelAlt/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Comentarios</p>
                    {commentSaving && <span className="text-[11px] text-textMuted">Enviando...</span>}
                  </div>
                  <textarea
                    aria-label="Comentario administrativo da tarefa"
                    className="input mt-3 min-h-24"
                    placeholder="Registrar contexto administrativo"
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.target.value)}
                  />
                  <div className="mt-3 flex justify-end">
                    <button className="btn-primary" onClick={() => void submitComment()} type="button">
                      Adicionar comentario
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Historico da tarefa</p>
                  {detailLoading && <span className="text-[11px] text-textMuted">Atualizando...</span>}
                </div>
                {taskTimeline.length === 0 && !detailLoading && (
                  <p className="text-sm text-textMuted">Nenhum historico registrado ainda.</p>
                )}
                <div className="space-y-2">
                  {taskTimeline.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-700 bg-panelAlt/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-textMain">{buildTaskTimelineSummary(item)}</p>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] ${
                              item.kind === "comment"
                                ? "bg-accent/10 text-accent"
                                : isTaskTimelineAutomatic(item)
                                  ? "bg-warning/20 text-warning"
                                  : "bg-panel text-textMuted"
                            }`}
                          >
                            {item.kind === "comment" ? "Comentario" : isTaskTimelineAutomatic(item) ? "Automatico" : "Evento"}
                          </span>
                        </div>
                        <span className="text-[11px] text-textMuted">{formatTaskDateTime(item.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-textMuted">
                        {item.actorName ? `Por ${item.actorName}` : "Evento automatico/sem ator"}
                      </p>
                      {item.kind === "comment" && item.body && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-textMain">{item.body}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

    </section>
  );
};
