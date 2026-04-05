import { useCallback, useMemo, useState } from "react";
import { api, ApiError } from "../../../lib/api";
import type {
  AuthUser,
  TaskItem,
  TaskPriority,
  TaskRepeatType,
} from "../../../types";
import {
  buildTaskSlaInfo,
  compareTasksByOperationalOrder,
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
  const [searchFilter, setSearchFilter] = useState("");

  const openCreateTask = useCallback(() => {
    setForm(EMPTY_FORM);
    setComposerOpen(true);
  }, []);

  const buildQuery = useCallback(() => {
    const normalizedSearch = searchFilter.trim();
    if (!normalizedSearch) {
      return "";
    }

    return `?${new URLSearchParams({ search: normalizedSearch }).toString()}`;
  }, [searchFilter]);

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

  const boardColumns = useMemo(
    () =>
      TASK_BOARD_COLUMNS.filter((status) => status !== "blocked" && status !== "cancelled").map((status) => ({
        status,
        label: TASK_STATUS_LABELS[status],
        tasks: tasks
          .filter((task) => task.status === status)
          .sort((left, right) => compareTasksByOperationalOrder(left, right))
      })),
    [tasks]
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

  return (
    <section className="space-y-6">
      <div className="space-y-4">
          <TaskBoard
            boardColumns={boardColumns}
            emptyMessage="Nenhuma tarefa encontrada para a busca atual."
            filters={
              <div className="flex flex-1">
                <input
                  className="input min-w-36"
                  placeholder="titulo, descricao ou status"
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
                <span>{task.dueAt ? new Date(task.dueAt).toLocaleString("pt-BR") : "Sem prazo"}</span>
                <span>{task.assigneeName || "Sem responsavel"}</span>
              </>
            )}
            selectedTaskId={selectedTask?.id ?? null}
            onBoardCardKeyDown={onBoardCardKeyDown}
            onOpenTask={openTaskFromBoard}
            onRefresh={() => void refreshTaskViews()}
            onCompleteTask={(taskId) => void completeTask(taskId)}
            onUpdateStatus={(taskId, status) => updateTaskStatus(taskId, status, TASK_STATUS_LABELS[status])}
            showHeaderMetaBadge={false}
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

      {(composerOpen || form.id > 0) && (
        <div
          aria-label="Overlay do formulario da tarefa"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-3 sm:p-6"
          onClick={resetForm}
        >
          <div
            aria-label="Formulario da tarefa"
            aria-modal="true"
            className="flex max-h-[min(90vh,640px)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.25rem] bg-panel shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="shrink-0 px-5 pt-5 pb-4">
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-display text-xl font-bold text-textMain">
                  {form.id > 0 ? "Editar tarefa" : "Nova tarefa"}
                </h4>
                <button
                  aria-label="Fechar formulario da tarefa"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-outlineSoft bg-panelAlt text-sm text-textMain"
                  onClick={resetForm}
                  type="button"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-5">
            <div className="space-y-4">

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
                  className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain"
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
        onStartEditing={startEditing}
        onSubmitComment={() => void submitComment()}
      />
    </section>
  );
};
