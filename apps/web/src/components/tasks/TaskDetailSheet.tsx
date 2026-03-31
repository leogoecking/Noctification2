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
  onUpdateStatus: (
    taskId: number,
    status: "new" | "assumed" | "in_progress" | "blocked" | "waiting_external"
  ) => void;
  onCompleteTask: (taskId: number) => void;
  onCancelTask: (taskId: number) => void;
  onCommentBodyChange: (value: string) => void;
  onSubmitComment: () => void;
}

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
  onUpdateStatus,
  onCompleteTask,
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
      className="fixed inset-0 z-40 flex items-center justify-center bg-textMain/70 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        aria-label="Detalhe da tarefa"
        aria-modal="true"
        className="max-h-[min(88vh,960px)] w-full max-w-3xl overflow-y-auto rounded-[1.25rem] bg-panel p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-accent">Detalhe da tarefa</p>
              <h4 className="mt-1 font-display text-lg text-textMain">{selectedTask.title}</h4>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] ${TASK_STATUS_BADGES[selectedTask.status]}`}>
                {TASK_STATUS_LABELS[selectedTask.status]}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] ${TASK_PRIORITY_BADGES[selectedTask.priority]}`}>
                {TASK_PRIORITY_LABELS[selectedTask.priority]}
              </span>
              <button
                aria-label="Fechar detalhe da tarefa"
                className="rounded-full border border-outlineSoft bg-panelAlt px-3 py-1 text-xs text-textMain"
                onClick={onClose}
                type="button"
              >
                Fechar
              </button>
            </div>
          </div>

          <p className="whitespace-pre-wrap text-sm text-textMain">
            {selectedTask.description || "Sem descricao registrada"}
          </p>

          <div className="rounded-2xl bg-panelAlt/70 p-4">
            <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,120px),1fr]">
              <dt className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Responsavel</dt>
              <dd className="text-sm text-textMain">{selectedTask.assigneeName || "Nao atribuido"}</dd>
              <dt className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Criada por</dt>
              <dd className="text-sm text-textMain">{selectedTask.creatorName || "-"}</dd>
              <dt className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Prazo</dt>
              <dd className="text-sm text-textMain">{formatTaskDateTime(selectedTask.dueAt)}</dd>
              <dt className="text-[10px] uppercase tracking-[0.18em] text-textMuted">SLA</dt>
              <dd className="text-sm text-textMain">
                <span className={`rounded-full px-2.5 py-1 text-[11px] ${taskSla.badgeClassName}`}>
                  {taskSla.label}
                </span>
                <span className="ml-2 text-textMuted">{taskSla.detail}</span>
              </dd>
              <dt className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Recorrencia</dt>
              <dd className="text-sm text-textMain">
                {buildTaskRecurrenceSummary(selectedTask.repeatType, selectedTask.repeatWeekdays)}
              </dd>
              <dt className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Atualizada em</dt>
              <dd className="text-sm text-textMain">{formatTaskDateTime(selectedTask.updatedAt)}</dd>
            </dl>
          </div>

          {selectedTask.status !== "done" && selectedTask.status !== "cancelled" && (
            <div className="space-y-3 rounded-[1.25rem] bg-panelAlt p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Acao principal</p>
                <p className="mt-1 text-sm text-textMuted">
                  O kanban concentra mudancas de status. No detalhe ficam apenas as acoes de manutencao.
                </p>
              </div>
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
            </div>
          )}

          <div className="space-y-2">
            <div className="rounded-[1.25rem] bg-panelAlt p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Comentarios</p>
                {commentSaving && <span className="text-[11px] text-textMuted">Enviando...</span>}
              </div>
              <textarea
                aria-label={commentAriaLabel}
                className="input mt-3 min-h-24"
                placeholder={commentPlaceholder}
                value={commentBody}
                onChange={(event) => onCommentBodyChange(event.target.value)}
              />
              <div className="mt-3 flex justify-end">
                <button className="btn-primary" onClick={() => onSubmitComment()} type="button">
                  Adicionar comentario
                </button>
              </div>
            </div>
          </div>

          <details className="rounded-[1.25rem] bg-panelAlt p-4" open>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-textMuted">Historico da tarefa</span>
              {detailLoading && <span className="text-[11px] text-textMuted">Atualizando...</span>}
            </summary>
            <div className="mt-3 space-y-2">
              {taskTimeline.length === 0 && !detailLoading && (
                <p className="text-sm text-textMuted">Nenhum historico registrado ainda.</p>
              )}
              {taskTimeline.map((item) => (
                <div key={item.id} className="rounded-xl bg-panel p-3 ring-1 ring-outlineSoft/50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-textMain">{buildTaskTimelineSummary(item)}</p>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] ${
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
          </details>
        </div>
      </div>
    </div>
  );
};
