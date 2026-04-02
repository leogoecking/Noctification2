import { useState } from "react";
import type { NotificationItem } from "../../types";
import type { NotificationSoundPrefsHandle } from "../../hooks/useNotificationSoundPrefs";
import {
  formatNotificationDate,
  OPERATIONAL_STATUS_LABELS,
  PRIORITY_LABELS,
  renderTaskLinkChip
} from "./userNotificationUi";
import { SoundConfigPanel } from "./SoundConfigPanel";

interface UserNotificationBellProps {
  bellOpen: boolean;
  dropdownItems: NotificationItem[];
  unreadCount: number;
  onOpenChange: (open: boolean) => void;
  onSelectNotification: (item: NotificationItem) => void;
  onOpenAllNotifications: () => void;
  soundPrefs: NotificationSoundPrefsHandle;
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
  onOpenAllNotifications,
  soundPrefs,
}: UserNotificationBellProps) => {
  const [soundConfigOpen, setSoundConfigOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="relative rounded-xl border border-outlineSoft bg-panel p-2 text-textMain"
        onClick={() => onOpenChange(!bellOpen)}
        aria-label="Abrir notificacoes"
        data-testid="notif-bell-btn"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-danger px-1 text-center text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {bellOpen && (
        <div
          data-testid="notif-dropdown"
          className="absolute right-0 z-30 mt-2 w-80 rounded-[1.5rem] bg-panel shadow-sm ring-1 ring-outlineSoft/50"
        >
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-semibold text-textMain">Ultimas 10 notificacoes</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-textMuted">{unreadCount} pendentes</span>
              <button
                onClick={() => setSoundConfigOpen((v) => !v)}
                aria-label="Configurar sons"
                className={`rounded-lg border px-2 py-1 text-xs transition ${
                  soundConfigOpen
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-outlineSoft/60 bg-panelAlt text-textMuted hover:text-textMain"
                }`}
              >
                ⚙ Sons
              </button>
            </div>
          </div>

          {soundConfigOpen && (
            <SoundConfigPanel
              prefs={soundPrefs.prefs}
              onToggleMaster={soundPrefs.toggleMaster}
              onSetSound={soundPrefs.setSound}
              onSetCustom={soundPrefs.setCustom}
              onRemoveCustom={soundPrefs.removeCustom}
            />
          )}

          {dropdownItems.length === 0 && !soundConfigOpen && (
            <p className="px-4 pb-3 text-xs text-textMuted">
              Nenhuma notificacao recente. Novos alertas aparecerao aqui.
            </p>
          )}

          {!soundConfigOpen && (
            <>
              <div data-testid="notif-dropdown-list" className="max-h-72 space-y-2 overflow-auto px-3 pb-1">
                {dropdownItems.map((item) => (
                  <button
                    key={item.id}
                    className="w-full rounded-xl bg-panelAlt p-3 text-left transition hover:bg-panel"
                    onClick={() => onSelectNotification(item)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-textMain">{item.title}</p>
                        <p className="mt-1 line-clamp-1 text-xs text-textMuted">
                          {item.message || "Sem mensagem adicional"}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-textMuted">
                          <span>{formatNotificationDate(item.createdAt)}</span>
                          <span>{OPERATIONAL_STATUS_LABELS[item.operationalStatus]}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {renderTaskLinkChip(item.sourceTaskId)}
                        {!item.isVisualized && <span className="h-2 w-2 rounded-full bg-accent" />}
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
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
                  </button>
                ))}
              </div>

              <div className="p-3">
                <button
                  data-testid="view-all-notifications-btn"
                  className="w-full rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-xs text-textMain"
                  onClick={onOpenAllNotifications}
                >
                  Ver todas as notificacoes
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
