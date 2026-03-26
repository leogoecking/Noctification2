import type { AuditEventItem, NotificationHistoryItem, OnlineUserItem } from "../../types";
import type { AdminMetrics, OnlineSummary, QueueFilters, StateSetter } from "./types";
import {
  AUDIT_LABELS,
  formatAuditActor,
  formatAuditEventType,
  formatAuditTargetType,
  formatDate,
  getAuditCategory,
  operationalStatusLabel,
  summarizeAuditMetadata
} from "./utils";

export const AdminOverviewMetrics = ({ metrics }: { metrics: AdminMetrics }) => (
  <div className="grid gap-3 md:grid-cols-5">
    <article className="rounded-2xl border border-slate-700 bg-panel p-4">
      <p className="text-xs uppercase tracking-wide text-textMuted">Nao visualizadas</p>
      <p className="mt-1 font-display text-2xl text-textMain">{metrics.pendingNotifications}</p>
    </article>

    <article className="rounded-2xl border border-slate-700 bg-panel p-4">
      <p className="text-xs uppercase tracking-wide text-textMuted">Pendencias operacionais</p>
      <p className="mt-1 font-display text-2xl text-warning">{metrics.pendingRecipients}</p>
    </article>

    <article className="rounded-2xl border border-slate-700 bg-panel p-4">
      <p className="text-xs uppercase tracking-wide text-textMuted">Criticas abertas</p>
      <p className="mt-1 font-display text-2xl text-danger">{metrics.criticalOpen}</p>
    </article>

    <article className="rounded-2xl border border-slate-700 bg-panel p-4">
      <p className="text-xs uppercase tracking-wide text-textMuted">Em andamento</p>
      <p className="mt-1 font-display text-2xl text-accent">{metrics.inProgressNotifications}</p>
    </article>

    <article className="rounded-2xl border border-slate-700 bg-panel p-4">
      <p className="text-xs uppercase tracking-wide text-textMuted">Online agora</p>
      <p className="mt-1 font-display text-2xl text-accent">{metrics.onlineUsers}</p>
    </article>
  </div>
);

interface AdminOverviewOnlineUsersProps {
  onlineUsers: OnlineUserItem[];
  onlineSummary: OnlineSummary;
  lastOnlineRefreshAt: string | null;
  loadingOnlineUsers: boolean;
  onRefreshOnlineUsers: () => void;
}

export const AdminOverviewOnlineUsers = ({
  onlineUsers,
  onlineSummary,
  lastOnlineRefreshAt,
  loadingOnlineUsers,
  onRefreshOnlineUsers
}: AdminOverviewOnlineUsersProps) => (
  <article className="rounded-2xl border border-slate-700 bg-panel p-4">
    <div className="mb-3 flex items-center justify-between">
      <div>
        <h4 className="font-display text-lg text-textMain">Usuarios online agora</h4>
        <p className="text-sm text-textMuted">Presenca em tempo real da operacao</p>
      </div>
      <button
        className="rounded-md border border-slate-600 px-3 py-1 text-xs text-textMuted"
        onClick={onRefreshOnlineUsers}
      >
        Atualizar
      </button>
    </div>

    <div className="mb-3 flex flex-wrap gap-2 text-xs">
      <span className="rounded-md bg-success/20 px-2 py-1 text-success">
        Total online: {onlineUsers.length}
      </span>
      <span className="rounded-md bg-accent/20 px-2 py-1 text-accent">
        Usuarios: {onlineSummary.operators}
      </span>
      <span className="rounded-md bg-panelAlt px-2 py-1 text-textMuted">
        Admins: {onlineSummary.admins}
      </span>
      <span className="rounded-md bg-panelAlt px-2 py-1 text-textMuted">
        Atualizado: {formatDate(lastOnlineRefreshAt)}
      </span>
    </div>

    {loadingOnlineUsers && <p className="text-sm text-textMuted">Carregando...</p>}
    {!loadingOnlineUsers && onlineUsers.length === 0 && (
      <p className="text-sm text-textMuted">Nenhum usuario online no momento.</p>
    )}

    <div className="space-y-2">
      {onlineUsers.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-xl border border-slate-700 bg-panelAlt p-3"
        >
          <div>
            <p className="text-sm font-semibold text-textMain">{item.name}</p>
            <p className="text-xs text-textMuted">
              {item.login} | {item.department || "Sem setor"} | {item.jobTitle || "Sem funcao"}
            </p>
          </div>
          <span className="rounded-md bg-success/20 px-2 py-1 text-xs text-success">
            {item.role}
          </span>
        </div>
      ))}
    </div>
  </article>
);

interface AdminOverviewAuditProps {
  recentAuditEvents: AuditEventItem[];
  auditEventType: string;
  auditLimit: number;
  lastAuditRefreshAt: string | null;
  loadingAudit: boolean;
  onRefreshAudit: () => void;
}

export const AdminOverviewAudit = ({
  recentAuditEvents,
  auditEventType,
  auditLimit,
  lastAuditRefreshAt,
  loadingAudit,
  onRefreshAudit
}: AdminOverviewAuditProps) => (
  <article className="rounded-2xl border border-slate-700 bg-panel p-4">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h4 className="font-display text-lg text-textMain">Auditoria recente</h4>
        <p className="text-sm text-textMuted">Eventos mais novos do sistema</p>
      </div>
      <button
        className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMuted transition hover:border-slate-500 hover:text-textMain"
        onClick={onRefreshAudit}
      >
        Atualizar
      </button>
    </div>

    <div className="mb-4 rounded-xl border border-slate-800/80 bg-panelAlt/20 px-3 py-2">
      <p className="text-[11px] text-textMuted">
        Filtro atual: {auditEventType || "todos"} | limite {auditLimit} | atualizado{" "}
        {formatDate(lastAuditRefreshAt)}
      </p>
    </div>

    {loadingAudit && <p className="text-sm text-textMuted">Carregando...</p>}
    {!loadingAudit && recentAuditEvents.length === 0 && (
      <p className="text-sm text-textMuted">Nenhum evento de auditoria.</p>
    )}

    <div className="space-y-3">
      {recentAuditEvents.map((event) => (
        <div key={event.id} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-textMain">
                {formatAuditEventType(event.event_type)}
              </p>
              <p className="text-[10px] text-slate-500">{event.event_type}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] ${
                  getAuditCategory(event.event_type).className
                }`}
              >
                {getAuditCategory(event.event_type).label}
              </span>
              <span className="text-[11px] text-slate-500">{formatDate(event.created_at)}</span>
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <div className="rounded-lg bg-panel p-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                {AUDIT_LABELS.actor}
              </p>
              <p className="mt-1 text-sm text-textMain">{formatAuditActor(event.actor)}</p>
            </div>
            <div className="rounded-lg bg-panel p-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                {AUDIT_LABELS.target}
              </p>
              <p className="mt-1 text-sm text-textMain">
                {formatAuditTargetType(event.target_type)} {event.target_id ?? "-"}
              </p>
            </div>
          </div>

          <div className="mt-2 rounded-lg bg-panel p-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              {AUDIT_LABELS.details}
            </p>
            <p className="mt-1 text-sm text-textMain">{summarizeAuditMetadata(event.metadata)}</p>
          </div>
        </div>
      ))}
    </div>
  </article>
);

interface AdminOverviewQueueProps {
  selectableUserTargets: Array<{
    id: number;
    name: string;
    login: string;
  }>;
  queueFilters: QueueFilters;
  setQueueFilters: StateSetter<QueueFilters>;
  queuePagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  setQueuePagination: StateSetter<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>;
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
  <article className="rounded-2xl border border-slate-700 bg-panel p-4">
    <div className="mb-3 flex items-center justify-between">
      <div>
        <h4 className="font-display text-lg text-textMain">Fila operacional</h4>
        <p className="text-xs text-textMuted">Inclui nao visualizadas e itens em andamento</p>
      </div>
      <button
        className="rounded-md border border-slate-600 px-3 py-1 text-xs text-textMuted"
        onClick={onRefreshQueue}
      >
        Atualizar
      </button>
    </div>

    <div className="mb-3 grid gap-3 md:grid-cols-4">
      <label className="text-sm text-textMuted">
        Usuario
        <select
          className="mt-1 w-full rounded-xl border border-slate-700 bg-panelAlt px-3 py-2 text-sm text-textMain"
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
          className="mt-1 w-full rounded-xl border border-slate-700 bg-panelAlt px-3 py-2 text-sm text-textMain"
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
          className="mt-1 w-full rounded-xl border border-slate-700 bg-panelAlt px-3 py-2 text-sm text-textMain"
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
          className="rounded-xl border border-accent px-4 py-2 text-sm text-accent"
          onClick={onApplyQueueFilters}
          type="button"
        >
          Aplicar filtros
        </button>
        <button
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-textMuted"
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
          <div key={item.id} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
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

            <div className="mt-2 space-y-2">
              {activeRecipients.length === 0 && (
                <p className="text-xs text-textMuted">Sem usuarios pendentes ou em andamento.</p>
              )}

              {activeRecipients.map((recipient) => (
                <div key={recipient.userId} className="rounded-lg border border-slate-700 px-2 py-2">
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
          className="rounded-md border border-slate-600 px-3 py-1 disabled:opacity-50"
          disabled={queuePagination.page <= 1}
          onClick={() => setQueuePagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
          type="button"
        >
          Pagina anterior
        </button>
        <button
          className="rounded-md border border-slate-600 px-3 py-1 disabled:opacity-50"
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

interface AdminOverviewCompletedProps {
  completedNotifications: NotificationHistoryItem[];
  loadingHistoryAll: boolean;
  onRefreshCompleted: () => void;
}

export const AdminOverviewCompleted = ({
  completedNotifications,
  loadingHistoryAll,
  onRefreshCompleted
}: AdminOverviewCompletedProps) => (
  <article className="rounded-2xl border border-slate-700 bg-panel p-4">
    <div className="mb-3 flex items-center justify-between">
      <h4 className="font-display text-lg text-textMain">Concluidas recentes</h4>
      <button
        className="rounded-md border border-slate-600 px-3 py-1 text-xs text-textMuted"
        onClick={onRefreshCompleted}
      >
        Atualizar
      </button>
    </div>

    {loadingHistoryAll && <p className="text-sm text-textMuted">Carregando...</p>}
    {!loadingHistoryAll && completedNotifications.length === 0 && (
      <p className="text-sm text-textMuted">Nenhuma notificacao operacionalmente concluida.</p>
    )}

    <div className="space-y-3">
      {completedNotifications.slice(0, 5).map((item) => (
        <div key={item.id} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-textMain">{item.title}</p>
              <p className="text-xs text-textMuted">Concluida em {formatDate(item.created_at)}</p>
            </div>
            <span className="rounded-md bg-success/20 px-2 py-1 text-xs text-success">
              Lidas: {item.stats.read}/{item.stats.total}
            </span>
          </div>
          <p className="mt-2 text-sm text-textMuted">{item.message}</p>
        </div>
      ))}
    </div>
  </article>
);
