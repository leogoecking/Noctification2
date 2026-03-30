import type { ReminderItem, ReminderOccurrenceItem } from "../../types";
import {
  formatOccurrenceStatus,
  formatReminderSummary,
  formatRepeatType,
  OCCURRENCE_FILTER_LABELS,
  REMINDER_FILTER_LABELS,
  type OccurrenceFilterMode,
  type ReminderFilterMode
} from "./reminderUi";

interface ReminderCollectionsProps {
  loading: boolean;
  reminders: ReminderItem[];
  occurrences: ReminderOccurrenceItem[];
  reminderFilter: ReminderFilterMode;
  occurrenceFilter: OccurrenceFilterMode;
  onReminderFilterChange: (value: ReminderFilterMode) => void;
  onOccurrenceFilterChange: (value: OccurrenceFilterMode) => void;
  onEditReminder: (item: ReminderItem) => void;
  onToggleReminder: (item: ReminderItem) => void;
  onDeleteReminder: (id: number) => void;
  onCompleteOccurrence: (id: number) => void;
}

export const ReminderCollections = ({
  loading,
  reminders,
  occurrences,
  reminderFilter,
  occurrenceFilter,
  onReminderFilterChange,
  onOccurrenceFilterChange,
  onEditReminder,
  onToggleReminder,
  onDeleteReminder,
  onCompleteOccurrence
}: ReminderCollectionsProps) => {
  return (
    <>
      <article className="rounded-[1.25rem] bg-panel p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-display text-base text-textMain">Meus lembretes</h4>
          <div className="flex flex-wrap gap-2">
            {[
              { label: REMINDER_FILTER_LABELS.all, value: "all" },
              { label: REMINDER_FILTER_LABELS.active, value: "active" },
              { label: REMINDER_FILTER_LABELS.inactive, value: "inactive" }
            ].map((option) => (
              <button
                key={option.value}
                className={`rounded-lg px-3 py-2 text-xs ${
                  reminderFilter === option.value
                    ? "bg-accent text-white"
                    : "border border-outlineSoft bg-panel text-textMain"
                }`}
                onClick={() => onReminderFilterChange(option.value as ReminderFilterMode)}
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
            Nenhum lembrete encontrado para este filtro. Ajuste os filtros ou crie um novo lembrete.
          </p>
        )}
        <div className="space-y-2">
          {reminders.map((item) => (
            <div key={item.id} className="rounded-xl bg-panelAlt p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-textMain">{item.title}</p>
                  <p className="text-xs text-textMuted">
                    Inicio em {item.startDate} | {formatRepeatType(item.repeatType)}
                  </p>
                  <p className="mt-1 text-xs text-textMuted">{formatReminderSummary(item)}</p>
                </div>
                <span className={`rounded-md px-2 py-1 text-xs ${item.isActive ? "bg-success/20 text-success" : "bg-panel text-textMuted"}`}>
                  {item.isActive ? "Ativo" : "Inativo"}
                </span>
              </div>
              {item.description && <p className="mt-2 line-clamp-2 text-sm text-textMuted">{item.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-xs text-textMain" onClick={() => onEditReminder(item)}>
                  Editar
                </button>
                <button className="rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-xs text-textMain" onClick={() => onToggleReminder(item)}>
                  {item.isActive ? "Desativar" : "Ativar"}
                </button>
                <button className="rounded-lg border border-danger/60 px-3 py-2 text-xs text-danger" onClick={() => onDeleteReminder(item.id)}>
                  Arquivar
                </button>
              </div>
            </div>
          ))}
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
