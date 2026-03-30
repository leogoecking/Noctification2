import { useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import type { TaskItem, TaskStatus } from "../../types";
import {
  TASK_PRIORITY_BADGES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_BADGES,
  TASK_STATUS_LABELS,
  formatTaskDateTime
} from "./taskUi";

interface TaskBoardColumn {
  status: TaskStatus;
  label: string;
  tasks: TaskItem[];
}

type BoardMutableStatus = "new" | "assumed" | "in_progress" | "blocked" | "waiting_external";

const isBoardMutableStatus = (status: TaskStatus): status is BoardMutableStatus =>
  status === "new" ||
  status === "assumed" ||
  status === "in_progress" ||
  status === "blocked" ||
  status === "waiting_external";

interface TaskBoardProps {
  headerTitle: string;
  headerDescription: string;
  filters: ReactNode;
  loading: boolean;
  emptyMessage: string;
  boardColumns: TaskBoardColumn[];
  selectedTaskId: number | null;
  selectedTask: TaskItem | null;
  onRefresh: () => void;
  onOpenTask: (task: TaskItem) => void;
  onBoardCardKeyDown: (event: KeyboardEvent<HTMLDivElement>, task: TaskItem) => void;
  onUpdateStatus: (
    taskId: number,
    status: "new" | "assumed" | "in_progress" | "blocked" | "waiting_external"
  ) => void;
  onCompleteTask: (taskId: number) => void;
  onCancelTask: (taskId: number) => void;
  metaRowRenderer?: (task: TaskItem) => ReactNode;
  bulkSelection?: {
    selectedTaskIds: number[];
    onToggleTask: (taskId: number) => void;
  };
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export const TaskBoard = ({
  headerTitle,
  headerDescription,
  filters,
  loading,
  emptyMessage,
  boardColumns,
  selectedTaskId,
  selectedTask,
  onRefresh,
  onOpenTask,
  onBoardCardKeyDown,
  onUpdateStatus,
  onCompleteTask,
  onCancelTask,
  metaRowRenderer,
  bulkSelection,
  primaryAction
}: TaskBoardProps) => {
  const [dragTaskId, setDragTaskId] = useState<number | null>(null);

  const handleCardDragStart = (event: DragEvent<HTMLDivElement>, task: TaskItem) => {
    if (!isBoardMutableStatus(task.status)) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/task-id", String(task.id));
    event.dataTransfer.setData("text/task-status", task.status);
    setDragTaskId(task.id);
  };

  const handleColumnDrop = (event: DragEvent<HTMLElement>, status: TaskStatus) => {
    event.preventDefault();
    setDragTaskId(null);

    if (!isBoardMutableStatus(status)) {
      return;
    }

    const taskIdRaw = event.dataTransfer.getData("text/task-id");
    const sourceStatus = event.dataTransfer.getData("text/task-status");
    const taskId = Number(taskIdRaw);

    if (!Number.isInteger(taskId) || taskId <= 0 || sourceStatus === status) {
      return;
    }

    onUpdateStatus(taskId, status);
  };

  return (
    <article className="rounded-[1.5rem] bg-panel p-5 shadow-glow">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted">Task Kanban</p>
          <h4 className="mt-1 font-display text-xl font-extrabold tracking-tight text-textMain">
            {headerTitle}
          </h4>
          <p className="text-sm text-textMuted">{headerDescription}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {primaryAction && (
            <button className="btn-primary" onClick={primaryAction.onClick} type="button">
              {primaryAction.label}
            </button>
          )}
          <span className="rounded-full bg-panelAlt px-3 py-1.5 text-xs font-semibold text-textMain">
            Last updated now
          </span>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-[1rem] bg-panelAlt/80 p-3">
        <button
          className="rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-sm text-textMain"
          onClick={() => onRefresh()}
          type="button"
        >
          Atualizar tarefas
        </button>
        {filters}
      </div>

      {selectedTask && (
        <div className="mb-5 rounded-[1.25rem] bg-panelAlt p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Tarefa selecionada</p>
              <h5 className="mt-1 text-base font-semibold text-textMain">{selectedTask.title}</h5>
              <p className="text-xs text-textMuted">
                Use o arraste entre colunas ou as acoes abaixo para operar sem poluir os cards.
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] ${TASK_STATUS_BADGES[selectedTask.status]}`}>
              {selectedTaskId === selectedTask.id
                ? `Selecionada · ${TASK_STATUS_LABELS[selectedTask.status]}`
                : TASK_STATUS_LABELS[selectedTask.status]}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedTask.status !== "done" && selectedTask.status !== "cancelled" && (
              <>
                {selectedTask.status !== "new" && (
                  <button
                    className="rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-sm text-textMain"
                    onClick={() => onUpdateStatus(selectedTask.id, "new")}
                    type="button"
                  >
                    Mover para nova
                  </button>
                )}
                {selectedTask.status !== "assumed" && (
                  <button
                    className="rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-300"
                    onClick={() => onUpdateStatus(selectedTask.id, "assumed")}
                    type="button"
                  >
                    Assumir
                  </button>
                )}
                {selectedTask.status !== "in_progress" && (
                  <button
                    className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning"
                    onClick={() => onUpdateStatus(selectedTask.id, "in_progress")}
                    type="button"
                  >
                    Mover para em andamento
                  </button>
                )}
                {selectedTask.status !== "blocked" && (
                  <button
                    className="rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger"
                    onClick={() => onUpdateStatus(selectedTask.id, "blocked")}
                    type="button"
                  >
                    Mover para bloqueada
                  </button>
                )}
                {selectedTask.status !== "waiting_external" && (
                  <button
                    className="rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-sm text-textMain"
                    onClick={() => onUpdateStatus(selectedTask.id, "waiting_external")}
                    type="button"
                  >
                    Mover para aguardando externo
                  </button>
                )}
                <button
                  className="btn-success"
                  onClick={() => onCompleteTask(selectedTask.id)}
                  type="button"
                >
                  Concluir selecionada
                </button>
                <button
                  className="rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger"
                  onClick={() => onCancelTask(selectedTask.id)}
                  type="button"
                >
                  Cancelar selecionada
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-textMuted">Carregando tarefas...</p>}
      {!loading && boardColumns.every((column) => column.tasks.length === 0) && (
        <p className="text-sm text-textMuted">{emptyMessage}</p>
      )}

      <div className="flex gap-6 overflow-x-auto pb-2">
        {boardColumns.map((column) => (
          <section
            key={column.status}
            aria-label={`Coluna ${column.label}`}
            className={`min-h-40 min-w-[320px] flex-1 rounded-[1.25rem] p-4 ${
              isBoardMutableStatus(column.status) && dragTaskId !== null
                ? "bg-accent/5 ring-1 ring-accent/30"
                : "bg-panelAlt/80"
            }`}
            onDragOver={(event) => {
              if (isBoardMutableStatus(column.status)) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }
            }}
            onDrop={(event) => handleColumnDrop(event, column.status)}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] ${TASK_STATUS_BADGES[column.status]}`}>
                {column.label}
              </span>
              <span className="rounded-full bg-panel px-2.5 py-1 text-xs text-textMuted">
                {column.tasks.length}
              </span>
            </div>

            <div className="space-y-2">
              {column.tasks.length === 0 && (
                <p className="rounded-xl border border-dashed border-outlineSoft px-3 py-6 text-xs text-textMuted">
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
                      : "border-transparent bg-panel hover:bg-surfaceHigh"
                  }`}
                  draggable={isBoardMutableStatus(task.status)}
                  onClick={() => onOpenTask(task)}
                  onDragEnd={() => setDragTaskId(null)}
                  onDragStart={(event) => handleCardDragStart(event, task)}
                  onKeyDown={(event) => onBoardCardKeyDown(event, task)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      {bulkSelection && (
                        <input
                          aria-label={`Selecionar tarefa ${task.title}`}
                          checked={bulkSelection.selectedTaskIds.includes(task.id)}
                          className="mt-0.5 h-4 w-4 rounded border-outlineSoft bg-panel"
                          onChange={(event) => {
                            event.stopPropagation();
                            bulkSelection.onToggleTask(task.id);
                          }}
                          onClick={(event) => event.stopPropagation()}
                          type="checkbox"
                        />
                      )}
                      <p className="min-w-0 flex-1 break-words text-sm font-medium text-textMain">{task.title}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${TASK_PRIORITY_BADGES[task.priority]}`}
                    >
                      {TASK_PRIORITY_LABELS[task.priority]}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-textMuted">
                    {metaRowRenderer ? metaRowRenderer(task) : <span>Prazo: {formatTaskDateTime(task.dueAt)}</span>}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-textMuted">
                    <span>{selectedTaskId === task.id ? "Selecionada" : "Clique para abrir"}</span>
                    {selectedTaskId === task.id && <span className="text-accent">Acoes no topo do board</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
};
