import { useState } from "react";
import type {
  AuditEventItem,
  NotificationHistoryItem,
  OnlineUserItem,
  ReminderHealthItem,
  TaskAutomationHealthItem
} from "../../types";
import type { AdminMetrics, OnlineSummary, QueueFilters, StateSetter } from "./types";
import {
  formatAuditActor,
  formatAuditEventType,
  formatAuditTargetType,
  formatDate,
  getAuditCategory,
  operationalStatusLabel,
  summarizeAuditMetadata
} from "./utils";

export const AdminOverviewMetrics = ({ metrics }: { metrics: AdminMetrics }) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <article className="rounded-[1.25rem] bg-panel p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted">
        Nao visualizadas
      </p>
      <p className="mt-3 font-display text-3xl font-black tracking-tight text-textMain">
        {metrics.pendingNotifications}
      </p>
      <p className="mt-1 text-xs text-textMuted">Pendencias novas aguardando leitura</p>
    </article>

    <article className="rounded-[1.25rem] bg-panel p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted">
        Pendencias operacionais
      </p>
      <p className="mt-3 font-display text-3xl font-black tracking-tight text-warning">
        {metrics.pendingRecipients}
      </p>
      <p className="mt-1 text-xs text-textMuted">Itens ainda em fluxo operacional</p>
    </article>

    <article className="rounded-[1.25rem] bg-panel p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted">
        Criticas abertas
      </p>
      <p className="mt-3 font-display text-3xl font-black tracking-tight text-danger">
        {metrics.criticalOpen}
      </p>
      <p className="mt-1 text-xs text-textMuted">Prioridade maxima na fila atual</p>
    </article>

    <article className="rounded-[1.25rem] bg-panel p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted">
        Em andamento
      </p>
      <p className="mt-3 font-display text-3xl font-black tracking-tight text-accent">
        {metrics.inProgressNotifications}
      </p>
      <p className="mt-1 text-xs text-textMuted">Notificacoes com retorno operacional em andamento</p>
    </article>
  </div>
);

interface AdminOverviewSystemHealthProps {
  reminderHealth: ReminderHealthItem | null;
  taskHealth: TaskAutomationHealthItem | null;
  loading: boolean;
  onRefresh: () => void;
}

export const AdminOverviewSystemHealth = ({
  reminderHealth,
  taskHealth,
  loading,
  onRefresh
}: AdminOverviewSystemHealthProps) => (
  <article className="rounded-[1.25rem] border-l-4 border-accent bg-panelAlt p-5">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h4 className="font-display text-lg text-textMain">System health</h4>
        <p className="text-sm text-textMuted">Resumo dos automatos com foco no que exige acao</p>
      </div>
      <button
        className="rounded-lg border border-outlineSoft bg-panel px-3 py-1.5 text-xs text-textMuted"
        onClick={onRefresh}
        type="button"
      >
        Atualizar
      </button>
    </div>

    {loading ? (
      <p className="text-sm text-textMuted">Carregando saude operacional...</p>
    ) : (
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              reminderHealth?.schedulerEnabled
                ? "bg-success/15 text-success"
                : "bg-warning/15 text-warning"
            }`}
          >
            Lembretes {reminderHealth?.schedulerEnabled ? "ativos" : "inativos"}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              taskHealth?.schedulerEnabled ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
            }`}
          >
            Tarefas {taskHealth?.schedulerEnabled ? "ativas" : "inativas"}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-panel px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Pendentes</p>
            <p className="mt-2 text-xl font-bold text-textMain">
              {reminderHealth?.pendingOccurrences ?? 0}
            </p>
            <p className="mt-1 text-xs text-textMuted">Ocorrencias aguardando processamento</p>
          </div>

          <div className="rounded-xl bg-panel px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Vencidas</p>
            <p className="mt-2 text-xl font-bold text-danger">{taskHealth?.overdueEligible ?? 0}</p>
            <p className="mt-1 text-xs text-textMuted">Tasks elegiveis para alerta de atraso</p>
          </div>

          <div className="rounded-xl bg-panel px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Alertas hoje</p>
            <p className="mt-2 text-xl font-bold text-textMain">
              {(taskHealth?.dueSoonSentToday ?? 0) +
                (taskHealth?.overdueSentToday ?? 0) +
                (taskHealth?.staleSentToday ?? 0) +
                (taskHealth?.blockedSentToday ?? 0)}
            </p>
            <p className="mt-1 text-xs text-textMuted">Disparos automaticos realizados hoje</p>
          </div>
        </div>

        <details className="rounded-xl bg-panel px-3 py-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-textMuted">
            Ver detalhes tecnicos
          </summary>
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-textMuted">Scheduler lembretes</span>
              <span className={reminderHealth?.schedulerEnabled ? "text-success" : "text-warning"}>
                {reminderHealth?.schedulerEnabled ? "Ativo" : "Inativo"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-textMuted">Scheduler tarefas</span>
              <span className={taskHealth?.schedulerEnabled ? "text-success" : "text-warning"}>
                {taskHealth?.schedulerEnabled ? "Ativo" : "Inativo"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-textMuted">Tasks bloqueadas elegiveis</span>
              <span className="font-semibold text-warning">{taskHealth?.blockedEligible ?? 0}</span>
            </div>
          </div>
        </details>
      </div>
    )}
  </article>
);

interface AdminOverviewOnlineUsersProps {
  onlineUsers: OnlineUserItem[];
  onlineSummary: OnlineSummary;
  lastOnlineRefreshAt: string | null;
  loadingOnlineUsers: boolean;
  onRefreshOnlineUsers: () => void;
}

export const AdminOnlineUsersTrigger = ({
  onlineUsers,
  onlineSummary,
  lastOnlineRefreshAt,
  loadingOnlineUsers,
  onRefreshOnlineUsers
}: AdminOverviewOnlineUsersProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        aria-label="Usuarios online"
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-outlineSoft bg-panelAlt text-textMain transition hover:border-accent/40"
        onClick={() => setIsModalOpen(true)}
        type="button"
      >
        <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
          <path
            d="M16 11a4 4 0 1 0-3.999-4A4 4 0 0 0 16 11Zm-8 1a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm8 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4ZM8 14c-.29 0-.62.02-.97.05C4.64 14.25 1 15.43 1 18v2h5v-2c0-1.55.8-2.89 2.18-3.93A8.7 8.7 0 0 0 8 14Z"
            fill="currentColor"
          />
        </svg>
        <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-success px-1.5 text-[10px] font-bold text-black">
          {loadingOnlineUsers ? "..." : onlineUsers.length}
        </span>
      </button>

      {isModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] bg-panel p-6 shadow-glow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted">
                  Presenca online
                </p>
                <h3 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-textMain">
                  Usuarios conectados agora
                </h3>
                <p className="mt-2 text-sm text-textMuted">
                  {onlineUsers.length} online. Atualizado em {formatDate(lastOnlineRefreshAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-xs text-textMain"
                  onClick={onRefreshOnlineUsers}
                  type="button"
                >
                  Atualizar
                </button>
                <button
                  className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-xs text-textMain"
                  onClick={() => setIsModalOpen(false)}
                  type="button"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-panelAlt px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Total online</p>
                <p className="mt-2 text-xl font-bold text-success">{onlineUsers.length}</p>
              </div>
              <div className="rounded-xl bg-panelAlt px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Usuarios</p>
                <p className="mt-2 text-xl font-bold text-accent">{onlineSummary.operators}</p>
              </div>
              <div className="rounded-xl bg-panelAlt px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Admins</p>
                <p className="mt-2 text-xl font-bold text-textMain">{onlineSummary.admins}</p>
              </div>
            </div>

            {loadingOnlineUsers ? <p className="mt-4 text-sm text-textMuted">Carregando...</p> : null}
            {!loadingOnlineUsers && onlineUsers.length === 0 ? (
              <p className="mt-4 text-sm text-textMuted">Nenhum usuario online no momento.</p>
            ) : null}

            <div className="mt-5 space-y-3">
              {onlineUsers.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl bg-panelAlt p-4"
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
          </div>
        </div>
      ) : null}
    </>
  );
};

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
                className={`rounded-full px-2.5 py-1 text-[10px] ${
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
  <article className="rounded-[1.25rem] bg-panel p-5">
    <div className="mb-3 flex items-center justify-between">
      <h4 className="font-display text-lg text-textMain">Concluidas recentes</h4>
      <button
        className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-1.5 text-xs text-textMuted"
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
        <div key={item.id} className="rounded-[1.25rem] bg-panelAlt p-4">
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
