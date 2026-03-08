import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api";
import { connectSocket } from "../lib/socket";
import type {
  AuthUser,
  NotificationItem,
  NotificationPriority,
  NotificationResponseStatus
} from "../types";

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

const RESPONSE_OPTIONS: NotificationResponseStatus[] = [
  "ciente",
  "em_andamento",
  "resolvido",
  "aguardando"
];

const RESPONSE_LABELS: Record<NotificationResponseStatus, string> = {
  ciente: "Ciente",
  em_andamento: "Em andamento",
  resolvido: "Resolvido",
  aguardando: "Aguardando"
};

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

const toLocalNotification = (payload: IncomingNotification): NotificationItem => ({
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
  responseStatus: null,
  responseAt: null,
  isRead: false
});

export const UserDashboard = ({ user, onError, onToast }: UserDashboardProps) => {
  const [filter, setFilter] = useState<FilterMode>("all");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [selected, setSelected] = useState<NotificationItem | null>(null);
  const [criticalModal, setCriticalModal] = useState<NotificationItem | null>(null);

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
      const parsed = toLocalNotification(payload);
      setItems((prev) => [parsed, ...prev]);

      if (parsed.priority === "critical") {
        setCriticalModal(parsed);
      }

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

  useEffect(() => {
    if (criticalModal) {
      return;
    }

    const firstPendingCritical = items.find((item) => !item.isRead && item.priority === "critical");
    if (firstPendingCritical) {
      setCriticalModal(firstPendingCritical);
    }
  }, [items, criticalModal]);

  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);

  const updateItemState = (
    notificationId: number,
    patch: Partial<Pick<NotificationItem, "readAt" | "isRead" | "responseStatus" | "responseAt">>
  ) => {
    setItems((prev) => prev.map((item) => (item.id === notificationId ? { ...item, ...patch } : item)));

    setSelected((prev) => (prev && prev.id === notificationId ? { ...prev, ...patch } : prev));

    setCriticalModal((prev) => {
      if (!prev || prev.id !== notificationId) {
        return prev;
      }

      const next = { ...prev, ...patch };
      return next.isRead ? null : next;
    });
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await api.markRead(notificationId);
      updateItemState(notificationId, {
        readAt: response.readAt,
        isRead: true
      });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Falha ao marcar como lida";
      onError(message);
    }
  };

  const respondNotification = async (
    notificationId: number,
    responseStatus: NotificationResponseStatus
  ) => {
    try {
      const response = await api.respondNotification(notificationId, responseStatus);
      updateItemState(notificationId, {
        readAt: response.readAt,
        isRead: true,
        responseStatus,
        responseAt: response.responseAt
      });
      onToast(`Resposta registrada: ${RESPONSE_LABELS[responseStatus]}`);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Falha ao registrar resposta";
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
                  : item.priority === "critical"
                    ? "border-danger bg-danger/10"
                    : "border-accent/50 bg-accent/10"
              }`}
              onClick={() => setSelected(item)}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-textMain">{item.title}</p>
                {item.priority === "critical" && (
                  <span className="rounded-md bg-danger/20 px-2 py-1 text-[10px] uppercase tracking-wide text-danger">
                    Critica
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-textMuted">{item.message}</p>
              <p className="mt-2 text-xs text-textMuted">{formatDate(item.createdAt)}</p>
              {item.responseStatus && (
                <p className="mt-1 text-xs text-accentWarm">
                  Resposta: {RESPONSE_LABELS[item.responseStatus]} ({formatDate(item.responseAt)})
                </p>
              )}
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
              <p className="text-xs text-textMuted">
                Resposta: {selected.responseStatus ? RESPONSE_LABELS[selected.responseStatus] : "-"}
              </p>
              {!selected.isRead && (
                <button
                  className="w-full rounded-xl bg-success px-3 py-2 text-sm font-semibold text-slate-900"
                  onClick={() => markAsRead(selected.id)}
                >
                  Marcar como lida
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                {RESPONSE_OPTIONS.map((status) => (
                  <button
                    key={status}
                    className="rounded-lg border border-slate-600 bg-panelAlt px-2 py-2 text-xs text-textMain"
                    onClick={() => respondNotification(selected.id, status)}
                  >
                    {RESPONSE_LABELS[status]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {criticalModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-danger bg-panel p-5 shadow-glow">
            <p className="text-xs uppercase tracking-[0.2em] text-danger">Notificacao critica</p>
            <h3 className="mt-2 font-display text-xl text-textMain">{criticalModal.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-textMain">{criticalModal.message}</p>
            <p className="mt-3 text-xs text-textMuted">
              Recebida em {formatDate(criticalModal.createdAt)}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {RESPONSE_OPTIONS.map((status) => (
                <button
                  key={status}
                  className="rounded-lg border border-slate-600 bg-panelAlt px-2 py-2 text-xs text-textMain"
                  onClick={() => respondNotification(criticalModal.id, status)}
                >
                  {RESPONSE_LABELS[status]}
                </button>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-xl bg-success px-3 py-2 text-sm font-semibold text-slate-900"
                onClick={() => markAsRead(criticalModal.id)}
              >
                Marcar como lida
              </button>
              <button
                className="flex-1 rounded-xl border border-slate-600 bg-panelAlt px-3 py-2 text-sm text-textMain"
                onClick={() => setCriticalModal(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

