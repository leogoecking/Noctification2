import type { AuditEventItem } from "../../types";
import type { StateSetter } from "./types";
import {
  AUDIT_LABELS,
  formatAuditActor,
  formatAuditEventType,
  formatAuditTargetType,
  formatDate,
  getAuditCategory,
  summarizeAuditMetadata
} from "./utils";

interface AdminAuditListProps {
  loadingAudit: boolean;
  filteredAuditEvents: AuditEventItem[];
  categoryFilter: string;
  setCategoryFilter: StateSetter<string>;
  availableCategories: ReturnType<typeof getAuditCategory>[];
}

export const AdminAuditList = ({
  loadingAudit,
  filteredAuditEvents,
  categoryFilter,
  setCategoryFilter,
  availableCategories
}: AdminAuditListProps) => {
  return (
    <>
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
                <p className="text-xs text-textMuted">{event.event_type}</p>
                <p className="text-[11px] text-textMuted">{formatDate(event.created_at)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    getAuditCategory(event.event_type).className
                  }`}
                >
                  {getAuditCategory(event.event_type).label}
                </span>
                <span className="rounded-full border border-outlineSoft bg-panel px-2 py-1 text-xs text-textMuted">
                  {formatAuditTargetType(event.target_type)} #{event.target_id ?? "-"}
                </span>
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <div className="rounded-lg bg-panel/80 p-2.5">
                <p className="text-xs uppercase tracking-wider text-textMuted">
                  {AUDIT_LABELS.category}
                </p>
                <p className="mt-1 text-sm text-textMain">{getAuditCategory(event.event_type).label}</p>
              </div>
              <div className="rounded-lg bg-panel/80 p-2.5">
                <p className="text-xs uppercase tracking-wider text-textMuted">{AUDIT_LABELS.actor}</p>
                <p className="mt-1 text-sm text-textMain">{formatAuditActor(event.actor)}</p>
              </div>
              <div className="rounded-lg bg-panel/80 p-2.5">
                <p className="text-xs uppercase tracking-wider text-textMuted">{AUDIT_LABELS.target}</p>
                <p className="mt-1 text-sm text-textMain">
                  {formatAuditTargetType(event.target_type)} #{event.target_id ?? "-"}
                </p>
              </div>
            </div>

            <div className="mt-2 rounded-lg bg-panel/80 p-2.5">
              <p className="text-xs uppercase tracking-wider text-textMuted">{AUDIT_LABELS.details}</p>
              <p className="mt-1 text-sm text-textMain">{summarizeAuditMetadata(event.metadata)}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
