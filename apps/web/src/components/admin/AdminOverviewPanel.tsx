import type {
  AuditEventItem,
  NotificationHistoryItem,
  TaskAutomationHealthItem,
} from "../../types";
import { OperationsBoardRail } from "../OperationsBoardRail";
import type { AdminMetrics } from "./types";
import {
  AdminOverviewAudit,
  AdminOverviewCompleted,
  AdminOverviewMetrics,
  AdminOverviewSystemHealth
} from "./adminOverviewSections";

interface AdminOverviewPanelProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
  taskHealth: TaskAutomationHealthItem | null;
  loadingHealth: boolean;
  onRefreshHealth: () => void;
  metrics: AdminMetrics;
  recentAuditEvents: AuditEventItem[];
  auditEventType: string;
  auditLimit: number;
  lastAuditRefreshAt: string | null;
  loadingAudit: boolean;
  onRefreshAudit: () => void;
  onOpenAudit: () => void;
  completedNotifications: NotificationHistoryItem[];
  loadingHistoryAll: boolean;
  onRefreshCompleted: () => void;
}

export const AdminOverviewPanel = ({
  onError,
  onToast,
  taskHealth,
  loadingHealth,
  onRefreshHealth,
  metrics,
  recentAuditEvents,
  auditEventType,
  auditLimit,
  lastAuditRefreshAt,
  loadingAudit,
  onRefreshAudit,
  onOpenAudit,
  completedNotifications,
  loadingHistoryAll,
  onRefreshCompleted
}: AdminOverviewPanelProps) => {
  return (
    <>
      <AdminOverviewMetrics metrics={metrics} />

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-9">
          <OperationsBoardRail
            currentUserName="admin"
            onError={onError}
            onToast={onToast}
            title="Mural da operacao"
            subtitle="Canal principal de contexto compartilhado entre administracao e usuarios"
          />

          <AdminOverviewCompleted
            completedNotifications={completedNotifications}
            loadingHistoryAll={loadingHistoryAll}
            onRefreshCompleted={onRefreshCompleted}
          />
        </div>

        <div className="space-y-6 xl:col-span-3">
          <AdminOverviewSystemHealth
            taskHealth={taskHealth}
            loading={loadingHealth}
            onRefresh={onRefreshHealth}
          />
          <AdminOverviewAudit
            recentAuditEvents={recentAuditEvents}
            auditEventType={auditEventType}
            auditLimit={auditLimit}
            lastAuditRefreshAt={lastAuditRefreshAt}
            loadingAudit={loadingAudit}
            onRefreshAudit={onRefreshAudit}
            onOpenAudit={onOpenAudit}
          />
        </div>
      </div>
    </>
  );
};
