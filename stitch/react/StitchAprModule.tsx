import { StitchMetricGrid, StitchSection, StitchTableShell } from "./StitchPrimitives";
import { StitchShell } from "./StitchShell";

export const StitchAprModule = () => {
  return (
    <StitchShell
      title="Noctification"
      subtitle="APR module"
      navItems={[
        { id: "dashboard", label: "Dashboard", icon: "DB" },
        { id: "tasks", label: "Tasks", icon: "TK" },
        { id: "admin", label: "Admin", icon: "AD" },
        { id: "apr", label: "APR", icon: "AR", active: true },
        { id: "notifications", label: "Notifications", icon: "NT" }
      ]}
    >
      <div className="space-y-8">
        <StitchSection
          title="Analise Preliminar de Risco"
          subtitle="Referencia de composicao Stitch para o modulo APR"
          actions={
            <>
              <button className="rounded-md bg-[#e2e7ff] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em]">
                Export apr-core
              </button>
              <button className="rounded-md bg-gradient-to-br from-black to-[#188ace] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white">
                Create New Entry
              </button>
            </>
          }
        >
          <StitchMetricGrid
            items={[
              { id: "manual", label: "Manual rows", value: "128", detail: "Current month", tone: "default" },
              { id: "system", label: "System rows", value: "131", detail: "Current month", tone: "info" },
              { id: "divergent", label: "Divergences", value: "3", detail: "Need review", tone: "warning" },
              { id: "history", label: "History changes", value: "12", detail: "Compared with previous month", tone: "success" }
            ]}
          />
        </StitchSection>

        <div className="grid gap-8 xl:grid-cols-[minmax(18rem,0.8fr),minmax(0,1.2fr)]">
          <StitchSection title="Dynamic Risk Matrix" subtitle="Bloco visual do Stitch; nao existe componente equivalente hoje">
            <div className="grid aspect-square grid-cols-5 gap-1">
              {Array.from({ length: 25 }, (_, index) => (
                <div key={index} className="rounded-sm bg-[#dae2fd]" />
              ))}
            </div>
          </StitchSection>

          <StitchSection title="Rule Configuration" subtitle="Referencia para reorganizar o formulario manual sem perder o fluxo real">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-white p-4 text-sm text-[#515f74]">Rule identification</div>
              <div className="rounded-xl bg-white p-4 text-sm text-[#515f74]">Probability / Impact</div>
              <div className="rounded-xl bg-white p-4 text-sm text-[#515f74] md:col-span-2">Hazard description / mitigation strategy</div>
            </div>
          </StitchSection>
        </div>

        <StitchSection title="Active Registry & Approvals" subtitle="Tabela base para integrar com audit e history reais do modulo">
          <StitchTableShell
            columns={["ID / Rule Reference", "Status", "Risk Level", "Owner", "Actions"]}
            rows={[
              ["APR-2024-001", "Active", "High", "E. Vance", "View"],
              ["APR-2024-042", "Pending Approval", "Moderate", "S. Kaine", "Approve"],
              ["APR-2024-089", "Draft", "Extreme", "J. Doe", "Edit"]
            ]}
          />
        </StitchSection>
      </div>
    </StitchShell>
  );
};
