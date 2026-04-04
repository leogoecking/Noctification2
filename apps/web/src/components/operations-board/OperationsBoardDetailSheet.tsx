import type { OperationsBoardEventItem, OperationsBoardMessageItem } from "../../types";
import {
  CATEGORIAS,
  TIMELINE_ICONS,
  buildTimelineLabels,
  formatDate,
  getCategoryPalette
} from "./operationsBoardUi";

interface OperationsBoardDetailSheetProps {
  currentUserName: string;
  darkMode: boolean;
  detailLoading: boolean;
  commentDraft: string;
  formBody: string;
  formTitle: string;
  selected: OperationsBoardMessageItem;
  timeline: OperationsBoardEventItem[];
  onClose: () => void;
  onCommentDraftChange: (value: string) => void;
  onFormBodyChange: (value: string) => void;
  onFormTitleChange: (value: string) => void;
  onPrepareEdition: () => void;
  onResolve: () => void;
  onSave: () => void;
  onSubmitComment: () => void;
}

export const OperationsBoardDetailSheet = ({
  currentUserName,
  darkMode,
  detailLoading,
  commentDraft,
  formBody,
  formTitle,
  selected,
  timeline,
  onClose,
  onCommentDraftChange,
  onFormBodyChange,
  onFormTitleChange,
  onPrepareEdition,
  onResolve,
  onSave,
  onSubmitComment
}: OperationsBoardDetailSheetProps) => (
  <div
    className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
    onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.75rem] bg-panel shadow-2xl sm:rounded-[1.75rem]">
      <div style={{ height: 4, background: getCategoryPalette(selected.category, darkMode).pin }} />

      <div className="px-6 pb-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{
                background: getCategoryPalette(selected.category, darkMode).bg,
                color: getCategoryPalette(selected.category, darkMode).labelColor,
                border: `1px solid ${getCategoryPalette(selected.category, darkMode).border}`
              }}
            >
              {CATEGORIAS[selected.category].label}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                selected.status === "active"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-panelAlt text-textMuted"
              }`}
            >
              {selected.status === "active" ? "Ativo" : "Encerrado"}
            </span>
          </div>
          <button
            aria-label="Fechar"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-outlineSoft bg-panelAlt text-base text-textMuted transition-colors hover:bg-outlineSoft"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <h3 className="mt-3 text-xl font-bold leading-snug text-textMain">{selected.title}</h3>

        <div className="mt-2 flex items-center gap-2">
          <div
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ background: getCategoryPalette(selected.category, darkMode).pin }}
          >
            {selected.authorName.trim().charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-textMuted">
            {selected.authorName} · {formatDate(selected.createdAt)}
          </span>
        </div>
      </div>

      <div className="mx-6 h-px bg-outlineSoft/50" />

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {detailLoading ? (
          <p className="mt-6 text-sm text-textMuted">Carregando detalhes...</p>
        ) : (
          <>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-textMain">{selected.body}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-1.5 text-xs font-medium text-textMain transition-colors hover:bg-outlineSoft/60"
                onClick={onPrepareEdition}
                type="button"
              >
                Preparar edicao
              </button>
              {selected.status === "active" ? (
                <button className="btn-warning text-xs" onClick={onResolve} type="button">
                  Encerrar recado
                </button>
              ) : null}
            </div>

            {formTitle && formBody ? (
              <div className="mt-5 space-y-3 rounded-xl border border-outlineSoft bg-panelAlt p-4">
                <p className="text-xs font-semibold text-textMain">Edicao preparada</p>
                <input
                  className="w-full rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-sm text-textMain outline-none"
                  onChange={(event) => onFormTitleChange(event.target.value)}
                  value={formTitle}
                />
                <textarea
                  className="min-h-24 w-full resize-none rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-sm text-textMain outline-none"
                  onChange={(event) => onFormBodyChange(event.target.value)}
                  value={formBody}
                />
                <button className="btn-primary w-full" onClick={onSave} type="button">
                  Salvar alteracoes
                </button>
              </div>
            ) : null}

            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold text-textMuted">Comentario rapido</p>
              <textarea
                className="w-full resize-none rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2.5 text-sm text-textMain outline-none"
                style={{ minHeight: 72 }}
                onChange={(event) => onCommentDraftChange(event.target.value)}
                placeholder={`Atualizacao de ${currentUserName}...`}
                value={commentDraft}
              />
              <button
                className="mt-2 w-full rounded-xl border border-outlineSoft bg-panel px-4 py-2.5 text-sm font-semibold text-textMain transition-colors hover:bg-panelAlt disabled:opacity-40"
                disabled={!commentDraft.trim()}
                onClick={onSubmitComment}
                type="button"
              >
                Registrar comentario
              </button>
            </div>

            {timeline.length > 0 ? (
              <div className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-textMuted">Histórico</p>
                <div className="space-y-2">
                  {timeline.map((event) => {
                    const icon = TIMELINE_ICONS[event.eventType] ?? "•";
                    const label = buildTimelineLabels[event.eventType] ?? event.eventType;

                    if (event.eventType === "viewed") {
                      return (
                        <div key={event.id} className="flex items-center gap-2 py-0.5">
                          <span className="text-xs text-textMuted/40">{icon}</span>
                          <span className="text-xs text-textMuted/60">
                            {event.actorName} visualizou · {formatDate(event.createdAt)}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={event.id} className="rounded-xl bg-panelAlt p-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm leading-none">{icon}</span>
                            <span className="text-sm font-semibold text-textMain">{event.actorName}</span>
                            <span className="rounded-full bg-outlineSoft/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-textMuted">
                              {label}
                            </span>
                          </div>
                          <span className="flex-shrink-0 text-[11px] text-textMuted">
                            {formatDate(event.createdAt)}
                          </span>
                        </div>
                        {event.body ? (
                          <p className="mt-2 whitespace-pre-wrap border-l-2 border-outlineSoft pl-3 text-sm text-textMain">
                            {event.body}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  </div>
);
