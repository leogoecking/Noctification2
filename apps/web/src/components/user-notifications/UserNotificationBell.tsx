import type { NotificationItem } from "../../types";
import {
  formatNotificationDate,
  OPERATIONAL_STATUS_LABELS,
  PRIORITY_LABELS,
  renderTaskLinkChip
} from "./userNotificationUi";

interface UserNotificationBellProps {
  bellOpen: boolean;
  dropdownItems: NotificationItem[];
  unreadCount: number;
  onOpenChange: (open: boolean) => void;
  onSelectNotification: (item: NotificationItem) => void;
  onOpenAllNotifications: () => void;
}

const BellIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);

export const UserNotificationBell = ({
  bellOpen,
  dropdownItems,
  unreadCount,
  onOpenChange,
  onSelectNotification,
  onOpenAllNotifications
}: UserNotificationBellProps) => {
  return (
    <div className="relative">
      <button
        className="relative rounded-xl border border-slate-600 bg-panelAlt p-2 text-textMain"
        onClick={() => onOpenChange(!bellOpen)}
        aria-label="Abrir notificacoes"
        data-testid="notif-bell-btn"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-danger px-1 text-center text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {bellOpen && (
        <div
          data-testid="notif-dropdown"
          className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-slate-700 bg-panel p-3 shadow-glow"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-textMain">Ultimas 10 notificacoes</p>
            <span className="text-xs text-textMuted">{unreadCount} pendentes</span>
          </div>

          {dropdownItems.length === 0 && (
            <p className="text-xs text-textMuted">
              Nenhuma notificacao recente. Novos alertas aparecerao aqui.
            </p>
          )}

          <div data-testid="notif-dropdown-list" className="max-h-72 space-y-2 overflow-auto">
            {dropdownItems.map((item) => (
              <button
                key={item.id}
                className="w-full rounded-lg border border-slate-700 bg-panelAlt p-2.5 text-left"
                onClick={() => onSelectNotification(item)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-textMain">{item.title}</p>
                  <div className="flex items-center gap-1">
                    {renderTaskLinkChip(item.sourceTaskId)}
                    {!item.isVisualized && <span className="h-2 w-2 rounded-full bg-accent" />}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        item.priority === "critical"
                          ? "bg-danger/20 text-danger"
                          : item.priority === "high"
                            ? "bg-warning/20 text-warning"
                            : "bg-panel text-textMuted"
                      }`}
                    >
                      {PRIORITY_LABELS[item.priority]}
                    </span>
                  </div>
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-textMuted">
                  {item.message || "Sem mensagem adicional"}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-textMuted">
                  <span>{formatNotificationDate(item.createdAt)}</span>
                  <span>{OPERATIONAL_STATUS_LABELS[item.operationalStatus]}</span>
                </div>
              </button>
            ))}
          </div>

          <button
            data-testid="view-all-notifications-btn"
            className="mt-2 w-full rounded-lg border border-slate-600 px-3 py-2 text-xs text-textMain"
            onClick={onOpenAllNotifications}
          >
            Ver todas as notificacoes
          </button>
        </div>
      )}
    </div>
  );
};

