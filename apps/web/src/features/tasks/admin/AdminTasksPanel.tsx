import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../../lib/api";
import type {
  TaskAutomationHealthItem,
  TaskItem,
  TaskMetricsSummaryItem,
  UserItem
} from "../../../types";
import { buildTaskSlaInfo, TASK_STATUS_LABELS } from "../../../components/tasks/taskUi";
import { TaskBoard } from "../../../components/tasks/TaskBoard";
import { TaskDetailSheet } from "../../../components/tasks/TaskDetailSheet";
import { useTaskPanelActions } from "../../../components/tasks/useTaskPanelActions";
import { useTaskPanelData } from "../../../components/tasks/useTaskPanelData";
import { AdminTaskBulkToolbar } from "./AdminTaskBulkToolbar";
import { AdminTaskComposerDialog } from "./AdminTaskComposerDialog";
import {
  buildAdminTaskBoardColumns,
  buildAdminTaskFormState,
  buildAdminTaskPayload,
  type AdminTaskMetricsWindow,
  EMPTY_TASK_ADMIN_FORM,
  type TaskAdminFormState
} from "./adminTasksPanelModel";

interface AdminTasksPanelProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

export const AdminTasksPanel = ({ onError, onToast }: AdminTasksPanelProps) => {
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
  const [metricsWindow, setMetricsWindow] = useState<AdminTaskMetricsWindow>("7d");
  const [capacityView, setCapacityView] = useState<"assignee" | "department">("assignee");
  const [searchFilter, setSearchFilter] = useState("");

  const openCreateTask = useCallback(() => {
    setForm(EMPTY_TASK_ADMIN_FORM);
    setComposerOpen(true);
  }, []);

  const buildQuery = useCallback(() => {
    const normalizedSearch = searchFilter.trim();
    if (!normalizedSearch) {
      return "";
    }

    return `?${new URLSearchParams({ search: normalizedSearch }).toString()}`;
  }, [searchFilter]);

  const buildMetricsQuery = useCallback(() => {
    const params = new URLSearchParams();
    const baseQuery = buildQuery();
    if (baseQuery.startsWith("?")) {
      for (const [key, value] of new URLSearchParams(baseQuery.slice(1)).entries()) {
        params.set(key, value);
      }
    }
    params.set("window", metricsWindow);
    return `?${params.toString()}`;
  }, [buildQuery, metricsWindow]);

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

  const capacityItems = metrics?.capacityByAssignee ?? [];
  const departmentCapacityItems = metrics?.capacityByDepartment ?? [];
  const productivityMetrics = metrics?.productivity ?? null;

  const boardColumns = useMemo(() => buildAdminTaskBoardColumns(tasks), [tasks]);
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
    setSelectedTaskIds((current) => current.filter((taskId) => tasks.some((task) => task.id === taskId)));
  }, [tasks]);

  const toggleBulkTask = useCallback((taskId: number) => {
    setSelectedTaskIds((current) =>
      current.includes(taskId) ? current.filter((value) => value !== taskId) : [...current, taskId]
    );
  }, []);

  const toggleSelectAllDisplayed = useCallback(() => {
    setSelectedTaskIds((current) => (current.length === tasks.length ? [] : tasks.map((task) => task.id)));
  }, [tasks]);

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
    <section className="space-y-6">
      <AdminTaskBulkToolbar
        visible={hasSelectedTasks}
        selectedTaskCount={selectedTaskCount}
        displayedTaskCount={tasks.length}
        bulkSaving={bulkSaving}
        users={users}
        bulkAssigneeUserId={bulkAssigneeUserId}
        setBulkAssigneeUserId={setBulkAssigneeUserId}
        onToggleSelectAllDisplayed={toggleSelectAllDisplayed}
        onClearBulkSelection={clearBulkSelection}
        onRunBulkStatusUpdate={(status) => void runBulkStatusUpdate(status)}
        onRunBulkComplete={() =>
          void runBulkAction((taskId) => api.completeAdminTask(taskId), "Tarefas concluidas em lote")
        }
        onRunBulkCancel={() =>
          void runBulkAction((taskId) => api.cancelAdminTask(taskId), "Tarefas canceladas em lote")
        }
        onRunBulkAssigneeUpdate={() => void runBulkAssigneeUpdate()}
      />

      <div className="space-y-4">
          <TaskBoard
            boardColumns={boardColumns}
            emptyMessage="Nenhuma tarefa encontrada para a busca atual."
            filters={
              <div className="flex flex-1">
                <input
                  className="input min-w-36"
                  placeholder="titulo, descricao, responsavel ou status"
                  value={searchFilter}
                  onChange={(event) => setSearchFilter(event.target.value)}
                />
              </div>
            }
            headerDescription="Kanban principal da operacao com busca direta e SLA"
            headerEyebrow="Board"
            headerTitle="Kanban"
            loading={loading}
            metaRowRenderer={(task) => (
              <>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${buildTaskSlaInfo(task).badgeClassName}`}
                  title={buildTaskSlaInfo(task).detail}
                >
                  {buildTaskSlaInfo(task).label}
                </span>
                <span>{task.assigneeName || "Sem responsavel"}</span>
                <span>{task.dueAt ? new Date(task.dueAt).toLocaleString("pt-BR") : "Sem prazo"}</span>
              </>
            )}
            selectedTaskId={selectedTask?.id ?? null}
            onBoardCardKeyDown={onBoardCardKeyDown}
            onOpenTask={openTaskFromBoard}
            onRefresh={() => void refreshTaskViews()}
            onCompleteTask={(taskId) => void completeTask(taskId)}
            onUpdateStatus={(taskId, status) => updateTaskStatus(taskId, status, TASK_STATUS_LABELS[status])}
            showHeaderMetaBadge={false}
            bulkSelection={{
              selectedTaskIds,
              onToggleTask: toggleBulkTask
            }}
          />
      </div>

      <div className="fixed bottom-8 right-8 z-20">
        <button
          aria-label="Nova tarefa"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-sm transition hover:scale-[1.02]"
          onClick={openCreateTask}
          type="button"
        >
          <span aria-hidden="true" className="text-2xl leading-none">+</span>
        </button>
      </div>

      <AdminTaskComposerDialog
        open={composerOpen || form.id > 0}
        form={form}
        setForm={setForm}
        users={users}
        onClose={resetForm}
        onSave={() => void saveTask()}
      />

      <article className="rounded-[1.25rem] bg-panel p-5">
        <button
          aria-expanded={analyticsOpen}
          className="flex w-full items-start justify-between gap-3 text-left"
          onClick={() => setAnalyticsOpen((current) => !current)}
          type="button"
        >
          <div>
            <p className="text-xs uppercase tracking-wider text-textMuted">Indicadores secundarios</p>
            <h4 className="mt-1 font-display text-base text-textMain">Produtividade, capacidade e automacao</h4>
            <p className="text-sm text-textMuted">Analise complementar fora da operacao principal do kanban.</p>
          </div>
              <span className="rounded-full border border-outlineSoft bg-panelAlt px-3 py-1 text-xs text-textMain">
                Abrir indicadores
              </span>
        </button>

        {analyticsOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
            <div
              aria-label="Indicadores da fila"
              aria-modal="true"
              className="max-h-[85vh] w-full max-w-6xl overflow-y-auto rounded-[1.5rem] bg-panel p-6 shadow-sm"
              role="dialog"
            >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-textMuted">
                  Indicadores secundarios
                </p>
                <h3 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-textMain">
                  Produtividade, capacidade e automacao
                </h3>
                <p className="mt-2 text-sm text-textMuted">
                  Analise complementar fora da operacao principal do kanban.
                </p>
              </div>
              <button
                className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-xs text-textMain"
                onClick={() => setAnalyticsOpen(false)}
                type="button"
              >
                Fechar
              </button>
            </div>

          <div className="space-y-4">
            <article className="rounded-[1.25rem] bg-panelAlt/80 p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-textMuted">Produtividade</p>
                  <h4 className="mt-1 font-display text-base text-textMain">Janela operacional</h4>
                  <p className="text-sm text-textMuted">Metricas da fila filtrada para acompanhamento do time.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    aria-pressed={metricsWindow === "7d"}
                    className={`rounded-full px-3 py-1.5 text-xs ${
                      metricsWindow === "7d" ? "bg-accent text-white" : "bg-panelAlt text-textMain"
                    }`}
                    onClick={() => setMetricsWindow("7d")}
                    type="button"
                  >
                    7 dias
                  </button>
                  <button
                    aria-pressed={metricsWindow === "30d"}
                    className={`rounded-full px-3 py-1.5 text-xs ${
                      metricsWindow === "30d" ? "bg-accent text-white" : "bg-panelAlt text-textMain"
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
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.25rem] bg-panel p-4 ring-1 ring-outlineSoft/50">
                  <p className="text-xs uppercase tracking-wider text-textMuted">Entrega</p>
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
                <div className="rounded-[1.25rem] bg-panel p-4 ring-1 ring-outlineSoft/50">
                  <p className="text-xs uppercase tracking-wider text-textMuted">Fluxo</p>
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
              </div>
              )}
            </article>

            <article className="rounded-[1.5rem] bg-panelAlt/80 p-4 ring-1 ring-outlineSoft/50">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-textMuted">Capacidade</p>
                  <h4 className="mt-1 font-display text-base text-textMain">Carga por responsavel ou equipe</h4>
                  <p className="text-sm text-textMuted">Resumo operacional do filtro atual por pessoa ou departamento.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    aria-pressed={capacityView === "assignee"}
                    className={`rounded-full px-3 py-1.5 text-xs ${
                      capacityView === "assignee" ? "bg-accent text-white" : "bg-panel text-textMain"
                    }`}
                    onClick={() => setCapacityView("assignee")}
                    type="button"
                  >
                    Responsavel
                  </button>
                  <button
                    aria-pressed={capacityView === "department"}
                    className={`rounded-full px-3 py-1.5 text-xs ${
                      capacityView === "department" ? "bg-accent text-white" : "bg-panel text-textMain"
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
                    <div key={item.assigneeKey} className="rounded-[1.25rem] bg-panel p-4 ring-1 ring-outlineSoft/50">
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
                      <div key={item.departmentKey} className="rounded-[1.25rem] bg-panel p-4 ring-1 ring-outlineSoft/50">
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
              <article className="rounded-[1.5rem] bg-panelAlt/80 p-4 ring-1 ring-outlineSoft/50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-textMuted">Automacao</p>
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
          </div>
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
        onStartEditing={startEditing}
        onSubmitComment={() => void submitComment()}
      />

    </section>
  );
};
