import { useMemo, useState } from "react";
import type { AuditEventItem, PaginationInfo } from "../../types";
import type { AuditFilters, StateSetter } from "./types";
import {
  AUDIT_LABELS,
  AUDIT_LIMIT_OPTIONS,
  formatAuditActor,
  formatAuditEventType,
  formatAuditTargetType,
  formatDate,
  getAuditCategory,
  summarizeAuditMetadata
} from "./utils";

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
  const [categoryFilter, setCategoryFilter] = useState("all");

  const availableCategories = useMemo(() => {
    const categories = new Map<string, ReturnType<typeof getAuditCategory>>();
    for (const eventType of auditEventTypes) {
      const category = getAuditCategory(eventType);
      categories.set(category.label, category);
    }

    for (const event of auditEvents) {
      const category = getAuditCategory(event.event_type);
      categories.set(category.label, category);
    }

    return Array.from(categories.values());
  }, [auditEventTypes, auditEvents]);

  const filteredAuditEvents = useMemo(() => {
    if (categoryFilter === "all") {
      return auditEvents;
    }

    return auditEvents.filter((event) => getAuditCategory(event.event_type).label === categoryFilter);
  }, [auditEvents, categoryFilter]);

  const auditEventSuggestions = useMemo(() => {
    return [...auditEventTypes]
      .sort((left, right) =>
        formatAuditEventType(left).localeCompare(formatAuditEventType(right), "pt-BR")
      )
      .slice(0, 8);
  }, [auditEventTypes]);

  const selectedEventTypeLabel = useMemo(() => {
    const trimmed = auditFilters.eventType.trim();
    return trimmed ? formatAuditEventType(trimmed) : null;
  }, [auditFilters.eventType]);

  return (
    <article className="space-y-4 rounded-[1.25rem] bg-panel p-5">
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
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-textMuted">
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
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-textMuted">De</span>
            <input
              className="input"
              type="date"
              value={auditFilters.from}
              onChange={(event) => setAuditFilters((prev) => ({ ...prev, from: event.target.value }))}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-textMuted">Ate</span>
            <input
              className="input"
              type="date"
              value={auditFilters.to}
              onChange={(event) => setAuditFilters((prev) => ({ ...prev, to: event.target.value }))}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-textMuted">Limite</span>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded-full px-3 py-1.5 text-[11px] transition ${
                categoryFilter === "all"
                  ? "border border-accent/40 bg-accent/15 text-accent"
                  : "border border-outlineSoft bg-panel text-textMuted hover:text-textMain"
              }`}
              onClick={() => setCategoryFilter("all")}
              type="button"
            >
              Todas as categorias
            </button>
            {availableCategories.map((category) => (
              <button
                key={category.label}
                className={`rounded-full px-3 py-1.5 text-[11px] transition ${
                  categoryFilter === category.label
                    ? "border border-accent/40 bg-accent/15 text-accent"
                    : "border border-outlineSoft bg-panel text-textMuted hover:text-textMain"
                }`}
                onClick={() => setCategoryFilter(category.label)}
                type="button"
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
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
        </div>
      </section>

      {loadingAudit && <p className="text-sm text-textMuted">Carregando...</p>}
      {!loadingAudit && filteredAuditEvents.length === 0 && (
        <p className="text-sm text-textMuted">Nenhum evento de auditoria.</p>
      )}

      <div className="space-y-3">
        {filteredAuditEvents.map((event) => (
          <div key={event.id} className="rounded-xl bg-panelAlt/70 p-3.5 ring-1 ring-outlineSoft/50">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-semibold text-textMain">{formatAuditEventType(event.event_type)}</p>
                <p className="text-[10px] text-textMuted">{event.event_type}</p>
                <p className="text-[11px] text-textMuted">{formatDate(event.created_at)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] ${
                    getAuditCategory(event.event_type).className
                  }`}
                >
                  {getAuditCategory(event.event_type).label}
                </span>
                <span className="rounded-full border border-outlineSoft bg-panel px-2 py-1 text-[10px] text-textMuted">
                  {formatAuditTargetType(event.target_type)} #{event.target_id ?? "-"}
                </span>
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <div className="rounded-lg bg-panel/80 p-2.5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">
                  {AUDIT_LABELS.category}
                </p>
                <p className="mt-1 text-sm text-textMain">{getAuditCategory(event.event_type).label}</p>
              </div>
              <div className="rounded-lg bg-panel/80 p-2.5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">{AUDIT_LABELS.actor}</p>
                <p className="mt-1 text-sm text-textMain">{formatAuditActor(event.actor)}</p>
              </div>
              <div className="rounded-lg bg-panel/80 p-2.5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">{AUDIT_LABELS.target}</p>
                <p className="mt-1 text-sm text-textMain">
                  {formatAuditTargetType(event.target_type)} #{event.target_id ?? "-"}
                </p>
              </div>
            </div>

            <div className="mt-2 rounded-lg bg-panel/80 p-2.5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">{AUDIT_LABELS.details}</p>
              <p className="mt-1 text-sm text-textMain">{summarizeAuditMetadata(event.metadata)}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
};
