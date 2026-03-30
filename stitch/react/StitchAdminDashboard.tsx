import { StitchMetricGrid, StitchSection, StitchTableShell } from "./StitchPrimitives";
import { StitchShell } from "./StitchShell";

export const StitchAdminDashboard = () => {
  return (
    <StitchShell
      title="Noctification"
      subtitle="Operations admin"
      navItems={[
        { id: "dashboard", label: "Dashboard", icon: "DB" },
        { id: "tasks", label: "Tasks", icon: "TK" },
        { id: "admin", label: "Admin", icon: "AD", active: true },
        { id: "apr", label: "APR", icon: "AR" },
        { id: "notifications", label: "Notifications", icon: "NT" }
      ]}
    >
      <div className="space-y-8">
        <StitchMetricGrid
          items={[
            { id: "completion", label: "Avg Completion Time", value: "1.2s", detail: "-12% vs last hour", tone: "success" },
            { id: "sla", label: "SLA Compliance", value: "99.8%", detail: "Within target range", tone: "info" },
            { id: "sessions", label: "Active Sessions", value: "1,402", detail: "+8% active now", tone: "success" },
            { id: "health", label: "System Health", value: "Healthy", detail: "Express API, Socket.IO, SQLite", tone: "info" }
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr),minmax(22rem,1fr)]">
          <StitchSection title="Operational Task Queue" subtitle="Tabela para integrar com a fila real do admin">
            <StitchTableShell
              columns={["ID / Reference", "Department", "Status", "ETA", "Action"]}
              rows={[
                ["NTF-8291", "Security Ops", "Critical", "2 mins", "Open"],
                ["NTF-8304", "Infrastructure", "In Progress", "14 mins", "Open"],
                ["NTF-8311", "Support Tier 2", "Pending", "45 mins", "Open"]
              ]}
            />
          </StitchSection>

          <div className="space-y-8">
            <StitchSection title="Active Administrators" subtitle="Card list de referencia do Stitch">
              <div className="space-y-3 text-xs text-[#515f74]">
                <p>Jordan Smith</p>
                <p>Sarah Chen</p>
                <p>Marcus Thorne</p>
              </div>
            </StitchSection>

            <StitchSection title="SLA Performance" subtitle="Widget visual de referencia">
              <div className="h-32 rounded-xl bg-[#131b2e] p-4 text-xs text-white">
                Spike detected in API latency during node synchronization
              </div>
            </StitchSection>
          </div>
        </div>
      </div>
    </StitchShell>
  );
};
