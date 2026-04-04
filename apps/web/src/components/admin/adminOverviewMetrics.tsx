import type { AdminMetrics } from "./types";

export const AdminOverviewMetrics = ({ metrics }: { metrics: AdminMetrics }) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <article className="rounded-[1.25rem] bg-panel p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-textMuted">
        Nao visualizadas
      </p>
      <p className="mt-3 font-display text-3xl font-black tracking-tight text-textMain">
        {metrics.pendingNotifications}
      </p>
      <p className="mt-1 text-xs text-textMuted">Pendencias novas aguardando leitura</p>
    </article>

    <article className="rounded-[1.25rem] bg-panel p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-textMuted">
        Pendencias operacionais
      </p>
      <p className="mt-3 font-display text-3xl font-black tracking-tight text-warning">
        {metrics.pendingRecipients}
      </p>
      <p className="mt-1 text-xs text-textMuted">Itens ainda em fluxo operacional</p>
    </article>

    <article className="rounded-[1.25rem] bg-panel p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-textMuted">
        Criticas abertas
      </p>
      <p className="mt-3 font-display text-3xl font-black tracking-tight text-danger">
        {metrics.criticalOpen}
      </p>
      <p className="mt-1 text-xs text-textMuted">Prioridade maxima na fila atual</p>
    </article>

    <article className="rounded-[1.25rem] bg-panel p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-textMuted">
        Em andamento
      </p>
      <p className="mt-3 font-display text-3xl font-black tracking-tight text-accent">
        {metrics.inProgressNotifications}
      </p>
      <p className="mt-1 text-xs text-textMuted">Notificacoes com retorno operacional em andamento</p>
    </article>
  </div>
);
