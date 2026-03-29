import { useCallback, useMemo, useState } from "react";
import { api, ApiError } from "../../../lib/api";
import type {
  AuthUser,
  TaskItem,
  TaskPriority,
  TaskRepeatType,
  TaskStatus
} from "../../../types";
import {
  TASK_BOARD_COLUMNS,
  TASK_STATUS_LABELS,
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

export const TaskUserPanel = ({ user, onError, onToast }: TaskUserPanelProps) => {
  const [composerOpen, setComposerOpen] = useState(false);
  const [form, setForm] = useState<TaskFormState>(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState<UserTaskFilterStatus>("");
  const [priorityFilter, setPriorityFilter] = useState<UserTaskFilterPriority>("");

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

  const {
    cancelTask,
    commentSaving,
    completeTask,
    onBoardCardKeyDown,
    openTaskFromBoard,
    reloadAndSelect,
    runBoardAction,
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

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-slate-700 bg-panel p-4">
        <h3 className="font-display text-lg text-textMain">Tarefas</h3>
        <p className="text-sm text-textMuted">Acompanhamento da sua fila operacional</p>
      </header>

      <article className="rounded-2xl border border-slate-700 bg-panel p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Visao rapida</p>
            <h4 className="mt-1 font-display text-base text-textMain">Minhas tarefas</h4>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-panelAlt px-3 py-1.5 text-textMain">{taskStats.total} no filtro</span>
            <span className="rounded-full bg-accent/10 px-3 py-1.5 text-accent">{taskStats.open} abertas</span>
            <span className="rounded-full bg-success/20 px-3 py-1.5 text-success">{taskStats.done} concluidas</span>
            <span className="rounded-full bg-danger/20 px-3 py-1.5 text-danger">{taskStats.critical} criticas</span>
          </div>
        </div>
      </article>

      <div className="space-y-4">
          <article className="rounded-2xl border border-slate-700 bg-panel p-4">
            <button
              aria-expanded={composerOpen || form.id > 0}
              className="flex w-full items-start justify-between gap-3 text-left"
              onClick={() => setComposerOpen((current) => !current)}
              type="button"
            >
              <div>
                <h4 className="font-display text-base text-textMain">
                  {form.id > 0 ? "Editar tarefa" : "Nova tarefa"}
                </h4>
                <p className="text-sm text-textMuted">Cadastro rapido da tarefa</p>
              </div>
              <span className="rounded-full border border-slate-600 px-3 py-1 text-xs text-textMain">
                {composerOpen || form.id > 0 ? "Ocultar" : "Abrir formulario"}
              </span>
            </button>

            {(composerOpen || form.id > 0) && (
              <div className="mt-4 space-y-3">
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
              </div>
            )}
          </article>

          <TaskBoard
            boardColumns={boardColumns}
            emptyMessage="Nenhuma tarefa encontrada para os filtros atuais."
            filters={
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
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
            }
            headerDescription="Filtros e visao por status"
            headerTitle="Minhas tarefas"
            loading={loading}
            metaRowRenderer={(task) => (
              <>
                <span>Prazo: {task.dueAt ? new Date(task.dueAt).toLocaleString("pt-BR") : "-"}</span>
                <span>Responsavel: {task.assigneeName || "Nao atribuido"}</span>
              </>
            )}
            selectedTaskId={selectedTask?.id ?? null}
            onBoardAction={runBoardAction}
            onBoardCardKeyDown={onBoardCardKeyDown}
            onCancelTask={cancelTask}
            onCompleteTask={completeTask}
            onOpenTask={openTaskFromBoard}
            onRefresh={() => void refreshTaskViews()}
            onUpdateStatus={(taskId, status) => updateTaskStatus(taskId, status, TASK_STATUS_LABELS[status])}
          />
      </div>

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
