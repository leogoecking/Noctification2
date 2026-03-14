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

const FILTER_LABELS: Record<FilterMode, string> = {
  all: "Todas",
  unread: "Nao lidas",
  read: "Lidas"
};

const PRIORITY_LABELS = {
  normal: "Normal",
  high: "Alta",
  critical: "Critica",
  low: "Baixa"
} as const;

const RESPONSE_ACTION_STYLES: Record<NotificationResponseStatus, string> = {
  em_andamento: "border-warning/50 bg-warning/10 text-warning hover:border-warning/70",
  assumida: "border-accent/50 bg-accent/10 text-accent hover:border-accent/70",
  resolvida: "border-success/50 bg-success/10 text-success hover:border-success/70"
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
  const inProgressCount = useMemo(
    () => items.filter((item) => item.operationalStatus === "em_andamento").length,
    [items]
  );
  const criticalCount = useMemo(
    () => items.filter((item) => !item.isVisualized && item.priority === "critical").length,
    [items]
  );
  const dropdownItems = useMemo(() => items.slice(0, 10), [items]);
  const dashboardItems = useMemo(
    () =>
      items
        .filter((item) => !item.isVisualized || item.operationalStatus !== "recebida")
        .slice(0, 6),
    [items]
  );

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

  const renderResponseActions = (notificationId: number) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Atualizar status</p>
        <span className="text-[11px] text-textMuted">Escolha a proxima etapa</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {RESPONSE_OPTIONS.map((status) => (
          <button
            key={status}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${RESPONSE_ACTION_STYLES[status]}`}
            onClick={() => respondNotification(notificationId, status, responseMessageDraft)}
          >
            {OPERATIONAL_STATUS_LABELS[status]}
          </button>
        ))}
      </div>
    </div>
  );

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
                  <p className="text-xs text-textMuted">
                    Nenhuma notificacao recente. Novos alertas aparecerao aqui.
                  </p>
                )}

                <div data-testid="notif-dropdown-list" className="max-h-72 space-y-2 overflow-auto">
                  {dropdownItems.map((item) => (
                    <button
                      key={item.id}
                      className="w-full rounded-lg border border-slate-700 bg-panelAlt p-2.5 text-left"
                      onClick={() => {
                        setSelected(item);
                        setBellOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-textMain">{item.title}</p>
                        <div className="flex items-center gap-1">
                          {!item.isVisualized && <span className="h-2 w-2 rounded-full bg-accent" />}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] ${
                              item.priority === "critical"
                                ? "bg-danger/20 text-danger"
                                : item.priority === "high"
                                  ? "bg-warning/20 text-warning"
                                  : "bg-panel text-textMuted"
                            }`}
                          >
                            {PRIORITY_LABELS[item.priority]}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-textMuted">
                        {item.message || "Sem mensagem adicional"}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-textMuted">
                        <span>{formatDate(item.createdAt)}</span>
                        <span>{OPERATIONAL_STATUS_LABELS[item.operationalStatus]}</span>
                      </div>
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

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Pendentes</p>
          <p className="mt-2 font-display text-2xl text-textMain">{unreadCount}</p>
          <p className="mt-1 text-xs text-textMuted">Notificacoes ainda nao visualizadas</p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Em andamento</p>
          <p className="mt-2 font-display text-2xl text-textMain">{inProgressCount}</p>
          <p className="mt-1 text-xs text-textMuted">Itens que ainda exigem acompanhamento</p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-danger">Criticas</p>
          <p className="mt-2 font-display text-2xl text-textMain">{criticalCount}</p>
          <p className="mt-1 text-xs text-textMuted">Notificacoes criticas nao visualizadas</p>
        </article>
      </section>

      <div className="flex flex-wrap gap-2">
        {!isNotificationsPage && (
          <button
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-textMain"
            onClick={onOpenAllNotifications}
          >
            Abrir central de notificacoes
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

      {isNotificationsPage && (
        <div className="flex flex-wrap gap-2">
          <button
            className={`rounded-lg px-3 py-2 text-sm ${filter === "all" ? "bg-accent text-slate-900" : "bg-panelAlt text-textMuted"}`}
            onClick={() => setFilter("all")}
          >
            {FILTER_LABELS.all}
          </button>
          <button
            className={`rounded-lg px-3 py-2 text-sm ${filter === "unread" ? "bg-accent text-slate-900" : "bg-panelAlt text-textMuted"}`}
            onClick={() => setFilter("unread")}
          >
            {FILTER_LABELS.unread}
          </button>
          <button
            className={`rounded-lg px-3 py-2 text-sm ${filter === "read" ? "bg-accent text-slate-900" : "bg-panelAlt text-textMuted"}`}
            onClick={() => setFilter("read")}
          >
            {FILTER_LABELS.read}
          </button>
        </div>
      )}

      {isNotificationsPage ? (
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
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        item.priority === "critical"
                          ? "bg-danger/20 text-danger"
                          : item.priority === "high"
                            ? "bg-warning/20 text-warning"
                            : "bg-panel text-textMuted"
                      }`}
                    >
                      {PRIORITY_LABELS[item.priority]}
                    </span>
                  </div>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-textMuted">{item.message}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-textMuted">
                  <span>{formatDate(item.createdAt)}</span>
                  <span>{OPERATIONAL_STATUS_LABELS[item.operationalStatus]}</span>
                  {item.responseMessage && <span>Com retorno</span>}
                </div>
              </button>
            ))}
          </div>

          <aside className="rounded-2xl border border-slate-700 bg-panel p-4">
            {!selected && <p className="text-sm text-textMuted">Selecione uma notificacao.</p>}
            {selected && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wider text-accent">Detalhe da notificacao</p>
                <h3 className="font-display text-lg text-textMain">{selected.title}</h3>
                <p className="whitespace-pre-wrap text-sm text-textMain">{selected.message}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-panelAlt/70 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Recebida</p>
                    <p className="mt-1 text-sm text-textMain">{formatDate(selected.deliveredAt)}</p>
                  </div>
                  <div className="rounded-xl bg-panelAlt/70 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Estado atual</p>
                    <p className="mt-1 text-sm text-textMain">
                      {OPERATIONAL_STATUS_LABELS[selected.operationalStatus]}
                    </p>
                  </div>
                  <div className="rounded-xl bg-panelAlt/70 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Visualizada em</p>
                    <p className="mt-1 text-sm text-textMain">{formatDate(selected.visualizedAt)}</p>
                  </div>
                  <div className="rounded-xl bg-panelAlt/70 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-textMuted">Mensagem atual</p>
                    <p className="mt-1 text-sm text-textMain">
                      {selected.responseMessage || "Sem retorno registrado"}
                    </p>
                  </div>
                </div>

                {!selected.isVisualized && (
                  <div className="rounded-2xl border border-success/30 bg-success/10 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-success">Proxima acao</p>
                    <button
                      className="mt-2 w-full rounded-xl bg-success px-3 py-2 text-sm font-semibold text-slate-900"
                      onClick={() => markAsRead(selected.id)}
                    >
                      Marcar como visualizada
                    </button>
                  </div>
                )}

                {renderResponseActions(selected.id)}

                <label className="block space-y-1">
                  <span className="text-xs text-textMuted">Mensagem de retorno opcional</span>
                  <textarea
                    className="input min-h-20"
                    placeholder="Adicione contexto para sua resposta, se necessario"
                    value={responseMessageDraft}
                    onChange={(event) => setResponseMessageDraft(event.target.value)}
                  />
                </label>
              </div>
            )}
          </aside>
        </div>
      ) : (
        <article className="rounded-2xl border border-slate-700 bg-panel p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg text-textMain">Pendencias recentes</h3>
              <p className="text-sm text-textMuted">Resumo rapido do que ainda precisa de acao</p>
            </div>
            <button className="btn-primary" onClick={onOpenAllNotifications} type="button">
              Ver central completa
            </button>
          </div>

          {loading && <p className="text-sm text-textMuted">Carregando...</p>}
          {!loading && dashboardItems.length === 0 && (
            <p className="text-sm text-textMuted">
              Nenhuma pendencia operacional no momento. Quando surgir algo novo, aparecera aqui.
            </p>
          )}
          <div className="space-y-2">
            {dashboardItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-3 ${
                  item.priority === "critical"
                    ? "border-danger/60 bg-danger/10"
                    : item.operationalStatus === "em_andamento"
                      ? "border-accent/50 bg-accent/10"
                      : "border-slate-700 bg-panelAlt/70"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-textMain">{item.title}</p>
                  <span className="rounded-full bg-panel px-2.5 py-1 text-[11px] text-textMuted">
                    {OPERATIONAL_STATUS_LABELS[item.operationalStatus]}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-textMuted">{item.message}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-textMuted">
                  <span>{formatDate(item.createdAt)}</span>
                  <span>Prioridade: {PRIORITY_LABELS[item.priority]}</span>
                  {!item.isVisualized && <span>Nao visualizada</span>}
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

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
              <span className="text-xs text-textMuted">Mensagem de retorno opcional</span>
              <textarea
                className="input min-h-20"
                placeholder="Adicione contexto para sua resposta, se necessario"
                value={responseMessageDraft}
                onChange={(event) => setResponseMessageDraft(event.target.value)}
              />
            </label>

            <div className="mt-4">{renderResponseActions(criticalModal.id)}</div>

            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-xl bg-success px-3 py-2 text-sm font-semibold text-slate-900"
                onClick={() => markAsRead(criticalModal.id)}
              >
                Marcar como visualizada
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
