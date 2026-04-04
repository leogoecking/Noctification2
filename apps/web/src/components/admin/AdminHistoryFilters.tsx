import type { PaginationInfo } from "../../types";
import type {
  HistoryFilters,
  HistoryPriorityFilter,
  HistoryStatusFilter,
  StateSetter
} from "./types";
import { HISTORY_LIMIT_OPTIONS, formatDate } from "./utils";
import type { UserItem } from "../../types";

interface AdminHistoryFiltersProps {
  historyFilters: HistoryFilters;
  setHistoryFilters: StateSetter<HistoryFilters>;
  selectableUserTargets: UserItem[];
  lastHistoryRefreshAt: string | null;
  historyPagination: PaginationInfo;
  setHistoryPagination: StateSetter<PaginationInfo>;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onRefresh: () => void;
}

export const AdminHistoryFilters = ({
  historyFilters,
  setHistoryFilters,
  selectableUserTargets,
  lastHistoryRefreshAt,
  historyPagination,
  setHistoryPagination,
  onApplyFilters,
  onResetFilters,
  onRefresh
}: AdminHistoryFiltersProps) => {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-lg text-textMain">Historico de notificacoes</h3>
          <p className="text-sm text-textMuted">
            Ultimas notificacoes enviadas e status por destinatario
          </p>
        </div>
        <button
          className="rounded-md border border-outlineSoft bg-panelAlt px-3 py-1 text-xs text-textMuted"
          onClick={onRefresh}
        >
          Atualizar
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-1">
          <span className="text-xs text-textMuted">Status</span>
          <select
            className="input"
            value={historyFilters.status}
            onChange={(event) =>
              setHistoryFilters((prev) => ({
                ...prev,
                status: event.target.value as HistoryStatusFilter
              }))
            }
          >
            <option value="">Todos</option>
            <option value="unread">Pendentes</option>
            <option value="read">Lidas</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-textMuted">Prioridade</span>
          <select
            className="input"
            value={historyFilters.priority}
            onChange={(event) =>
              setHistoryFilters((prev) => ({
                ...prev,
                priority: event.target.value as HistoryPriorityFilter
              }))
            }
          >
            <option value="">Todas</option>
            <option value="low">Baixa</option>
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
            <option value="critical">Critica</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-textMuted">Usuario</span>
          <select
            className="input"
            value={historyFilters.userId}
            onChange={(event) =>
              setHistoryFilters((prev) => ({ ...prev, userId: event.target.value }))
            }
          >
            <option value="">Todos</option>
            {selectableUserTargets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.login})
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-textMuted">De</span>
          <input
            className="input"
            type="date"
            value={historyFilters.from}
            onChange={(event) =>
              setHistoryFilters((prev) => ({ ...prev, from: event.target.value }))
            }
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-textMuted">Ate</span>
          <input
            className="input"
            type="date"
            value={historyFilters.to}
            onChange={(event) => setHistoryFilters((prev) => ({ ...prev, to: event.target.value }))}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="text-xs text-textMuted">Limite</span>
          <select
            className="input"
            value={historyFilters.limit}
            onChange={(event) =>
              setHistoryFilters((prev) => ({ ...prev, limit: Number(event.target.value) }))
            }
          >
            {HISTORY_LIMIT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <button className="btn-primary" onClick={onApplyFilters}>
          Aplicar filtros
        </button>

        <button
          className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain"
          onClick={onResetFilters}
        >
          Limpar filtros
        </button>

        <span className="rounded-md bg-panelAlt px-3 py-2 text-xs text-textMuted">
          Ultima atualizacao: {formatDate(lastHistoryRefreshAt)}
        </span>

        <span className="rounded-md bg-panelAlt px-3 py-2 text-xs text-textMuted">
          Pagina {historyPagination.page} de {historyPagination.totalPages} | Total{" "}
          {historyPagination.total}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain disabled:opacity-50"
          onClick={() =>
            setHistoryPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
          }
          disabled={historyPagination.page <= 1}
        >
          Pagina anterior
        </button>
        <button
          className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain disabled:opacity-50"
          onClick={() =>
            setHistoryPagination((prev) => ({
              ...prev,
              page: Math.min(prev.totalPages, prev.page + 1)
            }))
          }
          disabled={historyPagination.page >= historyPagination.totalPages}
        >
          Proxima pagina
        </button>
      </div>
    </>
  );
};
