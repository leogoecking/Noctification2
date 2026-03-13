import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api";
import { connectSocket } from "../lib/socket";
import type {
  AuditEventItem,
  NotificationHistoryItem,
  NotificationPriority,
  OnlineUserItem,
  PaginationInfo,
  UserItem
} from "../types";

interface AdminDashboardProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

type NotificationRecipient = NotificationHistoryItem["recipients"][number];

type RecipientMode = "all" | "users";
type AdminMenu = "dashboard" | "send" | "users" | "history_notifications" | "audit";
type AuditFilters = {
  eventType: string;
  from: string;
  to: string;
  limit: number;
};
type HistoryStatusFilter = "" | "read" | "unread";
type HistoryPriorityFilter = "" | NotificationPriority;
type HistoryFilters = {
  status: HistoryStatusFilter;
  priority: HistoryPriorityFilter;
  userId: string;
  from: string;
  to: string;
  limit: number;
};

const AUDIT_LIMIT_OPTIONS = [10, 20, 50, 100];
const HISTORY_LIMIT_OPTIONS = [20, 50, 100, 200];

const formatDate = (value: string | null): string => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("pt-BR");
};

const formatAuditValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "[valor nao serializavel]";
  }
};

const summarizeAuditMetadata = (metadata: Record<string, unknown> | null): string => {
  if (!metadata) {
    return "Sem metadados";
  }

  const entries = Object.entries(metadata).slice(0, 3);
  if (entries.length === 0) {
    return "Sem metadados";
  }

  return entries.map(([key, value]) => `${key}: ${formatAuditValue(value)}`).join(" | ");
};

const responseStatusLabel = (status: "em_andamento" | "resolvido" | null): string => {
  if (status === "em_andamento") {
    return "Em andamento";
  }

  if (status === "resolvido") {
    return "Resolvido";
  }

  return "Sem resposta";
};

const menuBaseClass =
  "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition";

const menuButtonClass = (active: boolean): string => {
  return `${menuBaseClass} ${
    active ? "bg-accent text-slate-900" : "text-textMuted hover:bg-panelAlt"
  }`;
};

const toErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof ApiError ? error.message : fallback;
};

const hasRecipientResponse = (recipient: NotificationRecipient): boolean => {
  return recipient.responseStatus !== null || Boolean(recipient.responseMessage?.trim());
};

const isRecipientInProgress = (recipient: NotificationRecipient): boolean =>
  recipient.responseStatus === "em_andamento";

const isNotificationOperationallyActive = (item: NotificationHistoryItem): boolean =>
  item.stats.operationalPending > 0;

const isNotificationOperationallyCompleted = (item: NotificationHistoryItem): boolean =>
  item.stats.total > 0 && item.stats.operationalPending === 0;

const IconDashboard = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="4" rx="1" />
    <rect x="14" y="10" width="7" height="11" rx="1" />
    <rect x="3" y="13" width="7" height="8" rx="1" />
  </svg>
);

const IconBell = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);

const IconUsers = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <path d="M20 8v6" />
    <path d="M23 11h-6" />
  </svg>
);

const IconArchive = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
    <path d="M10 12h4" />
  </svg>
);

const IconPulse = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </svg>
);


export const AdminDashboard = ({ onError, onToast }: AdminDashboardProps) => {
  const [menu, setMenu] = useState<AdminMenu>("dashboard");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [historyAll, setHistoryAll] = useState<NotificationHistoryItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingOnlineUsers, setLoadingOnlineUsers] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingHistoryAll, setLoadingHistoryAll] = useState(false);
  const [auditPagination, setAuditPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });
  const [auditFilters, setAuditFilters] = useState<AuditFilters>({
    eventType: "",
    from: "",
    to: "",
    limit: 20
  });
  const [lastOnlineRefreshAt, setLastOnlineRefreshAt] = useState<string | null>(null);
  const [lastAuditRefreshAt, setLastAuditRefreshAt] = useState<string | null>(null);
  const [historyFilters, setHistoryFilters] = useState<HistoryFilters>({
    status: "",
    priority: "",
    userId: "",
    from: "",
    to: "",
    limit: 100
  });
  const [historyPagination, setHistoryPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 1
  });
  const [lastHistoryRefreshAt, setLastHistoryRefreshAt] = useState<string | null>(null);

  const [notificationForm, setNotificationForm] = useState({
    title: "",
    message: "",
    priority: "normal" as NotificationPriority,
    recipient_mode: "all" as RecipientMode,
    recipient_ids: [] as number[]
  });

  const [newUserForm, setNewUserForm] = useState({
    name: "",
    login: "",
    password: "",
    department: "",
    job_title: "",
    role: "user"
  });

  const [editForm, setEditForm] = useState({
    id: 0,
    name: "",
    login: "",
    department: "",
    job_title: "",
    role: "user",
    password: ""
  });

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await api.adminUsers();
      setUsers(response.users as UserItem[]);
    } catch (error) {
      onError(toErrorMessage(error, "Falha ao carregar usuarios"));
    } finally {
      setLoadingUsers(false);
    }
  }, [onError]);

  const loadOnlineUsers = useCallback(async () => {
    setLoadingOnlineUsers(true);
    try {
      const response = await api.adminOnlineUsers();
      setOnlineUsers(response.users as OnlineUserItem[]);
      setLastOnlineRefreshAt(new Date().toISOString());
    } catch (error) {
      onError(toErrorMessage(error, "Falha ao carregar usuarios online"));
    } finally {
      setLoadingOnlineUsers(false);
    }
  }, [onError]);

  const loadAudit = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(auditFilters.limit));
      params.set("page", String(auditPagination.page));
      if (auditFilters.eventType.trim()) {
        params.set("event_type", auditFilters.eventType.trim());
      }
      if (auditFilters.from) {
        params.set("from", new Date(`${auditFilters.from}T00:00:00`).toISOString());
      }
      if (auditFilters.to) {
        params.set("to", new Date(`${auditFilters.to}T23:59:59`).toISOString());
      }

      const response = await api.adminAudit(`?${params.toString()}`);
      setAuditEvents(response.events as AuditEventItem[]);
      setAuditPagination(response.pagination as PaginationInfo);
      setLastAuditRefreshAt(new Date().toISOString());
    } catch (error) {
      onError(toErrorMessage(error, "Falha ao carregar auditoria"));
    } finally {
      setLoadingAudit(false);
    }
  }, [
    auditFilters.eventType,
    auditFilters.from,
    auditFilters.limit,
    auditFilters.to,
    auditPagination.page,
    onError
  ]);

  const loadUnreadDashboard = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const response = await api.adminNotifications("?limit=200");
      setHistory(response.notifications as NotificationHistoryItem[]);
    } catch (error) {
      onError(toErrorMessage(error, "Falha ao carregar dashboard"));
    } finally {
      setLoadingHistory(false);
    }
  }, [onError]);

  const loadNotificationHistory = useCallback(async () => {
    setLoadingHistoryAll(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(historyFilters.limit));
      params.set("page", String(historyPagination.page));
      if (historyFilters.status) {
        params.set("status", historyFilters.status);
      }
      if (historyFilters.priority) {
        params.set("priority", historyFilters.priority);
      }
      if (historyFilters.userId) {
        params.set("user_id", historyFilters.userId);
      }
      if (historyFilters.from) {
        params.set("from", new Date(`${historyFilters.from}T00:00:00`).toISOString());
      }
      if (historyFilters.to) {
        params.set("to", new Date(`${historyFilters.to}T23:59:59`).toISOString());
      }

      const query = params.toString();
      const response = await api.adminNotifications(query ? `?${query}` : "");
      setHistoryAll(response.notifications as NotificationHistoryItem[]);
      setHistoryPagination(response.pagination as PaginationInfo);
      setLastHistoryRefreshAt(new Date().toISOString());
    } catch (error) {
      onError(toErrorMessage(error, "Falha ao carregar historico"));
    } finally {
      setLoadingHistoryAll(false);
    }
  }, [
    historyFilters.from,
    historyFilters.limit,
    historyFilters.priority,
    historyFilters.status,
    historyFilters.to,
    historyFilters.userId,
    historyPagination.page,
    onError
  ]);

  useEffect(() => {
    loadUsers();
    loadOnlineUsers();
    loadAudit();
    loadUnreadDashboard();
    loadNotificationHistory();
  }, [loadAudit, loadNotificationHistory, loadOnlineUsers, loadUnreadDashboard, loadUsers]);

  useEffect(() => {
    const socket = connectSocket();

    const onReadUpdate = () => {
      loadUnreadDashboard();
      loadNotificationHistory();
      loadAudit();
    };

    const onOnlineUsersUpdate = () => {
      loadOnlineUsers();
    };

    const onConnectError = () => {
      onError("Falha na conexao em tempo real (admin)");
    };

    socket.on("notification:read_update", onReadUpdate);
    socket.on("online_users:update", onOnlineUsersUpdate);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("notification:read_update", onReadUpdate);
      socket.off("online_users:update", onOnlineUsersUpdate);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, [loadAudit, loadNotificationHistory, loadOnlineUsers, loadUnreadDashboard, onError]);

  const unreadNotifications = useMemo(
    () => history.filter((item) => isNotificationOperationallyActive(item)),
    [history]
  );
  const completedNotifications = useMemo(
    () =>
      historyAll.filter(
        (item) =>
          item.stats.total > 0 &&
          item.stats.unread === 0 &&
          isNotificationOperationallyCompleted(item)
      ),
    [historyAll]
  );

  const metrics = useMemo(() => {
    const pendingRecipients = unreadNotifications.reduce(
      (acc, item) => acc + item.stats.operationalPending,
      0
    );
    const criticalOpen = unreadNotifications.filter(
      (item) => item.priority === "critical" && isNotificationOperationallyActive(item)
    ).length;
    const inProgressNotifications = unreadNotifications.filter((item) => item.stats.inProgress > 0).length;

    return {
      pendingNotifications: unreadNotifications.length,
      pendingRecipients,
      criticalOpen,
      inProgressNotifications,
      completedNotifications: completedNotifications.length,
      onlineUsers: onlineUsers.length
    };
  }, [completedNotifications.length, onlineUsers.length, unreadNotifications]);

  const activeUsers = useMemo(() => users.filter((item) => item.isActive), [users]);
  const selectableUserTargets = useMemo(() => users.filter((item) => item.role === "user"), [users]);
  const recentAuditEvents = useMemo(() => auditEvents.slice(0, 8), [auditEvents]);
  const onlineSummary = useMemo(() => {
    const admins = onlineUsers.filter((item) => item.role === "admin").length;
    const operators = onlineUsers.filter((item) => item.role === "user").length;

    return {
      admins,
      operators
    };
  }, [onlineUsers]);
  const auditEventTypes = useMemo(() => {
    return Array.from(new Set(auditEvents.map((event) => event.event_type))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [auditEvents]);


  const sendNotification = async () => {
    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      onError("Titulo e mensagem sao obrigatorios");
      return;
    }

    if (notificationForm.recipient_mode === "users" && notificationForm.recipient_ids.length === 0) {
      onError("Selecione ao menos um destinatario");
      return;
    }

    try {
      await api.sendNotification(notificationForm);
      setNotificationForm({
        title: "",
        message: "",
        priority: "normal",
        recipient_mode: "all",
        recipient_ids: []
      });
      onToast("Notificacao enviada");
      await loadUnreadDashboard();
      await loadNotificationHistory();
      setMenu("dashboard");
    } catch (error) {
      onError(toErrorMessage(error, "Falha ao enviar notificacao"));
    }
  };

  const createUser = async () => {
    if (!newUserForm.name.trim() || !newUserForm.login.trim() || !newUserForm.password.trim()) {
      onError("Nome, login e senha sao obrigatorios");
      return;
    }

    try {
      await api.createUser(newUserForm);
      onToast("Usuario criado com sucesso");
      setNewUserForm({
        name: "",
        login: "",
        password: "",
        department: "",
        job_title: "",
        role: "user"
      });
      await loadUsers();
    } catch (error) {
      onError(toErrorMessage(error, "Falha ao criar usuario"));
    }
  };

  const updateUser = async () => {
    if (!editForm.id) {
      onError("Selecione um usuario para editar");
      return;
    }

    try {
      await api.updateUser(editForm.id, {
        name: editForm.name,
        login: editForm.login,
        department: editForm.department,
        job_title: editForm.job_title,
        role: editForm.role,
        password: editForm.password || undefined
      });

      onToast("Usuario atualizado");
      setEditForm((prev) => ({ ...prev, password: "" }));
      await loadUsers();
    } catch (error) {
      onError(toErrorMessage(error, "Falha ao atualizar usuario"));
    }
  };

  const toggleStatus = async (user: UserItem) => {
    try {
      await api.toggleUserStatus(user.id, !user.isActive);
      onToast(`Usuario ${user.isActive ? "desativado" : "ativado"}`);
      await loadUsers();
    } catch (error) {
      onError(toErrorMessage(error, "Falha ao alterar status"));
    }
  };

  const applyAuditFilters = () => {
    setAuditPagination((prev) => ({ ...prev, page: 1, limit: auditFilters.limit }));
    if (auditPagination.page === 1) {
      void loadAudit();
    }
  };

  const resetAuditFilters = () => {
    setAuditFilters({
      eventType: "",
      from: "",
      to: "",
      limit: 20
    });
    setAuditPagination((prev) => ({ ...prev, page: 1, limit: 20 }));
  };

  const applyHistoryFilters = () => {
    setHistoryPagination((prev) => ({ ...prev, page: 1, limit: historyFilters.limit }));
    if (historyPagination.page === 1) {
      void loadNotificationHistory();
    }
  };

  const resetHistoryFilters = () => {
    setHistoryFilters({
      status: "",
      priority: "",
      userId: "",
      from: "",
      to: "",
      limit: 100
    });
    setHistoryPagination((prev) => ({ ...prev, page: 1, limit: 100 }));
  };

  return (
    <section className="animate-fade-in">
      <div className="grid gap-4 lg:grid-cols-[250px,1fr]">
        <aside className="rounded-2xl border border-slate-700 bg-panel p-3 shadow-glow lg:sticky lg:top-4 lg:h-fit">
          <h2 className="mb-1 font-display text-lg text-textMain">Admin</h2>
          <p className="mb-3 text-xs text-textMuted">Menu executivo</p>

          <nav className="space-y-1">
            <button
              className={menuButtonClass(menu === "dashboard")}
              onClick={() => setMenu("dashboard")}
            >
              <IconDashboard />
              Dashboard
            </button>

            <button
              className={menuButtonClass(menu === "send")}
              onClick={() => setMenu("send")}
            >
              <IconBell />
              Enviar notificacao
            </button>

            <button
              className={menuButtonClass(menu === "users")}
              onClick={() => setMenu("users")}
            >
              <IconUsers />
              Usuarios
            </button>

            <button
              className={menuButtonClass(menu === "history_notifications")}
              onClick={() => setMenu("history_notifications")}
            >
              <IconArchive />
              Historico notificacoes
            </button>

            <button
              className={menuButtonClass(menu === "audit")}
              onClick={() => setMenu("audit")}
            >
              <IconPulse />
              Auditoria
            </button>
          </nav>
        </aside>

        <div className="space-y-4">
          {menu === "dashboard" && (
            <>
              <header className="rounded-2xl border border-slate-700 bg-panel p-4">
                <h3 className="font-display text-xl text-textMain">Dashboard de nao lidas</h3>
                <p className="text-sm text-textMuted">Visao rapida das pendencias de leitura</p>
              </header>

              <div className="grid gap-3 md:grid-cols-5">
                <article className="rounded-2xl border border-slate-700 bg-panel p-4">
                  <p className="text-xs uppercase tracking-wide text-textMuted">Nao visualizadas</p>
                  <p className="mt-1 font-display text-2xl text-textMain">{metrics.pendingNotifications}</p>
                </article>

                <article className="rounded-2xl border border-slate-700 bg-panel p-4">
                  <p className="text-xs uppercase tracking-wide text-textMuted">Pendencias operacionais</p>
                  <p className="mt-1 font-display text-2xl text-warning">{metrics.pendingRecipients}</p>
                </article>

                <article className="rounded-2xl border border-slate-700 bg-panel p-4">
                  <p className="text-xs uppercase tracking-wide text-textMuted">Criticas abertas</p>
                  <p className="mt-1 font-display text-2xl text-danger">{metrics.criticalOpen}</p>
                </article>

                <article className="rounded-2xl border border-slate-700 bg-panel p-4">
                  <p className="text-xs uppercase tracking-wide text-textMuted">Em andamento</p>
                  <p className="mt-1 font-display text-2xl text-accent">{metrics.inProgressNotifications}</p>
                </article>

                <article className="rounded-2xl border border-slate-700 bg-panel p-4">
                  <p className="text-xs uppercase tracking-wide text-textMuted">Online agora</p>
                  <p className="mt-1 font-display text-2xl text-accent">{metrics.onlineUsers}</p>
                </article>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
                <article className="rounded-2xl border border-slate-700 bg-panel p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-display text-lg text-textMain">Usuarios online agora</h4>
                      <p className="text-sm text-textMuted">Presenca em tempo real da operacao</p>
                    </div>
                    <button
                      className="rounded-md border border-slate-600 px-3 py-1 text-xs text-textMuted"
                      onClick={loadOnlineUsers}
                    >
                      Atualizar
                    </button>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-md bg-success/20 px-2 py-1 text-success">
                      Total online: {onlineUsers.length}
                    </span>
                    <span className="rounded-md bg-accent/20 px-2 py-1 text-accent">
                      Usuarios: {onlineSummary.operators}
                    </span>
                    <span className="rounded-md bg-panelAlt px-2 py-1 text-textMuted">
                      Admins: {onlineSummary.admins}
                    </span>
                    <span className="rounded-md bg-panelAlt px-2 py-1 text-textMuted">
                      Atualizado: {formatDate(lastOnlineRefreshAt)}
                    </span>
                  </div>

                  {loadingOnlineUsers && <p className="text-sm text-textMuted">Carregando...</p>}
                  {!loadingOnlineUsers && onlineUsers.length === 0 && (
                    <p className="text-sm text-textMuted">Nenhum usuario online no momento.</p>
                  )}

                  <div className="space-y-2">
                    {onlineUsers.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-slate-700 bg-panelAlt p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-textMain">{item.name}</p>
                          <p className="text-xs text-textMuted">
                            {item.login} | {item.department || "Sem setor"} | {item.jobTitle || "Sem funcao"}
                          </p>
                        </div>
                        <span className="rounded-md bg-success/20 px-2 py-1 text-xs text-success">
                          {item.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-2xl border border-slate-700 bg-panel p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-display text-lg text-textMain">Auditoria recente</h4>
                      <p className="text-sm text-textMuted">Eventos mais novos do sistema</p>
                    </div>
                    <button
                      className="rounded-md border border-slate-600 px-3 py-1 text-xs text-textMuted"
                      onClick={loadAudit}
                    >
                      Atualizar
                    </button>
                  </div>

                  <p className="mb-3 text-xs text-textMuted">
                    Filtro atual: {auditFilters.eventType || "todos"} | limite {auditFilters.limit} | atualizado{" "}
                    {formatDate(lastAuditRefreshAt)}
                  </p>

                  {loadingAudit && <p className="text-sm text-textMuted">Carregando...</p>}
                  {!loadingAudit && recentAuditEvents.length === 0 && (
                    <p className="text-sm text-textMuted">Nenhum evento de auditoria.</p>
                  )}

                  <div className="space-y-2">
                    {recentAuditEvents.map((event) => (
                      <div key={event.id} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-textMain">{event.event_type}</p>
                          <span className="text-[11px] text-textMuted">{formatDate(event.created_at)}</span>
                        </div>
                        <p className="mt-1 text-xs text-textMuted">
                          Ator: {event.actor ? `${event.actor.name} (${event.actor.login})` : "sistema"}
                        </p>
                        <p className="mt-1 text-xs text-textMuted">
                          Alvo: {event.target_type} {event.target_id ?? "-"}
                        </p>
                        <p className="mt-1 text-xs text-textMuted">
                          {summarizeAuditMetadata(event.metadata)}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              </div>

              <article className="rounded-2xl border border-slate-700 bg-panel p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-display text-lg text-textMain">Fila operacional</h4>
                    <p className="text-xs text-textMuted">Inclui nao visualizadas e itens em andamento</p>
                  </div>
                  <button
                    className="rounded-md border border-slate-600 px-3 py-1 text-xs text-textMuted"
                    onClick={loadUnreadDashboard}
                  >
                    Atualizar
                  </button>
                </div>

                {loadingHistory && <p className="text-sm text-textMuted">Carregando...</p>}
                {!loadingHistory && unreadNotifications.length === 0 && (
                  <p className="text-sm text-textMuted">Nenhuma pendencia no momento.</p>
                )}

                <div className="space-y-3">
                  {unreadNotifications.map((item) => {
                    const activeRecipients = item.recipients.filter(
                      (recipient) => recipient.visualizedAt === null || isRecipientInProgress(recipient)
                    );
                    const pendingCount = item.recipients.filter(
                      (recipient) => recipient.visualizedAt === null
                    ).length;
                    const inProgressCount = item.stats.inProgress;

                    return (
                      <div key={item.id} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-textMain">{item.title}</p>
                            <p className="text-xs text-textMuted">{formatDate(item.created_at)}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-warning/20 px-2 py-1 text-xs text-warning">
                              Nao visualizadas: {pendingCount}
                            </span>
                            {inProgressCount > 0 && (
                              <span className="rounded-md bg-accent/20 px-2 py-1 text-xs text-accent">
                                Em andamento: {inProgressCount}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-textMuted">{item.message}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-md bg-warning/20 px-2 py-1 text-warning">
                            Nao visualizadas: {pendingCount}
                          </span>
                          <span className="rounded-md bg-accent/20 px-2 py-1 text-accent">
                            Em andamento: {inProgressCount}
                          </span>
                        </div>

                        <div className="mt-2 space-y-2">
                          {activeRecipients.length === 0 && (
                            <p className="text-xs text-textMuted">Sem usuarios pendentes ou em andamento.</p>
                          )}

                          {activeRecipients.map((recipient) => (
                            <div key={recipient.userId} className="rounded-lg border border-slate-700 px-2 py-2">
                              <p className="text-xs text-textMain">
                                <span className="font-semibold">{recipient.name}</span> ({recipient.login}) -{" "}
                                {responseStatusLabel(recipient.responseStatus)}
                              </p>
                              <p className="text-[11px] text-textMuted">
                                Visualizada em: {formatDate(recipient.visualizedAt)}
                              </p>
                              <p className="text-[11px] text-textMuted">
                                Mensagem do usuario: {recipient.responseMessage?.trim() || "-"}
                              </p>
                              {recipient.responseStatus === "em_andamento" && Boolean(recipient.responseMessage?.trim()) && (
                                <p className="text-[11px] font-semibold text-accent">
                                  Retorno em andamento: {recipient.responseMessage?.trim()}
                                </p>
                              )}
                              <p className="text-[11px] text-textMuted">
                                Atualizado em: {formatDate(recipient.responseAt)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-700 bg-panel p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-display text-lg text-textMain">Concluidas recentes</h4>
                  <button
                    className="rounded-md border border-slate-600 px-3 py-1 text-xs text-textMuted"
                    onClick={loadNotificationHistory}
                  >
                    Atualizar
                  </button>
                </div>

                {loadingHistoryAll && <p className="text-sm text-textMuted">Carregando...</p>}
                {!loadingHistoryAll && completedNotifications.length === 0 && (
                  <p className="text-sm text-textMuted">Nenhuma notificacao operacionalmente concluida.</p>
                )}

                <div className="space-y-3">
                  {completedNotifications.slice(0, 5).map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-textMain">{item.title}</p>
                          <p className="text-xs text-textMuted">Concluida em {formatDate(item.created_at)}</p>
                        </div>
                        <span className="rounded-md bg-success/20 px-2 py-1 text-xs text-success">
                          Lidas: {item.stats.read}/{item.stats.total}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-textMuted">{item.message}</p>
                    </div>
                  ))}
                </div>
              </article>
            </>
          )}


          {menu === "history_notifications" && (
            <article className="space-y-3 rounded-2xl border border-slate-700 bg-panel p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg text-textMain">Historico de notificacoes</h3>
                  <p className="text-sm text-textMuted">Ultimas notificacoes enviadas e status por destinatario</p>
                </div>
                <button
                  className="rounded-md border border-slate-600 px-3 py-1 text-xs text-textMuted"
                  onClick={loadNotificationHistory}
                >
                  Atualizar
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <label className="space-y-1">
                  <span className="text-xs text-textMuted">Status</span>
                  <select
                    className="input"
                    value={historyFilters.status}
                    onChange={(event) =>
                      setHistoryFilters((prev) => ({
                        ...prev,
                        status: event.target.value as HistoryStatusFilter
                      }))
                    }
                  >
                    <option value="">Todos</option>
                    <option value="unread">Pendentes</option>
                    <option value="read">Lidas</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-xs text-textMuted">Prioridade</span>
                  <select
                    className="input"
                    value={historyFilters.priority}
                    onChange={(event) =>
                      setHistoryFilters((prev) => ({
                        ...prev,
                        priority: event.target.value as HistoryPriorityFilter
                      }))
                    }
                  >
                    <option value="">Todas</option>
                    <option value="low">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                    <option value="critical">Critica</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-xs text-textMuted">Usuario</span>
                  <select
                    className="input"
                    value={historyFilters.userId}
                    onChange={(event) =>
                      setHistoryFilters((prev) => ({ ...prev, userId: event.target.value }))
                    }
                  >
                    <option value="">Todos</option>
                    {selectableUserTargets.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.login})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-xs text-textMuted">De</span>
                  <input
                    className="input"
                    type="date"
                    value={historyFilters.from}
                    onChange={(event) =>
                      setHistoryFilters((prev) => ({ ...prev, from: event.target.value }))
                    }
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs text-textMuted">Ate</span>
                  <input
                    className="input"
                    type="date"
                    value={historyFilters.to}
                    onChange={(event) =>
                      setHistoryFilters((prev) => ({ ...prev, to: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <label className="space-y-1">
                  <span className="text-xs text-textMuted">Limite</span>
                  <select
                    className="input"
                    value={historyFilters.limit}
                    onChange={(event) =>
                      setHistoryFilters((prev) => ({ ...prev, limit: Number(event.target.value) }))
                    }
                  >
                    {HISTORY_LIMIT_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>

                <button className="btn-primary" onClick={applyHistoryFilters}>
                  Aplicar filtros
                </button>

                <button
                  className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain"
                  onClick={resetHistoryFilters}
                >
                  Limpar filtros
                </button>

                <span className="rounded-md bg-panelAlt px-3 py-2 text-xs text-textMuted">
                  Ultima atualizacao: {formatDate(lastHistoryRefreshAt)}
                </span>

                <span className="rounded-md bg-panelAlt px-3 py-2 text-xs text-textMuted">
                  Pagina {historyPagination.page} de {historyPagination.totalPages} | Total {historyPagination.total}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain disabled:opacity-50"
                  onClick={() =>
                    setHistoryPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                  disabled={historyPagination.page <= 1}
                >
                  Pagina anterior
                </button>
                <button
                  className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain disabled:opacity-50"
                  onClick={() =>
                    setHistoryPagination((prev) => ({
                      ...prev,
                      page: Math.min(prev.totalPages, prev.page + 1)
                    }))
                  }
                  disabled={historyPagination.page >= historyPagination.totalPages}
                >
                  Proxima pagina
                </button>
              </div>

              {loadingHistoryAll && <p className="text-sm text-textMuted">Carregando...</p>}
              {!loadingHistoryAll && historyAll.length === 0 && (
                <p className="text-sm text-textMuted">Nenhuma notificacao no historico.</p>
              )}

              <div className="space-y-3">
                {historyAll.map((item) => {
                  const notificationResponses = item.recipients.filter(hasRecipientResponse);

                  return (
                    <div key={item.id} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-textMain">{item.title}</p>
                          <p className="text-xs text-textMuted">Enviada em {formatDate(item.created_at)}</p>
                        </div>
                        <span className="rounded-md bg-accent/20 px-2 py-1 text-xs text-accent">
                          {item.recipient_mode === "all" ? "Todos" : "Usuarios especificos"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-textMuted">{item.message}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-md bg-panel px-2 py-1 text-textMuted">Total: {item.stats.total}</span>
                        <span className="rounded-md bg-success/20 px-2 py-1 text-success">
                          Visualizadas: {item.stats.read}
                        </span>
                        <span className="rounded-md bg-warning/20 px-2 py-1 text-warning">
                          Nao visualizadas: {item.stats.unread}
                        </span>
                        <span className="rounded-md bg-accent/20 px-2 py-1 text-accent">
                          Em andamento: {item.stats.inProgress}
                        </span>
                        <span className="rounded-md bg-panel px-2 py-1 text-textMuted">Com resposta: {item.stats.responded}</span>
                      </div>

                      <div className="mt-3 space-y-2">
                        {notificationResponses.length === 0 && (
                          <p className="text-xs text-textMuted">Sem respostas para esta notificacao.</p>
                        )}

                        {notificationResponses.map((recipient) => (
                          <div key={recipient.userId} className="rounded-lg border border-slate-700 px-2 py-2">
                            <p className="text-xs text-textMain">
                              <span className="font-semibold">{recipient.name}</span> ({recipient.login}) -{" "}
                              {responseStatusLabel(recipient.responseStatus)}
                            </p>
                            <p className="text-[11px] text-textMuted">
                              Visualizada em: {formatDate(recipient.visualizedAt)}
                            </p>
                            <p className="text-[11px] text-textMuted">
                              Mensagem: {recipient.responseMessage?.trim() || "(sem mensagem)"}
                            </p>
                            {recipient.responseStatus === "em_andamento" && Boolean(recipient.responseMessage?.trim()) && (
                              <p className="text-[11px] font-semibold text-accent">
                                Retorno em andamento: {recipient.responseMessage?.trim()}
                              </p>
                            )}
                            <p className="text-[11px] text-textMuted">
                              Atualizado em: {formatDate(recipient.responseAt ?? recipient.visualizedAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          )}

          {menu === "audit" && (
            <article className="space-y-3 rounded-2xl border border-slate-700 bg-panel p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg text-textMain">Auditoria</h3>
                  <p className="text-sm text-textMuted">Rastreamento de acessos, leitura e operacao administrativa</p>
                </div>
                <button
                  className="rounded-md border border-slate-600 px-3 py-1 text-xs text-textMuted"
                  onClick={loadAudit}
                >
                  Atualizar
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-1">
                  <span className="text-xs text-textMuted">Tipo de evento</span>
                  <input
                    className="input"
                    list="audit-event-types"
                    placeholder="Ex: auth.login"
                    value={auditFilters.eventType}
                    onChange={(event) =>
                      setAuditFilters((prev) => ({ ...prev, eventType: event.target.value }))
                    }
                  />
                  <datalist id="audit-event-types">
                    {auditEventTypes.map((eventType) => (
                      <option key={eventType} value={eventType} />
                    ))}
                  </datalist>
                </label>

                <label className="space-y-1">
                  <span className="text-xs text-textMuted">De</span>
                  <input
                    className="input"
                    type="date"
                    value={auditFilters.from}
                    onChange={(event) =>
                      setAuditFilters((prev) => ({ ...prev, from: event.target.value }))
                    }
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs text-textMuted">Ate</span>
                  <input
                    className="input"
                    type="date"
                    value={auditFilters.to}
                    onChange={(event) =>
                      setAuditFilters((prev) => ({ ...prev, to: event.target.value }))
                    }
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs text-textMuted">Limite</span>
                  <select
                    className="input"
                    value={auditFilters.limit}
                    onChange={(event) =>
                      setAuditFilters((prev) => ({ ...prev, limit: Number(event.target.value) }))
                    }
                  >
                    {AUDIT_LIMIT_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" onClick={applyAuditFilters}>
                  Aplicar filtros
                </button>
                <button
                  className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain"
                  onClick={resetAuditFilters}
                >
                  Limpar filtros
                </button>
                <span className="rounded-md bg-panelAlt px-3 py-2 text-xs text-textMuted">
                  Ultima atualizacao: {formatDate(lastAuditRefreshAt)}
                </span>
                <span className="rounded-md bg-panelAlt px-3 py-2 text-xs text-textMuted">
                  Pagina {auditPagination.page} de {auditPagination.totalPages} | Total {auditPagination.total}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain disabled:opacity-50"
                  onClick={() =>
                    setAuditPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                  disabled={auditPagination.page <= 1}
                >
                  Pagina anterior
                </button>
                <button
                  className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain disabled:opacity-50"
                  onClick={() =>
                    setAuditPagination((prev) => ({
                      ...prev,
                      page: Math.min(prev.totalPages, prev.page + 1)
                    }))
                  }
                  disabled={auditPagination.page >= auditPagination.totalPages}
                >
                  Proxima pagina
                </button>
              </div>

              {loadingAudit && <p className="text-sm text-textMuted">Carregando...</p>}
              {!loadingAudit && auditEvents.length === 0 && (
                <p className="text-sm text-textMuted">Nenhum evento de auditoria.</p>
              )}

              <div className="space-y-3">
                {auditEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-textMain">{event.event_type}</p>
                        <p className="text-xs text-textMuted">{formatDate(event.created_at)}</p>
                      </div>
                      <span className="rounded-md bg-panel px-2 py-1 text-xs text-textMuted">
                        {event.target_type} #{event.target_id ?? "-"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-textMuted">
                      Ator: {event.actor ? `${event.actor.name} (${event.actor.login})` : "sistema"}
                    </p>
                    <p className="mt-1 text-xs text-textMuted">
                      Metadados: {summarizeAuditMetadata(event.metadata)}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          )}
          {menu === "send" && (
            <article className="space-y-3 rounded-2xl border border-slate-700 bg-panel p-4">
              <h3 className="font-display text-lg text-textMain">Enviar notificacao</h3>

              <input
                className="input"
                placeholder="Titulo"
                value={notificationForm.title}
                onChange={(event) =>
                  setNotificationForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />

              <textarea
                className="input min-h-28"
                placeholder="Mensagem"
                value={notificationForm.message}
                onChange={(event) =>
                  setNotificationForm((prev) => ({ ...prev, message: event.target.value }))
                }
              />

              <div className="grid gap-3 md:grid-cols-2">
                <select
                  className="input"
                  value={notificationForm.priority}
                  onChange={(event) =>
                    setNotificationForm((prev) => ({
                      ...prev,
                      priority: event.target.value as NotificationPriority
                    }))
                  }
                >
                  <option value="low">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="critical">Critica</option>
                </select>

                <select
                  className="input"
                  value={notificationForm.recipient_mode}
                  onChange={(event) =>
                    setNotificationForm((prev) => ({
                      ...prev,
                      recipient_mode: event.target.value as RecipientMode,
                      recipient_ids: []
                    }))
                  }
                >
                  <option value="all">Todos os usuarios</option>
                  <option value="users">Usuarios especificos</option>
                </select>
              </div>

              {notificationForm.recipient_mode === "users" && (
                <div className="max-h-40 space-y-2 overflow-auto rounded-lg border border-slate-700 p-3">
                  {loadingUsers && <p className="text-xs text-textMuted">Carregando usuarios...</p>}
                  {!loadingUsers && activeUsers.length === 0 && (
                    <p className="text-xs text-textMuted">Nenhum usuario ativo.</p>
                  )}
                  {activeUsers.map((item) => {
                    const checked = notificationForm.recipient_ids.includes(item.id);
                    return (
                      <label key={item.id} className="flex items-center gap-2 text-sm text-textMuted">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            setNotificationForm((prev) => ({
                              ...prev,
                              recipient_ids: event.target.checked
                                ? [...prev.recipient_ids, item.id]
                                : prev.recipient_ids.filter((value) => value !== item.id)
                            }));
                          }}
                        />
                        {item.name} ({item.login})
                      </label>
                    );
                  })}
                </div>
              )}

              <button className="btn-accent w-full" onClick={sendNotification}>
                Enviar notificacao
              </button>
            </article>
          )}

          {menu === "users" && (
            <div className="space-y-4">
              <header className="rounded-2xl border border-slate-700 bg-panel p-4">
                <h3 className="font-display text-lg text-textMain">Gestao de usuarios</h3>
                <p className="text-sm text-textMuted">Cadastro, edicao e status de acesso</p>
              </header>

              <div className="grid gap-4 xl:grid-cols-2">
                <article className="space-y-3 rounded-2xl border border-slate-700 bg-panel p-4">
                  <h4 className="font-display text-base text-textMain">Cadastrar usuario</h4>
                  <input className="input" placeholder="Nome" value={newUserForm.name} onChange={(event) => setNewUserForm((prev) => ({ ...prev, name: event.target.value }))} />
                  <input className="input" placeholder="Login" value={newUserForm.login} onChange={(event) => setNewUserForm((prev) => ({ ...prev, login: event.target.value }))} />
                  <input className="input" type="password" placeholder="Senha" value={newUserForm.password} onChange={(event) => setNewUserForm((prev) => ({ ...prev, password: event.target.value }))} />
                  <input className="input" placeholder="Setor" value={newUserForm.department} onChange={(event) => setNewUserForm((prev) => ({ ...prev, department: event.target.value }))} />
                  <input className="input" placeholder="Funcao" value={newUserForm.job_title} onChange={(event) => setNewUserForm((prev) => ({ ...prev, job_title: event.target.value }))} />
                  <select className="input" value={newUserForm.role} onChange={(event) => setNewUserForm((prev) => ({ ...prev, role: event.target.value as "admin" | "user" }))}>
                    <option value="user">Usuario</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button className="btn-primary w-full" onClick={createUser}>Cadastrar</button>
                </article>

                <article className="space-y-3 rounded-2xl border border-slate-700 bg-panel p-4">
                  <h4 className="font-display text-base text-textMain">Editar usuario</h4>
                  <select
                    className="input"
                    value={editForm.id || ""}
                    onChange={(event) => {
                      const selected = users.find((item) => item.id === Number(event.target.value));
                      if (!selected) {
                        return;
                      }

                      setEditForm({
                        id: selected.id,
                        name: selected.name,
                        login: selected.login,
                        department: selected.department,
                        job_title: selected.jobTitle,
                        role: selected.role,
                        password: ""
                      });
                    }}
                  >
                    <option value="">Selecione</option>
                    {users.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.login})
                      </option>
                    ))}
                  </select>
                  <input className="input" placeholder="Nome" value={editForm.name} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} />
                  <input className="input" placeholder="Login" value={editForm.login} onChange={(event) => setEditForm((prev) => ({ ...prev, login: event.target.value }))} />
                  <input className="input" placeholder="Setor" value={editForm.department} onChange={(event) => setEditForm((prev) => ({ ...prev, department: event.target.value }))} />
                  <input className="input" placeholder="Funcao" value={editForm.job_title} onChange={(event) => setEditForm((prev) => ({ ...prev, job_title: event.target.value }))} />
                  <select className="input" value={editForm.role} onChange={(event) => setEditForm((prev) => ({ ...prev, role: event.target.value as "admin" | "user" }))}>
                    <option value="user">Usuario</option>
                    <option value="admin">Admin</option>
                  </select>
                  <input className="input" type="password" placeholder="Nova senha (opcional)" value={editForm.password} onChange={(event) => setEditForm((prev) => ({ ...prev, password: event.target.value }))} />
                  <button className="btn-primary w-full" onClick={updateUser}>Salvar alteracoes</button>
                </article>
              </div>

              <article className="rounded-2xl border border-slate-700 bg-panel p-4">
                <h4 className="mb-3 font-display text-base text-textMain">Status dos usuarios</h4>
                <div className="grid gap-2 md:grid-cols-2">
                  {users.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
                      <p className="text-sm font-semibold text-textMain">{item.name}</p>
                      <p className="text-xs text-textMuted">{item.login}</p>
                      <p className="mt-1 text-xs text-textMuted">
                        {item.department} - {item.jobTitle}
                      </p>
                      <button
                        className={`mt-2 rounded-md px-3 py-1 text-xs font-semibold ${item.isActive ? "bg-danger text-white" : "bg-success text-slate-900"}`}
                        onClick={() => toggleStatus(item)}
                      >
                        {item.isActive ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
