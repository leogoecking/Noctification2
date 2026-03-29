import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../../lib/api";
import type {
  AuthUser,
  TaskItem,
  TaskPriority,
  TaskRepeatType,
  TaskStatus
} from "../../../types";
import {
  buildTaskSlaInfo,
  compareTasksByOperationalOrder,
  matchesTaskQueueFilter,
  TASK_BOARD_COLUMNS,
  TASK_QUEUE_LABELS,
  TASK_STATUS_LABELS,
  type TaskQueueFilter,
  toApiDueAt,
  toDateTimeLocalValue
} from "../../../components/tasks/taskUi";
import { TaskBoard } from "../../../components/tasks/TaskBoard";
import { TaskDetailSheet } from "../../../components/tasks/TaskDetailSheet";
import { TaskRecurrenceField } from "../../../components/tasks/TaskRecurrenceField";
import { useTaskPanelActions } from "../../../components/tasks/useTaskPanelActions";
import { useTaskPanelData } from "../../../components/tasks/useTaskPanelData";

interface TaskUserPanelProps {
  user: AuthUser;
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

type UserTaskFilterStatus = "" | TaskStatus;
type UserTaskFilterPriority = "" | TaskPriority;

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

const USER_TASK_FILTERS_STORAGE_KEY = "tasks:user:filters";

const loadStoredUserTaskFilters = (): {
  statusFilter: UserTaskFilterStatus;
  priorityFilter: UserTaskFilterPriority;
  queueFilter: TaskQueueFilter;
} => {
  if (typeof window === "undefined") {
    return { statusFilter: "", priorityFilter: "", queueFilter: "all" };
  }

  const rawValue = window.localStorage.getItem(USER_TASK_FILTERS_STORAGE_KEY);
  if (!rawValue) {
    return { statusFilter: "", priorityFilter: "", queueFilter: "all" };
  }

  try {
    const parsed = JSON.parse(rawValue) as {
      statusFilter?: UserTaskFilterStatus;
      priorityFilter?: UserTaskFilterPriority;
      queueFilter?: TaskQueueFilter;
    };

    return {
      statusFilter: parsed.statusFilter ?? "",
      priorityFilter: parsed.priorityFilter ?? "",
      queueFilter: parsed.queueFilter ?? "all"
    };
  } catch {
    return { statusFilter: "", priorityFilter: "", queueFilter: "all" };
  }
};

export const TaskUserPanel = ({ user, onError, onToast }: TaskUserPanelProps) => {
  const initialFilters = loadStoredUserTaskFilters();
  const [composerOpen, setComposerOpen] = useState(false);
  const [form, setForm] = useState<TaskFormState>(EMPTY_FORM);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<UserTaskFilterStatus>(initialFilters.statusFilter);
  const [priorityFilter, setPriorityFilter] = useState<UserTaskFilterPriority>(initialFilters.priorityFilter);
  const [queueFilter, setQueueFilter] = useState<TaskQueueFilter>(initialFilters.queueFilter);

  const openCreateTask = useCallback(() => {
    setForm(EMPTY_FORM);
    setComposerOpen(true);
  }, []);

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
    loadTaskList: useCallback(
      async () => ({
        tasks: (await api.myTasks(buildQuery())).tasks
      }),
      [buildQuery]
    ),
    loadTaskDetail: useCallback(async (taskId: number) => {
      const response = await api.myTask(taskId);
      return {
        task: response.task,
        timeline: response.timeline
      };
    }, []),
    onError,
    listErrorMessage: "Falha ao carregar tarefas",
    detailErrorMessage: "Falha ao carregar detalhe da tarefa"
  });

  const queueOptions = useMemo(
    () =>
      (["all", "due_today", "overdue", "blocked", "stale"] as TaskQueueFilter[]).map((queue) => ({
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

  const taskStats = useMemo(
    () => ({
      total: displayedTasks.length,
      open: displayedTasks.filter((task) => task.status !== "done" && task.status !== "cancelled").length,
      done: displayedTasks.filter((task) => task.status === "done").length,
      critical: displayedTasks.filter((task) => task.priority === "critical" && task.status !== "done").length
    }),
    [displayedTasks]
  );

  const boardColumns = useMemo(
    () =>
      TASK_BOARD_COLUMNS.map((status) => ({
        status,
        label: TASK_STATUS_LABELS[status],
        tasks: displayedTasks
          .filter((task) => task.status === status)
          .sort((left, right) => compareTasksByOperationalOrder(left, right))
      })),
    [displayedTasks]
  );

  const startEditing = useCallback((task: TaskItem) => {
    setComposerOpen(true);
    setSelectedTask(null);
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
  }, [setSelectedTask]);

  const resetForm = useCallback(() => {
    setComposerOpen(false);
    setForm(EMPTY_FORM);
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
    createComment: (taskId, body) => api.createMyTaskComment(taskId, { body }),
    updateTaskStatusRequest: (taskId, status) => api.updateMyTask(taskId, { status }),
    completeTaskRequest: (taskId) => api.completeMyTask(taskId),
    cancelTaskRequest: (taskId) => api.cancelMyTask(taskId),
    statusErrorMessage: "Falha ao atualizar status",
    completeErrorMessage: "Falha ao concluir tarefa",
    cancelErrorMessage: "Falha ao cancelar tarefa",
    commentErrorMessage: "Falha ao registrar comentario",
    commentEmptyMessage: "Informe um comentario antes de enviar"
  });

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
        await reloadAndSelect(response.task.id, "Tarefa atualizada");
        return;
      }

      const response = await api.createMyTask({
        ...payload
      });
      resetForm();
      await reloadAndSelect(response.task.id, "Tarefa criada");
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Falha ao salvar tarefa");
    }
  }, [form, onError, reloadAndSelect, resetForm, user.id]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      USER_TASK_FILTERS_STORAGE_KEY,
      JSON.stringify({
        statusFilter,
        priorityFilter,
        queueFilter
      })
    );
  }, [priorityFilter, queueFilter, statusFilter]);

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-slate-700 bg-panel p-4">
        <h3 className="font-display text-lg text-textMain">Tarefas</h3>
        <p className="text-sm text-textMuted">Acompanhamento da sua fila operacional</p>
      </header>

      <div className="flex flex-wrap items-center gap-2 px-1 text-xs">
        <span className="rounded-full bg-panelAlt px-3 py-1.5 text-textMain">{taskStats.total} tarefas</span>
        <span className="rounded-full bg-accent/10 px-3 py-1.5 text-accent">{taskStats.open} abertas</span>
        <span className="rounded-full bg-success/20 px-3 py-1.5 text-success">{taskStats.done} concluidas</span>
        {taskStats.critical > 0 && (
          <span className="rounded-full bg-danger/20 px-3 py-1.5 text-danger">{taskStats.critical} criticas</span>
        )}
      </div>

      <div className="space-y-4">
          <TaskBoard
            boardColumns={boardColumns}
            emptyMessage="Nenhuma tarefa encontrada para os filtros atuais."
            filters={
              <div className="flex flex-1 flex-col gap-2">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr),auto]">
                  <select
                    className="input min-w-36"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as UserTaskFilterStatus)}
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
                      onChange={(event) => setPriorityFilter(event.target.value as UserTaskFilterPriority)}
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
            headerDescription="Kanban com filas rapidas e leitura de SLA"
            headerTitle="Minhas tarefas"
            loading={loading}
            metaRowRenderer={(task) => (
              <>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] ${buildTaskSlaInfo(task).badgeClassName}`}
                  title={buildTaskSlaInfo(task).detail}
                >
                  {buildTaskSlaInfo(task).label}
                </span>
                <span>{task.dueAt ? new Date(task.dueAt).toLocaleString("pt-BR") : "Sem prazo"}</span>
                <span>{task.assigneeName || "Sem responsavel"}</span>
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
          />
      </div>

      {(composerOpen || form.id > 0) && (
        <div
          aria-label="Overlay do formulario da tarefa"
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6"
          onClick={resetForm}
        >
          <div
            aria-label="Formulario da tarefa"
            aria-modal="true"
            className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-panel p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-accent">Kanban</p>
                  <h4 className="mt-1 font-display text-lg text-textMain">
                    {form.id > 0 ? "Editar tarefa" : "Nova tarefa"}
                  </h4>
                  <p className="text-sm text-textMuted">Cadastro rapido da tarefa dentro da fila.</p>
                </div>
                <button
                  aria-label="Fechar formulario da tarefa"
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

              <TaskRecurrenceField
                recurrenceAriaLabel="Recorrencia da tarefa"
                repeatType={form.repeatType}
                weekdayAriaLabelPrefix="Dia da recorrencia"
                weekdays={form.weekdays}
                onRepeatTypeChange={(repeatType) => setForm((prev) => ({ ...prev, repeatType }))}
                onWeekdaysChange={(weekdays) => setForm((prev) => ({ ...prev, weekdays }))}
              />

              <label className="flex items-center gap-2 text-sm text-textMain">
                <input
                  checked={form.assignToMe}
                  onChange={(event) => setForm((prev) => ({ ...prev, assignToMe: event.target.checked }))}
                  type="checkbox"
                />
                Atribuir a mim
              </label>

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

      <TaskDetailSheet
        commentAriaLabel="Comentario da tarefa"
        commentBody={commentBody}
        commentPlaceholder="Registrar contexto operacional"
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
