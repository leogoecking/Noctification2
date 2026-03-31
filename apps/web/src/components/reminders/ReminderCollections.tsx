import type { ReminderItem, ReminderOccurrenceItem } from "../../types";
import {
  formatOccurrenceStatus,
  formatReminderSummary,
  getReminderKindLabel,
  OCCURRENCE_FILTER_LABELS,
  REMINDER_COLOR_STYLES,
  toggleChecklistLine,
  type OccurrenceFilterMode,
  type ReminderViewModel
} from "./reminderUi";

interface ReminderCollectionsProps {
  loading: boolean;
  reminders: ReminderViewModel[];
  occurrences: ReminderOccurrenceItem[];
  occurrenceFilter: OccurrenceFilterMode;
  reminderFilter: string;
  availableTags: string[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onReminderFilterChange: (value: string) => void;
  onOccurrenceFilterChange: (value: OccurrenceFilterMode) => void;
  onEditReminder: (item: ReminderItem) => void;
  onTogglePinnedReminder: (item: ReminderItem) => void;
  onToggleReminder: (item: ReminderItem) => void;
  onDeleteReminder: (id: number) => void;
  onCompleteOccurrence: (id: number) => void;
  onToggleChecklistItem: (item: ReminderItem, nextDescription: string) => void;
  onSendToBoard: (item: ReminderItem, body: string) => void;
}

export const ReminderCollections = ({
  loading,
  reminders,
  occurrences,
  reminderFilter,
  availableTags,
  searchQuery,
  onSearchQueryChange,
  occurrenceFilter,
  onReminderFilterChange,
  onOccurrenceFilterChange,
  onEditReminder,
  onTogglePinnedReminder,
  onToggleReminder,
  onDeleteReminder,
  onCompleteOccurrence,
  onToggleChecklistItem,
  onSendToBoard
}: ReminderCollectionsProps) => {
  const pinnedReminders = reminders.filter((entry) => entry.meta.pinned);
  const regularReminders = reminders.filter((entry) => !entry.meta.pinned);
  const filterChips = [
    { label: "Todas", value: "all" },
    { label: "Fixadas", value: "pinned" },
    { label: "Texto", value: "note" },
    { label: "Checklist", value: "checklist" },
    { label: "Com alarme", value: "alarm" },
    { label: "Ativas", value: "active" },
    { label: "Inativas", value: "inactive" },
    ...availableTags.map((tag) => ({ label: `#${tag}`, value: `tag:${tag}` }))
  ];

  const renderReminderCard = (entry: ReminderViewModel) => {
    const colorStyle = REMINDER_COLOR_STYLES[entry.meta.color];

    return (
      <div
        key={entry.item.id}
        className={`rounded-xl border-l-4 bg-panelAlt p-4 ${colorStyle.accent} ${
          entry.meta.pinned ? "ring-1 ring-warning/50 shadow-glow" : ""
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] ${colorStyle.chip}`}>
                {getReminderKindLabel(entry.meta.noteKind, entry.meta.pinned)}
              </span>
              {entry.meta.pinned ? (
                <span className="rounded-full bg-warning/20 px-2.5 py-1 text-[11px] font-semibold text-warning">
                  Prioridade
                </span>
              ) : null}
              {entry.meta.tag ? (
                <span className="rounded-full bg-panel px-2.5 py-1 text-[11px] text-textMuted">
                  #{entry.meta.tag}
                </span>
              ) : null}
              <span className={`rounded-full px-2.5 py-1 text-[11px] ${entry.item.isActive ? "bg-success/20 text-success" : "bg-panel text-textMuted"}`}>
                {entry.item.isActive ? "Ativa" : "Arquivada"}
              </span>
            </div>
            <div>
              <p className="font-semibold text-textMain">{entry.item.title}</p>
              <p className="mt-1 text-xs text-textMuted">
                {formatReminderSummary(entry.item)} | Inicio em {entry.item.startDate}
              </p>
            </div>
          </div>
          <div className={`rounded-xl px-3 py-2 text-xs ${colorStyle.soft}`}>
            {entry.item.timeOfDay}
          </div>
        </div>

        {entry.meta.noteKind === "checklist" && entry.checklistTotal > 0 ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-textMuted">
              <span>Progresso</span>
              <span>
                {entry.checklistCompleted}/{entry.checklistTotal}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-panel">
              <div
                className="h-full rounded-full bg-accent"
                style={{
                  width: `${entry.checklistTotal === 0 ? 0 : (entry.checklistCompleted / entry.checklistTotal) * 100}%`
                }}
              />
            </div>
            <div className="space-y-2">
              {entry.checklistItems.map((task, index) => (
                <label key={`${entry.item.id}-${index}`} className="flex items-start gap-2 text-sm text-textMain">
                  <input
                    checked={task.checked}
                    onChange={() => onToggleChecklistItem(entry.item, toggleChecklistLine(entry.body, index))}
                    type="checkbox"
                  />
                  <span className={task.checked ? "line-through text-textMuted" : ""}>{task.label}</span>
                </label>
              ))}
            </div>
          </div>
        ) : entry.body ? (
          <p className="mt-3 whitespace-pre-wrap text-sm text-textMuted">{entry.body}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-xs text-textMain" onClick={() => onTogglePinnedReminder(entry.item)} type="button">
            {entry.meta.pinned ? "Desfixar" : "Fixar"}
          </button>
          <button className="rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-xs text-textMain" onClick={() => onEditReminder(entry.item)} type="button">
            Editar
          </button>
          <button className="rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-xs text-textMain" onClick={() => onToggleReminder(entry.item)} type="button">
            {entry.item.isActive ? "Desativar" : "Ativar"}
          </button>
          <button className="rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-xs text-textMain" onClick={() => onSendToBoard(entry.item, entry.body)} type="button">
            No mural
          </button>
          <button className="rounded-lg border border-danger/60 px-3 py-2 text-xs text-danger" onClick={() => onDeleteReminder(entry.item.id)} type="button">
            Arquivar
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <article className="rounded-[1.25rem] bg-panel p-5">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-display text-base text-textMain">Biblioteca operacional</h4>
              <p className="text-sm text-textMuted">Notas, checklists, alarmes e itens fixados no mesmo fluxo.</p>
            </div>
            <input
              className="input w-full max-w-xs"
              placeholder="Buscar por texto, tag ou status"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {filterChips.map((option) => (
              <button
                key={option.value}
                className={`rounded-full px-3 py-2 text-xs ${
                  reminderFilter === option.value
                    ? "bg-accent text-white"
                    : "border border-outlineSoft bg-panelAlt text-textMain"
                }`}
                onClick={() => onReminderFilterChange(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="text-sm text-textMuted">Carregando...</p>}
        {!loading && reminders.length === 0 && (
          <p className="text-sm text-textMuted">
            Nenhuma nota encontrada para este recorte. Ajuste a busca, os chips ou crie uma nova nota.
          </p>
        )}
        <div className="space-y-4">
          {pinnedReminders.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-xs font-bold uppercase tracking-[0.18em] text-warning">Fixados</h5>
                <span className="text-xs text-textMuted">{pinnedReminders.length} itens</span>
              </div>
              <div className="rounded-2xl border border-warning/30 bg-warning/5 p-3">
                <div className="space-y-3">{pinnedReminders.map(renderReminderCard)}</div>
              </div>
            </div>
          ) : null}

          {regularReminders.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-xs font-bold uppercase tracking-[0.18em] text-textMuted">Fluxo geral</h5>
                <span className="text-xs text-textMuted">{regularReminders.length} itens</span>
              </div>
              <div className="space-y-3">{regularReminders.map(renderReminderCard)}</div>
            </div>
          ) : null}
        </div>
      </article>

      <article className="rounded-[1.25rem] bg-panel p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-display text-base text-textMain">Historico de ocorrencias</h4>
          <div className="flex flex-wrap gap-2">
            {[
              { label: OCCURRENCE_FILTER_LABELS.all, value: "all" },
              { label: OCCURRENCE_FILTER_LABELS.today, value: "today" },
              { label: OCCURRENCE_FILTER_LABELS.pending, value: "pending" },
              { label: OCCURRENCE_FILTER_LABELS.completed, value: "completed" },
              { label: OCCURRENCE_FILTER_LABELS.expired, value: "expired" }
            ].map((option) => (
              <button
                key={option.value}
                className={`rounded-lg px-3 py-2 text-xs ${
                  occurrenceFilter === option.value
                    ? "bg-accent text-white"
                    : "border border-outlineSoft bg-panel text-textMain"
                }`}
                onClick={() => onOccurrenceFilterChange(option.value as OccurrenceFilterMode)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {occurrences.length === 0 && (
          <p className="text-sm text-textMuted">
            Nenhuma ocorrencia encontrada para este filtro.
          </p>
        )}
        <div className="space-y-2">
          {occurrences.map((item) => (
            <div key={item.id} className="rounded-xl bg-panelAlt p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-textMain">{item.title}</p>
                <span className="rounded-md bg-panel px-2 py-1 text-xs text-textMuted">
                  {formatOccurrenceStatus(item.status)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-textMuted">
                <span>Agendado para {new Date(item.scheduledFor).toLocaleString("pt-BR")}</span>
                <span>Tentativas: {item.retryCount}</span>
                {item.completedAt && (
                  <span>Concluida em {new Date(item.completedAt).toLocaleString("pt-BR")}</span>
                )}
                {item.expiredAt && (
                  <span>Expirada em {new Date(item.expiredAt).toLocaleString("pt-BR")}</span>
                )}
              </div>
              {item.status === "pending" && (
                <button className="btn-success mt-2 text-xs" onClick={() => onCompleteOccurrence(item.id)}>
                  Concluir
                </button>
              )}
            </div>
          ))}
        </div>
      </article>
    </>
  );
};
