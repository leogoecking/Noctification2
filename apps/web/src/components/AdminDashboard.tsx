import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { AdminAuditPanel } from "./admin/AdminAuditPanel";
import { AdminGlobalSearchPanel } from "./admin/AdminGlobalSearchPanel";
import { AdminHistoryPanel } from "./admin/AdminHistoryPanel";
import { AdminOverviewPanel } from "./admin/AdminOverviewPanel";
import { AdminSendPanel } from "./admin/AdminSendPanel";
import { AdminSidebar } from "./admin/AdminSidebar";
import { AdminUsersPanel } from "./admin/AdminUsersPanel";
import { AdminRemindersPanel } from "./admin/AdminRemindersPanel";
import { AdminOnlineUsersTrigger } from "./admin/adminOverviewSections";
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

const getAdminHeaderCopy = (
  menu: "dashboard" | "send" | "users" | "tasks" | "history_notifications" | "audit" | "reminders",
  isSearching: boolean,
  isAprPage: boolean,
  isKmlPostePage: boolean
): { title: string; subtitle: string; chip: string } => {
  if (isSearching) {
    return {
      title: "Busca global",
      subtitle: "Resultados unificados de tarefas, usuarios, notificacoes e auditoria.",
      chip: "Pesquisa"
    };
  }

  if (isAprPage) {
    return {
      title: "APR",
      subtitle: "Workspace isolado para conferencia mensal e operacao da base APR.",
      chip: "Modulo"
    };
  }

  if (isKmlPostePage) {
    return {
      title: "KML/KMZ",
      subtitle: "Padronizacao operacional de postes com upload e exportacao de artefatos.",
      chip: "Modulo"
    };
  }

  switch (menu) {
    case "tasks":
      return {
        title: "Tarefas",
        subtitle: "Fila administrativa de tarefas, acompanhamentos e comentarios.",
        chip: "Operacao"
      };
    case "reminders":
      return {
        title: "Lembretes",
        subtitle: "Monitoramento e operacao dos lembretes ativos e ocorrencias.",
        chip: "Operacao"
      };
    case "send":
      return {
        title: "Envio de notificacoes",
        subtitle: "Disparo controlado para usuarios ativos sem sair do console.",
        chip: "Acao"
      };
    case "users":
      return {
        title: "Usuarios",
        subtitle: "Gestao de contas, permissoes e status operacional.",
        chip: "Gestao"
      };
    case "history_notifications":
      return {
        title: "Historico",
        subtitle: "Consulta de notificacoes entregues, respondidas e encerradas.",
        chip: "Consulta"
      };
    case "audit":
      return {
        title: "Auditoria",
        subtitle: "Eventos administrativos recentes e trilha de acao do sistema.",
        chip: "Consulta"
      };
    case "dashboard":
    default:
      return {
        title: "Dashboard operacional",
        subtitle: "Visao rapida das pendencias, saude do sistema e atividade recente.",
        chip: "Resumo"
      };
  }
};

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
  const normalizedSearch = deferredSearchQuery.trim().toLowerCase();
  const globalSearchEnabled = menu !== "tasks" && !isAprPage && !isKmlPostePage;

  useEffect(() => {
    if (!globalSearchEnabled || normalizedSearch.length < 2) {
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
  }, [globalSearchEnabled, normalizedSearch]);

  const matchedUsers = useMemo<UserItem[]>(
    () =>
      !globalSearchEnabled || normalizedSearch.length < 2
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
    [globalSearchEnabled, normalizedSearch, users]
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
      !globalSearchEnabled || normalizedSearch.length < 2
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
    [globalSearchEnabled, normalizedSearch, searchableNotifications]
  );

  const matchedAudit = useMemo<AuditEventItem[]>(
    () =>
      !globalSearchEnabled || normalizedSearch.length < 2
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
    [auditEvents, globalSearchEnabled, normalizedSearch]
  );

  const isSearching = globalSearchEnabled && normalizedSearch.length >= 2;

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

  const headerCopy = getAdminHeaderCopy(menu, isSearching, isAprPage, isKmlPostePage);
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
          <header className="rounded-[1.25rem] bg-panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
                    {headerCopy.chip}
                  </span>
                  <span className="rounded-full bg-panelAlt px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted">
                    Admin
                  </span>
                </div>
                <h3 className="font-display text-2xl font-extrabold tracking-tight text-textMain">
                  {headerCopy.title}
                </h3>
                <p className="mt-1 max-w-3xl text-sm text-textMuted">{headerCopy.subtitle}</p>
              </div>

              <div className="flex min-w-[18rem] flex-1 items-center justify-end gap-3 lg:max-w-2xl">
                {globalSearchEnabled ? (
                  <label className="mx-auto flex w-full max-w-xl items-center gap-3 rounded-xl bg-panelAlt px-3 py-2 text-sm text-textMuted">
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
                ) : null}
                <AdminOnlineUsersTrigger
                  onlineUsers={onlineUsers}
                  onlineSummary={onlineSummary}
                  lastOnlineRefreshAt={lastOnlineRefreshAt}
                  loadingOnlineUsers={loadingOnlineUsers}
                  onRefreshOnlineUsers={loadOnlineUsers}
                />
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
              recentAuditEvents={recentAuditEvents}
              auditEventType={auditFilters.eventType}
              auditLimit={auditFilters.limit}
              lastAuditRefreshAt={lastAuditRefreshAt}
              loadingAudit={loadingAudit}
              onRefreshAudit={loadAudit}
              onOpenAudit={() => setMenu("audit")}
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
