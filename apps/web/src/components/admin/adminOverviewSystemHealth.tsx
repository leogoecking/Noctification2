import type { TaskAutomationHealthItem } from "../../types";

interface AdminOverviewSystemHealthProps {
  taskHealth: TaskAutomationHealthItem | null;
  loading: boolean;
  onRefresh: () => void;
}

export const AdminOverviewSystemHealth = ({
  taskHealth,
  loading,
  onRefresh
}: AdminOverviewSystemHealthProps) => (
  <article className="rounded-[1.25rem] border-l-4 border-accent bg-panelAlt p-5">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h4 className="font-display text-lg text-textMain">System health</h4>
        <p className="text-sm text-textMuted">Resumo dos automatos com foco no que exige acao</p>
      </div>
      <button
        className="rounded-lg border border-outlineSoft bg-panel px-3 py-1.5 text-xs text-textMuted"
        onClick={onRefresh}
        type="button"
      >
        Atualizar
      </button>
    </div>

    {loading ? (
      <p className="text-sm text-textMuted">Carregando saude operacional...</p>
    ) : (
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              taskHealth?.schedulerEnabled ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
            }`}
          >
            Tarefas {taskHealth?.schedulerEnabled ? "ativas" : "inativas"}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-panel px-3 py-3">
            <p className="text-xs uppercase tracking-wider text-textMuted">A vencer</p>
            <p className="mt-2 text-xl font-bold text-textMain">
              {taskHealth?.dueSoonEligible ?? 0}
            </p>
            <p className="mt-1 text-xs text-textMuted">Tasks proximas do SLA configurado</p>
          </div>

          <div className="rounded-xl bg-panel px-3 py-3">
            <p className="text-xs uppercase tracking-wider text-textMuted">Vencidas</p>
            <p className="mt-2 text-xl font-bold text-danger">{taskHealth?.overdueEligible ?? 0}</p>
            <p className="mt-1 text-xs text-textMuted">Tasks elegiveis para alerta de atraso</p>
          </div>

          <div className="rounded-xl bg-panel px-3 py-3">
            <p className="text-xs uppercase tracking-wider text-textMuted">Alertas hoje</p>
            <p className="mt-2 text-xl font-bold text-textMain">
              {(taskHealth?.dueSoonSentToday ?? 0) +
                (taskHealth?.overdueSentToday ?? 0) +
                (taskHealth?.staleSentToday ?? 0) +
                (taskHealth?.blockedSentToday ?? 0)}
            </p>
            <p className="mt-1 text-xs text-textMuted">Disparos automaticos realizados hoje</p>
          </div>
        </div>

        <details className="rounded-xl bg-panel px-3 py-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-textMuted">
            Ver detalhes tecnicos
          </summary>
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-textMuted">Scheduler tarefas</span>
              <span className={taskHealth?.schedulerEnabled ? "text-success" : "text-warning"}>
                {taskHealth?.schedulerEnabled ? "Ativo" : "Inativo"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-textMuted">Tasks bloqueadas elegiveis</span>
              <span className="font-semibold text-warning">{taskHealth?.blockedEligible ?? 0}</span>
            </div>
          </div>
        </details>
      </div>
    )}
  </article>
);
