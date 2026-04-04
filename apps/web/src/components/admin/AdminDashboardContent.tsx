import { AdminAuditPanel } from "./AdminAuditPanel";
import { AdminGlobalSearchPanel } from "./AdminGlobalSearchPanel";
import { AdminHistoryPanel } from "./AdminHistoryPanel";
import { AdminOverviewPanel } from "./AdminOverviewPanel";
import { AdminRemindersPanel } from "./AdminRemindersPanel";
import { AdminSendPanel } from "./AdminSendPanel";
import { AdminUsersPanel } from "./AdminUsersPanel";
import type {
  AdminMenu,
  AuditFilters,
  EditUserFormState,
  HistoryFilters,
  NotificationFormState,
  StateSetter,
  UserFormState
} from "./types";
import type {
  AuditEventItem,
  NotificationHistoryItem,
  PaginationInfo,
  TaskAutomationHealthItem,
  TaskItem,
  UserItem
} from "../../types";
import { AdminTasksPanel } from "../../features/tasks";
import { AprPage } from "../../features/apr/AprPage";
import { KmlPostePage } from "../../features/kml-postes/KmlPostePage";

interface AdminDashboardContentProps {
  isAprPage: boolean;
  isKmlPostePage: boolean;
  isSearching: boolean;
  menu: AdminMenu;
  onError: (message: string) => void;
  onToast: (message: string) => void;
  matchedAudit: AuditEventItem[];
  loadingTaskSearch: boolean;
  matchedNotifications: NotificationHistoryItem[];
  setMenu: StateSetter<AdminMenu>;
  searchQuery: string;
  taskSearchResults: TaskItem[];
  matchedUsers: UserItem[];
  taskHealth: TaskAutomationHealthItem | null;
  loadingHealth: boolean;
  onRefreshHealth: () => void;
  metrics: {
    pendingNotifications: number;
    pendingRecipients: number;
    criticalOpen: number;
    inProgressNotifications: number;
    completedNotifications: number;
    onlineUsers: number;
  };
  recentAuditEvents: AuditEventItem[];
  auditFilters: AuditFilters;
  lastAuditRefreshAt: string | null;
  loadingAudit: boolean;
  onRefreshAudit: () => void;
  completedNotifications: NotificationHistoryItem[];
  loadingHistoryAll: boolean;
  onRefreshCompleted: () => void;
  historyFilters: HistoryFilters;
  setHistoryFilters: StateSetter<HistoryFilters>;
  selectableUserTargets: UserItem[];
  lastHistoryRefreshAt: string | null;
  historyPagination: PaginationInfo;
  setHistoryPagination: StateSetter<PaginationInfo>;
  historyAll: NotificationHistoryItem[];
  onApplyHistoryFilters: () => void;
  onResetHistoryFilters: () => void;
  auditEventTypes: string[];
  auditPagination: PaginationInfo;
  setAuditPagination: StateSetter<PaginationInfo>;
  auditEvents: AuditEventItem[];
  setAuditFilters: StateSetter<AuditFilters>;
  onApplyAuditFilters: () => void;
  onResetAuditFilters: () => void;
  notificationForm: NotificationFormState;
  setNotificationForm: StateSetter<NotificationFormState>;
  activeUsers: UserItem[];
  loadingUsers: boolean;
  onSend: () => Promise<void>;
  users: UserItem[];
  newUserForm: UserFormState;
  setNewUserForm: StateSetter<UserFormState>;
  editForm: EditUserFormState;
  setEditForm: StateSetter<EditUserFormState>;
  onCreateUser: () => Promise<void>;
  onUpdateUser: () => Promise<void>;
  onToggleStatus: (user: UserItem) => void | Promise<void>;
}

export const AdminDashboardContent = ({
  isAprPage,
  isKmlPostePage,
  isSearching,
  menu,
  onError,
  onToast,
  matchedAudit,
  loadingTaskSearch,
  matchedNotifications,
  setMenu,
  searchQuery,
  taskSearchResults,
  matchedUsers,
  taskHealth,
  loadingHealth,
  onRefreshHealth,
  metrics,
  recentAuditEvents,
  auditFilters,
  lastAuditRefreshAt,
  loadingAudit,
  onRefreshAudit,
  completedNotifications,
  loadingHistoryAll,
  onRefreshCompleted,
  historyFilters,
  setHistoryFilters,
  selectableUserTargets,
  lastHistoryRefreshAt,
  historyPagination,
  setHistoryPagination,
  historyAll,
  onApplyHistoryFilters,
  onResetHistoryFilters,
  auditEventTypes,
  auditPagination,
  setAuditPagination,
  auditEvents,
  setAuditFilters,
  onApplyAuditFilters,
  onResetAuditFilters,
  notificationForm,
  setNotificationForm,
  activeUsers,
  loadingUsers,
  onSend,
  users,
  newUserForm,
  setNewUserForm,
  editForm,
  setEditForm,
  onCreateUser,
  onUpdateUser,
  onToggleStatus
}: AdminDashboardContentProps) => {
  if (isAprPage) {
    return <AprPage onError={onError} onToast={onToast} />;
  }

  if (isKmlPostePage) {
    return <KmlPostePage onError={onError} onToast={onToast} />;
  }

  return (
    <>
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

      {!isSearching && menu === "dashboard" ? (
        <AdminOverviewPanel
          onError={onError}
          onToast={onToast}
          taskHealth={taskHealth}
          loadingHealth={loadingHealth}
          onRefreshHealth={onRefreshHealth}
          metrics={metrics}
          recentAuditEvents={recentAuditEvents}
          auditEventType={auditFilters.eventType}
          auditLimit={auditFilters.limit}
          lastAuditRefreshAt={lastAuditRefreshAt}
          loadingAudit={loadingAudit}
          onRefreshAudit={onRefreshAudit}
          onOpenAudit={() => setMenu("audit")}
          completedNotifications={completedNotifications}
          loadingHistoryAll={loadingHistoryAll}
          onRefreshCompleted={onRefreshCompleted}
        />
      ) : null}

      {!isSearching && menu === "history_notifications" ? (
        <AdminHistoryPanel
          historyFilters={historyFilters}
          setHistoryFilters={setHistoryFilters}
          selectableUserTargets={selectableUserTargets}
          lastHistoryRefreshAt={lastHistoryRefreshAt}
          historyPagination={historyPagination}
          setHistoryPagination={setHistoryPagination}
          loadingHistoryAll={loadingHistoryAll}
          historyAll={historyAll}
          onApplyFilters={onApplyHistoryFilters}
          onResetFilters={onResetHistoryFilters}
          onRefresh={onRefreshCompleted}
        />
      ) : null}

      {!isSearching && menu === "audit" ? (
        <AdminAuditPanel
          auditFilters={auditFilters}
          setAuditFilters={setAuditFilters}
          auditEventTypes={auditEventTypes}
          lastAuditRefreshAt={lastAuditRefreshAt}
          auditPagination={auditPagination}
          setAuditPagination={setAuditPagination}
          loadingAudit={loadingAudit}
          auditEvents={auditEvents}
          onApplyFilters={onApplyAuditFilters}
          onResetFilters={onResetAuditFilters}
          onRefresh={onRefreshAudit}
        />
      ) : null}

      {!isSearching && menu === "send" ? (
        <AdminSendPanel
          notificationForm={notificationForm}
          setNotificationForm={setNotificationForm}
          activeUsers={activeUsers}
          loadingUsers={loadingUsers}
          onSend={onSend}
        />
      ) : null}

      {!isSearching && menu === "users" ? (
        <AdminUsersPanel
          users={users}
          newUserForm={newUserForm}
          setNewUserForm={setNewUserForm}
          editForm={editForm}
          setEditForm={setEditForm}
          onCreateUser={onCreateUser}
          onUpdateUser={onUpdateUser}
          onToggleStatus={onToggleStatus}
        />
      ) : null}

      {!isSearching && menu === "tasks" ? (
        <AdminTasksPanel onError={onError} onToast={onToast} />
      ) : null}

      {!isSearching && menu === "reminders" ? (
        <AdminRemindersPanel onError={onError} onToast={onToast} />
      ) : null}
    </>
  );
};
