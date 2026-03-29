import { useCallback, useMemo, useState } from "react";
import { api, ApiError } from "../../../lib/api";
import type { TaskItem, TaskPriority, UserItem } from "../../../types";
import { TASK_STATUS_LABELS } from "../../../components/tasks/taskUi";
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
  EMPTY_TASK_ADMIN_FORM,
  type AdminTaskFilterPriority,
  type AdminTaskFilterStatus,
  type TaskAdminFormState
} from "./adminTasksPanelModel";

interface AdminTasksPanelProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

export const AdminTasksPanel = ({ onError, onToast }: AdminTasksPanelProps) => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [form, setForm] = useState<TaskAdminFormState>(EMPTY_TASK_ADMIN_FORM);
  const [statusFilter, setStatusFilter] = useState<AdminTaskFilterStatus>("");
  const [priorityFilter, setPriorityFilter] = useState<AdminTaskFilterPriority>("");
  const [assigneeFilter, setAssigneeFilter] = useState("");

  const buildQuery = useCallback(() => {
    return buildAdminTaskQuery({
      statusFilter,
      priorityFilter,
      assigneeFilter
    });
  }, [assigneeFilter, priorityFilter, statusFilter]);

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
      const [tasksResponse, usersResponse] = await Promise.all([
        api.adminTasks(buildQuery()),
        api.adminUsers()
      ]);

      return {
        tasks: tasksResponse.tasks,
        users: usersResponse.users.filter((user) => user.isActive)
      };
    }, [buildQuery]),
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
    onListLoaded: useCallback((result: { tasks: TaskItem[]; users: UserItem[] }) => {
      setUsers(result.users);
    }, [])
  });

  const taskStats = useMemo(() => buildAdminTaskStats(tasks), [tasks]);

  const boardColumns = useMemo(() => buildAdminTaskBoardColumns(tasks), [tasks]);

  const startEditing = useCallback((task: TaskItem) => {
    setForm(buildAdminTaskFormState(task));
  }, []);

  const resetForm = useCallback(() => {
    setForm(EMPTY_TASK_ADMIN_FORM);
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

            <TaskRecurrenceField
              recurrenceAriaLabel="Recorrencia da tarefa admin"
              repeatType={form.repeatType}
              weekdayAriaLabelPrefix="Dia da recorrencia admin"
              weekdays={form.weekdays}
              onRepeatTypeChange={(repeatType) => setForm((prev) => ({ ...prev, repeatType }))}
              onWeekdaysChange={(weekdays) => setForm((prev) => ({ ...prev, weekdays }))}
            />

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

          <TaskBoard
            boardColumns={boardColumns}
            emptyMessage="Nenhuma tarefa encontrada para os filtros atuais."
            filters={
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
            }
            headerDescription="Filtros e visao por status"
            headerTitle="Fila de tarefas"
            loading={loading}
            metaRowRenderer={(task) => (
              <>
                <span>Responsavel: {task.assigneeName || "Nao atribuido"}</span>
                <span>Prazo: {task.dueAt ? new Date(task.dueAt).toLocaleString("pt-BR") : "-"}</span>
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
