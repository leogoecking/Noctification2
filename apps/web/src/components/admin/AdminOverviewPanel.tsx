import type { AuditEventItem, NotificationHistoryItem, OnlineUserItem } from "../../types";
import type { AdminMetrics, OnlineSummary, QueueFilters, StateSetter } from "./types";
import {
  AdminOverviewAudit,
  AdminOverviewCompleted,
  AdminOverviewMetrics,
  AdminOverviewOnlineUsers,
  AdminOverviewQueue
} from "./adminOverviewSections";

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
  onResetQueueFilters,
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

      <AdminOverviewMetrics metrics={metrics} />

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <AdminOverviewOnlineUsers
          onlineUsers={onlineUsers}
          onlineSummary={onlineSummary}
          lastOnlineRefreshAt={lastOnlineRefreshAt}
          loadingOnlineUsers={loadingOnlineUsers}
          onRefreshOnlineUsers={onRefreshOnlineUsers}
        />
        <AdminOverviewAudit
          recentAuditEvents={recentAuditEvents}
          auditEventType={auditEventType}
          auditLimit={auditLimit}
          lastAuditRefreshAt={lastAuditRefreshAt}
          loadingAudit={loadingAudit}
          onRefreshAudit={onRefreshAudit}
        />
      </div>

      <AdminOverviewQueue
        selectableUserTargets={selectableUserTargets}
        queueFilters={queueFilters}
        setQueueFilters={setQueueFilters}
        queuePagination={queuePagination}
        setQueuePagination={setQueuePagination}
        lastQueueRefreshAt={lastQueueRefreshAt}
        unreadNotifications={unreadNotifications}
        loadingHistory={loadingHistory}
        onRefreshQueue={onRefreshQueue}
        onApplyQueueFilters={onApplyQueueFilters}
        onResetQueueFilters={onResetQueueFilters}
      />

      <AdminOverviewCompleted
        completedNotifications={completedNotifications}
        loadingHistoryAll={loadingHistoryAll}
        onRefreshCompleted={onRefreshCompleted}
      />
    </>
  );
};
