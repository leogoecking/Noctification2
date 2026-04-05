import type { PaginationInfo } from "../../types";
import type { AuditFilters, StateSetter } from "./types";
import {
  AUDIT_LIMIT_OPTIONS,
  formatAuditEventType,
  formatDate
} from "./utils";

interface AdminAuditFiltersProps {
  auditFilters: AuditFilters;
  setAuditFilters: StateSetter<AuditFilters>;
  auditEventTypes: string[];
  auditEventSuggestions: string[];
  selectedEventTypeLabel: string | null;
  lastAuditRefreshAt: string | null;
  auditPagination: PaginationInfo;
  setAuditPagination: StateSetter<PaginationInfo>;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onRefresh: () => void;
}

export const AdminAuditFilters = ({
  auditFilters,
  setAuditFilters,
  auditEventTypes,
  auditEventSuggestions,
  selectedEventTypeLabel,
  lastAuditRefreshAt,
  auditPagination,
  setAuditPagination,
  onApplyFilters,
  onResetFilters,
  onRefresh
}: AdminAuditFiltersProps) => {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-lg text-textMain">Auditoria</h3>
          <p className="text-sm text-textMuted">
            Rastreamento de acessos, leitura e operacao administrativa
          </p>
        </div>
        <button
          className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMuted transition hover:text-textMain"
          onClick={onRefresh}
        >
          Atualizar
        </button>
      </div>

      <section className="rounded-[1.25rem] bg-panelAlt/70 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-textMuted">
              Tipo de evento
            </span>
            <input
              className="input"
              list="audit-event-types"
              placeholder="Ex: Login realizado"
              value={auditFilters.eventType}
              onChange={(event) => setAuditFilters((prev) => ({ ...prev, eventType: event.target.value }))}
            />
            {selectedEventTypeLabel && (
              <p className="text-[11px] text-textMuted">
                {selectedEventTypeLabel} ({auditFilters.eventType})
              </p>
            )}
            <datalist id="audit-event-types">
              {auditEventTypes.map((eventType) => (
                <option
                  key={eventType}
                  value={eventType}
                  label={`${formatAuditEventType(eventType)} (${eventType})`}
                />
              ))}
            </datalist>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-textMuted">De</span>
            <input
              className="input"
              type="date"
              value={auditFilters.from}
              onChange={(event) => setAuditFilters((prev) => ({ ...prev, from: event.target.value }))}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-textMuted">Ate</span>
            <input
              className="input"
              type="date"
              value={auditFilters.to}
              onChange={(event) => setAuditFilters((prev) => ({ ...prev, to: event.target.value }))}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-textMuted">Limite</span>
            <select
              className="input"
              value={auditFilters.limit}
              onChange={(event) => setAuditFilters((prev) => ({ ...prev, limit: Number(event.target.value) }))}
            >
              {AUDIT_LIMIT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {auditEventSuggestions.map((eventType) => (
              <button
                key={eventType}
                className={`rounded-full px-3 py-1.5 text-[11px] transition ${
                  auditFilters.eventType === eventType
                    ? "bg-accent/20 text-accent"
                    : "border border-outlineSoft bg-panel text-textMuted hover:text-textMain"
                }`}
                onClick={() => setAuditFilters((prev) => ({ ...prev, eventType }))}
                title={eventType}
                type="button"
              >
                {formatAuditEventType(eventType)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-primary" onClick={onApplyFilters}>
              Aplicar filtros
            </button>
            <button
              className="rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-sm text-textMuted transition hover:text-textMain"
              onClick={onResetFilters}
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-panelAlt px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-textMuted">
          <span>Ultima atualizacao: {formatDate(lastAuditRefreshAt)}</span>
          <span>
            Pagina {auditPagination.page} de {auditPagination.totalPages} | Total {auditPagination.total}
          </span>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain disabled:opacity-50"
            onClick={() => setAuditPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={auditPagination.page <= 1}
          >
            Pagina anterior
          </button>
          <button
            className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain disabled:opacity-50"
            onClick={() =>
              setAuditPagination((prev) => ({
                ...prev,
                page: Math.min(prev.totalPages, prev.page + 1)
              }))
            }
            disabled={auditPagination.page >= auditPagination.totalPages}
          >
            Proxima pagina
          </button>
        </div>
      </section>
    </>
  );
};
