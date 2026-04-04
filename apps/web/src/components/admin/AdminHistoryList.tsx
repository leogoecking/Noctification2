import type { NotificationHistoryItem } from "../../types";
import { formatDate, hasRecipientResponse, operationalStatusLabel } from "./utils";

interface AdminHistoryListProps {
  loadingHistoryAll: boolean;
  historyAll: NotificationHistoryItem[];
}

export const AdminHistoryList = ({
  loadingHistoryAll,
  historyAll
}: AdminHistoryListProps) => {
  if (loadingHistoryAll) {
    return <p className="text-sm text-textMuted">Carregando...</p>;
  }

  if (historyAll.length === 0) {
    return <p className="text-sm text-textMuted">Nenhuma notificacao no historico.</p>;
  }

  return (
    <div className="space-y-3">
      {historyAll.map((item) => {
        const notificationResponses = item.recipients.filter(hasRecipientResponse);

        return (
          <div key={item.id} className="rounded-xl bg-panelAlt p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-textMain">{item.title}</p>
                <p className="text-xs text-textMuted">Enviada em {formatDate(item.created_at)}</p>
              </div>
              <span className="rounded-md bg-accent/20 px-2 py-1 text-xs text-accent">
                {item.recipient_mode === "all" ? "Todos" : "Usuarios especificos"}
              </span>
            </div>
            {item.source_task_id ? (
              <p className="mt-2 text-xs text-accent">Tarefa vinculada #{item.source_task_id}</p>
            ) : null}
            <p className="mt-2 text-sm text-textMuted">{item.message}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-panel px-2 py-1 text-textMuted">
                Total: {item.stats.total}
              </span>
              <span className="rounded-md bg-success/20 px-2 py-1 text-success">
                Visualizadas: {item.stats.read}
              </span>
              <span className="rounded-md bg-warning/20 px-2 py-1 text-warning">
                Nao visualizadas: {item.stats.unread}
              </span>
              <span className="rounded-md bg-panel px-2 py-1 text-textMuted">
                Visualizadas: {item.stats.visualized ?? 0}
              </span>
              <span className="rounded-md bg-accent/20 px-2 py-1 text-xs text-accent">
                Em andamento: {item.stats.inProgress}
              </span>
              <span className="rounded-md bg-success/20 px-2 py-1 text-xs text-success">
                Assumidas: {item.stats.assumed ?? 0}
              </span>
              <span className="rounded-md bg-success/20 px-2 py-1 text-xs text-success">
                Resolvidas: {item.stats.resolved}
              </span>
              <span className="rounded-md bg-panel px-2 py-1 text-textMuted">
                Com resposta: {item.stats.responded}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {notificationResponses.length === 0 ? (
                <p className="text-xs text-textMuted">Sem respostas para esta notificacao.</p>
              ) : null}

              {notificationResponses.map((recipient) => (
                <div
                  key={recipient.userId}
                  className="rounded-lg border border-outlineSoft bg-panel px-2 py-2"
                >
                  <p className="text-xs text-textMain">
                    <span className="font-semibold">{recipient.name}</span> ({recipient.login}) -{" "}
                    {operationalStatusLabel(recipient.operationalStatus)}
                  </p>
                  <p className="text-[11px] text-textMuted">
                    Visualizada em: {formatDate(recipient.visualizedAt)}
                  </p>
                  <p className="text-[11px] text-textMuted">
                    Mensagem: {recipient.responseMessage?.trim() || "(sem mensagem)"}
                  </p>
                  {recipient.operationalStatus === "em_andamento" &&
                  Boolean(recipient.responseMessage?.trim()) ? (
                    <p className="text-[11px] font-semibold text-accent">
                      Retorno em andamento: {recipient.responseMessage?.trim()}
                    </p>
                  ) : null}
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
  );
};
