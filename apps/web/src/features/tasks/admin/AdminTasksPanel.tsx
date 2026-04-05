import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../../lib/api";
import type {
  TaskAutomationHealthItem,
  TaskItem,
  TaskMetricsSummaryItem,
  UserItem
} from "../../../types";
import { TASK_STATUS_LABELS } from "../../../components/tasks/taskUi";
import { TaskDetailSheet } from "../../../components/tasks/TaskDetailSheet";
import { useTaskPanelActions } from "../../../components/tasks/useTaskPanelActions";
import { useTaskPanelData } from "../../../components/tasks/useTaskPanelData";
import { AdminTaskAnalyticsDialog } from "./AdminTaskAnalyticsDialog";
import { AdminTasksBoardSection } from "./AdminTasksBoardSection";
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

      <AdminTasksBoardSection
        boardColumns={boardColumns}
        loading={loading}
        searchFilter={searchFilter}
        setSearchFilter={setSearchFilter}
        selectedTaskId={selectedTask?.id ?? null}
        onBoardCardKeyDown={onBoardCardKeyDown}
        onOpenTask={openTaskFromBoard}
        onRefresh={() => void refreshTaskViews()}
        onCompleteTask={(taskId) => void completeTask(taskId)}
        onUpdateStatus={(taskId, status) => updateTaskStatus(taskId, status, TASK_STATUS_LABELS[status])}
        selectedTaskIds={selectedTaskIds}
        onToggleTask={toggleBulkTask}
        onOpenCreateTask={openCreateTask}
      />

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
      </article>

      <AdminTaskAnalyticsDialog
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        metricsWindow={metricsWindow}
        onMetricsWindowChange={setMetricsWindow}
        capacityView={capacityView}
        onCapacityViewChange={setCapacityView}
        metricsUnavailable={metricsUnavailable}
        productivityMetrics={productivityMetrics}
        capacityItems={capacityItems}
        departmentCapacityItems={departmentCapacityItems}
        automationHealth={automationHealth}
      />

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
