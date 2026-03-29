import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../../lib/api";
import type {
  TaskAutomationHealthItem,
  TaskItem,
  TaskMetricsSummaryItem,
  TaskPriority,
  UserItem
} from "../../../types";
import {
  buildTaskSlaInfo,
  matchesTaskQueueFilter,
  TASK_QUEUE_LABELS,
  TASK_STATUS_LABELS,
  type TaskQueueFilter
} from "../../../components/tasks/taskUi";
import { TaskBoard } from "../../../components/tasks/TaskBoard";
import { TaskDetailSheet } from "../../../components/tasks/TaskDetailSheet";
import { TaskRecurrenceField } from "../../../components/tasks/TaskRecurrenceField";
import { useTaskPanelActions } from "../../../components/tasks/useTaskPanelActions";
import { useTaskPanelData } from "../../../components/tasks/useTaskPanelData";
import {
  buildAdminTaskBoardColumns,
  buildAdminTaskFormState,
  buildAdminTaskPayload,
  buildAdminTaskQuery,
  buildAdminTaskStats,
  type AdminTaskMetricsWindow,
  EMPTY_TASK_ADMIN_FORM,
  type AdminTaskFilterPriority,
  type AdminTaskFilterStatus,
  type TaskAdminFormState
} from "./adminTasksPanelModel";

interface AdminTasksPanelProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

const ADMIN_TASK_FILTERS_STORAGE_KEY = "tasks:admin:filters";

const loadStoredAdminTaskFilters = (): {
  statusFilter: AdminTaskFilterStatus;
  priorityFilter: AdminTaskFilterPriority;
  assigneeFilter: string;
  queueFilter: TaskQueueFilter;
} => {
  if (typeof window === "undefined") {
    return {
      statusFilter: "",
      priorityFilter: "",
      assigneeFilter: "",
      queueFilter: "all"
    };
  }

  const rawValue = window.localStorage.getItem(ADMIN_TASK_FILTERS_STORAGE_KEY);
  if (!rawValue) {
    return {
      statusFilter: "",
      priorityFilter: "",
      assigneeFilter: "",
      queueFilter: "all"
    };
  }

  try {
    const parsed = JSON.parse(rawValue) as {
      statusFilter?: AdminTaskFilterStatus;
      priorityFilter?: AdminTaskFilterPriority;
      assigneeFilter?: string;
      queueFilter?: TaskQueueFilter;
    };

    return {
      statusFilter: parsed.statusFilter ?? "",
      priorityFilter: parsed.priorityFilter ?? "",
      assigneeFilter: parsed.assigneeFilter ?? "",
      queueFilter: parsed.queueFilter ?? "all"
    };
  } catch {
    return {
      statusFilter: "",
      priorityFilter: "",
      assigneeFilter: "",
      queueFilter: "all"
    };
  }
};

export const AdminTasksPanel = ({ onError, onToast }: AdminTasksPanelProps) => {
  const initialFilters = loadStoredAdminTaskFilters();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [automationHealth, setAutomationHealth] = useState<TaskAutomationHealthItem | null>(null);
  const [metrics, setMetrics] = useState<TaskMetricsSummaryItem | null>(null);
  const [metricsUnavailable, setMetricsUnavailable] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [form, setForm] = useState<TaskAdminFormState>(EMPTY_TASK_ADMIN_FORM);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [bulkAssigneeUserId, setBulkAssigneeUserId] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [metricsWindow, setMetricsWindow] = useState<AdminTaskMetricsWindow>("7d");
  const [capacityView, setCapacityView] = useState<"assignee" | "department">("assignee");
  const [statusFilter, setStatusFilter] = useState<AdminTaskFilterStatus>(initialFilters.statusFilter);
  const [priorityFilter, setPriorityFilter] = useState<AdminTaskFilterPriority>(initialFilters.priorityFilter);
  const [assigneeFilter, setAssigneeFilter] = useState(initialFilters.assigneeFilter);
  const [queueFilter, setQueueFilter] = useState<TaskQueueFilter>(initialFilters.queueFilter);

  const openCreateTask = useCallback(() => {
    setForm(EMPTY_TASK_ADMIN_FORM);
    setComposerOpen(true);
  }, []);

  const buildQuery = useCallback(() => {
    return buildAdminTaskQuery({
      statusFilter,
      priorityFilter,
      assigneeFilter
    });
  }, [assigneeFilter, priorityFilter, statusFilter]);

  const buildMetricsQuery = useCallback(() => {
    const params = new URLSearchParams();
    const baseQuery = buildQuery();
    if (baseQuery.startsWith("?")) {
      for (const [key, value] of new URLSearchParams(baseQuery.slice(1)).entries()) {
        params.set(key, value);
      }
    }

    params.set("queue", queueFilter);
    params.set("window", metricsWindow);
    return `?${params.toString()}`;
  }, [buildQuery, metricsWindow, queueFilter]);

  const {
    commentBody,
    detailLoading,
    loading,
    refreshTaskViews,
    reloadTaskDetail,
    reloadTasks,
    selectedTask,
    setCommentBody,
    setSelectedTask,
    taskTimeline,
    tasks
  } = useTaskPanelData({
    loadTaskList: useCallback(async () => {
      const [tasksResponse, usersResponse, healthResponse, metricsResult] = await Promise.all([
        api.adminTasks(buildQuery()),
        api.adminUsers(),
        api.adminTaskHealth(),
        api.adminTaskMetrics(buildMetricsQuery()).then(
          (response) => ({ ok: true as const, metrics: response.metrics }),
          () => ({ ok: false as const })
        )
      ]);

      return {
        tasks: tasksResponse.tasks,
        users: usersResponse.users.filter((user) => user.isActive),
        health: healthResponse.health,
        metrics: metricsResult.ok ? metricsResult.metrics : null,
        metricsUnavailable: !metricsResult.ok
      };
    }, [buildMetricsQuery, buildQuery]),
    loadTaskDetail: useCallback(async (taskId: number) => {
      const response = await api.adminTask(taskId);
      return {
        task: response.task,
        timeline: response.timeline
      };
    }, []),
    onError,
    listErrorMessage: "Falha ao carregar tarefas administrativas",
    detailErrorMessage: "Falha ao carregar detalhe da tarefa",
    onListLoaded: useCallback((result: {
      tasks: TaskItem[];
      users: UserItem[];
      health: TaskAutomationHealthItem;
      metrics: TaskMetricsSummaryItem | null;
      metricsUnavailable: boolean;
    }) => {
      setUsers(result.users);
      setAutomationHealth(result.health);
      setMetrics(result.metrics);
      setMetricsUnavailable(result.metricsUnavailable);
    }, [])
  });

  const queueOptions = useMemo(
    () =>
      (["all", "attention", "due_today", "overdue", "blocked", "stale", "unassigned"] as TaskQueueFilter[]).map((queue) => ({
        value: queue,
        label: TASK_QUEUE_LABELS[queue],
        count: tasks.filter((task) => matchesTaskQueueFilter(task, queue)).length
      })),
    [tasks]
  );

  const displayedTasks = useMemo(
    () => tasks.filter((task) => matchesTaskQueueFilter(task, queueFilter)),
    [queueFilter, tasks]
  );

  const taskStats = useMemo(() => buildAdminTaskStats(displayedTasks), [displayedTasks]);
  const capacityItems = metrics?.capacityByAssignee ?? [];
  const departmentCapacityItems = metrics?.capacityByDepartment ?? [];
  const productivityMetrics = metrics?.productivity ?? null;

  const boardColumns = useMemo(() => buildAdminTaskBoardColumns(displayedTasks), [displayedTasks]);
  const selectedTaskCount = selectedTaskIds.length;
  const hasSelectedTasks = selectedTaskCount > 0;

  const startEditing = useCallback((task: TaskItem) => {
    setComposerOpen(true);
    setSelectedTask(null);
    setForm(buildAdminTaskFormState(task));
  }, [setSelectedTask]);

  const resetForm = useCallback(() => {
    setComposerOpen(false);
    setForm(EMPTY_TASK_ADMIN_FORM);
  }, []);

  const {
    cancelTask,
    commentSaving,
    completeTask,
    onBoardCardKeyDown,
    openTaskFromBoard,
    reloadAndSelect,
    submitComment,
    updateTaskStatus
  } = useTaskPanelActions({
    commentBody,
    onError,
    onToast,
    reloadTaskDetail,
    reloadTasks,
    selectedTask,
    setCommentBody,
    setSelectedTask,
    createComment: (taskId, body) => api.createAdminTaskComment(taskId, { body }),
    updateTaskStatusRequest: (taskId, status) => api.updateAdminTask(taskId, { status }),
    completeTaskRequest: (taskId) => api.completeAdminTask(taskId),
    cancelTaskRequest: (taskId) => api.cancelAdminTask(taskId),
    statusErrorMessage: "Falha ao atualizar status",
    completeErrorMessage: "Falha ao concluir tarefa",
    cancelErrorMessage: "Falha ao cancelar tarefa",
    commentErrorMessage: "Falha ao registrar comentario",
    commentEmptyMessage: "Informe um comentario antes de enviar"
  });

  const saveTask = useCallback(async () => {
    if (!form.title.trim()) {
      onError("Informe um titulo para a tarefa");
      return;
    }

    const payload = buildAdminTaskPayload(form);

    try {
      if (form.id > 0) {
        const response = await api.updateAdminTask(form.id, payload);
        resetForm();
        await reloadAndSelect(response.task.id, "Tarefa atualizada");
        return;
      }

      const response = await api.createAdminTask(payload);
      resetForm();
      await reloadAndSelect(response.task.id, "Tarefa criada");
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao salvar tarefa");
    }
  }, [form, onError, reloadAndSelect, resetForm]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      ADMIN_TASK_FILTERS_STORAGE_KEY,
      JSON.stringify({
        statusFilter,
        priorityFilter,
        assigneeFilter,
        queueFilter
      })
    );
  }, [assigneeFilter, priorityFilter, queueFilter, statusFilter]);

  useEffect(() => {
    setSelectedTaskIds((current) => current.filter((taskId) => displayedTasks.some((task) => task.id === taskId)));
  }, [displayedTasks]);

  const toggleBulkTask = useCallback((taskId: number) => {
    setSelectedTaskIds((current) =>
      current.includes(taskId) ? current.filter((value) => value !== taskId) : [...current, taskId]
    );
  }, []);

  const toggleSelectAllDisplayed = useCallback(() => {
    setSelectedTaskIds((current) =>
      current.length === displayedTasks.length ? [] : displayedTasks.map((task) => task.id)
    );
  }, [displayedTasks]);

  const clearBulkSelection = useCallback(() => {
    setSelectedTaskIds([]);
  }, []);

  const runBulkAction = useCallback(
    async (action: (taskId: number) => Promise<unknown>, successMessage: string) => {
      if (selectedTaskIds.length === 0) {
        onError("Selecione ao menos uma tarefa para aplicar em lote");
        return;
      }

      setBulkSaving(true);
      try {
        const results = await Promise.allSettled(selectedTaskIds.map((taskId) => action(taskId)));
        const failedCount = results.filter((result) => result.status === "rejected").length;

        await refreshTaskViews();

        if (failedCount > 0) {
          onError(`${failedCount} tarefa(s) falharam na acao em lote`);
        } else {
          onToast(successMessage);
        }

        setSelectedTaskIds([]);
        setBulkAssigneeUserId("");
      } finally {
        setBulkSaving(false);
      }
    },
    [onError, onToast, refreshTaskViews, selectedTaskIds]
  );

  const runBulkStatusUpdate = useCallback(
    async (status: "new" | "assumed" | "in_progress" | "blocked" | "waiting_external") => {
      await runBulkAction(
        (taskId) => api.updateAdminTask(taskId, { status }),
        `Status em lote atualizado para ${TASK_STATUS_LABELS[status]}`
      );
    },
    [runBulkAction]
  );

  const runBulkAssigneeUpdate = useCallback(async () => {
    await runBulkAction(
      (taskId) =>
        api.updateAdminTask(taskId, {
          assignee_user_id: bulkAssigneeUserId ? Number(bulkAssigneeUserId) : null
        }),
      bulkAssigneeUserId ? "Responsavel atualizado em lote" : "Responsavel removido em lote"
    );
  }, [bulkAssigneeUserId, runBulkAction]);

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-slate-700 bg-panel p-4">
        <h3 className="font-display text-lg text-textMain">Tarefas</h3>
        <p className="text-sm text-textMuted">Operacao, atribuicao e acompanhamento de tarefas</p>
      </header>

      <div className="flex flex-wrap items-center gap-2 px-1 text-xs">
        <span className="rounded-full bg-panelAlt px-3 py-1.5 text-textMain">{taskStats.total} tarefas</span>
        <span className="rounded-full bg-accent/10 px-3 py-1.5 text-accent">{taskStats.open} abertas</span>
        <span className="rounded-full bg-success/20 px-3 py-1.5 text-success">{taskStats.done} concluidas</span>
        {taskStats.unassigned > 0 && (
          <span className="rounded-full bg-warning/20 px-3 py-1.5 text-warning">
            {taskStats.unassigned} sem responsavel
          </span>
        )}
      </div>

      <article className="rounded-2xl border border-slate-700 bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Bulk actions</p>
            <h4 className="mt-1 font-display text-base text-textMain">
              {selectedTaskCount} tarefa(s) selecionada(s)
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain"
              onClick={toggleSelectAllDisplayed}
              type="button"
            >
              {selectedTaskCount === displayedTasks.length && displayedTasks.length > 0
                ? "Limpar exibidas"
                : "Selecionar exibidas"}
            </button>
            <button
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain"
              onClick={clearBulkSelection}
              type="button"
            >
              Limpar selecao
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            className="rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-300 disabled:opacity-50"
            disabled={!hasSelectedTasks || bulkSaving}
            onClick={() => void runBulkStatusUpdate("assumed")}
            type="button"
          >
            Assumir em lote
          </button>
          <button
            className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning disabled:opacity-50"
            disabled={!hasSelectedTasks || bulkSaving}
            onClick={() => void runBulkStatusUpdate("in_progress")}
            type="button"
          >
            Em andamento em lote
          </button>
          <button
            className="rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger disabled:opacity-50"
            disabled={!hasSelectedTasks || bulkSaving}
            onClick={() => void runBulkStatusUpdate("blocked")}
            type="button"
          >
            Bloquear em lote
          </button>
          <button
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain disabled:opacity-50"
            disabled={!hasSelectedTasks || bulkSaving}
            onClick={() => void runBulkStatusUpdate("waiting_external")}
            type="button"
          >
            Aguardar externo em lote
          </button>
          <button
            className="rounded-lg bg-success px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
            disabled={!hasSelectedTasks || bulkSaving}
            onClick={() => void runBulkAction((taskId) => api.completeAdminTask(taskId), "Tarefas concluidas em lote")}
            type="button"
          >
            Concluir em lote
          </button>
          <button
            className="rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger disabled:opacity-50"
            disabled={!hasSelectedTasks || bulkSaving}
            onClick={() => void runBulkAction((taskId) => api.cancelAdminTask(taskId), "Tarefas canceladas em lote")}
            type="button"
          >
            Cancelar em lote
          </button>
          <select
            aria-label="Responsavel em lote"
            className="input min-w-44"
            disabled={!hasSelectedTasks || bulkSaving}
            value={bulkAssigneeUserId}
            onChange={(event) => setBulkAssigneeUserId(event.target.value)}
          >
            <option value="">Sem responsavel</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <button
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain disabled:opacity-50"
            disabled={!hasSelectedTasks || bulkSaving}
            onClick={() => void runBulkAssigneeUpdate()}
            type="button"
          >
            Aplicar responsavel
          </button>
        </div>
      </article>

      <div className="space-y-4">
          <TaskBoard
            boardColumns={boardColumns}
            emptyMessage="Nenhuma tarefa encontrada para os filtros atuais."
            filters={
              <div className="flex flex-1 flex-col gap-2">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr),minmax(0,1fr),auto]">
                  <select
                    className="input min-w-36"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as AdminTaskFilterStatus)}
                  >
                    <option value="">Todos os status</option>
                    <option value="new">Nova</option>
                    <option value="assumed">Assumida</option>
                    <option value="in_progress">Em andamento</option>
                    <option value="blocked">Bloqueada</option>
                    <option value="waiting_external">Aguardando externo</option>
                    <option value="done">Concluida</option>
                    <option value="cancelled">Cancelada</option>
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
                  <button
                    className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain"
                    onClick={() => setMoreFiltersOpen((current) => !current)}
                    type="button"
                  >
                    {moreFiltersOpen ? "Menos filtros" : "Mais filtros"}
                  </button>
                </div>
                {moreFiltersOpen && (
                  <div className="grid gap-2 sm:grid-cols-2">
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
                    <button
                      className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain"
                      onClick={() => {
                        setStatusFilter("");
                        setPriorityFilter("");
                        setAssigneeFilter("");
                        setQueueFilter("all");
                      }}
                      type="button"
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {queueOptions.map((queue) => (
                    <button
                      key={queue.value}
                      aria-pressed={queueFilter === queue.value}
                      className={`rounded-full px-3 py-1.5 text-xs ${
                        queueFilter === queue.value
                          ? "bg-accent/10 text-accent"
                          : "border border-slate-600 text-textMain"
                      }`}
                      onClick={() => setQueueFilter(queue.value)}
                      type="button"
                    >
                      {queue.label} ({queue.count})
                    </button>
                  ))}
                </div>
              </div>
            }
            headerDescription="Kanban com filas operacionais e leitura de SLA"
            headerTitle="Fila de tarefas"
            loading={loading}
            metaRowRenderer={(task) => (
              <>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] ${buildTaskSlaInfo(task).badgeClassName}`}
                  title={buildTaskSlaInfo(task).detail}
                >
                  {buildTaskSlaInfo(task).label}
                </span>
                <span>{task.assigneeName || "Sem responsavel"}</span>
                <span>{task.dueAt ? new Date(task.dueAt).toLocaleString("pt-BR") : "Sem prazo"}</span>
              </>
            )}
            selectedTaskId={selectedTask?.id ?? null}
            selectedTask={selectedTask}
            onBoardCardKeyDown={onBoardCardKeyDown}
            onCancelTask={cancelTask}
            onCompleteTask={completeTask}
            onOpenTask={openTaskFromBoard}
            primaryAction={{ label: "Novo", onClick: openCreateTask }}
            onRefresh={() => void refreshTaskViews()}
            onUpdateStatus={(taskId, status) => updateTaskStatus(taskId, status, TASK_STATUS_LABELS[status])}
            bulkSelection={{
              selectedTaskIds,
              onToggleTask: toggleBulkTask
            }}
          />
      </div>

      {(composerOpen || form.id > 0) && (
        <div
          aria-label="Overlay do formulario administrativo da tarefa"
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6"
          onClick={resetForm}
        >
          <div
            aria-label="Formulario administrativo da tarefa"
            aria-modal="true"
            className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-panel p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-accent">Kanban administrativo</p>
                  <h4 className="mt-1 font-display text-lg text-textMain">
                    {form.id > 0 ? "Editar tarefa" : "Nova tarefa administrativa"}
                  </h4>
                  <p className="text-sm text-textMuted">Criacao e ajuste de tarefa sem sair da fila.</p>
                </div>
                <button
                  aria-label="Fechar formulario administrativo da tarefa"
                  className="rounded-full border border-slate-600 px-3 py-1 text-xs text-textMain"
                  onClick={resetForm}
                  type="button"
                >
                  Fechar
                </button>
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

              <TaskRecurrenceField
                recurrenceAriaLabel="Recorrencia da tarefa admin"
                repeatType={form.repeatType}
                weekdayAriaLabelPrefix="Dia da recorrencia admin"
                weekdays={form.weekdays}
                onRepeatTypeChange={(repeatType) => setForm((prev) => ({ ...prev, repeatType }))}
                onWeekdaysChange={(weekdays) => setForm((prev) => ({ ...prev, weekdays }))}
              />

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain"
                  onClick={resetForm}
                  type="button"
                >
                  {form.id > 0 ? "Cancelar edicao" : "Cancelar"}
                </button>
                <button className="btn-primary" onClick={saveTask} type="button">
                  {form.id > 0 ? "Salvar tarefa" : "Criar tarefa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <article className="rounded-2xl border border-slate-700 bg-panel p-4">
        <button
          aria-expanded={analyticsOpen}
          className="flex w-full items-start justify-between gap-3 text-left"
          onClick={() => setAnalyticsOpen((current) => !current)}
          type="button"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Visao gerencial</p>
            <h4 className="mt-1 font-display text-base text-textMain">Produtividade, capacidade e automacao</h4>
            <p className="text-sm text-textMuted">Secao secundaria para analise da equipe e da fila.</p>
          </div>
          <span className="rounded-full border border-slate-600 px-3 py-1 text-xs text-textMain">
            {analyticsOpen ? "Ocultar indicadores" : "Abrir indicadores"}
          </span>
        </button>

        {analyticsOpen && (
          <div className="mt-4 space-y-4">
            <article className="rounded-2xl border border-slate-700 bg-panelAlt/40 p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Produtividade</p>
                  <h4 className="mt-1 font-display text-base text-textMain">Janela operacional</h4>
                  <p className="text-sm text-textMuted">Metricas da fila filtrada para acompanhamento do time.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    aria-pressed={metricsWindow === "7d"}
                    className={`rounded-full px-3 py-1.5 text-xs ${
                      metricsWindow === "7d" ? "bg-accent text-slate-950" : "bg-panel text-textMain"
                    }`}
                    onClick={() => setMetricsWindow("7d")}
                    type="button"
                  >
                    7 dias
                  </button>
                  <button
                    aria-pressed={metricsWindow === "30d"}
                    className={`rounded-full px-3 py-1.5 text-xs ${
                      metricsWindow === "30d" ? "bg-accent text-slate-950" : "bg-panel text-textMain"
                    }`}
                    onClick={() => setMetricsWindow("30d")}
                    type="button"
                  >
                    30 dias
                  </button>
                </div>
              </div>
              {!productivityMetrics ? (
                <p className="text-sm text-textMuted">
                  {metricsUnavailable ? "Metricas indisponiveis no momento." : "Carregando metricas..."}
                </p>
              ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-700 bg-panel p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Entrega</p>
                  <p className="mt-2 text-2xl font-semibold text-textMain">{productivityMetrics.completedInWindow}</p>
                  <p className="mt-1 text-sm text-textMuted">
                    concluidas nos ultimos {productivityMetrics.windowDays} dias
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-success/20 px-2.5 py-1 text-success">
                      {productivityMetrics.completedOnTime} no prazo
                    </span>
                    <span className="rounded-full bg-danger/20 px-2.5 py-1 text-danger">
                      {productivityMetrics.completedLate} em atraso
                    </span>
                    <span className="rounded-full bg-panelAlt px-2.5 py-1 text-textMain">
                      taxa no prazo{" "}
                      {productivityMetrics.onTimeRate === null
                        ? "-"
                        : `${Math.round(productivityMetrics.onTimeRate * 100)}%`}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-panel p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Fluxo</p>
                  <p className="mt-2 text-2xl font-semibold text-textMain">{productivityMetrics.createdInWindow}</p>
                  <p className="mt-1 text-sm text-textMuted">
                    criadas nos ultimos {productivityMetrics.windowDays} dias
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 text-accent">
                      throughput{" "}
                      {productivityMetrics.completionRate === null
                        ? "-"
                        : `${Math.round(productivityMetrics.completionRate * 100)}%`}
                    </span>
                    <span className="rounded-full bg-panelAlt px-2.5 py-1 text-textMain">
                      ciclo medio{" "}
                      {productivityMetrics.avgCycleHours === null
                        ? "-"
                        : `${productivityMetrics.avgCycleHours.toFixed(1)}h`}
                    </span>
                    <span className="rounded-full bg-panelAlt px-2.5 py-1 text-textMain">
                      inicio medio{" "}
                      {productivityMetrics.avgStartLagHours === null
                        ? "-"
                        : `${productivityMetrics.avgStartLagHours.toFixed(1)}h`}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-panel p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Risco atual</p>
                  <p className="mt-2 text-2xl font-semibold text-textMain">{productivityMetrics.overdueOpen}</p>
                  <p className="mt-1 text-sm text-textMuted">tarefas abertas atrasadas no filtro atual</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-danger/20 px-2.5 py-1 text-danger">
                      {productivityMetrics.overdueOpen} atrasadas
                    </span>
                    <span className="rounded-full bg-warning/20 px-2.5 py-1 text-warning">
                      {productivityMetrics.blockedOpen} bloqueadas
                    </span>
                  </div>
                </div>
              </div>
              )}
            </article>

            <article className="rounded-2xl border border-slate-700 bg-panelAlt/40 p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Capacidade</p>
                  <h4 className="mt-1 font-display text-base text-textMain">Carga por responsavel ou equipe</h4>
                  <p className="text-sm text-textMuted">Resumo operacional do filtro atual por pessoa ou departamento.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    aria-pressed={capacityView === "assignee"}
                    className={`rounded-full px-3 py-1.5 text-xs ${
                      capacityView === "assignee" ? "bg-accent text-slate-950" : "bg-panel text-textMain"
                    }`}
                    onClick={() => setCapacityView("assignee")}
                    type="button"
                  >
                    Responsavel
                  </button>
                  <button
                    aria-pressed={capacityView === "department"}
                    className={`rounded-full px-3 py-1.5 text-xs ${
                      capacityView === "department" ? "bg-accent text-slate-950" : "bg-panel text-textMain"
                    }`}
                    onClick={() => setCapacityView("department")}
                    type="button"
                  >
                    Equipe
                  </button>
                </div>
              </div>
              {capacityView === "assignee" && capacityItems.length === 0 ? (
                <p className="text-sm text-textMuted">Nenhum responsavel visivel para o filtro atual.</p>
              ) : capacityView === "department" && departmentCapacityItems.length === 0 ? (
                <p className="text-sm text-textMuted">Nenhuma equipe visivel para o filtro atual.</p>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {capacityView === "assignee" &&
                    capacityItems.map((item) => (
                    <div key={item.assigneeKey} className="rounded-2xl border border-slate-700 bg-panel p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-textMain">{item.assigneeLabel}</p>
                          <p className="text-xs text-textMuted">{item.open} abertas no filtro</p>
                        </div>
                        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] text-accent">
                          {item.done} concluidas
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-panelAlt px-2.5 py-1 text-textMain">
                          {item.open} abertas
                        </span>
                        <span className="rounded-full bg-danger/20 px-2.5 py-1 text-danger">
                          {item.overdue} atrasadas
                        </span>
                        <span className="rounded-full bg-danger/20 px-2.5 py-1 text-danger">
                          {item.critical} criticas
                        </span>
                        <span className="rounded-full bg-warning/20 px-2.5 py-1 text-warning">
                          {item.blocked} bloqueadas
                        </span>
                        <span className="rounded-full bg-success/20 px-2.5 py-1 text-success">
                          {item.completedOnTime} no prazo
                        </span>
                        <span className="rounded-full bg-panelAlt px-2.5 py-1 text-textMain">
                          ciclo {item.avgCycleHours === null ? "-" : `${item.avgCycleHours.toFixed(1)}h`}
                        </span>
                      </div>
                    </div>
                  ))}
                  {capacityView === "department" &&
                    departmentCapacityItems.map((item) => (
                      <div key={item.departmentKey} className="rounded-2xl border border-slate-700 bg-panel p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-textMain">{item.departmentLabel}</p>
                            <p className="text-xs text-textMuted">{item.members} membro(s) ativos</p>
                          </div>
                          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] text-accent">
                            {item.open} abertas
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-danger/20 px-2.5 py-1 text-danger">
                            {item.overdue} atrasadas
                          </span>
                          <span className="rounded-full bg-warning/20 px-2.5 py-1 text-warning">
                            {item.blocked} bloqueadas
                          </span>
                          <span className="rounded-full bg-danger/20 px-2.5 py-1 text-danger">
                            {item.critical} criticas
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </article>

            {automationHealth && (
              <article className="rounded-2xl border border-slate-700 bg-panelAlt/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Automacao</p>
                    <h4 className="mt-1 font-display text-base text-textMain">Precisa de atencao</h4>
                    <p className="text-sm text-textMuted">
                      Visao do scheduler para atraso e tarefa parada na fila atual.
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs ${
                      automationHealth.schedulerEnabled
                        ? "bg-success/20 text-success"
                        : "bg-danger/20 text-danger"
                    }`}
                  >
                    {automationHealth.schedulerEnabled ? "Scheduler ativo" : "Scheduler inativo"}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                  <span className="rounded-2xl bg-danger/10 px-3 py-3 text-sm text-danger">
                    {automationHealth.overdueEligible} atrasadas
                  </span>
                  <span className="rounded-2xl bg-warning/20 px-3 py-3 text-sm text-warning">
                    {automationHealth.staleEligible} paradas 24h+
                  </span>
                  <span className="rounded-2xl bg-danger/20 px-3 py-3 text-sm text-danger">
                    {automationHealth.blockedEligible} bloqueadas 24h+
                  </span>
                  <span className="rounded-2xl bg-accent/10 px-3 py-3 text-sm text-accent">
                    {automationHealth.dueSoonEligible} vencendo em breve
                  </span>
                  <span className="rounded-2xl bg-panel px-3 py-3 text-sm text-textMain">
                    {automationHealth.overdueSentToday} alertas de atraso hoje
                  </span>
                  <span className="rounded-2xl bg-panel px-3 py-3 text-sm text-textMain">
                    {automationHealth.staleSentToday} alertas de parada hoje
                  </span>
                  <span className="rounded-2xl bg-panel px-3 py-3 text-sm text-textMain">
                    {automationHealth.blockedSentToday} alertas de bloqueio hoje
                  </span>
                  <span className="rounded-2xl bg-panel px-3 py-3 text-sm text-textMain">
                    Janela: {automationHealth.dueSoonWindowMinutes}min / {automationHealth.staleWindowHours}h
                  </span>
                </div>
              </article>
            )}
          </div>
        )}
      </article>

      <TaskDetailSheet
        commentAriaLabel="Comentario administrativo da tarefa"
        commentBody={commentBody}
        commentPlaceholder="Registrar contexto administrativo"
        commentSaving={commentSaving}
        detailLoading={detailLoading}
        selectedTask={selectedTask}
        taskTimeline={taskTimeline}
        onCancelTask={cancelTask}
        onClose={() => setSelectedTask(null)}
        onCommentBodyChange={setCommentBody}
        onCompleteTask={completeTask}
        onStartEditing={startEditing}
        onSubmitComment={() => void submitComment()}
        onUpdateStatus={(taskId, status) => updateTaskStatus(taskId, status, TASK_STATUS_LABELS[status])}
      />

    </section>
  );
};
