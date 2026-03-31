import type { ReactNode } from "react";
import type { AuditEventItem, NotificationHistoryItem, TaskItem, UserItem } from "../../types";
import type { AdminMenu } from "./types";
import { formatDate } from "./utils";

interface AdminGlobalSearchPanelProps {
  query: string;
  loadingTasks: boolean;
  users: UserItem[];
  notifications: NotificationHistoryItem[];
  auditEvents: AuditEventItem[];
  tasks: TaskItem[];
  onOpenMenu: (menu: AdminMenu) => void;
}

const totalResults = (props: Omit<AdminGlobalSearchPanelProps, "query" | "onOpenMenu">) =>
  props.users.length + props.notifications.length + props.auditEvents.length + props.tasks.length;

const EmptyState = ({ query }: { query: string }) => (
  <article className="rounded-[1.5rem] bg-panel p-6 shadow-glow">
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-textMuted">
      Busca global
    </p>
    <h3 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-textMain">
      Nenhum resultado para "{query}"
    </h3>
    <p className="mt-2 max-w-2xl text-sm text-textMuted">
      Tente buscar por usuario, login, titulo de tarefa, texto da notificacao ou evento de
      auditoria.
    </p>
  </article>
);

const Section = ({
  title,
  count,
  actionLabel,
  onAction,
  children
}: {
  title: string;
  count: number;
  actionLabel: string;
  onAction: () => void;
  children: ReactNode;
}) => (
  <article className="rounded-[1.25rem] bg-panel p-5">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h4 className="font-display text-lg font-bold text-textMain">{title}</h4>
        <p className="text-xs text-textMuted">{count} resultado(s)</p>
      </div>
      <button
        className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-xs font-semibold text-textMuted transition hover:text-textMain"
        onClick={onAction}
        type="button"
      >
        {actionLabel}
      </button>
    </div>
    <div className="space-y-3">{children}</div>
  </article>
);

export const AdminGlobalSearchPanel = ({
  query,
  loadingTasks,
  users,
  notifications,
  auditEvents,
  tasks,
  onOpenMenu
}: AdminGlobalSearchPanelProps) => {
  const resultCount = totalResults({ loadingTasks, users, notifications, auditEvents, tasks });

  if (!loadingTasks && resultCount === 0) {
    return <EmptyState query={query} />;
  }

  return (
    <div className="space-y-6">
      <article className="rounded-[1.5rem] bg-panel p-6 shadow-glow">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-textMuted">
          Busca global
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="font-display text-2xl font-extrabold tracking-tight text-textMain">
              Resultados para "{query}"
            </h3>
            <p className="mt-2 text-sm text-textMuted">
              Usuarios, notificacoes, auditoria e tarefas reunidos em um unico ponto.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-md bg-panelAlt px-3 py-1.5 text-textMuted">
              Usuarios: {users.length}
            </span>
            <span className="rounded-md bg-panelAlt px-3 py-1.5 text-textMuted">
              Notificacoes: {notifications.length}
            </span>
            <span className="rounded-md bg-panelAlt px-3 py-1.5 text-textMuted">
              Auditoria: {auditEvents.length}
            </span>
            <span className="rounded-md bg-panelAlt px-3 py-1.5 text-textMuted">
              Tarefas: {loadingTasks ? "..." : tasks.length}
            </span>
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="Usuarios"
          count={users.length}
          actionLabel="Abrir usuarios"
          onAction={() => onOpenMenu("users")}
        >
          {users.length === 0 ? (
            <p className="text-sm text-textMuted">Nenhum usuario correspondente.</p>
          ) : (
            users.map((user) => (
              <button
                key={user.id}
                className="block w-full rounded-xl bg-panelAlt p-3 text-left transition hover:bg-panelAlt/80"
                onClick={() => onOpenMenu("users")}
                type="button"
              >
                <p className="text-sm font-semibold text-textMain">{user.name}</p>
                <p className="text-xs text-textMuted">
                  {user.login} | {user.department || "Sem setor"} | {user.jobTitle || "Sem funcao"}
                </p>
              </button>
            ))
          )}
        </Section>

        <Section
          title="Tarefas"
          count={tasks.length}
          actionLabel="Abrir tarefas"
          onAction={() => onOpenMenu("tasks")}
        >
          {loadingTasks ? (
            <p className="text-sm text-textMuted">Buscando tarefas...</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-textMuted">Nenhuma tarefa correspondente.</p>
          ) : (
            tasks.map((task) => (
              <button
                key={task.id}
                className="block w-full rounded-xl bg-panelAlt p-3 text-left transition hover:bg-panelAlt/80"
                onClick={() => onOpenMenu("tasks")}
                type="button"
              >
                <p className="text-sm font-semibold text-textMain">{task.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-textMuted">
                  {task.description || "Sem descricao"}
                </p>
                <p className="mt-2 text-[11px] text-textMuted">
                  Responsavel: {task.assigneeName || task.assigneeLogin || "Nao atribuido"}
                </p>
              </button>
            ))
          )}
        </Section>

        <Section
          title="Notificacoes"
          count={notifications.length}
          actionLabel="Abrir historico"
          onAction={() => onOpenMenu("history_notifications")}
        >
          {notifications.length === 0 ? (
            <p className="text-sm text-textMuted">Nenhuma notificacao correspondente.</p>
          ) : (
            notifications.map((item) => (
              <button
                key={item.id}
                className="block w-full rounded-xl bg-panelAlt p-3 text-left transition hover:bg-panelAlt/80"
                onClick={() => onOpenMenu("history_notifications")}
                type="button"
              >
                <p className="text-sm font-semibold text-textMain">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-textMuted">{item.message}</p>
                <p className="mt-2 text-[11px] text-textMuted">
                  {formatDate(item.created_at)} | {item.sender.name} ({item.sender.login})
                </p>
              </button>
            ))
          )}
        </Section>

        <Section
          title="Auditoria"
          count={auditEvents.length}
          actionLabel="Abrir auditoria"
          onAction={() => onOpenMenu("audit")}
        >
          {auditEvents.length === 0 ? (
            <p className="text-sm text-textMuted">Nenhum evento correspondente.</p>
          ) : (
            auditEvents.map((event) => (
              <button
                key={event.id}
                className="block w-full rounded-xl bg-panelAlt p-3 text-left transition hover:bg-panelAlt/80"
                onClick={() => onOpenMenu("audit")}
                type="button"
              >
                <p className="text-sm font-semibold text-textMain">{event.event_type}</p>
                <p className="mt-1 text-xs text-textMuted">
                  {event.actor?.name || "Sistema"} | {event.target_type} {event.target_id ?? "-"}
                </p>
                <p className="mt-2 text-[11px] text-textMuted">{formatDate(event.created_at)}</p>
              </button>
            ))
          )}
        </Section>
      </div>
    </div>
  );
};
