import type { NotificationHistoryItem, UserItem } from "../../types";
import type {
  HistoryFilters,
  HistoryPriorityFilter,
  HistoryStatusFilter,
  StateSetter
} from "./types";
import { HISTORY_LIMIT_OPTIONS, formatDate, hasRecipientResponse, operationalStatusLabel } from "./utils";
import type { PaginationInfo } from "../../types";

interface AdminHistoryPanelProps {
  historyFilters: HistoryFilters;
  setHistoryFilters: StateSetter<HistoryFilters>;
  selectableUserTargets: UserItem[];
  lastHistoryRefreshAt: string | null;
  historyPagination: PaginationInfo;
  setHistoryPagination: StateSetter<PaginationInfo>;
  loadingHistoryAll: boolean;
  historyAll: NotificationHistoryItem[];
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onRefresh: () => void;
}

export const AdminHistoryPanel = ({
  historyFilters,
  setHistoryFilters,
  selectableUserTargets,
  lastHistoryRefreshAt,
  historyPagination,
  setHistoryPagination,
  loadingHistoryAll,
  historyAll,
  onApplyFilters,
  onResetFilters,
  onRefresh
}: AdminHistoryPanelProps) => {
  return (
    <article className="space-y-3 rounded-[1.25rem] bg-panel p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-lg text-textMain">Historico de notificacoes</h3>
          <p className="text-sm text-textMuted">Ultimas notificacoes enviadas e status por destinatario</p>
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
            onChange={(event) => setHistoryFilters((prev) => ({ ...prev, from: event.target.value }))}
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
          Pagina {historyPagination.page} de {historyPagination.totalPages} | Total {historyPagination.total}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain disabled:opacity-50"
          onClick={() => setHistoryPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
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

      {loadingHistoryAll && <p className="text-sm text-textMuted">Carregando...</p>}
      {!loadingHistoryAll && historyAll.length === 0 && (
        <p className="text-sm text-textMuted">Nenhuma notificacao no historico.</p>
      )}

      <div className="space-y-3">
        {historyAll.map((item) => {
          const notificationResponses = item.recipients.filter(hasRecipientResponse);

          return (
            <div key={item.id} className="rounded-xl bg-panelAlt p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-textMain">{item.title}</p>
                  <p className="text-xs text-textMuted">Enviada em {formatDate(item.created_at)}</p>
                </div>
                <span className="rounded-md bg-accent/20 px-2 py-1 text-xs text-accent">
                  {item.recipient_mode === "all" ? "Todos" : "Usuarios especificos"}
                </span>
              </div>
              {item.source_task_id ? (
                <p className="mt-2 text-xs text-accent">Tarefa vinculada #{item.source_task_id}</p>
              ) : null}
              <p className="mt-2 text-sm text-textMuted">{item.message}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-md bg-panel px-2 py-1 text-textMuted">Total: {item.stats.total}</span>
                <span className="rounded-md bg-success/20 px-2 py-1 text-success">
                  Visualizadas: {item.stats.read}
                </span>
                <span className="rounded-md bg-warning/20 px-2 py-1 text-warning">
                  Nao visualizadas: {item.stats.unread}
                </span>
                <span className="rounded-md bg-panel px-2 py-1 text-textMuted">
                  Visualizadas: {item.stats.visualized ?? 0}
                </span>
                <span className="rounded-md bg-accent/20 px-2 py-1 text-xs text-accent">
                  Em andamento: {item.stats.inProgress}
                </span>
                <span className="rounded-md bg-success/20 px-2 py-1 text-xs text-success">
                  Assumidas: {item.stats.assumed ?? 0}
                </span>
                <span className="rounded-md bg-success/20 px-2 py-1 text-xs text-success">
                  Resolvidas: {item.stats.resolved}
                </span>
                <span className="rounded-md bg-panel px-2 py-1 text-textMuted">
                  Com resposta: {item.stats.responded}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {notificationResponses.length === 0 && (
                  <p className="text-xs text-textMuted">Sem respostas para esta notificacao.</p>
                )}

                {notificationResponses.map((recipient) => (
                  <div key={recipient.userId} className="rounded-lg border border-outlineSoft bg-panel px-2 py-2">
                    <p className="text-xs text-textMain">
                      <span className="font-semibold">{recipient.name}</span> ({recipient.login}) -{" "}
                      {operationalStatusLabel(recipient.operationalStatus)}
                    </p>
                    <p className="text-[11px] text-textMuted">
                      Visualizada em: {formatDate(recipient.visualizedAt)}
                    </p>
                    <p className="text-[11px] text-textMuted">
                      Mensagem: {recipient.responseMessage?.trim() || "(sem mensagem)"}
                    </p>
                    {recipient.operationalStatus === "em_andamento" &&
                      Boolean(recipient.responseMessage?.trim()) && (
                        <p className="text-[11px] font-semibold text-accent">
                          Retorno em andamento: {recipient.responseMessage?.trim()}
                        </p>
                      )}
                    <p className="text-[11px] text-textMuted">
                      Atualizado em: {formatDate(recipient.responseAt ?? recipient.visualizedAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
};
