import { useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
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

type BoardMutableStatus = "new" | "assumed" | "in_progress" | "blocked" | "waiting_external";
type BoardDropTargetStatus = BoardMutableStatus | "done";

const isBoardMutableStatus = (status: TaskStatus): status is BoardMutableStatus =>
  status === "new" ||
  status === "assumed" ||
  status === "in_progress" ||
  status === "blocked" ||
  status === "waiting_external";

const isBoardDropTargetStatus = (status: TaskStatus): status is BoardDropTargetStatus =>
  isBoardMutableStatus(status) || status === "done";

interface TaskBoardProps {
  headerTitle: string;
  headerDescription: string;
  headerEyebrow?: string;
  filters?: ReactNode;
  loading: boolean;
  emptyMessage: string;
  boardColumns: TaskBoardColumn[];
  selectedTaskId: number | null;
  onRefresh: () => void;
  onOpenTask: (task: TaskItem) => void;
  onBoardCardKeyDown: (event: KeyboardEvent<HTMLDivElement>, task: TaskItem) => void;
  onUpdateStatus: (
    taskId: number,
    status: "new" | "assumed" | "in_progress" | "blocked" | "waiting_external"
  ) => void;
  onCompleteTask: (taskId: number) => void;
  metaRowRenderer?: (task: TaskItem) => ReactNode;
  bulkSelection?: {
    selectedTaskIds: number[];
    onToggleTask: (taskId: number) => void;
  };
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  showHeaderMetaBadge?: boolean;
}

const COLUMN_STATUS_DOT: Record<TaskStatus, string> = {
  new: "bg-accent",
  assumed: "bg-sky-400",
  in_progress: "bg-warning",
  blocked: "bg-danger",
  waiting_external: "bg-textMuted",
  done: "bg-success",
  cancelled: "bg-danger"
};

const PRIORITY_CARD_BORDER: Record<string, string> = {
  low: "border-l-outlineSoft/40",
  normal: "border-l-accent",
  high: "border-l-warning",
  critical: "border-l-danger"
};

export const TaskBoard = ({
  headerTitle,
  headerDescription,
  headerEyebrow = "Task Kanban",
  filters,
  loading,
  emptyMessage,
  boardColumns,
  selectedTaskId,
  onRefresh,
  onOpenTask,
  onBoardCardKeyDown,
  onUpdateStatus,
  onCompleteTask,
  metaRowRenderer,
  bulkSelection,
  primaryAction,
  showHeaderMetaBadge = true
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

    if (!isBoardDropTargetStatus(status)) {
      return;
    }

    const taskIdRaw = event.dataTransfer.getData("text/task-id");
    const sourceStatus = event.dataTransfer.getData("text/task-status");
    const taskId = Number(taskIdRaw);

    if (!Number.isInteger(taskId) || taskId <= 0 || sourceStatus === status) {
      return;
    }

    if (status === "done") {
      onCompleteTask(taskId);
      return;
    }

    onUpdateStatus(taskId, status);
  };

  return (
    <article className="rounded-[1.5rem] border border-outlineSoft/70 bg-panel p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-textMuted">{headerEyebrow}</p>
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
          {showHeaderMetaBadge ? (
            <span className="rounded-full bg-panelAlt px-3 py-1.5 text-xs font-semibold text-textMain">
              Last updated now
            </span>
          ) : null}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          aria-label="Atualizar tarefas"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-outlineSoft bg-panel text-textMain"
          onClick={() => onRefresh()}
          type="button"
        >
          <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
            <path
              d="M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </button>
        {filters ? filters : null}
      </div>

      {loading && <p className="text-sm text-textMuted">Carregando tarefas...</p>}
      {!loading && boardColumns.every((column) => column.tasks.length === 0) && (
        <p className="text-sm text-textMuted">{emptyMessage}</p>
      )}

      <div className="flex gap-4 overflow-x-auto pb-2">
        {boardColumns.map((column) => (
          <section
            key={column.status}
            aria-label={`Coluna ${column.label}`}
            className={`min-h-40 min-w-[220px] flex-1 rounded-[1.25rem] p-4 ${
              isBoardDropTargetStatus(column.status) && dragTaskId !== null
                ? "bg-accent/5 ring-1 ring-accent/30"
                : "bg-panelAlt/80"
            }`}
            onDragOver={(event) => {
              if (isBoardDropTargetStatus(column.status)) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }
            }}
            onDrop={(event) => handleColumnDrop(event, column.status)}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${COLUMN_STATUS_DOT[column.status]}`} />
                <span className={`rounded-full px-2.5 py-1 text-[11px] ${TASK_STATUS_BADGES[column.status]}`}>
                  {column.label}
                </span>
              </div>
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
                  className={`w-full cursor-pointer rounded-xl border-l-[3px] border-t border-r border-b p-3 text-left transition ${
                    selectedTaskId === task.id
                      ? `${PRIORITY_CARD_BORDER[task.priority]} border-t-outlineSoft/40 border-r-outlineSoft/40 border-b-outlineSoft/40 ring-1 ring-accent/20 bg-accent/5`
                      : `${PRIORITY_CARD_BORDER[task.priority]} border-t-outlineSoft/40 border-r-outlineSoft/40 border-b-outlineSoft/40 bg-panel hover:border-t-outlineSoft hover:border-r-outlineSoft hover:border-b-outlineSoft hover:bg-surfaceHigh`
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
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${TASK_PRIORITY_BADGES[task.priority]}`}
                    >
                      {TASK_PRIORITY_LABELS[task.priority]}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-textMuted">
                    {metaRowRenderer ? metaRowRenderer(task) : <span>{formatTaskDateTime(task.dueAt)}</span>}
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
