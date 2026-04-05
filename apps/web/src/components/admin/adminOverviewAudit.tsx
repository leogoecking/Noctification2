import type { AuditEventItem } from "../../types";
import {
  formatAuditActor,
  formatAuditEventType,
  formatAuditTargetType,
  formatDate,
  getAuditCategory,
  summarizeAuditMetadata
} from "./utils";

interface AdminOverviewAuditProps {
  recentAuditEvents: AuditEventItem[];
  auditEventType: string;
  auditLimit: number;
  lastAuditRefreshAt: string | null;
  loadingAudit: boolean;
  onRefreshAudit: () => void;
  onOpenAudit: () => void;
}

export const AdminOverviewAudit = ({
  recentAuditEvents,
  auditEventType,
  auditLimit,
  lastAuditRefreshAt,
  loadingAudit,
  onRefreshAudit,
  onOpenAudit
}: AdminOverviewAuditProps) => (
  <article className="rounded-[1.25rem] bg-panel p-5">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h4 className="font-display text-lg text-textMain">Auditoria recente</h4>
        <p className="text-sm text-textMuted">Linha do tempo curta das ultimas acoes relevantes</p>
      </div>
      <div className="flex gap-2">
        <button
          className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMuted transition hover:text-textMain"
          onClick={onRefreshAudit}
          type="button"
        >
          Atualizar
        </button>
        <button
          className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMuted transition hover:text-textMain"
          onClick={onOpenAudit}
          type="button"
        >
          Abrir auditoria
        </button>
      </div>
    </div>

    <div className="mb-4 rounded-xl bg-panelAlt px-3 py-2">
      <p className="text-[11px] text-textMuted">
        Filtro atual: {auditEventType || "todos"} | limite {auditLimit} | atualizado{" "}
        {formatDate(lastAuditRefreshAt)}
      </p>
    </div>

    {loadingAudit && <p className="text-sm text-textMuted">Carregando...</p>}
    {!loadingAudit && recentAuditEvents.length === 0 && (
      <p className="text-sm text-textMuted">Nenhum evento de auditoria.</p>
    )}

    <div className="space-y-2">
      {recentAuditEvents.slice(0, 3).map((event) => (
        <button
          key={event.id}
          className="flex w-full items-start justify-between gap-3 rounded-xl bg-panelAlt p-3 text-left transition hover:bg-panel"
          onClick={onOpenAudit}
          type="button"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs ${
                  getAuditCategory(event.event_type).className
                }`}
              >
                {getAuditCategory(event.event_type).label}
              </span>
              <span className="text-[11px] text-textMuted">{formatDate(event.created_at)}</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-textMain">
              {formatAuditEventType(event.event_type)}
            </p>
            <p className="mt-1 text-xs text-textMuted">
              {formatAuditActor(event.actor)} • {formatAuditTargetType(event.target_type)} {event.target_id ?? "-"}
            </p>
            <p className="mt-1 line-clamp-1 text-xs text-textMuted">
              {summarizeAuditMetadata(event.metadata)}
            </p>
          </div>
        </button>
      ))}
    </div>
  </article>
);
