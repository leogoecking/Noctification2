import type { AuditEventItem, PaginationInfo } from "../../types";
import type { AuditFilters, StateSetter } from "./types";
import { AUDIT_LIMIT_OPTIONS, formatDate, summarizeAuditMetadata } from "./utils";

interface AdminAuditPanelProps {
  auditFilters: AuditFilters;
  setAuditFilters: StateSetter<AuditFilters>;
  auditEventTypes: string[];
  lastAuditRefreshAt: string | null;
  auditPagination: PaginationInfo;
  setAuditPagination: StateSetter<PaginationInfo>;
  loadingAudit: boolean;
  auditEvents: AuditEventItem[];
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onRefresh: () => void;
}

export const AdminAuditPanel = ({
  auditFilters,
  setAuditFilters,
  auditEventTypes,
  lastAuditRefreshAt,
  auditPagination,
  setAuditPagination,
  loadingAudit,
  auditEvents,
  onApplyFilters,
  onResetFilters,
  onRefresh
}: AdminAuditPanelProps) => {
  return (
    <article className="space-y-3 rounded-2xl border border-slate-700 bg-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-lg text-textMain">Auditoria</h3>
          <p className="text-sm text-textMuted">Rastreamento de acessos, leitura e operacao administrativa</p>
        </div>
        <button className="rounded-md border border-slate-600 px-3 py-1 text-xs text-textMuted" onClick={onRefresh}>
          Atualizar
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1">
          <span className="text-xs text-textMuted">Tipo de evento</span>
          <input
            className="input"
            list="audit-event-types"
            placeholder="Ex: auth.login"
            value={auditFilters.eventType}
            onChange={(event) => setAuditFilters((prev) => ({ ...prev, eventType: event.target.value }))}
          />
          <datalist id="audit-event-types">
            {auditEventTypes.map((eventType) => (
              <option key={eventType} value={eventType} />
            ))}
          </datalist>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-textMuted">De</span>
          <input
            className="input"
            type="date"
            value={auditFilters.from}
            onChange={(event) => setAuditFilters((prev) => ({ ...prev, from: event.target.value }))}
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-textMuted">Ate</span>
          <input
            className="input"
            type="date"
            value={auditFilters.to}
            onChange={(event) => setAuditFilters((prev) => ({ ...prev, to: event.target.value }))}
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-textMuted">Limite</span>
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

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={onApplyFilters}>
          Aplicar filtros
        </button>
        <button
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain"
          onClick={onResetFilters}
        >
          Limpar filtros
        </button>
        <span className="rounded-md bg-panelAlt px-3 py-2 text-xs text-textMuted">
          Ultima atualizacao: {formatDate(lastAuditRefreshAt)}
        </span>
        <span className="rounded-md bg-panelAlt px-3 py-2 text-xs text-textMuted">
          Pagina {auditPagination.page} de {auditPagination.totalPages} | Total {auditPagination.total}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain disabled:opacity-50"
          onClick={() => setAuditPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
          disabled={auditPagination.page <= 1}
        >
          Pagina anterior
        </button>
        <button
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain disabled:opacity-50"
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

      {loadingAudit && <p className="text-sm text-textMuted">Carregando...</p>}
      {!loadingAudit && auditEvents.length === 0 && (
        <p className="text-sm text-textMuted">Nenhum evento de auditoria.</p>
      )}

      <div className="space-y-3">
        {auditEvents.map((event) => (
          <div key={event.id} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-textMain">{event.event_type}</p>
                <p className="text-xs text-textMuted">{formatDate(event.created_at)}</p>
              </div>
              <span className="rounded-md bg-panel px-2 py-1 text-xs text-textMuted">
                {event.target_type} #{event.target_id ?? "-"}
              </span>
            </div>
            <p className="mt-2 text-xs text-textMuted">
              Ator: {event.actor ? `${event.actor.name} (${event.actor.login})` : "sistema"}
            </p>
            <p className="mt-1 text-xs text-textMuted">
              Metadados: {summarizeAuditMetadata(event.metadata)}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
};
