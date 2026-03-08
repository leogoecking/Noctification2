import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api";
import { connectSocket } from "../lib/socket";
import type { AuthUser, NotificationItem, NotificationPriority } from "../types";

interface UserDashboardProps {
  user: AuthUser;
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

interface IncomingNotification {
  id: number;
  title: string;
  message: string;
  priority: NotificationPriority;
  createdAt: string;
  sender: {
    id: number;
    name: string;
    login: string;
  };
}

type FilterMode = "all" | "read" | "unread";

const formatDate = (value: string | null): string => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("pt-BR");
};

const playAlert = () => {
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.value = 880;
  gainNode.gain.value = 0.04;

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.12);
};

export const UserDashboard = ({ user, onError, onToast }: UserDashboardProps) => {
  const [filter, setFilter] = useState<FilterMode>("all");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [selected, setSelected] = useState<NotificationItem | null>(null);

  const loadNotifications = async (nextFilter: FilterMode) => {
    setLoading(true);

    try {
      const query = nextFilter === "all" ? "" : `?status=${nextFilter}`;
      const response = await api.myNotifications(query);
      setItems(response.notifications as NotificationItem[]);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Falha ao carregar notificacoes";
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const socket = connectSocket();

    socket.on("connect", () => {
      socket.emit("notifications:subscribe", () => undefined);
    });

    socket.on("notification:new", (payload: IncomingNotification) => {
      setItems((prev) => [
        {
          id: payload.id,
          title: payload.title,
          message: payload.message,
          priority: payload.priority,
          createdAt: payload.createdAt,
          senderId: payload.sender.id,
          senderName: payload.sender.name,
          senderLogin: payload.sender.login,
          readAt: null,
          deliveredAt: payload.createdAt,
          isRead: false
        },
        ...prev
      ]);

      onToast(`Nova notificacao: ${payload.title}`);
      playAlert();
    });

    socket.on("connect_error", () => {
      onError("Falha na conexao em tempo real");
    });

    return () => {
      socket.disconnect();
    };
  }, [onError, onToast]);

  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await api.markRead(notificationId);
      setItems((prev) =>
        prev.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                readAt: response.readAt,
                isRead: true
              }
            : item
        )
      );

      setSelected((prev) =>
        prev && prev.id === notificationId
          ? {
              ...prev,
              readAt: response.readAt,
              isRead: true
            }
          : prev
      );
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Falha ao marcar como lida";
      onError(message);
    }
  };

  return (
    <section className="animate-fade-in space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-panel p-4 shadow-glow">
        <div>
          <h2 className="font-display text-xl text-textMain">Painel do Usuario</h2>
          <p className="text-sm text-textMuted">Conectado como {user.name}</p>
        </div>
        <div className="rounded-xl bg-panelAlt px-4 py-2 text-sm text-textMain">
          Pendentes: <strong className="text-accent">{unreadCount}</strong>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          className={`rounded-lg px-3 py-2 text-sm ${filter === "all" ? "bg-accent text-slate-900" : "bg-panelAlt text-textMuted"}`}
          onClick={() => setFilter("all")}
        >
          Todas
        </button>
        <button
          className={`rounded-lg px-3 py-2 text-sm ${filter === "unread" ? "bg-accent text-slate-900" : "bg-panelAlt text-textMuted"}`}
          onClick={() => setFilter("unread")}
        >
          Nao lidas
        </button>
        <button
          className={`rounded-lg px-3 py-2 text-sm ${filter === "read" ? "bg-accent text-slate-900" : "bg-panelAlt text-textMuted"}`}
          onClick={() => setFilter("read")}
        >
          Lidas
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[2fr,1fr]">
        <div className="space-y-2 rounded-2xl border border-slate-700 bg-panel p-3">
          {loading && <p className="text-sm text-textMuted">Carregando...</p>}
          {!loading && items.length === 0 && <p className="text-sm text-textMuted">Nenhuma notificacao.</p>}
          {items.map((item) => (
            <button
              key={item.id}
              className={`w-full rounded-xl border p-3 text-left transition ${
                item.isRead
                  ? "border-slate-700 bg-panelAlt/60"
                  : "border-accent/50 bg-accent/10"
              }`}
              onClick={() => setSelected(item)}
            >
              <p className="font-medium text-textMain">{item.title}</p>
              <p className="mt-1 text-sm text-textMuted">{item.message}</p>
              <p className="mt-2 text-xs text-textMuted">{formatDate(item.createdAt)}</p>
            </button>
          ))}
        </div>

        <aside className="rounded-2xl border border-slate-700 bg-panel p-4">
          {!selected && <p className="text-sm text-textMuted">Selecione uma notificacao.</p>}
          {selected && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-accent">Detalhe</p>
              <h3 className="font-display text-lg text-textMain">{selected.title}</h3>
              <p className="whitespace-pre-wrap text-sm text-textMain">{selected.message}</p>
              <p className="text-xs text-textMuted">Recebida: {formatDate(selected.deliveredAt)}</p>
              <p className="text-xs text-textMuted">Leitura: {formatDate(selected.readAt)}</p>
              {!selected.isRead && (
                <button
                  className="w-full rounded-xl bg-success px-3 py-2 text-sm font-semibold text-slate-900"
                  onClick={() => markAsRead(selected.id)}
                >
                  Marcar como lida
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};
