import type { NotificationHistoryItem, PaginationInfo } from "../../types";
import type { QueueFilters, StateSetter } from "./types";
import { formatDate, operationalStatusLabel } from "./utils";

interface AdminOverviewQueueProps {
  selectableUserTargets: Array<{
    id: number;
    name: string;
    login: string;
  }>;
  queueFilters: QueueFilters;
  setQueueFilters: StateSetter<QueueFilters>;
  queuePagination: PaginationInfo;
  setQueuePagination: StateSetter<PaginationInfo>;
  lastQueueRefreshAt: string | null;
  unreadNotifications: NotificationHistoryItem[];
  loadingHistory: boolean;
  onRefreshQueue: () => void;
  onApplyQueueFilters: () => void;
  onResetQueueFilters: () => void;
}

export const AdminOverviewQueue = ({
  selectableUserTargets,
  queueFilters,
  setQueueFilters,
  queuePagination,
  setQueuePagination,
  lastQueueRefreshAt,
  unreadNotifications,
  loadingHistory,
  onRefreshQueue,
  onApplyQueueFilters,
  onResetQueueFilters
}: AdminOverviewQueueProps) => (
  <article className="rounded-[1.25rem] bg-panel p-5">
    <div className="mb-3 flex items-center justify-between">
      <div>
        <h4 className="font-display text-lg text-textMain">Fila operacional</h4>
        <p className="text-xs text-textMuted">Inclui nao visualizadas e itens em andamento</p>
      </div>
      <button
        className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-1.5 text-xs text-textMuted"
        onClick={onRefreshQueue}
      >
        Atualizar
      </button>
    </div>

    <div className="mb-3 grid gap-3 md:grid-cols-4">
      <label className="text-sm text-textMuted">
        Usuario
        <select
          className="mt-1 w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain"
          value={queueFilters.userId}
          onChange={(event) =>
            setQueueFilters((prev) => ({ ...prev, userId: event.target.value }))
          }
        >
          <option value="">Todos</option>
          {selectableUserTargets.map((user) => (
            <option key={user.id} value={String(user.id)}>
              {user.name} ({user.login})
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm text-textMuted">
        Prioridade
        <select
          className="mt-1 w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain"
          value={queueFilters.priority}
          onChange={(event) =>
            setQueueFilters((prev) => ({
              ...prev,
              priority: event.target.value as QueueFilters["priority"]
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

      <label className="text-sm text-textMuted">
        Limite
        <select
          className="mt-1 w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain"
          value={queueFilters.limit}
          onChange={(event) =>
            setQueueFilters((prev) => ({ ...prev, limit: Number(event.target.value) }))
          }
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </label>

      <div className="flex items-end gap-2">
        <button
          className="rounded-xl border border-accent bg-accent/10 px-4 py-2 text-sm text-accent"
          onClick={onApplyQueueFilters}
          type="button"
        >
          Aplicar filtros
        </button>
        <button
          className="rounded-xl border border-outlineSoft bg-panelAlt px-4 py-2 text-sm text-textMuted"
          onClick={onResetQueueFilters}
          type="button"
        >
          Limpar
        </button>
      </div>
    </div>

    <p className="mb-3 text-xs text-textMuted">
      Atualizado: {formatDate(lastQueueRefreshAt)} | pagina {queuePagination.page} de{" "}
      {queuePagination.totalPages} | total {queuePagination.total}
    </p>

    {loadingHistory && <p className="text-sm text-textMuted">Carregando...</p>}
    {!loadingHistory && unreadNotifications.length === 0 && (
      <p className="text-sm text-textMuted">Nenhuma pendencia no momento.</p>
    )}

    <div className="space-y-3">
      {unreadNotifications.map((item) => {
        const activeRecipients = item.recipients.filter(
          (recipient) => recipient.operationalStatus !== "resolvida"
        );
        const pendingCount = item.recipients.filter(
          (recipient) => recipient.operationalStatus === "recebida"
        ).length;
        const inProgressCount = item.stats.inProgress;
        const assumedCount = item.stats.assumed ?? 0;

        return (
          <div key={item.id} className="rounded-[1.25rem] bg-panelAlt p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-textMain">{item.title}</p>
                <p className="text-xs text-textMuted">{formatDate(item.created_at)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-warning/20 px-2 py-1 text-xs text-warning">
                  Nao visualizadas: {pendingCount}
                </span>
                {inProgressCount > 0 && (
                  <span className="rounded-md bg-accent/20 px-2 py-1 text-xs text-accent">
                    Em andamento: {inProgressCount}
                  </span>
                )}
                {assumedCount > 0 && (
                  <span className="rounded-md bg-success/20 px-2 py-1 text-xs text-success">
                    Assumidas: {assumedCount}
                  </span>
                )}
              </div>
            </div>
            <p className="mt-2 text-sm text-textMuted">{item.message}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md bg-warning/20 px-2 py-1 text-warning">
                Nao visualizadas: {pendingCount}
              </span>
              <span className="rounded-md bg-accent/20 px-2 py-1 text-accent">
                Em andamento: {inProgressCount}
              </span>
              <span className="rounded-md bg-success/20 px-2 py-1 text-success">
                Assumidas: {assumedCount}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {activeRecipients.length === 0 && (
                <p className="text-xs text-textMuted">Sem usuarios pendentes ou em andamento.</p>
              )}

              {activeRecipients.map((recipient) => (
                <div key={recipient.userId} className="rounded-xl border border-outlineSoft bg-panel px-3 py-3">
                  <p className="text-xs text-textMain">
                    <span className="font-semibold">{recipient.name}</span> ({recipient.login}) -{" "}
                    {operationalStatusLabel(recipient.operationalStatus)}
                  </p>
                  <p className="text-[11px] text-textMuted">
                    Visualizada em: {formatDate(recipient.visualizedAt)}
                  </p>
                  <p className="text-[11px] text-textMuted">
                    Mensagem do usuario: {recipient.responseMessage?.trim() || "-"}
                  </p>
                  {recipient.operationalStatus === "em_andamento" &&
                    Boolean(recipient.responseMessage?.trim()) && (
                      <p className="text-[11px] font-semibold text-accent">
                        Retorno em andamento: {recipient.responseMessage?.trim()}
                      </p>
                    )}
                  <p className="text-[11px] text-textMuted">
                    Atualizado em: {formatDate(recipient.responseAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>

    <div className="mt-4 flex items-center justify-between text-xs text-textMuted">
      <span>
        Pagina {queuePagination.page} de {queuePagination.totalPages}
      </span>
      <div className="flex gap-2">
        <button
          className="rounded-md border border-outlineSoft bg-panelAlt px-3 py-1 disabled:opacity-50"
          disabled={queuePagination.page <= 1}
          onClick={() => setQueuePagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
          type="button"
        >
          Pagina anterior
        </button>
        <button
          className="rounded-md border border-outlineSoft bg-panelAlt px-3 py-1 disabled:opacity-50"
          disabled={queuePagination.page >= queuePagination.totalPages}
          onClick={() =>
            setQueuePagination((prev) => ({
              ...prev,
              page: Math.min(prev.totalPages, prev.page + 1)
            }))
          }
          type="button"
        >
          Proxima pagina
        </button>
      </div>
    </div>
  </article>
);
