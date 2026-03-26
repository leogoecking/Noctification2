import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import type { TaskItem, TaskStatus } from "../../types";
import {
  TASK_PRIORITY_BADGES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_BADGES,
  formatTaskDateTime
} from "./taskUi";

interface TaskBoardColumn {
  status: TaskStatus;
  label: string;
  tasks: TaskItem[];
}

interface TaskBoardProps {
  headerTitle: string;
  headerDescription: string;
  filters: ReactNode;
  loading: boolean;
  emptyMessage: string;
  boardColumns: TaskBoardColumn[];
  selectedTaskId: number | null;
  onRefresh: () => void;
  onOpenTask: (task: TaskItem) => void;
  onBoardCardKeyDown: (event: KeyboardEvent<HTMLDivElement>, task: TaskItem) => void;
  onBoardAction: (event: MouseEvent<HTMLButtonElement>, action: () => void) => void;
  onUpdateStatus: (taskId: number, status: "new" | "in_progress" | "waiting") => void;
  onCompleteTask: (taskId: number) => void;
  onCancelTask: (taskId: number) => void;
  metaRowRenderer?: (task: TaskItem) => ReactNode;
}

export const TaskBoard = ({
  headerTitle,
  headerDescription,
  filters,
  loading,
  emptyMessage,
  boardColumns,
  selectedTaskId,
  onRefresh,
  onOpenTask,
  onBoardCardKeyDown,
  onBoardAction,
  onUpdateStatus,
  onCompleteTask,
  onCancelTask,
  metaRowRenderer
}: TaskBoardProps) => {
  return (
    <article className="rounded-2xl border border-slate-700 bg-panel p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-display text-base text-textMain">{headerTitle}</h4>
          <p className="text-sm text-textMuted">{headerDescription}</p>
        </div>
        <span className="rounded-full bg-accent/10 px-3 py-1.5 text-xs text-accent">Board</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain"
          onClick={() => onRefresh()}
          type="button"
        >
          Atualizar tarefas
        </button>
        {filters}
      </div>

      {loading && <p className="text-sm text-textMuted">Carregando tarefas...</p>}
      {!loading && boardColumns.every((column) => column.tasks.length === 0) && (
        <p className="text-sm text-textMuted">{emptyMessage}</p>
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
                    selectedTaskId === task.id
                      ? "border-accent bg-accent/10"
                      : "border-slate-700 bg-panel hover:border-slate-500"
                  }`}
                  onClick={() => onOpenTask(task)}
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
                    {metaRowRenderer ? metaRowRenderer(task) : <span>Prazo: {formatTaskDateTime(task.dueAt)}</span>}
                  </div>
                  <p className="mt-2 text-[11px] text-textMuted">
                    {selectedTaskId === task.id ? "Aberta no detalhe" : "Clique para abrir"}
                  </p>
                  {selectedTaskId === task.id && task.status !== "done" && task.status !== "cancelled" && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {task.status !== "new" && (
                        <button
                          className="rounded-md border border-slate-600 px-2 py-1 text-[10px] text-textMuted"
                          onClick={(event) => onBoardAction(event, () => onUpdateStatus(task.id, "new"))}
                          type="button"
                        >
                          Nova
                        </button>
                      )}
                      {task.status !== "in_progress" && (
                        <button
                          className="rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-[10px] text-warning"
                          onClick={(event) => onBoardAction(event, () => onUpdateStatus(task.id, "in_progress"))}
                          type="button"
                        >
                          Em andamento
                        </button>
                      )}
                      {task.status !== "waiting" && (
                        <button
                          className="rounded-md border border-slate-600 px-2 py-1 text-[10px] text-textMuted"
                          onClick={(event) => onBoardAction(event, () => onUpdateStatus(task.id, "waiting"))}
                          type="button"
                        >
                          Aguardar
                        </button>
                      )}
                      <button
                        className="rounded-md bg-success px-2 py-1 text-[10px] font-semibold text-slate-900"
                        onClick={(event) => onBoardAction(event, () => onCompleteTask(task.id))}
                        type="button"
                      >
                        Concluir
                      </button>
                      <button
                        className="rounded-md border border-danger/50 bg-danger/10 px-2 py-1 text-[10px] text-danger"
                        onClick={(event) => onBoardAction(event, () => onCancelTask(task.id))}
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
  );
};
