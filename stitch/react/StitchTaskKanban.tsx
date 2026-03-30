import { StitchSection } from "./StitchPrimitives";
import { StitchShell } from "./StitchShell";

const columns = [
  { id: "backlog", label: "Backlog", cards: ["Validate Q3 infrastructure cost redistribution", "Database indexing optimization"] },
  { id: "todo", label: "To Do", cards: ["Resolve notification dispatch latency"] },
  { id: "in_progress", label: "In Progress", cards: ["Draft new APR compliance documentation", "Webhook verification"] },
  { id: "blocked", label: "Blocked", cards: ["Security patch deployment for legacy SMTP relays"] },
  { id: "review", label: "Review", cards: [] },
  { id: "done", label: "Completed", cards: ["Onboard 4 new agents to notification triage cluster"] }
];

export const StitchTaskKanban = () => {
  return (
    <StitchShell
      title="Noctification"
      subtitle="Task kanban"
      navItems={[
        { id: "dashboard", label: "Dashboard", icon: "DB" },
        { id: "tasks", label: "Tasks", icon: "TK", active: true },
        { id: "admin", label: "Admin", icon: "AD" },
        { id: "apr", label: "APR", icon: "AR" },
        { id: "notifications", label: "Notifications", icon: "NT" }
      ]}
    >
      <div className="space-y-6">
        <StitchSection title="Operational filters" subtitle="Estrutura visual do Stitch para filtros do kanban">
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="rounded-lg bg-white px-3 py-2">Assignee</div>
            <div className="rounded-lg bg-white px-3 py-2">Priority</div>
            <div className="rounded-lg bg-white px-3 py-2">SLA Status</div>
            <div className="rounded-lg bg-white px-3 py-2">More Filters</div>
          </div>
        </StitchSection>

        <div className="flex gap-6 overflow-x-auto pb-4">
          {columns.map((column) => (
            <section key={column.id} className="w-80 flex-none">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-[0.18em] text-[#515f74]">
                  {column.label}
                </h2>
                <span className="rounded-full bg-[#dae2fd] px-2 py-0.5 text-[10px] font-bold">
                  {column.cards.length}
                </span>
              </div>
              <div className="space-y-4">
                {column.cards.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#c6c6cd] bg-[#f2f3ff] p-6 text-xs text-[#515f74]">
                    Drop here to assign review
                  </div>
                ) : (
                  column.cards.map((card) => (
                    <article key={card} className="rounded-xl bg-white p-4 shadow-sm">
                      <p className="text-sm font-bold text-slate-900">{card}</p>
                      <p className="mt-2 text-xs text-[#515f74]">
                        Adaptar este card para o componente real do board sem perder drag and drop, SLA e filtros.
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </StitchShell>
  );
};
