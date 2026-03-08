import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api";
import { connectSocket } from "../lib/socket";
import type { NotificationHistoryItem, NotificationPriority, UserItem } from "../types";

interface AdminDashboardProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

type RecipientMode = "all" | "users";
type AdminMenu = "dashboard" | "send" | "users";

const formatDate = (value: string | null): string => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("pt-BR");
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

export const AdminDashboard = ({ onError, onToast }: AdminDashboardProps) => {
  const [menu, setMenu] = useState<AdminMenu>("dashboard");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
      const message = error instanceof ApiError ? error.message : "Falha ao carregar usuarios";
      onError(message);
    } finally {
      setLoadingUsers(false);
    }
  }, [onError]);

  const loadUnreadDashboard = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const response = await api.adminNotifications("?status=unread");
      setHistory(response.notifications as NotificationHistoryItem[]);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Falha ao carregar dashboard";
      onError(message);
    } finally {
      setLoadingHistory(false);
    }
  }, [onError]);

  useEffect(() => {
    loadUsers();
    loadUnreadDashboard();
  }, [loadUsers, loadUnreadDashboard]);

  useEffect(() => {
    const socket = connectSocket();
    socket.on("notification:read_update", () => {
      loadUnreadDashboard();
    });

    return () => {
      socket.disconnect();
    };
  }, [loadUnreadDashboard]);

  const unreadNotifications = useMemo(() => history.filter((item) => item.stats.unread > 0), [history]);

  const metrics = useMemo(() => {
    const pendingRecipients = unreadNotifications.reduce((acc, item) => acc + item.stats.unread, 0);
    const criticalOpen = unreadNotifications.filter(
      (item) => item.priority === "critical" && item.stats.unread > 0
    ).length;

    return {
      pendingNotifications: unreadNotifications.length,
      pendingRecipients,
      criticalOpen
    };
  }, [unreadNotifications]);

  const activeUsers = useMemo(() => users.filter((item) => item.isActive), [users]);

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
      setMenu("dashboard");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Falha ao enviar notificacao";
      onError(message);
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
      const message = error instanceof ApiError ? error.message : "Falha ao criar usuario";
      onError(message);
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
      const message = error instanceof ApiError ? error.message : "Falha ao atualizar usuario";
      onError(message);
    }
  };

  const toggleStatus = async (user: UserItem) => {
    try {
      await api.toggleUserStatus(user.id, !user.isActive);
      onToast(`Usuario ${user.isActive ? "desativado" : "ativado"}`);
      await loadUsers();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Falha ao alterar status";
      onError(message);
    }
  };

  return (
    <section className="animate-fade-in">
      <div className="grid gap-4 lg:grid-cols-[250px,1fr]">
        <aside className="rounded-2xl border border-slate-700 bg-panel p-3 shadow-glow lg:sticky lg:top-4 lg:h-fit">
          <h2 className="mb-1 font-display text-lg text-textMain">Admin</h2>
          <p className="mb-3 text-xs text-textMuted">Menu executivo</p>

          <nav className="space-y-1">
            <button
              className={`${menuBaseClass} ${menu === "dashboard" ? "bg-accent text-slate-900" : "text-textMuted hover:bg-panelAlt"}`}
              onClick={() => setMenu("dashboard")}
            >
              <IconDashboard />
              Dashboard
            </button>

            <button
              className={`${menuBaseClass} ${menu === "send" ? "bg-accent text-slate-900" : "text-textMuted hover:bg-panelAlt"}`}
              onClick={() => setMenu("send")}
            >
              <IconBell />
              Enviar notificacao
            </button>

            <button
              className={`${menuBaseClass} ${menu === "users" ? "bg-accent text-slate-900" : "text-textMuted hover:bg-panelAlt"}`}
              onClick={() => setMenu("users")}
            >
              <IconUsers />
              Usuarios
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

              <div className="grid gap-3 md:grid-cols-3">
                <article className="rounded-2xl border border-slate-700 bg-panel p-4">
                  <p className="text-xs uppercase tracking-wide text-textMuted">Nao lidas</p>
                  <p className="mt-1 font-display text-2xl text-textMain">{metrics.pendingNotifications}</p>
                </article>

                <article className="rounded-2xl border border-slate-700 bg-panel p-4">
                  <p className="text-xs uppercase tracking-wide text-textMuted">Leituras pendentes</p>
                  <p className="mt-1 font-display text-2xl text-warning">{metrics.pendingRecipients}</p>
                </article>

                <article className="rounded-2xl border border-slate-700 bg-panel p-4">
                  <p className="text-xs uppercase tracking-wide text-textMuted">Criticas abertas</p>
                  <p className="mt-1 font-display text-2xl text-danger">{metrics.criticalOpen}</p>
                </article>
              </div>

              <article className="rounded-2xl border border-slate-700 bg-panel p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-display text-lg text-textMain">Fila de nao lidas</h4>
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
                    const unreadRecipients = item.recipients.filter(
                      (recipient) => recipient.responseStatus !== "resolvido"
                    );
                    const inProgressCount = unreadRecipients.filter(
                      (recipient) => recipient.responseStatus === "em_andamento"
                    ).length;

                    return (
                      <div key={item.id} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-textMain">{item.title}</p>
                            <p className="text-xs text-textMuted">{formatDate(item.created_at)}</p>
                          </div>
                          <span className="rounded-md bg-warning/20 px-2 py-1 text-xs text-warning">
                            Pendentes: {item.stats.unread}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-textMuted">{item.message}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-md bg-warning/20 px-2 py-1 text-warning">
                            Pendente: {item.stats.unread}
                          </span>
                          <span className="rounded-md bg-accent/20 px-2 py-1 text-accent">
                            Em andamento: {inProgressCount}
                          </span>
                        </div>

                        <div className="mt-2 space-y-2">
                          {unreadRecipients.length === 0 && (
                            <p className="text-xs text-textMuted">Sem usuarios pendentes.</p>
                          )}

                          {unreadRecipients.map((recipient) => (
                            <div key={recipient.userId} className="rounded-lg border border-slate-700 px-2 py-2">
                              <p className="text-xs text-textMain">
                                <span className="font-semibold">{recipient.name}</span> ({recipient.login}) -{" "}
                                {responseStatusLabel(recipient.responseStatus)}
                              </p>
                              <p className="text-[11px] text-textMuted">
                                Mensagem do usuario: {recipient.responseMessage?.trim() || "-"}
                              </p>
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
            </>
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
