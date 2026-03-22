import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { AuthUser, TaskEventItem, TaskItem, TaskPriority, TaskRepeatType, TaskStatus } from "../types";
import {
  TASK_BOARD_COLUMNS,
  buildTaskEventSummary,
  buildTaskRecurrenceSummary,
  formatTaskDateTime,
  TASK_PRIORITY_BADGES,
  TASK_PRIORITY_LABELS,
  TASK_REPEAT_LABELS,
  TASK_STATUS_BADGES,
  TASK_STATUS_LABELS,
  toApiDueAt,
  toDateTimeLocalValue,
  WEEKDAY_SHORT_LABELS
} from "./tasks/taskUi";

interface TaskUserPanelProps {
  user: AuthUser;
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

type UserTaskFilterStatus = "" | TaskStatus;
type UserTaskFilterPriority = "" | TaskPriority;
type TaskViewMode = "list" | "board";

type TaskFormState = {
  id: number;
  title: string;
  description: string;
  priority: TaskPriority;
  dueAt: string;
  repeatType: TaskRepeatType;
  weekdays: number[];
  assignToMe: boolean;
};

const EMPTY_FORM: TaskFormState = {
  id: 0,
  title: "",
  description: "",
  priority: "normal",
  dueAt: "",
  repeatType: "none",
  weekdays: [],
  assignToMe: true
};

export const TaskUserPanel = ({ user, onError, onToast }: TaskUserPanelProps) => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [taskEvents, setTaskEvents] = useState<TaskEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form, setForm] = useState<TaskFormState>(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState<UserTaskFilterStatus>("");
  const [priorityFilter, setPriorityFilter] = useState<UserTaskFilterPriority>("");
  const [viewMode, setViewMode] = useState<TaskViewMode>("list");
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

    const query = params.toString();
    return query ? `?${query}` : "";
  }, [priorityFilter, statusFilter]);

  const loadTasks = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);

    try {
      const response = await api.myTasks(buildQuery());
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      const nextTasks = response.tasks as TaskItem[];
      setTasks(nextTasks);
      setSelectedTask((current) =>
        current ? nextTasks.find((task) => task.id === current.id) ?? null : nextTasks[0] ?? null
      );
    } catch (error) {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      onError(error instanceof ApiError ? error.message : "Falha ao carregar tarefas");
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
        const response = await api.myTask(taskId);
        if (requestId !== detailRequestIdRef.current) {
          return;
        }

        setSelectedTask(response.task as TaskItem);
        setTaskEvents(response.events as TaskEventItem[]);
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

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!selectedTask) {
      setTaskEvents([]);
      return;
    }

    void loadTaskDetail(selectedTask.id);
  }, [loadTaskDetail, selectedTask?.id]);

  const taskStats = useMemo(
    () => ({
      total: tasks.length,
      open: tasks.filter((task) => task.status !== "done" && task.status !== "cancelled").length,
      done: tasks.filter((task) => task.status === "done").length,
      critical: tasks.filter((task) => task.priority === "critical" && task.status !== "done").length
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
      assignToMe: task.assigneeUserId === task.creatorUserId || task.assigneeUserId !== null
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
    const payload = {
      title: form.title,
      description: form.description,
      priority: form.priority,
      due_at: toApiDueAt(form.dueAt),
      repeat_type: form.repeatType,
      weekdays: form.repeatType === "weekly" ? form.weekdays : [],
      assignee_user_id: form.assignToMe ? user.id : null
    };

    if (!form.title.trim()) {
      onError("Informe um titulo para a tarefa");
      return;
    }

    try {
      if (form.id > 0) {
        const response = await api.updateMyTask(form.id, payload);
        resetForm();
        await reloadAndSelect((response.task as TaskItem).id, "Tarefa atualizada");
        return;
      }

      const response = await api.createMyTask({
        ...payload
      });
      resetForm();
      await reloadAndSelect((response.task as TaskItem).id, "Tarefa criada");
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao salvar tarefa");
    }
  }, [form, onError, reloadAndSelect, resetForm, selectedTask?.assigneeUserId]);

  const updateTaskStatus = useCallback(
    async (taskId: number, status: "new" | "in_progress" | "waiting") => {
      try {
        await api.updateMyTask(taskId, { status });
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
        await api.completeMyTask(taskId);
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
        await api.cancelMyTask(taskId);
        await reloadAndSelect(taskId, "Tarefa cancelada");
      } catch (error) {
        onError(error instanceof ApiError ? error.message : "Falha ao cancelar tarefa");
      }
    },
    [onError, reloadAndSelect]
  );

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
        <p className="text-sm text-textMuted">Lista inicial de trabalho operacional do usuario</p>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Total</p>
          <p className="mt-2 font-display text-2xl text-textMain">{taskStats.total}</p>
          <p className="mt-1 text-xs text-textMuted">Tarefas no filtro atual</p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Abertas</p>
          <p className="mt-2 font-display text-2xl text-textMain">{taskStats.open}</p>
          <p className="mt-1 text-xs text-textMuted">Novas, em andamento ou aguardando</p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-success">Concluidas</p>
          <p className="mt-2 font-display text-2xl text-textMain">{taskStats.done}</p>
          <p className="mt-1 text-xs text-textMuted">Execucao finalizada</p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-danger">Criticas</p>
          <p className="mt-2 font-display text-2xl text-textMain">{taskStats.critical}</p>
          <p className="mt-1 text-xs text-textMuted">Prioridade critica pendente</p>
        </article>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
        <div className="space-y-4">
          <article className="space-y-3 rounded-2xl border border-slate-700 bg-panel p-4">
            <div>
              <h4 className="font-display text-base text-textMain">
                {form.id > 0 ? "Editar tarefa" : "Nova tarefa"}
              </h4>
              <p className="text-sm text-textMuted">Cadastro inicial sem board e sem automacoes</p>
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

            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="input"
                aria-label="Prioridade da tarefa"
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
                aria-label="Prazo da tarefa"
                type="datetime-local"
                value={form.dueAt}
                onChange={(event) => setForm((prev) => ({ ...prev, dueAt: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <select
                aria-label="Recorrencia da tarefa"
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
                      aria-label={`Dia da recorrencia ${item.full}`}
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

            <label className="flex items-center gap-2 text-sm text-textMain">
              <input
                checked={form.assignToMe}
                onChange={(event) => setForm((prev) => ({ ...prev, assignToMe: event.target.checked }))}
                type="checkbox"
              />
              Atribuir a mim
            </label>

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
                <h4 className="font-display text-base text-textMain">Minhas tarefas</h4>
                <p className="text-sm text-textMuted">
                  Operacao inicial com filtros por status, prioridade e visao em board
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="flex rounded-xl border border-slate-600 bg-panelAlt/40 p-1">
                  <button
                    className={`rounded-lg px-3 py-1.5 text-xs transition ${
                      viewMode === "list" ? "bg-accent text-slate-900" : "text-textMuted"
                    }`}
                    onClick={() => setViewMode("list")}
                    type="button"
                  >
                    Lista
                  </button>
                  <button
                    className={`rounded-lg px-3 py-1.5 text-xs transition ${
                      viewMode === "board" ? "bg-accent text-slate-900" : "text-textMuted"
                    }`}
                    onClick={() => setViewMode("board")}
                    type="button"
                  >
                    Board
                  </button>
                </div>
                <select
                  className="input min-w-36"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as UserTaskFilterStatus)}
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
                  onChange={(event) => setPriorityFilter(event.target.value as UserTaskFilterPriority)}
                >
                  <option value="">Todas as prioridades</option>
                  <option value="low">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="critical">Critica</option>
                </select>
              </div>
            </div>

            {loading && <p className="text-sm text-textMuted">Carregando tarefas...</p>}
            {!loading && tasks.length === 0 && (
              <p className="text-sm text-textMuted">Nenhuma tarefa encontrada para os filtros atuais.</p>
            )}

            {viewMode === "list" ? (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedTask?.id === task.id
                        ? "border-accent bg-accent/10"
                        : "border-slate-700 bg-panelAlt/70 hover:border-slate-500"
                    }`}
                    onClick={() => setSelectedTask(task)}
                    type="button"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-textMain">{task.title}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] ${TASK_STATUS_BADGES[task.status]}`}>
                          {TASK_STATUS_LABELS[task.status]}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] ${TASK_PRIORITY_BADGES[task.priority]}`}>
                          {TASK_PRIORITY_LABELS[task.priority]}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-textMuted">{task.description || "Sem descricao"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-textMuted">
                      <span>Prazo: {formatTaskDateTime(task.dueAt)}</span>
                      <span>Recorrencia: {buildTaskRecurrenceSummary(task.repeatType, task.repeatWeekdays)}</span>
                      <span>Criada: {formatTaskDateTime(task.createdAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-5">
                {boardColumns.map((column) => (
                  <section
                    key={column.status}
                    aria-label={`Coluna ${column.label}`}
                    className="min-h-40 rounded-2xl border border-slate-700 bg-panelAlt/50 p-3"
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
                          className={`w-full rounded-xl border p-3 text-left transition ${
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
                            <p className="text-sm font-medium text-textMain">{task.title}</p>
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] ${TASK_PRIORITY_BADGES[task.priority]}`}
                            >
                              {TASK_PRIORITY_LABELS[task.priority]}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-3 text-xs text-textMuted">
                            {task.description || "Sem descricao"}
                          </p>
                          <div className="mt-2 space-y-1 text-[11px] text-textMuted">
                            <p>Prazo: {formatTaskDateTime(task.dueAt)}</p>
                            <p>Responsavel: {task.assigneeName || "Nao atribuido"}</p>
                          </div>
                          {task.status !== "done" && task.status !== "cancelled" && (
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
            )}
          </article>
        </div>

        <aside className="rounded-2xl border border-slate-700 bg-panel p-4">
          {!selectedTask && <p className="text-sm text-textMuted">Selecione uma tarefa.</p>}
          {selectedTask && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-accent">Detalhe da tarefa</p>
                  <h4 className="mt-1 font-display text-lg text-textMain">{selectedTask.title}</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] ${TASK_STATUS_BADGES[selectedTask.status]}`}>
                    {TASK_STATUS_LABELS[selectedTask.status]}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] ${TASK_PRIORITY_BADGES[selectedTask.priority]}`}>
                    {TASK_PRIORITY_LABELS[selectedTask.priority]}
                  </span>
                </div>
              </div>

              <p className="whitespace-pre-wrap text-sm text-textMain">
                {selectedTask.description || "Sem descricao registrada"}
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl bg-panelAlt/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Responsavel</p>
                  <p className="mt-1 text-sm text-textMain">
                    {selectedTask.assigneeName || "Nao atribuido"}
                  </p>
                </div>
                <div className="rounded-xl bg-panelAlt/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Prazo</p>
                  <p className="mt-1 text-sm text-textMain">{formatTaskDateTime(selectedTask.dueAt)}</p>
                </div>
                <div className="rounded-xl bg-panelAlt/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Recorrencia</p>
                  <p className="mt-1 text-sm text-textMain">
                    {buildTaskRecurrenceSummary(selectedTask.repeatType, selectedTask.repeatWeekdays)}
                  </p>
                </div>
                <div className="rounded-xl bg-panelAlt/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Criada por</p>
                  <p className="mt-1 text-sm text-textMain">{selectedTask.creatorName ?? "-"}</p>
                </div>
                <div className="rounded-xl bg-panelAlt/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Atualizada em</p>
                  <p className="mt-1 text-sm text-textMain">{formatTaskDateTime(selectedTask.updatedAt)}</p>
                </div>
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
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Timeline inicial</p>
                  {detailLoading && <span className="text-[11px] text-textMuted">Atualizando...</span>}
                </div>
                {taskEvents.length === 0 && !detailLoading && (
                  <p className="text-sm text-textMuted">Nenhum evento registrado ainda.</p>
                )}
                <div className="space-y-2">
                  {taskEvents.map((event) => (
                    <div key={event.id} className="rounded-xl border border-slate-700 bg-panelAlt/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-textMain">{buildTaskEventSummary(event)}</p>
                        <span className="text-[11px] text-textMuted">{formatTaskDateTime(event.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-textMuted">
                        {event.actorName ? `Por ${event.actorName}` : "Evento automatico/sem ator"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};
