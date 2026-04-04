import type { TaskAutomationHealthItem, TaskMetricsSummaryItem } from "../../../types";
import type { AdminTaskMetricsWindow } from "./adminTasksPanelModel";

interface AdminTaskAnalyticsDialogProps {
  open: boolean;
  onClose: () => void;
  metricsWindow: AdminTaskMetricsWindow;
  onMetricsWindowChange: (window: AdminTaskMetricsWindow) => void;
  capacityView: "assignee" | "department";
  onCapacityViewChange: (view: "assignee" | "department") => void;
  metricsUnavailable: boolean;
  productivityMetrics: TaskMetricsSummaryItem["productivity"] | null;
  capacityItems: TaskMetricsSummaryItem["capacityByAssignee"];
  departmentCapacityItems: TaskMetricsSummaryItem["capacityByDepartment"];
  automationHealth: TaskAutomationHealthItem | null;
}

export const AdminTaskAnalyticsDialog = ({
  open,
  onClose,
  metricsWindow,
  onMetricsWindowChange,
  capacityView,
  onCapacityViewChange,
  metricsUnavailable,
  productivityMetrics,
  capacityItems,
  departmentCapacityItems,
  automationHealth
}: AdminTaskAnalyticsDialogProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
      <div
        aria-label="Indicadores da fila"
        aria-modal="true"
        className="max-h-[85vh] w-full max-w-6xl overflow-y-auto rounded-[1.5rem] bg-panel p-6 shadow-sm"
        role="dialog"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-textMuted">
              Indicadores secundarios
            </p>
            <h3 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-textMain">
              Produtividade, capacidade e automacao
            </h3>
            <p className="mt-2 text-sm text-textMuted">
              Analise complementar fora da operacao principal do kanban.
            </p>
          </div>
          <button
            className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-xs text-textMain"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
        </div>

        <div className="space-y-4">
          <article className="rounded-[1.25rem] bg-panelAlt/80 p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-textMuted">Produtividade</p>
                <h4 className="mt-1 font-display text-base text-textMain">Janela operacional</h4>
                <p className="text-sm text-textMuted">Metricas da fila filtrada para acompanhamento do time.</p>
              </div>
              <div className="flex gap-2">
                <button
                  aria-pressed={metricsWindow === "7d"}
                  className={`rounded-full px-3 py-1.5 text-xs ${
                    metricsWindow === "7d" ? "bg-accent text-white" : "bg-panelAlt text-textMain"
                  }`}
                  onClick={() => onMetricsWindowChange("7d")}
                  type="button"
                >
                  7 dias
                </button>
                <button
                  aria-pressed={metricsWindow === "30d"}
                  className={`rounded-full px-3 py-1.5 text-xs ${
                    metricsWindow === "30d" ? "bg-accent text-white" : "bg-panelAlt text-textMain"
                  }`}
                  onClick={() => onMetricsWindowChange("30d")}
                  type="button"
                >
                  30 dias
                </button>
              </div>
            </div>
            {!productivityMetrics ? (
              <p className="text-sm text-textMuted">
                {metricsUnavailable ? "Metricas indisponiveis no momento." : "Carregando metricas..."}
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.25rem] bg-panel p-4 ring-1 ring-outlineSoft/50">
                  <p className="text-xs uppercase tracking-wider text-textMuted">Entrega</p>
                  <p className="mt-2 text-2xl font-semibold text-textMain">{productivityMetrics.completedInWindow}</p>
                  <p className="mt-1 text-sm text-textMuted">
                    concluidas nos ultimos {productivityMetrics.windowDays} dias
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-success/20 px-2.5 py-1 text-success">
                      {productivityMetrics.completedOnTime} no prazo
                    </span>
                    <span className="rounded-full bg-danger/20 px-2.5 py-1 text-danger">
                      {productivityMetrics.completedLate} em atraso
                    </span>
                    <span className="rounded-full bg-panelAlt px-2.5 py-1 text-textMain">
                      taxa no prazo{" "}
                      {productivityMetrics.onTimeRate === null
                        ? "-"
                        : `${Math.round(productivityMetrics.onTimeRate * 100)}%`}
                    </span>
                  </div>
                </div>
                <div className="rounded-[1.25rem] bg-panel p-4 ring-1 ring-outlineSoft/50">
                  <p className="text-xs uppercase tracking-wider text-textMuted">Fluxo</p>
                  <p className="mt-2 text-2xl font-semibold text-textMain">{productivityMetrics.createdInWindow}</p>
                  <p className="mt-1 text-sm text-textMuted">
                    criadas nos ultimos {productivityMetrics.windowDays} dias
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 text-accent">
                      throughput{" "}
                      {productivityMetrics.completionRate === null
                        ? "-"
                        : `${Math.round(productivityMetrics.completionRate * 100)}%`}
                    </span>
                    <span className="rounded-full bg-panelAlt px-2.5 py-1 text-textMain">
                      ciclo medio{" "}
                      {productivityMetrics.avgCycleHours === null
                        ? "-"
                        : `${productivityMetrics.avgCycleHours.toFixed(1)}h`}
                    </span>
                    <span className="rounded-full bg-panelAlt px-2.5 py-1 text-textMain">
                      inicio medio{" "}
                      {productivityMetrics.avgStartLagHours === null
                        ? "-"
                        : `${productivityMetrics.avgStartLagHours.toFixed(1)}h`}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </article>

          <article className="rounded-[1.5rem] bg-panelAlt/80 p-4 ring-1 ring-outlineSoft/50">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-textMuted">Capacidade</p>
                <h4 className="mt-1 font-display text-base text-textMain">Carga por responsavel ou equipe</h4>
                <p className="text-sm text-textMuted">Resumo operacional do filtro atual por pessoa ou departamento.</p>
              </div>
              <div className="flex gap-2">
                <button
                  aria-pressed={capacityView === "assignee"}
                  className={`rounded-full px-3 py-1.5 text-xs ${
                    capacityView === "assignee" ? "bg-accent text-white" : "bg-panel text-textMain"
                  }`}
                  onClick={() => onCapacityViewChange("assignee")}
                  type="button"
                >
                  Responsavel
                </button>
                <button
                  aria-pressed={capacityView === "department"}
                  className={`rounded-full px-3 py-1.5 text-xs ${
                    capacityView === "department" ? "bg-accent text-white" : "bg-panel text-textMain"
                  }`}
                  onClick={() => onCapacityViewChange("department")}
                  type="button"
                >
                  Equipe
                </button>
              </div>
            </div>
            {capacityView === "assignee" && capacityItems.length === 0 ? (
              <p className="text-sm text-textMuted">Nenhum responsavel visivel para o filtro atual.</p>
            ) : capacityView === "department" && departmentCapacityItems.length === 0 ? (
              <p className="text-sm text-textMuted">Nenhuma equipe visivel para o filtro atual.</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {capacityView === "assignee" &&
                  capacityItems.map((item) => (
                    <div key={item.assigneeKey} className="rounded-[1.25rem] bg-panel p-4 ring-1 ring-outlineSoft/50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-textMain">{item.assigneeLabel}</p>
                          <p className="text-xs text-textMuted">{item.open} abertas no filtro</p>
                        </div>
                        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] text-accent">
                          {item.done} concluidas
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-panelAlt px-2.5 py-1 text-textMain">
                          {item.open} abertas
                        </span>
                        <span className="rounded-full bg-danger/20 px-2.5 py-1 text-danger">
                          {item.overdue} atrasadas
                        </span>
                        <span className="rounded-full bg-danger/20 px-2.5 py-1 text-danger">
                          {item.critical} criticas
                        </span>
                        <span className="rounded-full bg-success/20 px-2.5 py-1 text-success">
                          {item.completedOnTime} no prazo
                        </span>
                        <span className="rounded-full bg-panelAlt px-2.5 py-1 text-textMain">
                          ciclo {item.avgCycleHours === null ? "-" : `${item.avgCycleHours.toFixed(1)}h`}
                        </span>
                      </div>
                    </div>
                  ))}
                {capacityView === "department" &&
                  departmentCapacityItems.map((item) => (
                    <div key={item.departmentKey} className="rounded-[1.25rem] bg-panel p-4 ring-1 ring-outlineSoft/50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-textMain">{item.departmentLabel}</p>
                          <p className="text-xs text-textMuted">{item.members} membro(s) ativos</p>
                        </div>
                        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] text-accent">
                          {item.open} abertas
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-danger/20 px-2.5 py-1 text-danger">
                          {item.overdue} atrasadas
                        </span>
                        <span className="rounded-full bg-danger/20 px-2.5 py-1 text-danger">
                          {item.critical} criticas
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </article>

          {automationHealth && (
            <article className="rounded-[1.5rem] bg-panelAlt/80 p-4 ring-1 ring-outlineSoft/50">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-textMuted">Automacao</p>
                  <h4 className="mt-1 font-display text-base text-textMain">Precisa de atencao</h4>
                  <p className="text-sm text-textMuted">
                    Visao do scheduler para atraso e tarefa parada na fila atual.
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1.5 text-xs ${
                    automationHealth.schedulerEnabled
                      ? "bg-success/20 text-success"
                      : "bg-danger/20 text-danger"
                  }`}
                >
                  {automationHealth.schedulerEnabled ? "Scheduler ativo" : "Scheduler inativo"}
                </span>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                <span className="rounded-2xl bg-danger/10 px-3 py-3 text-sm text-danger">
                  {automationHealth.overdueEligible} atrasadas
                </span>
                <span className="rounded-2xl bg-warning/20 px-3 py-3 text-sm text-warning">
                  {automationHealth.staleEligible} paradas 24h+
                </span>
                <span className="rounded-2xl bg-danger/20 px-3 py-3 text-sm text-danger">
                  {automationHealth.blockedEligible} bloqueadas 24h+
                </span>
                <span className="rounded-2xl bg-accent/10 px-3 py-3 text-sm text-accent">
                  {automationHealth.dueSoonEligible} vencendo em breve
                </span>
                <span className="rounded-2xl bg-panel px-3 py-3 text-sm text-textMain">
                  {automationHealth.overdueSentToday} alertas de atraso hoje
                </span>
                <span className="rounded-2xl bg-panel px-3 py-3 text-sm text-textMain">
                  {automationHealth.staleSentToday} alertas de parada hoje
                </span>
                <span className="rounded-2xl bg-panel px-3 py-3 text-sm text-textMain">
                  {automationHealth.blockedSentToday} alertas de bloqueio hoje
                </span>
                <span className="rounded-2xl bg-panel px-3 py-3 text-sm text-textMain">
                  Janela: {automationHealth.dueSoonWindowMinutes}min / {automationHealth.staleWindowHours}h
                </span>
              </div>
            </article>
          )}
        </div>
      </div>
    </div>
  );
};
