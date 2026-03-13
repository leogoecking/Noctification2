import type { AuditEventItem, NotificationHistoryItem, OnlineUserItem } from "../../types";
import type { AdminMetrics, OnlineSummary } from "./types";
import {
  formatDate,
  operationalStatusLabel,
  summarizeAuditMetadata
} from "./utils";

interface AdminOverviewPanelProps {
  metrics: AdminMetrics;
  onlineUsers: OnlineUserItem[];
  onlineSummary: OnlineSummary;
  lastOnlineRefreshAt: string | null;
  loadingOnlineUsers: boolean;
  onRefreshOnlineUsers: () => void;
  recentAuditEvents: AuditEventItem[];
  auditEventType: string;
  auditLimit: number;
  lastAuditRefreshAt: string | null;
  loadingAudit: boolean;
  onRefreshAudit: () => void;
  unreadNotifications: NotificationHistoryItem[];
  loadingHistory: boolean;
  onRefreshQueue: () => void;
  completedNotifications: NotificationHistoryItem[];
  loadingHistoryAll: boolean;
  onRefreshCompleted: () => void;
}

export const AdminOverviewPanel = ({
  metrics,
  onlineUsers,
  onlineSummary,
  lastOnlineRefreshAt,
  loadingOnlineUsers,
  onRefreshOnlineUsers,
  recentAuditEvents,
  auditEventType,
  auditLimit,
  lastAuditRefreshAt,
  loadingAudit,
  onRefreshAudit,
  unreadNotifications,
  loadingHistory,
  onRefreshQueue,
  completedNotifications,
  loadingHistoryAll,
  onRefreshCompleted
}: AdminOverviewPanelProps) => {
  return (
    <>
      <header className="rounded-2xl border border-slate-700 bg-panel p-4">
        <h3 className="font-display text-xl text-textMain">Dashboard operacional</h3>
        <p className="text-sm text-textMuted">Visao rapida das pendencias de leitura e atendimento</p>
      </header>

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

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
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

        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h4 className="font-display text-lg text-textMain">Auditoria recente</h4>
              <p className="text-sm text-textMuted">Eventos mais novos do sistema</p>
            </div>
            <button
              className="rounded-md border border-slate-600 px-3 py-1 text-xs text-textMuted"
              onClick={onRefreshAudit}
            >
              Atualizar
            </button>
          </div>

          <p className="mb-3 text-xs text-textMuted">
            Filtro atual: {auditEventType || "todos"} | limite {auditLimit} | atualizado{" "}
            {formatDate(lastAuditRefreshAt)}
          </p>

          {loadingAudit && <p className="text-sm text-textMuted">Carregando...</p>}
          {!loadingAudit && recentAuditEvents.length === 0 && (
            <p className="text-sm text-textMuted">Nenhum evento de auditoria.</p>
          )}

          <div className="space-y-2">
            {recentAuditEvents.map((event) => (
              <div key={event.id} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-textMain">{event.event_type}</p>
                  <span className="text-[11px] text-textMuted">{formatDate(event.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-textMuted">
                  Ator: {event.actor ? `${event.actor.name} (${event.actor.login})` : "sistema"}
                </p>
                <p className="mt-1 text-xs text-textMuted">
                  Alvo: {event.target_type} {event.target_id ?? "-"}
                </p>
                <p className="mt-1 text-xs text-textMuted">{summarizeAuditMetadata(event.metadata)}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

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
      </article>

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
    </>
  );
};
