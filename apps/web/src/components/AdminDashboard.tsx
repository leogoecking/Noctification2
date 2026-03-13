import { AdminAuditPanel } from "./admin/AdminAuditPanel";
import { AdminHistoryPanel } from "./admin/AdminHistoryPanel";
import { AdminOverviewPanel } from "./admin/AdminOverviewPanel";
import { AdminSendPanel } from "./admin/AdminSendPanel";
import { AdminSidebar } from "./admin/AdminSidebar";
import { AdminUsersPanel } from "./admin/AdminUsersPanel";
import { AdminRemindersPanel } from "./admin/AdminRemindersPanel";
import { useAdminDashboardData } from "./admin/useAdminDashboardData";

interface AdminDashboardProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

export const AdminDashboard = ({ onError, onToast }: AdminDashboardProps) => {
  const {
    menu,
    setMenu,
    users,
    onlineUsers,
    auditEvents,
    historyAll,
    loadingUsers,
    loadingOnlineUsers,
    loadingAudit,
    loadingHistory,
    loadingHistoryAll,
    auditPagination,
    setAuditPagination,
    auditFilters,
    setAuditFilters,
    lastOnlineRefreshAt,
    lastAuditRefreshAt,
    historyFilters,
    setHistoryFilters,
    historyPagination,
    setHistoryPagination,
    lastHistoryRefreshAt,
    notificationForm,
    setNotificationForm,
    newUserForm,
    setNewUserForm,
    editForm,
    setEditForm,
    unreadNotifications,
    completedNotifications,
    activeUsers,
    selectableUserTargets,
    recentAuditEvents,
    onlineSummary,
    auditEventTypes,
    metrics,
    loadOnlineUsers,
    loadAudit,
    loadUnreadDashboard,
    loadNotificationHistory,
    sendNotification,
    createUser,
    updateUser,
    toggleStatus,
    applyAuditFilters,
    resetAuditFilters,
    applyHistoryFilters,
    resetHistoryFilters
  } = useAdminDashboardData({ onError, onToast });

  return (
    <section className="animate-fade-in">
      <div className="grid gap-4 lg:grid-cols-[250px,1fr]">
        <AdminSidebar menu={menu} onSelect={setMenu} />

        <div className="space-y-4">
          {menu === "dashboard" && (
            <AdminOverviewPanel
              metrics={metrics}
              onlineUsers={onlineUsers}
              onlineSummary={onlineSummary}
              lastOnlineRefreshAt={lastOnlineRefreshAt}
              loadingOnlineUsers={loadingOnlineUsers}
              onRefreshOnlineUsers={loadOnlineUsers}
              recentAuditEvents={recentAuditEvents}
              auditEventType={auditFilters.eventType}
              auditLimit={auditFilters.limit}
              lastAuditRefreshAt={lastAuditRefreshAt}
              loadingAudit={loadingAudit}
              onRefreshAudit={loadAudit}
              unreadNotifications={unreadNotifications}
              loadingHistory={loadingHistory}
              onRefreshQueue={loadUnreadDashboard}
              completedNotifications={completedNotifications}
              loadingHistoryAll={loadingHistoryAll}
              onRefreshCompleted={loadNotificationHistory}
            />
          )}

          {menu === "history_notifications" && (
            <AdminHistoryPanel
              historyFilters={historyFilters}
              setHistoryFilters={setHistoryFilters}
              selectableUserTargets={selectableUserTargets}
              lastHistoryRefreshAt={lastHistoryRefreshAt}
              historyPagination={historyPagination}
              setHistoryPagination={setHistoryPagination}
              loadingHistoryAll={loadingHistoryAll}
              historyAll={historyAll}
              onApplyFilters={applyHistoryFilters}
              onResetFilters={resetHistoryFilters}
              onRefresh={loadNotificationHistory}
            />
          )}

          {menu === "audit" && (
            <AdminAuditPanel
              auditFilters={auditFilters}
              setAuditFilters={setAuditFilters}
              auditEventTypes={auditEventTypes}
              lastAuditRefreshAt={lastAuditRefreshAt}
              auditPagination={auditPagination}
              setAuditPagination={setAuditPagination}
              loadingAudit={loadingAudit}
              auditEvents={auditEvents}
              onApplyFilters={applyAuditFilters}
              onResetFilters={resetAuditFilters}
              onRefresh={loadAudit}
            />
          )}

          {menu === "send" && (
            <AdminSendPanel
              notificationForm={notificationForm}
              setNotificationForm={setNotificationForm}
              activeUsers={activeUsers}
              loadingUsers={loadingUsers}
              onSend={sendNotification}
            />
          )}

          {menu === "users" && (
            <AdminUsersPanel
              users={users}
              newUserForm={newUserForm}
              setNewUserForm={setNewUserForm}
              editForm={editForm}
              setEditForm={setEditForm}
              onCreateUser={createUser}
              onUpdateUser={updateUser}
              onToggleStatus={toggleStatus}
            />
          )}

          {menu === "reminders" && (
            <AdminRemindersPanel onError={onError} onToast={onToast} />
          )}
        </div>
      </div>
    </section>
  );
};
