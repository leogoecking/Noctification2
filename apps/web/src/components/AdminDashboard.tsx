import { useCallback } from "react";
import { AdminDashboardContent } from "./admin/AdminDashboardContent";
import { AdminSidebar } from "./admin/AdminSidebar";
import { AdminDashboardHeader } from "./admin/adminDashboardHeader";
import { useAdminDashboardData } from "./admin/useAdminDashboardData";
import { useAdminGlobalSearch } from "./admin/useAdminGlobalSearch";
import { useAdminSystemHealth } from "./admin/useAdminSystemHealth";
import { isAprModuleEnabled, isKmlPosteModuleEnabled } from "../lib/featureFlags";
import type { AppPath } from "./app/appShell";
interface AdminDashboardProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
  currentPath?: AppPath;
  onNavigate?: (path: AppPath) => void;
  onLogout?: () => void;
}

export const AdminDashboard = ({
  onError,
  onToast,
  currentPath = "/",
  onNavigate,
  onLogout
}: AdminDashboardProps) => {
  const aprModuleEnabled = isAprModuleEnabled();
  const kmlPosteModuleEnabled = isKmlPosteModuleEnabled();
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
    loadNotificationHistory,
    sendNotification,
    createUser,
    updateUser,
    toggleStatus,
    applyAuditFilters,
    resetAuditFilters,
    applyHistoryFilters,
    resetHistoryFilters,
  } = useAdminDashboardData({ onError, onToast });

  const isAprPage = currentPath === "/apr";
  const isKmlPostePage = currentPath === "/kml-postes";
  const globalSearchEnabled = menu !== "tasks" && !isAprPage && !isKmlPostePage;
  const {
    searchQuery,
    setSearchQuery,
    taskSearchResults,
    loadingTaskSearch,
    matchedUsers,
    matchedNotifications,
    matchedAudit,
    isSearching
  } = useAdminGlobalSearch({
    enabled: globalSearchEnabled,
    users,
    unreadNotifications,
    historyAll,
    completedNotifications,
    auditEvents
  });
  const { taskHealth, loadingHealth, loadSystemHealth } = useAdminSystemHealth();

  const handleSidebarSelect = useCallback(
    (nextMenu: typeof menu) => {
      setMenu(nextMenu);
      if ((isAprPage || isKmlPostePage) && onNavigate) {
        onNavigate("/");
      }
    },
    [isAprPage, isKmlPostePage, onNavigate, setMenu]
  );

  return (
    <section className="animate-fade-in">
      <div className="grid gap-6 lg:grid-cols-[max-content,1fr]">
        <AdminSidebar
          aprActive={isAprPage}
          aprEnabled={aprModuleEnabled}
          kmlPosteActive={isKmlPostePage}
          kmlPosteEnabled={kmlPosteModuleEnabled}
          menu={menu}
          onOpenApr={
            onNavigate
              ? () => {
                  onNavigate("/apr");
                }
              : undefined
          }
          onOpenDashboard={
            onNavigate
              ? () => {
                  setMenu("dashboard");
                  onNavigate("/");
                }
              : undefined
          }
          onOpenKmlPostes={
            onNavigate
              ? () => {
                  onNavigate("/kml-postes");
                }
              : undefined
          }
          onLogout={onLogout}
          onSelect={handleSidebarSelect}
        />

        <div className="space-y-4">
          {!isAprPage && !isKmlPostePage ? (
            <AdminDashboardHeader
              menu={menu}
              isSearching={isSearching}
              isAprPage={isAprPage}
              isKmlPostePage={isKmlPostePage}
              globalSearchEnabled={globalSearchEnabled}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onlineUsers={onlineUsers}
              onlineSummary={onlineSummary}
              lastOnlineRefreshAt={lastOnlineRefreshAt}
              loadingOnlineUsers={loadingOnlineUsers}
              onRefreshOnlineUsers={loadOnlineUsers}
            />
          ) : null}

          <AdminDashboardContent
            isAprPage={isAprPage}
            isKmlPostePage={isKmlPostePage}
            isSearching={isSearching}
            menu={menu}
            onError={onError}
            onToast={onToast}
            matchedAudit={matchedAudit}
            loadingTaskSearch={loadingTaskSearch}
            matchedNotifications={matchedNotifications}
            setMenu={setMenu}
            searchQuery={searchQuery}
            taskSearchResults={taskSearchResults}
            matchedUsers={matchedUsers}
            taskHealth={taskHealth}
            loadingHealth={loadingHealth}
            onRefreshHealth={() => void loadSystemHealth()}
            metrics={metrics}
            recentAuditEvents={recentAuditEvents}
            auditFilters={auditFilters}
            lastAuditRefreshAt={lastAuditRefreshAt}
            loadingAudit={loadingAudit}
            onRefreshAudit={loadAudit}
            completedNotifications={completedNotifications}
            loadingHistoryAll={loadingHistoryAll}
            onRefreshCompleted={loadNotificationHistory}
            historyFilters={historyFilters}
            setHistoryFilters={setHistoryFilters}
            selectableUserTargets={selectableUserTargets}
            lastHistoryRefreshAt={lastHistoryRefreshAt}
            historyPagination={historyPagination}
            setHistoryPagination={setHistoryPagination}
            historyAll={historyAll}
            onApplyHistoryFilters={applyHistoryFilters}
            onResetHistoryFilters={resetHistoryFilters}
            auditEventTypes={auditEventTypes}
            auditPagination={auditPagination}
            setAuditPagination={setAuditPagination}
            auditEvents={auditEvents}
            setAuditFilters={setAuditFilters}
            onApplyAuditFilters={applyAuditFilters}
            onResetAuditFilters={resetAuditFilters}
            notificationForm={notificationForm}
            setNotificationForm={setNotificationForm}
            activeUsers={activeUsers}
            loadingUsers={loadingUsers}
            onSend={sendNotification}
            users={users}
            newUserForm={newUserForm}
            setNewUserForm={setNewUserForm}
            editForm={editForm}
            setEditForm={setEditForm}
            onCreateUser={createUser}
            onUpdateUser={updateUser}
            onToggleStatus={toggleStatus}
          />
        </div>
      </div>
    </section>
  );
};
