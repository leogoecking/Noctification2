import type { TaskItem, TaskTimelineItem } from "../../types";
import {
  buildTaskSlaInfo,
  buildTaskRecurrenceSummary,
  buildTaskTimelineDetail,
  buildTaskTimelineSummary,
  formatTaskDateTime,
  isTaskTimelineAutomatic,
  TASK_PRIORITY_BADGES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_BADGES,
  TASK_STATUS_LABELS
} from "./taskUi";

interface TaskDetailSheetProps {
  selectedTask: TaskItem | null;
  taskTimeline: TaskTimelineItem[];
  detailLoading: boolean;
  commentSaving: boolean;
  commentBody: string;
  commentAriaLabel: string;
  commentPlaceholder: string;
  onClose: () => void;
  onStartEditing: (task: TaskItem) => void;
  onCancelTask: (taskId: number) => void;
  onCommentBodyChange: (value: string) => void;
  onSubmitComment: () => void;
}

const PRIORITY_STRIP_BG: Record<string, string> = {
  low: "bg-outlineSoft",
  normal: "bg-accent",
  high: "bg-warning",
  critical: "bg-danger"
};

export const TaskDetailSheet = ({
  selectedTask,
  taskTimeline,
  detailLoading,
  commentSaving,
  commentBody,
  commentAriaLabel,
  commentPlaceholder,
  onClose,
  onStartEditing,
  onCancelTask,
  onCommentBodyChange,
  onSubmitComment
}: TaskDetailSheetProps) => {
  if (!selectedTask) {
    return null;
  }

  const taskSla = buildTaskSlaInfo(selectedTask);

  return (
    <div
      aria-label="Overlay de detalhe da tarefa"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        aria-label="Detalhe da tarefa"
        aria-modal="true"
        className="flex max-h-[min(88vh,960px)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.25rem] bg-panel shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        {/* priority strip */}
        <div className={`h-1 w-full shrink-0 ${PRIORITY_STRIP_BG[selectedTask.priority]}`} />

        {/* fixed header */}
        <div className="shrink-0 px-5 pt-4 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] ${TASK_STATUS_BADGES[selectedTask.status]}`}>
                {TASK_STATUS_LABELS[selectedTask.status]}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] ${TASK_PRIORITY_BADGES[selectedTask.priority]}`}>
                {TASK_PRIORITY_LABELS[selectedTask.priority]}
              </span>
            </div>
            <button
              aria-label="Fechar detalhe da tarefa"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-outlineSoft bg-panelAlt text-sm text-textMain"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>
          <h4 className="mt-2 font-display text-xl font-bold text-textMain">{selectedTask.title}</h4>
          <p className="mt-1 text-xs text-textMuted">
            {selectedTask.creatorName ? `Criado por ${selectedTask.creatorName}` : ""}
            {selectedTask.creatorName && selectedTask.updatedAt ? " · " : ""}
            {selectedTask.updatedAt ? formatTaskDateTime(selectedTask.updatedAt) : ""}
          </p>
        </div>

        <div className="mx-5 h-px shrink-0 bg-outlineSoft/50" />

        {/* scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <div className="space-y-4 pt-4">
            <p className="whitespace-pre-wrap text-sm text-textMain">
              {selectedTask.description || "Sem descricao registrada"}
            </p>

            <div className="rounded-xl border border-outlineSoft/50 bg-panelAlt/60 p-4">
              <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,120px),1fr]">
                <dt className="text-xs uppercase tracking-wider text-textMuted">Responsavel</dt>
                <dd className="text-sm text-textMain">{selectedTask.assigneeName || "Nao atribuido"}</dd>
                <dt className="text-xs uppercase tracking-wider text-textMuted">Criada por</dt>
                <dd className="text-sm text-textMain">{selectedTask.creatorName || "-"}</dd>
                <dt className="text-xs uppercase tracking-wider text-textMuted">Prazo</dt>
                <dd className="text-sm text-textMain">{formatTaskDateTime(selectedTask.dueAt)}</dd>
                <dt className="text-xs uppercase tracking-wider text-textMuted">SLA</dt>
                <dd className="text-sm text-textMain">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] ${taskSla.badgeClassName}`}>
                    {taskSla.label}
                  </span>
                  <span className="ml-2 text-textMuted">{taskSla.detail}</span>
                </dd>
                <dt className="text-xs uppercase tracking-wider text-textMuted">Recorrencia</dt>
                <dd className="text-sm text-textMain">
                  {buildTaskRecurrenceSummary(selectedTask.repeatType, selectedTask.repeatWeekdays)}
                </dd>
                <dt className="text-xs uppercase tracking-wider text-textMuted">Atualizada em</dt>
                <dd className="text-sm text-textMain">{formatTaskDateTime(selectedTask.updatedAt)}</dd>
              </dl>
            </div>

            {selectedTask.status !== "done" && selectedTask.status !== "cancelled" && (
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent"
                  onClick={() => onStartEditing(selectedTask)}
                  type="button"
                >
                  Editar tarefa
                </button>
                <button
                  className="rounded-xl border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger"
                  onClick={() => onCancelTask(selectedTask.id)}
                  type="button"
                >
                  Excluir
                </button>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-textMuted">Comentario</p>
                {commentSaving && <span className="text-[11px] text-textMuted">Enviando...</span>}
              </div>
              <textarea
                aria-label={commentAriaLabel}
                className="input min-h-24"
                placeholder={commentPlaceholder}
                value={commentBody}
                onChange={(event) => onCommentBodyChange(event.target.value)}
              />
              <div className="flex justify-end">
                <button className="btn-primary" onClick={() => onSubmitComment()} type="button">
                  Adicionar comentario
                </button>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-textMuted">
                Historico da tarefa
                {detailLoading && <span className="ml-2 font-normal normal-case tracking-normal">Atualizando...</span>}
              </p>
              <div className="space-y-2">
                {taskTimeline.length === 0 && !detailLoading && (
                  <p className="text-sm text-textMuted">Nenhum historico registrado ainda.</p>
                )}
                {taskTimeline.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl bg-panel p-3 border-l-2 ${
                      item.kind === "comment"
                        ? "border-l-accent/40"
                        : isTaskTimelineAutomatic(item)
                          ? "border-l-warning/40"
                          : "border-l-outlineSoft/40"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-textMain">{buildTaskTimelineSummary(item)}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${
                            item.kind === "comment"
                              ? "bg-accent/10 text-accent"
                              : isTaskTimelineAutomatic(item)
                                ? "bg-warning/20 text-warning"
                                : "bg-panelAlt text-textMuted"
                          }`}
                        >
                          {item.kind === "comment" ? "Comentario" : isTaskTimelineAutomatic(item) ? "Automatico" : "Evento"}
                        </span>
                      </div>
                      <span className="text-[11px] text-textMuted">{formatTaskDateTime(item.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-textMuted">
                      {item.actorName ? `Por ${item.actorName}` : "Evento automatico/sem ator"}
                    </p>
                    {buildTaskTimelineDetail(item) && item.kind === "event" && (
                      <p className="mt-2 text-sm text-textMuted">{buildTaskTimelineDetail(item)}</p>
                    )}
                    {item.kind === "comment" && item.body && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-textMain">{item.body}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
