import type { NotificationItem, NotificationResponseStatus } from "../../types";
import {
  FILTER_LABELS,
  formatNotificationDate,
  OPERATIONAL_STATUS_LABELS,
  PRIORITY_LABELS,
  RESPONSE_ACTION_STYLES,
  RESPONSE_OPTIONS,
  renderTaskLinkChip,
  type FilterMode
} from "./userNotificationUi";

interface UserNotificationFilterBarProps {
  filter: FilterMode;
  onChange: (value: FilterMode) => void;
}

export const UserNotificationFilterBar = ({
  filter,
  onChange
}: UserNotificationFilterBarProps) => (
  <div className="flex flex-wrap gap-2">
    <button
      className={`rounded-lg px-3 py-2 text-sm ${filter === "all" ? "bg-accent text-white" : "bg-panelAlt text-textMuted"}`}
      onClick={() => onChange("all")}
    >
      {FILTER_LABELS.all}
    </button>
    <button
      className={`rounded-lg px-3 py-2 text-sm ${filter === "unread" ? "bg-accent text-white" : "bg-panelAlt text-textMuted"}`}
      onClick={() => onChange("unread")}
    >
      {FILTER_LABELS.unread}
    </button>
    <button
      className={`rounded-lg px-3 py-2 text-sm ${filter === "read" ? "bg-accent text-white" : "bg-panelAlt text-textMuted"}`}
      onClick={() => onChange("read")}
    >
      {FILTER_LABELS.read}
    </button>
  </div>
);

interface UserNotificationResponseActionsProps {
  notificationId: number;
  responseMessageDraft: string;
  onRespond: (notificationId: number, status: NotificationResponseStatus, responseMessage?: string) => void;
}

export const UserNotificationResponseActions = ({
  notificationId,
  responseMessageDraft,
  onRespond
}: UserNotificationResponseActionsProps) => (
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
          onClick={() => onRespond(notificationId, status, responseMessageDraft)}
        >
          {OPERATIONAL_STATUS_LABELS[status]}
        </button>
      ))}
    </div>
  </div>
);

interface UserNotificationCenterProps {
  items: NotificationItem[];
  loading: boolean;
  selected: NotificationItem | null;
  responseMessageDraft: string;
  onSelect: (item: NotificationItem) => void;
  onDraftChange: (value: string) => void;
  onMarkAsRead: (notificationId: number) => void;
  onRespond: (notificationId: number, status: NotificationResponseStatus, responseMessage?: string) => void;
}

export const UserNotificationCenter = ({
  items,
  loading,
  selected,
  responseMessageDraft,
  onSelect,
  onDraftChange,
  onMarkAsRead,
  onRespond
}: UserNotificationCenterProps) => (
  <div className="grid gap-4 md:grid-cols-[1.6fr,1fr]">
    <div className="space-y-3 rounded-[1.5rem] bg-panel p-4">
      {loading && <p className="text-sm text-textMuted">Carregando...</p>}
      {!loading && items.length === 0 && <p className="text-sm text-textMuted">Nenhuma notificacao.</p>}
      {items.map((item) => (
        <button
          key={item.id}
          className={`w-full rounded-[1.25rem] border p-4 text-left transition ${
            item.isVisualized
              ? "border-outlineSoft bg-panelAlt/60 hover:bg-panelAlt"
              : item.priority === "critical"
                ? "border-danger/50 bg-danger/10 hover:bg-danger/15"
                : "border-accent/50 bg-accent/10 hover:bg-accent/15"
          }`}
          onClick={() => onSelect(item)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-textMain">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-textMuted">{item.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-textMuted">
                <span>{formatNotificationDate(item.createdAt)}</span>
                <span>{OPERATIONAL_STATUS_LABELS[item.operationalStatus]}</span>
                {item.responseMessage && <span>Com retorno</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {renderTaskLinkChip(item.sourceTaskId)}
              {!item.isVisualized && <span className="h-2 w-2 rounded-full bg-accent" />}
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
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
        </button>
      ))}
    </div>

    <aside className="rounded-[1.5rem] bg-panel p-4 ring-1 ring-outlineSoft/50">
      {!selected && <p className="text-sm text-textMuted">Selecione uma notificacao.</p>}
      {selected && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-accent">Detalhe da notificacao</p>
          <h3 className="font-display text-lg text-textMain">{selected.title}</h3>
          {selected.sourceTaskId ? (
            <p className="text-xs text-accent">Tarefa vinculada #{selected.sourceTaskId}</p>
          ) : null}
          <p className="whitespace-pre-wrap text-sm text-textMain">{selected.message}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-panelAlt/70 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Recebida</p>
              <p className="mt-1 text-sm text-textMain">{formatNotificationDate(selected.deliveredAt)}</p>
            </div>
            <div className="rounded-xl bg-panelAlt/70 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Estado atual</p>
              <p className="mt-1 text-sm text-textMain">
                {OPERATIONAL_STATUS_LABELS[selected.operationalStatus]}
              </p>
            </div>
            <div className="rounded-xl bg-panelAlt/70 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Visualizada em</p>
              <p className="mt-1 text-sm text-textMain">{formatNotificationDate(selected.visualizedAt)}</p>
            </div>
            <div className="rounded-xl bg-panelAlt/70 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Mensagem atual</p>
              <p className="mt-1 text-sm text-textMain">
                {selected.responseMessage || "Sem retorno registrado"}
              </p>
            </div>
          </div>

          {!selected.isVisualized && (
            <div className="rounded-2xl border border-success/30 bg-success/10 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-success">Proxima acao</p>
              <button
                className="btn-success mt-2 w-full"
                onClick={() => onMarkAsRead(selected.id)}
              >
                Marcar como visualizada
              </button>
            </div>
          )}

          <UserNotificationResponseActions
            notificationId={selected.id}
            responseMessageDraft={responseMessageDraft}
            onRespond={onRespond}
          />

          <label className="block space-y-1">
            <span className="text-xs text-textMuted">Mensagem de retorno opcional</span>
            <textarea
              className="input min-h-20"
              placeholder="Adicione contexto para sua resposta, se necessario"
              value={responseMessageDraft}
              onChange={(event) => onDraftChange(event.target.value)}
            />
          </label>
        </div>
      )}
    </aside>
  </div>
);

interface UserNotificationSummaryProps {
  dashboardItems: NotificationItem[];
  loading: boolean;
  onOpenAllNotifications: () => void;
}

export const UserNotificationSummary = ({
  dashboardItems,
  loading,
  onOpenAllNotifications
}: UserNotificationSummaryProps) => (
  <article className="rounded-[1.5rem] bg-panel p-4">
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-lg text-textMain">Pendencias recentes</h3>
        <p className="text-sm text-textMuted">Resumo do que ainda precisa de acao</p>
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
          className={`rounded-[1.25rem] border p-4 ${
            item.priority === "critical"
              ? "border-danger/60 bg-danger/10"
              : item.operationalStatus === "em_andamento"
                ? "border-accent/50 bg-accent/10"
                : "border-outlineSoft bg-panelAlt/70"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-textMain">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-textMuted">{item.message}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="rounded-full bg-panel px-2.5 py-1 text-[11px] text-textMuted">
                {OPERATIONAL_STATUS_LABELS[item.operationalStatus]}
              </span>
              {renderTaskLinkChip(item.sourceTaskId)}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-textMuted">
            <span>{formatNotificationDate(item.createdAt)}</span>
            <span>Prioridade: {PRIORITY_LABELS[item.priority]}</span>
            {!item.isVisualized && <span>Nao visualizada</span>}
          </div>
        </div>
      ))}
    </div>
  </article>
);

interface UserCriticalNotificationModalProps {
  criticalModal: NotificationItem;
  responseMessageDraft: string;
  onDraftChange: (value: string) => void;
  onMarkAsRead: (notificationId: number) => void;
  onClose: () => void;
  onRespond: (notificationId: number, status: NotificationResponseStatus, responseMessage?: string) => void;
}

export const UserCriticalNotificationModal = ({
  criticalModal,
  responseMessageDraft,
  onDraftChange,
  onMarkAsRead,
  onClose,
  onRespond
}: UserCriticalNotificationModalProps) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-textMain/70 px-4">
    <div className="w-full max-w-lg rounded-2xl border border-danger bg-panel p-5 shadow-glow">
      <p className="text-xs uppercase tracking-[0.2em] text-danger">Notificacao critica</p>
      <h3 className="mt-2 font-display text-xl text-textMain">{criticalModal.title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm text-textMain">{criticalModal.message}</p>
      <p className="mt-3 text-xs text-textMuted">
        Recebida em {formatNotificationDate(criticalModal.createdAt)}
      </p>

      <label className="mt-3 block space-y-1">
        <span className="text-xs text-textMuted">Mensagem de retorno opcional</span>
        <textarea
          className="input min-h-20"
          placeholder="Adicione contexto para sua resposta, se necessario"
          value={responseMessageDraft}
          onChange={(event) => onDraftChange(event.target.value)}
        />
      </label>

      <div className="mt-4">
        <UserNotificationResponseActions
          notificationId={criticalModal.id}
          responseMessageDraft={responseMessageDraft}
          onRespond={onRespond}
        />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          className="btn-success flex-1"
          onClick={() => onMarkAsRead(criticalModal.id)}
        >
          Marcar como visualizada
        </button>
        <button
          className="flex-1 rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
    </div>
  </div>
);
