import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { AdminAuditPanel } from "./admin/AdminAuditPanel";
import { AdminGlobalSearchPanel } from "./admin/AdminGlobalSearchPanel";
import { AdminHistoryPanel } from "./admin/AdminHistoryPanel";
import { AdminOverviewPanel } from "./admin/AdminOverviewPanel";
import { AdminSendPanel } from "./admin/AdminSendPanel";
import { AdminSidebar } from "./admin/AdminSidebar";
import { AdminUsersPanel } from "./admin/AdminUsersPanel";
import { AdminRemindersPanel } from "./admin/AdminRemindersPanel";
import { useAdminDashboardData } from "./admin/useAdminDashboardData";
import { AdminTasksPanel } from "../features/tasks";
import { AprPage } from "../features/apr/AprPage";
import { KmlPostePage } from "../features/kml-postes/KmlPostePage";
import { api } from "../lib/api";
import { isAprModuleEnabled, isKmlPosteModuleEnabled } from "../lib/featureFlags";
import type { AppPath } from "./app/appShell";
import type {
  AuditEventItem,
  NotificationHistoryItem,
  ReminderHealthItem,
  TaskAutomationHealthItem,
  TaskItem,
  UserItem
} from "../types";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [taskSearchResults, setTaskSearchResults] = useState<TaskItem[]>([]);
  const [loadingTaskSearch, setLoadingTaskSearch] = useState(false);
  const [reminderHealth, setReminderHealth] = useState<ReminderHealthItem | null>(null);
  const [taskHealth, setTaskHealth] = useState<TaskAutomationHealthItem | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);
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
    queueFilters,
    setQueueFilters,
    queuePagination,
    setQueuePagination,
    lastQueueRefreshAt,
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
    resetHistoryFilters,
    applyQueueFilters,
    resetQueueFilters
  } = useAdminDashboardData({ onError, onToast });

  const normalizedSearch = deferredSearchQuery.trim().toLowerCase();

  useEffect(() => {
    if (normalizedSearch.length < 2) {
      setTaskSearchResults([]);
      setLoadingTaskSearch(false);
      return;
    }

    const controller = new AbortController();
    const searchParams = new URLSearchParams();
    searchParams.set("search", normalizedSearch);
    searchParams.set("limit", "8");
    setLoadingTaskSearch(true);

    void api
      .adminTasks(`?${searchParams.toString()}`)
      .then((response) => {
        if (!controller.signal.aborted) {
          setTaskSearchResults(response.tasks);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setTaskSearchResults([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingTaskSearch(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [normalizedSearch]);

  const matchedUsers = useMemo<UserItem[]>(
    () =>
      normalizedSearch.length < 2
        ? []
        : users
            .filter(
              (user) =>
                user.name.toLowerCase().includes(normalizedSearch) ||
                user.login.toLowerCase().includes(normalizedSearch) ||
                user.department.toLowerCase().includes(normalizedSearch) ||
                user.jobTitle.toLowerCase().includes(normalizedSearch)
            )
            .slice(0, 6),
    [normalizedSearch, users]
  );

  const searchableNotifications = useMemo<NotificationHistoryItem[]>(() => {
    const notificationMap = new Map<number, NotificationHistoryItem>();
    for (const item of [...unreadNotifications, ...historyAll, ...completedNotifications]) {
      notificationMap.set(item.id, item);
    }
    return [...notificationMap.values()];
  }, [completedNotifications, historyAll, unreadNotifications]);

  const matchedNotifications = useMemo<NotificationHistoryItem[]>(
    () =>
      normalizedSearch.length < 2
        ? []
        : searchableNotifications
            .filter(
              (item) =>
                item.title.toLowerCase().includes(normalizedSearch) ||
                item.message.toLowerCase().includes(normalizedSearch) ||
                item.sender.name.toLowerCase().includes(normalizedSearch) ||
                item.sender.login.toLowerCase().includes(normalizedSearch) ||
                item.recipients.some(
                  (recipient) =>
                    recipient.name.toLowerCase().includes(normalizedSearch) ||
                    recipient.login.toLowerCase().includes(normalizedSearch)
                )
            )
            .slice(0, 6),
    [normalizedSearch, searchableNotifications]
  );

  const matchedAudit = useMemo<AuditEventItem[]>(
    () =>
      normalizedSearch.length < 2
        ? []
        : auditEvents
            .filter(
              (event) =>
                event.event_type.toLowerCase().includes(normalizedSearch) ||
                event.target_type.toLowerCase().includes(normalizedSearch) ||
                event.actor?.name?.toLowerCase().includes(normalizedSearch) ||
                event.actor?.login?.toLowerCase().includes(normalizedSearch) ||
                JSON.stringify(event.metadata ?? {}).toLowerCase().includes(normalizedSearch)
            )
            .slice(0, 6),
    [auditEvents, normalizedSearch]
  );

  const isSearching = normalizedSearch.length >= 2;

  const loadSystemHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const [nextReminderHealth, nextTaskHealth] = await Promise.all([
        api.adminReminderHealth(),
        api.adminTaskHealth()
      ]);
      setReminderHealth(nextReminderHealth.health);
      setTaskHealth(nextTaskHealth.health);
    } catch {
      setReminderHealth(null);
      setTaskHealth(null);
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  useEffect(() => {
    void loadSystemHealth();
  }, [loadSystemHealth]);

  const isAprPage = currentPath === "/apr";
  const isKmlPostePage = currentPath === "/kml-postes";
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
      <div className="grid gap-6 lg:grid-cols-[15rem,1fr]">
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
          {isAprPage ? (
            <AprPage onError={onError} onToast={onToast} />
          ) : isKmlPostePage ? (
            <KmlPostePage onError={onError} onToast={onToast} />
          ) : (
            <>
          <header className="rounded-[1.5rem] bg-panel p-4 shadow-glow">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-panelAlt px-3 py-2 text-sm text-textMuted">
                <span className="text-xs uppercase tracking-[0.18em]">Search</span>
                <input
                  aria-label="Busca global do admin"
                  className="min-w-0 flex-1 bg-transparent text-sm text-textMain outline-none placeholder:text-textMuted"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar tarefas, usuarios, notificacoes e auditoria"
                  type="search"
                  value={searchQuery}
                />
              </label>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-display text-xl font-extrabold tracking-tight text-textMain">
                    Noctification
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-textMuted">
                    Operations Admin
                  </p>
                </div>
                <span className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
                  Admin
                </span>
              </div>
            </div>
          </header>

          {isSearching ? (
            <AdminGlobalSearchPanel
              auditEvents={matchedAudit}
              loadingTasks={loadingTaskSearch}
              notifications={matchedNotifications}
              onOpenMenu={setMenu}
              query={searchQuery.trim()}
              tasks={taskSearchResults}
              users={matchedUsers}
            />
          ) : null}

          {!isSearching && menu === "dashboard" && (
            <AdminOverviewPanel
              onError={onError}
              onToast={onToast}
              reminderHealth={reminderHealth}
              taskHealth={taskHealth}
              loadingHealth={loadingHealth}
              onRefreshHealth={() => void loadSystemHealth()}
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
              selectableUserTargets={selectableUserTargets}
              queueFilters={queueFilters}
              setQueueFilters={setQueueFilters}
              queuePagination={queuePagination}
              setQueuePagination={setQueuePagination}
              lastQueueRefreshAt={lastQueueRefreshAt}
              unreadNotifications={unreadNotifications}
              loadingHistory={loadingHistory}
              onRefreshQueue={loadUnreadDashboard}
              onApplyQueueFilters={applyQueueFilters}
              onResetQueueFilters={resetQueueFilters}
              completedNotifications={completedNotifications}
              loadingHistoryAll={loadingHistoryAll}
              onRefreshCompleted={loadNotificationHistory}
            />
          )}

          {!isSearching && menu === "history_notifications" && (
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

          {!isSearching && menu === "audit" && (
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

          {!isSearching && menu === "send" && (
            <AdminSendPanel
              notificationForm={notificationForm}
              setNotificationForm={setNotificationForm}
              activeUsers={activeUsers}
              loadingUsers={loadingUsers}
              onSend={sendNotification}
            />
          )}

          {!isSearching && menu === "users" && (
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

          {!isSearching && menu === "tasks" && (
            <AdminTasksPanel onError={onError} onToast={onToast} />
          )}

          {!isSearching && menu === "reminders" && (
            <AdminRemindersPanel onError={onError} onToast={onToast} />
          )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};
