import { StitchMetricGrid, StitchSection, StitchTableShell } from "./StitchPrimitives";
import { StitchShell } from "./StitchShell";

export const StitchDashboardMain = () => {
  return (
    <StitchShell
      title="Noctification"
      subtitle="Dashboard overview"
      navItems={[
        { id: "dashboard", label: "Dashboard", icon: "DB", active: true },
        { id: "tasks", label: "Tasks", icon: "TK" },
        { id: "admin", label: "Admin", icon: "AD" },
        { id: "apr", label: "APR", icon: "AR" },
        { id: "notifications", label: "Notifications", icon: "NT" }
      ]}
    >
      <div className="space-y-8">
        <StitchMetricGrid
          items={[
            { id: "active", label: "Active Tasks", value: "1,284", detail: "+12% vs last shift", tone: "info" },
            { id: "sla", label: "SLA Warning", value: "42", detail: "Requiring immediate attention", tone: "warning" },
            { id: "critical", label: "Critical Failures", value: "09", detail: "Escalation protocol active", tone: "danger" },
            { id: "apr", label: "APR Compliance", value: "99.4%", detail: "Current compliance baseline", tone: "success" }
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr),minmax(20rem,1fr)]">
          <StitchSection title="Live Notification Stream" subtitle="Referencia do Stitch para o dashboard principal">
            <div className="space-y-3">
              {["Database Latency Spike", "New Admin Provisioned", "APR Module Backup Complete"].map((item) => (
                <article key={item} className="rounded-xl bg-white p-4">
                  <p className="text-sm font-bold text-slate-900">{item}</p>
                  <p className="mt-1 text-xs text-[#515f74]">
                    Este card deve ser abastecido pelos dados reais da central de notificacoes existente.
                  </p>
                </article>
              ))}
            </div>
          </StitchSection>

          <div className="space-y-8">
            <StitchSection title="Reminders" subtitle="Widget para migrar a partir do modulo de lembretes atual">
              <div className="space-y-3 text-xs text-[#515f74]">
                <p>Security Audit Review</p>
                <p>Weekly Sync</p>
              </div>
            </StitchSection>

            <StitchSection title="System Health" subtitle="Resumo operacional de referencia">
              <div className="space-y-3 text-xs text-[#515f74]">
                <p>Memory Load</p>
                <p>Worker Threads</p>
                <p>Global System Operational</p>
              </div>
            </StitchSection>
          </div>
        </div>

        <StitchSection title="Task Throughput" subtitle="Tabela de referencia para integrar com dados reais">
          <StitchTableShell
            columns={["Task ID", "Operator", "Status", "SLA", "Complexity", "Action"]}
            rows={[
              ["#NC-88219", "Orchestrator Node B", "Processing", "04:12:00", "2/3", "More"],
              ["#NC-88220", "System Admin", "Pending Review", "00:15:30", "3/3", "More"],
              ["#NC-88221", "Auto-Ingress", "Queued", "--:--:--", "1/3", "More"]
            ]}
          />
        </StitchSection>
      </div>
    </StitchShell>
  );
};
