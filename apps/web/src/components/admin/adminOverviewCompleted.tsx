import type { NotificationHistoryItem } from "../../types";
import { formatDate } from "./utils";

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
