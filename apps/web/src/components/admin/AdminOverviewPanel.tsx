import type {
  AuditEventItem,
  NotificationHistoryItem,
  OnlineUserItem,
  ReminderHealthItem,
  TaskAutomationHealthItem
} from "../../types";
import { OperationsBoardRail } from "../OperationsBoardRail";
import type { AdminMetrics, OnlineSummary, QueueFilters, StateSetter } from "./types";
import {
  AdminOverviewAudit,
  AdminOverviewCompleted,
  AdminOverviewMetrics,
  AdminOverviewOnlineUsers,
  AdminOverviewQueue,
  AdminOverviewSystemHealth
} from "./adminOverviewSections";

interface AdminOverviewPanelProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
  reminderHealth: ReminderHealthItem | null;
  taskHealth: TaskAutomationHealthItem | null;
  loadingHealth: boolean;
  onRefreshHealth: () => void;
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
  onError,
  onToast,
  reminderHealth,
  taskHealth,
  loadingHealth,
  onRefreshHealth,
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
      <header className="rounded-[1.5rem] bg-panelAlt/80 p-6 shadow-glow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-textMuted">
              Operations admin
            </p>
            <h3 className="font-display text-3xl font-extrabold tracking-tight text-textMain">
              Dashboard operacional
            </h3>
            <p className="max-w-3xl text-sm text-textMuted">
              Visao rapida das pendencias de leitura, acompanhamento operacional e atividade
              administrativa recente.
            </p>
          </div>
        </div>
      </header>

      <AdminOverviewMetrics metrics={metrics} />

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
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
        </div>

        <div className="space-y-6 xl:col-span-4">
          <OperationsBoardRail
            currentUserName="admin"
            onError={onError}
            onToast={onToast}
            title="Mural da operacao"
            subtitle="Canal principal de contexto compartilhado entre administracao e usuarios"
          />
          <AdminOverviewSystemHealth
            reminderHealth={reminderHealth}
            taskHealth={taskHealth}
            loading={loadingHealth}
            onRefresh={onRefreshHealth}
          />
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
      </div>
    </>
  );
};
