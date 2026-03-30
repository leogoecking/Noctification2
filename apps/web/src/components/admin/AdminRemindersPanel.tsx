import type { ReminderOccurrenceItem } from "../../types";
import {
  type OccurrenceAdminFilterMode,
  type ReminderAdminFilterMode,
  useAdminRemindersData
} from "./useAdminRemindersData";

interface AdminRemindersPanelProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

export const AdminRemindersPanel = ({ onError, onToast }: AdminRemindersPanelProps) => {
  const {
    health,
    reminders,
    occurrences,
    loading,
    userFilter,
    reminderFilter,
    occurrenceFilter,
    stats,
    setUserFilter,
    setReminderFilter,
    setOccurrenceFilter,
    toggleReminder
  } = useAdminRemindersData({ onError, onToast });

  const formatOccurrenceStatus = (status: ReminderOccurrenceItem["status"]) => {
    if (status === "pending") return "Pendente";
    if (status === "completed") return "Concluida";
    if (status === "expired") return "Expirada";
    return "Cancelada";
  };

  return (
    <section className="space-y-6">
      <header className="rounded-[1.25rem] bg-panelAlt/80 p-6 shadow-glow">
        <h3 className="font-display text-3xl font-extrabold tracking-tight text-textMain">Lembretes</h3>
        <p className="mt-2 text-sm text-textMuted">Visao administrativa dos lembretes dos usuarios</p>
      </header>

      {health && !health.schedulerEnabled && (
        <article className="rounded-[1.25rem] border border-warning/50 bg-warning/10 p-5">
          <p className="font-display text-base text-textMain">Scheduler de lembretes desativado</p>
          <p className="mt-1 text-sm text-textMuted">
            Os lembretes nao vao disparar enquanto `ENABLE_REMINDER_SCHEDULER` estiver desligado na API.
          </p>
        </article>
      )}

      <section className="grid gap-3 md:grid-cols-4">
        <article className="rounded-[1.25rem] bg-panel p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Lembretes</p>
          <p className="mt-2 font-display text-2xl text-textMain">{stats.reminders}</p>
        </article>
        <article className="rounded-[1.25rem] bg-panel p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-success">Ativos</p>
          <p className="mt-2 font-display text-2xl text-textMain">{stats.active}</p>
        </article>
        <article className="rounded-[1.25rem] bg-panel p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-warning">Pendentes</p>
          <p className="mt-2 font-display text-2xl text-textMain">{stats.pending}</p>
        </article>
        <article className="rounded-[1.25rem] bg-panel p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Concluidas</p>
          <p className="mt-2 font-display text-2xl text-textMain">{stats.completed}</p>
          <p className="mt-1 text-xs text-textMuted">Hoje</p>
        </article>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-[1.25rem] bg-panel p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-warning">Expiradas hoje</p>
          <p className="mt-2 font-display text-2xl text-textMain">{stats.expiredToday}</p>
        </article>
        <article className="rounded-[1.25rem] bg-panel p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Disparos hoje</p>
          <p className="mt-2 font-display text-2xl text-textMain">{stats.deliveriesToday}</p>
        </article>
        <article className="rounded-[1.25rem] bg-panel p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Retries hoje</p>
          <p className="mt-2 font-display text-2xl text-textMain">{stats.retriesToday}</p>
        </article>
      </section>

      <article className="rounded-[1.25rem] bg-panel p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-display text-base text-textMain">Lembretes cadastrados</h4>
          <div className="flex flex-wrap gap-2">
            <input
              className="input w-32"
              placeholder="Usuario ou login"
              value={userFilter}
              onChange={(event) => setUserFilter(event.target.value)}
            />
            {[
              { label: "Todos", value: "all" },
              { label: "Ativos", value: "active" },
              { label: "Inativos", value: "inactive" }
            ].map((option) => (
              <button
                key={option.value}
                className={`rounded-lg px-3 py-2 text-xs ${
                  reminderFilter === option.value
                    ? "bg-accent text-white"
                    : "border border-outlineSoft bg-panel text-textMain"
                }`}
                onClick={() => setReminderFilter(option.value as ReminderAdminFilterMode)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {loading && <p className="text-sm text-textMuted">Carregando...</p>}
        {!loading && reminders.length === 0 && <p className="text-sm text-textMuted">Nenhum lembrete encontrado.</p>}
        <div className="space-y-2">
          {reminders.map((item) => (
            <div key={item.id} className="rounded-xl bg-panelAlt p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-textMain">{item.title}</p>
                  <p className="text-xs text-textMuted">
                    {(item.userName || item.userLogin)
                      ? `${item.userName ?? "-"} (${item.userLogin ?? "-"})`
                      : `Usuario #${item.userId}`}{" "}
                    | {item.startDate} {item.timeOfDay} | {item.repeatType}
                  </p>
                </div>
                <button className="rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-xs text-textMain" onClick={() => toggleReminder(item)}>
                  {item.isActive ? "Desativar" : "Ativar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-[1.25rem] bg-panel p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-display text-base text-textMain">Ocorrencias recentes</h4>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Todas", value: "all" },
              { label: "Hoje", value: "today" },
              { label: "Pendentes", value: "pending" },
              { label: "Concluidas", value: "completed" },
              { label: "Expiradas", value: "expired" }
            ].map((option) => (
              <button
                key={option.value}
                className={`rounded-lg px-3 py-2 text-xs ${
                  occurrenceFilter === option.value
                    ? "bg-accent text-white"
                    : "border border-outlineSoft bg-panel text-textMain"
                }`}
                onClick={() => setOccurrenceFilter(option.value as OccurrenceAdminFilterMode)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {occurrences.length === 0 && <p className="text-sm text-textMuted">Nenhuma ocorrencia registrada.</p>}
        <div className="space-y-2">
          {occurrences.map((item) => (
            <div key={item.id} className="rounded-xl bg-panelAlt p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-textMain">{item.title}</p>
                <span className="rounded-md bg-panel px-2 py-1 text-xs text-textMuted">
                  {formatOccurrenceStatus(item.status)}
                </span>
              </div>
              <p className="mt-1 text-xs text-textMuted">
                {(item.userName || item.userLogin)
                  ? `${item.userName ?? "-"} (${item.userLogin ?? "-"})`
                  : `Usuario #${item.userId}`}{" "}
                | Agendado para {new Date(item.scheduledFor).toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-xs text-textMuted">Tentativas: {item.retryCount}</p>
              {item.completedAt && (
                <p className="mt-1 text-xs text-textMuted">
                  Concluida em {new Date(item.completedAt).toLocaleString("pt-BR")}
                </p>
              )}
              {item.expiredAt && (
                <p className="mt-1 text-xs text-textMuted">
                  Expirada em {new Date(item.expiredAt).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
};
