import type { ReminderOccurrenceItem } from "../../types";

interface ReminderPendingListProps {
  pendingOccurrences: ReminderOccurrenceItem[];
  pendingCount: number;
  onCompleteOccurrence: (id: number) => void;
}

export const ReminderPendingList = ({
  pendingOccurrences,
  pendingCount,
  onCompleteOccurrence
}: ReminderPendingListProps) => {
  return (
    <article className="rounded-2xl border border-warning/40 bg-warning/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h4 className="font-display text-base text-textMain">Ocorrencias pendentes agora</h4>
          <p className="text-sm text-textMuted">Itens que exigem sua confirmacao</p>
        </div>
        <span className="rounded-full bg-warning/20 px-3 py-1 text-xs text-warning">
          {pendingCount} pendentes
        </span>
      </div>
      {pendingOccurrences.length === 0 && (
        <p className="text-sm text-textMuted">
          Nenhuma ocorrencia pendente no momento. Seus proximos lembretes aparecerao aqui.
        </p>
      )}
      <div className="space-y-2">
        {pendingOccurrences.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-700 bg-panel p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-textMain">{item.title}</p>
              <span className="rounded-full bg-warning/20 px-2.5 py-1 text-xs text-warning">
                Tentativas: {item.retryCount}
              </span>
            </div>
            <p className="mt-1 text-xs text-textMuted">
              Agendado para {new Date(item.scheduledFor).toLocaleString("pt-BR")}
            </p>
            {item.description && (
              <p className="mt-2 line-clamp-2 text-sm text-textMuted">{item.description}</p>
            )}
            <button
              className="mt-3 rounded-lg bg-success px-3 py-2 text-xs font-semibold text-slate-900"
              onClick={() => onCompleteOccurrence(item.id)}
            >
              Concluir
            </button>
          </div>
        ))}
      </div>
    </article>
  );
};
