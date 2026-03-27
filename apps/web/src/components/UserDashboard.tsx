import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import {
  dispatchNotificationUpdated,
  subscribeNotificationEvents,
  type IncomingNotification,
  type IncomingReminder
} from "../lib/notificationEvents";
import type { AuthUser, NotificationItem, NotificationOperationalStatus, NotificationResponseStatus } from "../types";
import { UserNotificationBell } from "./user-notifications/UserNotificationBell";
import {
  UserCriticalNotificationModal,
  UserNotificationCenter,
  UserNotificationFilterBar,
  UserNotificationSummary
} from "./user-notifications/UserNotificationViews";
import {
  OPERATIONAL_STATUS_LABELS,
  toLocalNotification,
  type FilterMode
} from "./user-notifications/userNotificationUi";

interface UserDashboardProps {
  user: AuthUser;
  isNotificationsPage: boolean;
  onOpenAllNotifications: () => void;
  onBackToDashboard: () => void;
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

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

          <UserNotificationBell
            bellOpen={bellOpen}
            dropdownItems={dropdownItems}
            unreadCount={unreadCount}
            onOpenChange={setBellOpen}
            onSelectNotification={(item) => {
              setSelected(item);
              setBellOpen(false);
            }}
            onOpenAllNotifications={() => {
              onOpenAllNotifications();
              setBellOpen(false);
            }}
          />
        </div>
      </header>

      <article className="rounded-2xl border border-slate-700 bg-panel p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Visao rapida</p>
            <h3 className="mt-1 font-display text-base text-textMain">Estado das notificacoes</h3>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-panelAlt px-3 py-1.5 text-textMain">{items.length} no total</span>
            <span className="rounded-full bg-accent/10 px-3 py-1.5 text-accent">{unreadCount} pendentes</span>
            <span className="rounded-full bg-warning/20 px-3 py-1.5 text-warning">{inProgressCount} em andamento</span>
            <span className="rounded-full bg-danger/20 px-3 py-1.5 text-danger">{criticalCount} criticas</span>
          </div>
        </div>
      </article>

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
        <UserNotificationFilterBar filter={filter} onChange={setFilter} />
      )}

      {isNotificationsPage ? (
        <UserNotificationCenter
          items={items}
          loading={loading}
          selected={selected}
          responseMessageDraft={responseMessageDraft}
          onSelect={setSelected}
          onDraftChange={setResponseMessageDraft}
          onMarkAsRead={(notificationId) => void markAsRead(notificationId)}
          onRespond={(notificationId, status, responseMessage) =>
            void respondNotification(notificationId, status, responseMessage)
          }
        />
      ) : (
        <UserNotificationSummary
          dashboardItems={dashboardItems}
          loading={loading}
          onOpenAllNotifications={onOpenAllNotifications}
        />
      )}

      {criticalModal && (
        <UserCriticalNotificationModal
          criticalModal={criticalModal}
          responseMessageDraft={responseMessageDraft}
          onDraftChange={setResponseMessageDraft}
          onMarkAsRead={(notificationId) => void markAsRead(notificationId)}
          onClose={() => setCriticalModal(null)}
          onRespond={(notificationId, status, responseMessage) =>
            void respondNotification(notificationId, status, responseMessage)
          }
        />
      )}
    </section>
  );
};
