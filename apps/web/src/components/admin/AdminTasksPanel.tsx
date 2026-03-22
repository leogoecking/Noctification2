import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { api, ApiError } from "../../lib/api";
import type {
  TaskAutomationHealthItem,
  TaskAutomationLogItem,
  TaskEventItem,
  TaskItem,
  TaskPriority,
  TaskRepeatType,
  TaskStatus,
  UserItem
} from "../../types";
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
} from "../tasks/taskUi";

interface AdminTasksPanelProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

type AdminTaskFilterStatus = "" | TaskStatus;
type AdminTaskFilterPriority = "" | TaskPriority;
type TaskViewMode = "list" | "board";
type TaskAutomationFilter = "" | TaskAutomationLogItem["automationType"];

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
  const [taskEvents, setTaskEvents] = useState<TaskEventItem[]>([]);
  const [automationHealth, setAutomationHealth] = useState<TaskAutomationHealthItem | null>(null);
  const [automationLogs, setAutomationLogs] = useState<TaskAutomationLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form, setForm] = useState<TaskAdminFormState>(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState<AdminTaskFilterStatus>("");
  const [priorityFilter, setPriorityFilter] = useState<AdminTaskFilterPriority>("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [viewMode, setViewMode] = useState<TaskViewMode>("list");
  const [automationFilter, setAutomationFilter] = useState<TaskAutomationFilter>("");
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

  const buildAutomationLogsQuery = useCallback(() => {
    const params = new URLSearchParams();

    if (automationFilter) {
      params.set("automation_type", automationFilter);
    }

    params.set("limit", "20");
    const query = params.toString();
    return query ? `?${query}` : "";
  }, [automationFilter]);

  const loadTasks = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);

    try {
      const [tasksResponse, usersResponse, healthResponse, logsResponse] = await Promise.all([
        api.adminTasks(buildQuery()),
        api.adminUsers(),
        api.adminTaskHealth(),
        api.adminTaskAutomationLogs(buildAutomationLogsQuery())
      ]);
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      const nextTasks = tasksResponse.tasks as TaskItem[];
      setTasks(nextTasks);
      setUsers((usersResponse.users as UserItem[]).filter((user) => user.isActive));
      setAutomationHealth(healthResponse.health as TaskAutomationHealthItem);
      setAutomationLogs(logsResponse.logs as TaskAutomationLogItem[]);
      setSelectedTask((current) =>
        current ? nextTasks.find((task) => task.id === current.id) ?? null : nextTasks[0] ?? null
      );
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
  }, [buildAutomationLogsQuery, buildQuery, onError]);

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

  const automationStats = useMemo(
    () => ({
      dueSoonSentToday: automationHealth?.dueSoonSentToday ?? 0,
      overdueSentToday: automationHealth?.overdueSentToday ?? 0,
      staleSentToday: automationHealth?.staleSentToday ?? 0,
      recurringCreatedToday: automationHealth?.recurringCreatedToday ?? 0
    }),
    [automationHealth]
  );

  const formatAutomationType = (value: TaskAutomationLogItem["automationType"]): string => {
    if (value === "due_soon") return "Prazo proximo";
    if (value === "overdue") return "Atraso";
    if (value === "stale_task") return "Tarefa parada";
    return "Recorrencia";
  };

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
        <p className="text-sm text-textMuted">Lista administrativa inicial de tarefas operacionais</p>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Total</p>
          <p className="mt-2 font-display text-2xl text-textMain">{taskStats.total}</p>
          <p className="mt-1 text-xs text-textMuted">Itens no filtro atual</p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Abertas</p>
          <p className="mt-2 font-display text-2xl text-textMain">{taskStats.open}</p>
          <p className="mt-1 text-xs text-textMuted">Demandam acompanhamento</p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-success">Concluidas</p>
          <p className="mt-2 font-display text-2xl text-textMain">{taskStats.done}</p>
          <p className="mt-1 text-xs text-textMuted">Finalizadas no filtro atual</p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-warning">Sem responsavel</p>
          <p className="mt-2 font-display text-2xl text-textMain">{taskStats.unassigned}</p>
          <p className="mt-1 text-xs text-textMuted">Aguardando atribuicao</p>
        </article>
      </section>

      {automationHealth && !automationHealth.schedulerEnabled && (
        <article className="rounded-2xl border border-warning/50 bg-warning/10 p-4">
          <p className="font-display text-base text-textMain">Automacao de tarefas desativada</p>
          <p className="mt-1 text-sm text-textMuted">
            O scheduler operacional depende de `ENABLE_TASK_AUTOMATION_SCHEDULER` ligado na API.
          </p>
        </article>
      )}

      <section className="grid gap-3 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Prazo proximo hoje</p>
          <p className="mt-2 font-display text-2xl text-textMain">{automationStats.dueSoonSentToday}</p>
          <p className="mt-1 text-xs text-textMuted">
            Elegiveis agora: {automationHealth?.dueSoonEligible ?? 0}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-danger">Atrasos hoje</p>
          <p className="mt-2 font-display text-2xl text-textMain">{automationStats.overdueSentToday}</p>
          <p className="mt-1 text-xs text-textMuted">
            Elegiveis agora: {automationHealth?.overdueEligible ?? 0}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-warning">Paradas hoje</p>
          <p className="mt-2 font-display text-2xl text-textMain">{automationStats.staleSentToday}</p>
          <p className="mt-1 text-xs text-textMuted">
            Elegiveis agora: {automationHealth?.staleEligible ?? 0}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-success">Recorrencias hoje</p>
          <p className="mt-2 font-display text-2xl text-textMain">{automationStats.recurringCreatedToday}</p>
          <p className="mt-1 text-xs text-textMuted">
            Ativas: {automationHealth?.recurringEligible ?? 0} | janela stale:{" "}
            {automationHealth?.staleWindowHours ?? 0}h
          </p>
        </article>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4">
          <article className="space-y-3 rounded-2xl border border-slate-700 bg-panel p-4">
            <div>
              <h4 className="font-display text-base text-textMain">
                {form.id > 0 ? "Editar tarefa" : "Nova tarefa administrativa"}
              </h4>
              <p className="text-sm text-textMuted">Criacao e atribuicao inicial sem board</p>
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
                <p className="text-sm text-textMuted">
                  Operacao inicial com filtros, atribuicao e visao em board por status
                </p>
              </div>
              <div className="space-y-2">
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
                <div className="grid gap-2 sm:grid-cols-3">
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
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-textMuted">
                      <span>Responsavel: {task.assigneeName || "Nao atribuido"}</span>
                      <span>Prazo: {formatTaskDateTime(task.dueAt)}</span>
                      <span>Recorrencia: {buildTaskRecurrenceSummary(task.repeatType, task.repeatWeekdays)}</span>
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
                          <div className="mt-2 space-y-1 text-[11px] text-textMuted">
                            <p>Responsavel: {task.assigneeName || "Nao atribuido"}</p>
                            <p>Prazo: {formatTaskDateTime(task.dueAt)}</p>
                            <p>Recorrencia: {buildTaskRecurrenceSummary(task.repeatType, task.repeatWeekdays)}</p>
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
                  <p className="mt-1 text-sm text-textMain">{selectedTask.assigneeName || "Nao atribuido"}</p>
                </div>
                <div className="rounded-xl bg-panelAlt/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Criada por</p>
                  <p className="mt-1 text-sm text-textMain">{selectedTask.creatorName || "-"}</p>
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

      <article className="rounded-2xl border border-slate-700 bg-panel p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-display text-base text-textMain">Logs de automacao</h4>
            <p className="text-sm text-textMuted">
              Eventos recentes de prazo, atraso, inatividade e recorrencia
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Filtro de automacao de tarefa"
              className="input min-w-44"
              value={automationFilter}
              onChange={(event) => setAutomationFilter(event.target.value as TaskAutomationFilter)}
            >
              <option value="">Todas as automacoes</option>
              <option value="due_soon">Prazo proximo</option>
              <option value="overdue">Atraso</option>
              <option value="stale_task">Tarefa parada</option>
              <option value="recurring_task">Recorrencia</option>
            </select>
            <button
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain"
              onClick={() => void loadTasks()}
              type="button"
            >
              Atualizar logs
            </button>
          </div>
        </div>

        {automationHealth && (
          <p className="mb-3 text-xs text-textMuted">
            Tarefas ativas: {automationHealth.activeTasks} | janela prazo:{" "}
            {automationHealth.dueSoonWindowMinutes} min
          </p>
        )}

        {automationLogs.length === 0 ? (
          <p className="text-sm text-textMuted">Nenhum log de automacao encontrado para o filtro atual.</p>
        ) : (
          <div className="space-y-2">
            {automationLogs.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-700 bg-panelAlt/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-textMain">
                      {formatAutomationType(item.automationType)} na tarefa #{item.taskId}: {item.taskTitle}
                    </p>
                    <p className="mt-1 text-xs text-textMuted">
                      {formatTaskDateTime(item.createdAt)} | dedupe `{item.dedupeKey}`
                    </p>
                  </div>
                  {item.notificationId ? (
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] text-accent">
                      Notificacao #{item.notificationId}
                    </span>
                  ) : (
                    <span className="rounded-full bg-panel px-2.5 py-1 text-[11px] text-textMuted">
                      Sem notificacao
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
};
