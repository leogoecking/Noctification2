import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import {
  dispatchNotificationUpdated,
  subscribeNotificationEvents,
  type IncomingNotification,
  type IncomingReminder
} from "../lib/notificationEvents";
import type { AuthUser, NotificationItem, NotificationOperationalStatus, NotificationResponseStatus } from "../types";
import type { ReminderItem, ReminderOccurrenceItem } from "../types";
import { UserNotificationBell } from "./user-notifications/UserNotificationBell";
import { UserCriticalNotificationModal, UserNotificationCenter, UserNotificationFilterBar } from "./user-notifications/UserNotificationViews";
import { OperationsBoardRail } from "./OperationsBoardRail";
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
  onOpenTasks: () => void;
  onOpenReminders: () => void;
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

export const UserDashboard = ({
  user,
  isNotificationsPage,
  onOpenAllNotifications,
  onBackToDashboard,
  onOpenTasks,
  onOpenReminders,
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
  const [activeReminders, setActiveReminders] = useState<ReminderItem[]>([]);
  const [pendingOccurrences, setPendingOccurrences] = useState<ReminderOccurrenceItem[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const loadRequestIdRef = useRef(0);
  const reminderRequestIdRef = useRef(0);

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
    if (!isNotificationsPage && filter !== "all") {
      setFilter("all");
    }
  }, [filter, isNotificationsPage]);

  const loadReminderRail = useCallback(async () => {
    const requestId = reminderRequestIdRef.current + 1;
    reminderRequestIdRef.current = requestId;
    setLoadingReminders(true);

    try {
      const [remindersResponse, occurrencesResponse] = await Promise.all([
        api.myReminders("?active=true"),
        api.myReminderOccurrences("?status=pending")
      ]);

      if (requestId !== reminderRequestIdRef.current) {
        return;
      }

      setActiveReminders(remindersResponse.reminders);
      setPendingOccurrences(
        [...occurrencesResponse.occurrences]
          .sort((left, right) => left.scheduledFor.localeCompare(right.scheduledFor))
          .slice(0, 4)
      );
    } catch (error) {
      if (requestId !== reminderRequestIdRef.current) {
        return;
      }

      const message = error instanceof ApiError ? error.message : "Falha ao carregar lembretes";
      onError(message);
    } finally {
      if (requestId === reminderRequestIdRef.current) {
        setLoadingReminders(false);
      }
    }
  }, [onError]);

  useEffect(() => {
    void loadReminderRail();
  }, [loadReminderRail]);

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
  const remindersTodayCount = useMemo(
    () =>
      pendingOccurrences.filter(
        (item) =>
          new Date(item.scheduledFor).toLocaleDateString("sv-SE") ===
          new Date().toLocaleDateString("sv-SE")
      ).length,
    [pendingOccurrences]
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
    <section className="animate-fade-in space-y-6">
      <header className="rounded-[1.5rem] bg-panel p-4 shadow-glow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-textMuted">
                Operations overview
              </p>
              <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-textMain">
                Noctification
              </h2>
            </div>
            <div className="hidden h-4 w-px bg-outlineSoft md:block" />
            <p className="text-sm text-textMuted">
              {isNotificationsPage ? "Todas as notificacoes" : "Dashboard Overview"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              data-testid="unread-counter"
              className="rounded-full bg-panelAlt px-4 py-2 text-sm text-textMain"
            >
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
        </div>
      </header>

      <header className="rounded-[1.5rem] bg-panelAlt/80 p-6 shadow-glow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-textMuted">
              Live operations
            </p>
            <h3 className="font-display text-3xl font-extrabold tracking-tight text-textMain">
              {isNotificationsPage ? "Todas as notificacoes" : "Painel do Usuario"}
            </h3>
            <p className="max-w-2xl text-sm text-textMuted">
              Conectado como {user.name}. Acompanhe sinais operacionais, pendencias recentes e o
              status das notificacoes sem sair do fluxo atual.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isNotificationsPage && (
              <button
                className="rounded-xl border border-outlineSoft bg-panel px-4 py-2 text-sm text-textMain"
                onClick={onOpenAllNotifications}
                type="button"
              >
                Abrir central de notificacoes
              </button>
            )}
            {isNotificationsPage && (
              <>
                <button
                  className="rounded-xl border border-outlineSoft bg-panel px-4 py-2 text-sm text-textMain"
                  onClick={onBackToDashboard}
                  type="button"
                >
                  Voltar ao painel
                </button>
                <button
                  data-testid="mark-all-read-btn"
                  className="btn-success"
                  onClick={markAllAsRead}
                  disabled={submittingReadAll}
                  type="button"
                >
                  {submittingReadAll ? "Marcando..." : "Marcar todas como lidas"}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.25rem] bg-panel p-5">
          <div className="flex items-start justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted">
              Total de itens
            </p>
            <span className="text-xs font-bold text-accent">Live</span>
          </div>
          <p className="mt-4 text-4xl font-black tracking-tight text-textMain">{items.length}</p>
          <p className="mt-1 text-xs text-textMuted">Volume carregado para a sua fila atual</p>
        </article>

        <article className="rounded-[1.25rem] bg-panel p-5">
          <div className="flex items-start justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted">
              Pendentes
            </p>
            <span className="h-2 w-2 rounded-full bg-accent" />
          </div>
          <p className="mt-4 text-4xl font-black tracking-tight text-textMain">{unreadCount}</p>
          <p className="mt-1 text-xs text-textMuted">Itens ainda nao visualizados</p>
        </article>

        <article className="rounded-[1.25rem] bg-panel p-5">
          <div className="flex items-start justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted">
              Em andamento
            </p>
            <span className="h-2 w-2 rounded-full bg-warning" />
          </div>
          <p className="mt-4 text-4xl font-black tracking-tight text-textMain">{inProgressCount}</p>
          <p className="mt-1 text-xs text-textMuted">Com resposta operacional em curso</p>
        </article>

        <article className="rounded-[1.25rem] bg-panel p-5">
          <div className="flex items-start justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted">
              Criticas
            </p>
            <span className="h-2 w-2 rounded-full bg-danger" />
          </div>
          <p className="mt-4 text-4xl font-black tracking-tight text-danger">{criticalCount}</p>
          <p className="mt-1 text-xs text-textMuted">Exigem atencao imediata</p>
        </article>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          {isNotificationsPage ? (
            <article className="rounded-[1.25rem] bg-panel p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted">
                    Live notification stream
                  </p>
                  <h3 className="mt-1 font-display text-xl text-textMain">Central completa</h3>
                </div>
              </div>

              <div className="mb-4 rounded-[1rem] bg-panelAlt p-3">
                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted">
                    Filtros
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-textMain">Central completa</h3>
                </div>
                <UserNotificationFilterBar filter={filter} onChange={setFilter} />
              </div>

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
            </article>
          ) : (
            <OperationsBoardRail
              currentUserName={user.name}
              onError={onError}
              onToast={onToast}
              subtitle="Avisos de turno e alinhamentos compartilhados com toda a operacao"
            />
          )}
        </div>

        <aside className="space-y-4 lg:col-span-4">
          <article className="rounded-[1.25rem] bg-panel p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-textMain">
                  Agenda e lembretes
                </h3>
                <p className="mt-1 text-xs text-textMuted">Proximos compromissos operacionais do usuario</p>
              </div>
              <button
                className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-xs text-textMain"
                onClick={onOpenReminders}
                type="button"
              >
                Abrir
              </button>
            </div>

            <div className="mt-4 grid gap-2 text-xs md:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-xl bg-panelAlt p-3">
                <p className="text-textMuted">Lembretes ativos</p>
                <p className="mt-1 text-lg font-semibold text-textMain">{activeReminders.length}</p>
              </div>
              <div className="rounded-xl bg-panelAlt p-3">
                <p className="text-textMuted">Pendentes</p>
                <p className="mt-1 text-lg font-semibold text-textMain">{pendingOccurrences.length}</p>
              </div>
              <div className="rounded-xl bg-panelAlt p-3">
                <p className="text-textMuted">Hoje</p>
                <p className="mt-1 text-lg font-semibold text-warning">{remindersTodayCount}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {loadingReminders ? (
                <p className="text-sm text-textMuted">Carregando lembretes...</p>
              ) : pendingOccurrences.length === 0 ? (
                <p className="text-sm text-textMuted">Sem ocorrencias pendentes no momento.</p>
              ) : (
                pendingOccurrences.map((item) => (
                  <div key={item.id} className="rounded-xl bg-panelAlt p-3">
                    <p className="text-sm font-semibold text-textMain">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-textMuted">{item.description}</p>
                    <p className="mt-2 text-[11px] text-textMuted">
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short"
                      }).format(new Date(item.scheduledFor))}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-[1.25rem] bg-panel p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-textMain">Quick actions</h3>
              <span className="text-[11px] text-textMuted">Atalhos</span>
            </div>
            <div className="mt-4 space-y-2">
              <button
                className="w-full rounded-xl bg-panelAlt px-4 py-3 text-left text-sm font-medium text-textMain"
                onClick={onOpenAllNotifications}
                type="button"
              >
                Abrir central de notificacoes
              </button>
              <button
                className="w-full rounded-xl bg-panelAlt px-4 py-3 text-left text-sm font-medium text-textMain"
                onClick={onOpenTasks}
                type="button"
              >
                Abrir kanban de tarefas
              </button>
              <button
                className="w-full rounded-xl bg-panelAlt px-4 py-3 text-left text-sm font-medium text-textMain"
                onClick={onOpenReminders}
                type="button"
              >
                Abrir painel de lembretes
              </button>
            </div>
          </article>
        </aside>
      </div>

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
