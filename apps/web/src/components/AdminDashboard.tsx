import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api";
import { connectSocket } from "../lib/socket";
import type { NotificationHistoryItem, NotificationPriority, UserItem } from "../types";

interface AdminDashboardProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

type HistoryFilter = "all" | "read" | "unread";
type RecipientMode = "all" | "users";

const formatDate = (value: string | null): string => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("pt-BR");
};

export const AdminDashboard = ({ onError, onToast }: AdminDashboardProps) => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  const [notificationForm, setNotificationForm] = useState({
    title: "",
    message: "",
    priority: "normal" as NotificationPriority,
    recipient_mode: "all" as RecipientMode,
    recipient_ids: [] as number[]
  });

  const loadUsers = async () => {
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
  };

  const loadHistory = async (filter: HistoryFilter) => {
    setLoadingHistory(true);
    try {
      const query = filter === "all" ? "" : `?status=${filter}`;
      const response = await api.adminNotifications(query);
      setHistory(response.notifications as NotificationHistoryItem[]);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Falha ao carregar historico";
      onError(message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadHistory(historyFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyFilter]);

  useEffect(() => {
    const socket = connectSocket();
    socket.on("notification:read_update", () => {
      loadHistory(historyFilter);
    });

    return () => {
      socket.disconnect();
    };
  }, [historyFilter]);

  const pendingCount = useMemo(
    () => history.reduce((acc, item) => acc + item.stats.unread, 0),
    [history]
  );

  const createUser = async () => {
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
      onError("Selecione um usuario para edicao");
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
      await loadUsers();
      onToast(`Usuario ${!user.isActive ? "ativado" : "desativado"}`);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Falha ao alterar status";
      onError(message);
    }
  };

  const sendNotification = async () => {
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
      await loadHistory(historyFilter);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Falha ao enviar notificacao";
      onError(message);
    }
  };

  return (
    <section className="animate-fade-in space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-panel p-4 shadow-glow">
        <div>
          <h2 className="font-display text-xl text-textMain">Painel Admin</h2>
          <p className="text-sm text-textMuted">Controle de usuarios e notificacoes</p>
        </div>
        <div className="rounded-xl bg-panelAlt px-4 py-2 text-sm text-textMain">
          Pendencias globais: <strong className="text-accentWarm">{pendingCount}</strong>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-3">
        <article className="space-y-3 rounded-2xl border border-slate-700 bg-panel p-4">
          <h3 className="font-display text-lg text-textMain">Novo usuario</h3>
          <input className="input" placeholder="Nome" value={newUserForm.name} onChange={(event) => setNewUserForm((prev) => ({ ...prev, name: event.target.value }))} />
          <input className="input" placeholder="Login" value={newUserForm.login} onChange={(event) => setNewUserForm((prev) => ({ ...prev, login: event.target.value }))} />
          <input className="input" type="password" placeholder="Senha" value={newUserForm.password} onChange={(event) => setNewUserForm((prev) => ({ ...prev, password: event.target.value }))} />
          <input className="input" placeholder="Setor" value={newUserForm.department} onChange={(event) => setNewUserForm((prev) => ({ ...prev, department: event.target.value }))} />
          <input className="input" placeholder="Funcao" value={newUserForm.job_title} onChange={(event) => setNewUserForm((prev) => ({ ...prev, job_title: event.target.value }))} />
          <select className="input" value={newUserForm.role} onChange={(event) => setNewUserForm((prev) => ({ ...prev, role: event.target.value as "admin" | "user" }))}>
            <option value="user">Usuario</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn-primary w-full" onClick={createUser}>Criar usuario</button>
        </article>

        <article className="space-y-3 rounded-2xl border border-slate-700 bg-panel p-4">
          <h3 className="font-display text-lg text-textMain">Editar usuario</h3>
          <select
            className="input"
            value={editForm.id || ""}
            onChange={(event) => {
              const selected = users.find((item) => item.id === Number(event.target.value));
              if (!selected) return;
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
              <option key={item.id} value={item.id}>{item.name} ({item.login})</option>
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

        <article className="space-y-3 rounded-2xl border border-slate-700 bg-panel p-4">
          <h3 className="font-display text-lg text-textMain">Enviar notificacao</h3>
          <input className="input" placeholder="Titulo" value={notificationForm.title} onChange={(event) => setNotificationForm((prev) => ({ ...prev, title: event.target.value }))} />
          <textarea className="input min-h-24" placeholder="Mensagem" value={notificationForm.message} onChange={(event) => setNotificationForm((prev) => ({ ...prev, message: event.target.value }))} />
          <select className="input" value={notificationForm.priority} onChange={(event) => setNotificationForm((prev) => ({ ...prev, priority: event.target.value as NotificationPriority }))}>
            <option value="low">Baixa</option>
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
            <option value="critical">Critica</option>
          </select>
          <select className="input" value={notificationForm.recipient_mode} onChange={(event) => setNotificationForm((prev) => ({ ...prev, recipient_mode: event.target.value as RecipientMode, recipient_ids: [] }))}>
            <option value="all">Todos os usuarios</option>
            <option value="users">Usuarios especificos</option>
          </select>

          {notificationForm.recipient_mode === "users" && (
            <div className="max-h-28 space-y-2 overflow-auto rounded-lg border border-slate-700 p-2">
              {users.filter((item) => item.isActive).map((item) => {
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

          <button className="btn-accent w-full" onClick={sendNotification}>Enviar agora</button>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-700 bg-panel p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg text-textMain">Usuarios</h3>
          {loadingUsers && <p className="text-xs text-textMuted">Atualizando...</p>}
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {users.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
              <p className="text-sm font-semibold text-textMain">{item.name}</p>
              <p className="text-xs text-textMuted">{item.login}</p>
              <p className="mt-1 text-xs text-textMuted">{item.department} - {item.jobTitle}</p>
              <p className="text-xs text-textMuted">Perfil: {item.role}</p>
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

      <article className="rounded-2xl border border-slate-700 bg-panel p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg text-textMain">Historico de notificacoes</h3>
          <div className="flex gap-2">
            <button className={`rounded-md px-3 py-1 text-xs ${historyFilter === "all" ? "bg-accent text-slate-900" : "bg-panelAlt text-textMuted"}`} onClick={() => setHistoryFilter("all")}>Todas</button>
            <button className={`rounded-md px-3 py-1 text-xs ${historyFilter === "unread" ? "bg-accent text-slate-900" : "bg-panelAlt text-textMuted"}`} onClick={() => setHistoryFilter("unread")}>Com pendencia</button>
            <button className={`rounded-md px-3 py-1 text-xs ${historyFilter === "read" ? "bg-accent text-slate-900" : "bg-panelAlt text-textMuted"}`} onClick={() => setHistoryFilter("read")}>100% lidas</button>
          </div>
        </div>

        {loadingHistory && <p className="text-sm text-textMuted">Carregando historico...</p>}
        {!loadingHistory && history.length === 0 && <p className="text-sm text-textMuted">Nenhuma notificacao encontrada.</p>}

        <div className="space-y-3">
          {history.map((item) => (
            <details key={item.id} className="rounded-xl border border-slate-700 bg-panelAlt p-3">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-textMain">{item.title}</p>
                    <p className="text-xs text-textMuted">{formatDate(item.created_at)}</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="rounded-md bg-success/20 px-2 py-1 text-success">Lidas: {item.stats.read}</span>
                    <span className="rounded-md bg-warning/20 px-2 py-1 text-warning">Pendentes: {item.stats.unread}</span>
                  </div>
                </div>
              </summary>
              <p className="mt-3 text-sm text-textMain">{item.message}</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {item.recipients.map((recipient) => (
                  <div key={`${item.id}-${recipient.userId}`} className="rounded-lg border border-slate-700 p-2">
                    <p className="text-sm text-textMain">{recipient.name} ({recipient.login})</p>
                    <p className="text-xs text-textMuted">Leitura: {formatDate(recipient.readAt)}</p>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </article>
    </section>
  );
};
