import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import {
  dispatchNotificationUpdated,
  subscribeNotificationEvents,
  type IncomingNotification,
  type IncomingReminder
} from "../lib/notificationEvents";
import type {
  AuthUser,
  NotificationItem,
  NotificationOperationalStatus,
  NotificationResponseStatus
} from "../types";

interface UserDashboardProps {
  user: AuthUser;
  isNotificationsPage: boolean;
  onOpenAllNotifications: () => void;
  onBackToDashboard: () => void;
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

type FilterMode = "all" | "read" | "unread";

const RESPONSE_OPTIONS: NotificationResponseStatus[] = ["em_andamento", "assumida", "resolvida"];

const OPERATIONAL_STATUS_LABELS: Record<
  NotificationOperationalStatus | NotificationResponseStatus,
  string
> = {
  recebida: "Recebida",
  visualizada: "Visualizada",
  em_andamento: "Em andamento",
  assumida: "Assumida",
  resolvida: "Resolvida"
};

const formatDate = (value: string | null): string => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("pt-BR");
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
  visualizedAt: null,
  deliveredAt: payload.createdAt,
  operationalStatus: "recebida",
  responseAt: null,
  responseMessage: null,
  isVisualized: false
});

const BellIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);

export const UserDashboard = ({
  user,
  isNotificationsPage,
  onOpenAllNotifications,
  onBackToDashboard,
  onError,
  onToast
}: UserDashboardProps) => {
  const [filter, setFilter] = useState<FilterMode>("all");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [selected, setSelected] = useState<NotificationItem | null>(null);
  const [criticalModal, setCriticalModal] = useState<NotificationItem | null>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const [responseMessageDraft, setResponseMessageDraft] = useState("");
  const [submittingReadAll, setSubmittingReadAll] = useState(false);
  const loadRequestIdRef = useRef(0);

  const loadNotifications = useCallback(
    async (nextFilter: FilterMode) => {
      const requestId = loadRequestIdRef.current + 1;
      loadRequestIdRef.current = requestId;
      setLoading(true);

      try {
        const query = nextFilter === "all" ? "" : `?status=${nextFilter}`;
        const response = await api.myNotifications(query);
        if (requestId !== loadRequestIdRef.current) {
          return;
        }

        setItems(response.notifications as NotificationItem[]);
      } catch (error) {
        if (requestId !== loadRequestIdRef.current) {
          return;
        }

        const message = error instanceof ApiError ? error.message : "Falha ao carregar notificacoes";
        onError(message);
      } finally {
        if (requestId === loadRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [onError]
  );

  useEffect(() => {
    void loadNotifications(filter);
  }, [filter, loadNotifications]);

  useEffect(() => {
    const onNotificationNew = (payload: IncomingNotification) => {
      const parsed = toLocalNotification(payload);
      setItems((prev) => [parsed, ...prev]);

      if (parsed.priority === "critical") {
        setCriticalModal(parsed);
      }

      setBellOpen(true);
    };

    const onNotificationReminder = (payload: IncomingReminder) => {
      setItems((prev) => {
        const index = prev.findIndex((item) => item.id === payload.id);
        if (index === -1) {
          return [
            {
              ...toLocalNotification(payload),
              operationalStatus: "em_andamento",
              responseAt: new Date().toISOString(),
              isVisualized: false
            },
            ...prev
          ];
        }

        return prev.map((item) =>
          item.id === payload.id
            ? {
                ...item,
                operationalStatus: "em_andamento"
              }
            : item
        );
      });

      setBellOpen(true);
    };

    return subscribeNotificationEvents({
      onNew: onNotificationNew,
      onReminder: onNotificationReminder
    });
  }, []);

  useEffect(() => {
    if (criticalModal) {
      return;
    }

    const firstPendingCritical = items.find((item) => !item.isVisualized && item.priority === "critical");
    if (firstPendingCritical) {
      setCriticalModal(firstPendingCritical);
    }
  }, [items, criticalModal]);

  useEffect(() => {
    if (selected) {
      setResponseMessageDraft(selected.responseMessage ?? "");
    }
  }, [selected]);

  useEffect(() => {
    if (!selected && criticalModal) {
      setResponseMessageDraft(criticalModal.responseMessage ?? "");
    }
  }, [criticalModal, selected]);

  const unreadItems = useMemo(() => items.filter((item) => !item.isVisualized), [items]);
  const unreadCount = unreadItems.length;
  const dropdownItems = useMemo(() => items.slice(0, 10), [items]);

  const updateItemState = (
    notificationId: number,
    patch: Partial<
      Pick<
        NotificationItem,
        "visualizedAt" | "isVisualized" | "operationalStatus" | "responseAt" | "responseMessage"
      >
    >
  ) => {
    const nextPatch = {
      visualizedAt: patch.visualizedAt ?? null,
      operationalStatus: patch.operationalStatus ?? "recebida",
      responseAt: patch.responseAt,
      responseMessage: patch.responseMessage,
      isVisualized: patch.isVisualized ?? false
    };

    setItems((prev) => prev.map((item) => (item.id === notificationId ? { ...item, ...patch } : item)));

    setSelected((prev) => (prev && prev.id === notificationId ? { ...prev, ...patch } : prev));

    setCriticalModal((prev) => {
      if (!prev || prev.id !== notificationId) {
        return prev;
      }

      const next = { ...prev, ...patch };
      return next.isVisualized ? null : next;
    });

    dispatchNotificationUpdated({
      id: notificationId,
      visualizedAt: nextPatch.visualizedAt,
      operationalStatus: nextPatch.operationalStatus,
      responseAt: nextPatch.responseAt,
      responseMessage: nextPatch.responseMessage,
      isVisualized: nextPatch.isVisualized
    });
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await api.markRead(notificationId);
      updateItemState(notificationId, {
        visualizedAt: response.visualizedAt,
        isVisualized: response.isVisualized,
        operationalStatus: response.operationalStatus as NotificationOperationalStatus
      });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Falha ao marcar como lida";
      onError(message);
    }
  };

  const markAllAsRead = async () => {
    setSubmittingReadAll(true);
    try {
      const response = await api.markAllRead();
      if (!response.visualizedAt || response.updatedCount === 0) {
        onToast("Nenhuma notificacao pendente para marcar");
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.isVisualized
            ? item
            : {
                ...item,
                visualizedAt: response.visualizedAt,
                isVisualized: true,
                operationalStatus: "visualizada"
              }
        )
      );
      setCriticalModal(null);
      onToast(`${response.updatedCount} notificacao(oes) marcadas como lidas`);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Falha ao marcar todas como lidas";
      onError(message);
    } finally {
      setSubmittingReadAll(false);
    }
  };

  const respondNotification = async (
    notificationId: number,
    responseStatus: NotificationResponseStatus,
    responseMessage?: string
  ) => {
    try {
      const response = await api.respondNotification(notificationId, responseStatus, responseMessage);
      updateItemState(notificationId, {
        visualizedAt: response.visualizedAt,
        isVisualized: response.isVisualized,
        operationalStatus: response.operationalStatus as NotificationOperationalStatus,
        responseMessage: response.responseMessage,
        responseAt: response.responseAt
      });
      onToast(`Resposta registrada: ${OPERATIONAL_STATUS_LABELS[responseStatus]}`);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Falha ao registrar resposta";
      onError(message);
    }
  };

  return (
    <section className="animate-fade-in space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-panel p-4 shadow-glow">
        <div>
          <h2 className="font-display text-xl text-textMain">
            {isNotificationsPage ? "Todas as notificacoes" : "Painel do Usuario"}
          </h2>
          <p className="text-sm text-textMuted">Conectado como {user.name}</p>
        </div>

        <div className="flex items-center gap-2">
          <div data-testid="unread-counter" className="rounded-xl bg-panelAlt px-4 py-2 text-sm text-textMain">
            Nao lidas: <strong className="text-accent">{unreadCount}</strong>
          </div>

          <div className="relative">
            <button
              className="relative rounded-xl border border-slate-600 bg-panelAlt p-2 text-textMain"
              onClick={() => setBellOpen((prev) => !prev)}
              aria-label="Abrir notificacoes" data-testid="notif-bell-btn"
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-danger px-1 text-center text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <div data-testid="notif-dropdown" className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-slate-700 bg-panel p-3 shadow-glow">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-textMain">Ultimas 10 notificacoes</p>
                  <span className="text-xs text-textMuted">Nao lidas: {unreadCount}</span>
                </div>

                {dropdownItems.length === 0 && (
                  <p className="text-xs text-textMuted">Sem notificacoes.</p>
                )}

                <div data-testid="notif-dropdown-list" className="max-h-72 space-y-2 overflow-auto">
                  {dropdownItems.map((item) => (
                    <button
                      key={item.id}
                      className="w-full rounded-lg border border-slate-700 bg-panelAlt p-2 text-left"
                      onClick={() => {
                        setSelected(item);
                        setBellOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-textMain">{item.title}</p>
                        <div className="flex items-center gap-1">
                          {!item.isVisualized && <span className="h-2 w-2 rounded-full bg-accent" />}
                          {item.priority === "critical" && (
                            <span className="rounded bg-danger/20 px-1.5 py-0.5 text-[10px] text-danger">
                              Critica
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-textMuted">{item.message}</p>
                      <p className="mt-1 text-[11px] text-textMuted">{formatDate(item.createdAt)}</p>
                    </button>
                  ))}
                </div>

                <button
                  data-testid="view-all-notifications-btn"
                  className="mt-2 w-full rounded-lg border border-slate-600 px-3 py-2 text-xs text-textMain"
                  onClick={() => {
                    onOpenAllNotifications();
                    setBellOpen(false);
                  }}
                >
                  Ver todas as notificacoes
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {!isNotificationsPage && (
          <button
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain"
            onClick={onOpenAllNotifications}
          >
            Ver todas as notificacoes
          </button>
        )}
        {isNotificationsPage && (
          <>
            <button
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain"
              onClick={onBackToDashboard}
            >
              Voltar ao painel
            </button>
            <button
              data-testid="mark-all-read-btn"
              className="rounded-lg bg-success px-3 py-2 text-sm font-semibold text-slate-900"
              onClick={markAllAsRead}
              disabled={submittingReadAll}
            >
              {submittingReadAll ? "Marcando..." : "Marcar todas como lidas"}
            </button>
          </>
        )}
      </div>

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
                item.isVisualized
                  ? "border-slate-700 bg-panelAlt/60"
                  : item.priority === "critical"
                    ? "border-danger bg-danger/10"
                    : "border-accent/50 bg-accent/10"
              }`}
              onClick={() => setSelected(item)}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-textMain">{item.title}</p>
                <div className="flex items-center gap-2">
                  {!item.isVisualized && <span className="h-2 w-2 rounded-full bg-accent" />}
                  {item.priority === "critical" && (
                    <span className="rounded-md bg-danger/20 px-2 py-1 text-[10px] uppercase tracking-wide text-danger">
                      Critica
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-textMuted">{item.message}</p>
              <p className="mt-2 text-xs text-textMuted">{formatDate(item.createdAt)}</p>
              {item.operationalStatus !== "recebida" && (
                <p className="mt-1 text-xs text-accentWarm">
                  Estado: {OPERATIONAL_STATUS_LABELS[item.operationalStatus]} ({formatDate(item.responseAt)})
                </p>
              )}
              {item.responseMessage && (
                <p className="mt-1 text-xs text-textMuted">Mensagem: {item.responseMessage}</p>
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
              <p className="text-xs text-textMuted">Visualizada em: {formatDate(selected.visualizedAt)}</p>
              <p className="text-xs text-textMuted">
                Estado operacional: {OPERATIONAL_STATUS_LABELS[selected.operationalStatus]}
              </p>
              {selected.responseMessage && (
                <p className="text-xs text-textMuted">Mensagem atual: {selected.responseMessage}</p>
              )}

              {!selected.isVisualized && (
                <button
                  className="w-full rounded-xl bg-success px-3 py-2 text-sm font-semibold text-slate-900"
                  onClick={() => markAsRead(selected.id)}
                >
                  Marcar visualizacao
                </button>
              )}

              <label className="block space-y-1">
                <span className="text-xs text-textMuted">Mensagem de retorno (opcional)</span>
                <textarea
                  className="input min-h-20"
                  placeholder="Digite um retorno, se quiser"
                  value={responseMessageDraft}
                  onChange={(event) => setResponseMessageDraft(event.target.value)}
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                {RESPONSE_OPTIONS.map((status) => (
                  <button
                    key={status}
                    className="rounded-lg border border-slate-600 bg-panelAlt px-2 py-2 text-xs text-textMain"
                    onClick={() => respondNotification(selected.id, status, responseMessageDraft)}
                  >
                    {OPERATIONAL_STATUS_LABELS[status]}
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

            <label className="mt-3 block space-y-1">
              <span className="text-xs text-textMuted">Mensagem de retorno (opcional)</span>
              <textarea
                className="input min-h-20"
                placeholder="Digite um retorno, se quiser"
                value={responseMessageDraft}
                onChange={(event) => setResponseMessageDraft(event.target.value)}
              />
            </label>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {RESPONSE_OPTIONS.map((status) => (
                <button
                key={status}
                className="rounded-lg border border-slate-600 bg-panelAlt px-2 py-2 text-xs text-textMain"
                onClick={() => respondNotification(criticalModal.id, status, responseMessageDraft)}
              >
                {OPERATIONAL_STATUS_LABELS[status]}
              </button>
            ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-xl bg-success px-3 py-2 text-sm font-semibold text-slate-900"
                onClick={() => markAsRead(criticalModal.id)}
              >
                Marcar visualizacao
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
