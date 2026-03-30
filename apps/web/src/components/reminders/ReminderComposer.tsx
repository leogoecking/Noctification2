import type { ReminderRepeatType } from "../../types";
import { REMINDER_WEEKDAY_LABELS } from "./reminderUi";

interface ReminderComposerForm {
  id: number;
  title: string;
  description: string;
  startDate: string;
  timeOfDay: string;
  timezone: string;
  repeatType: ReminderRepeatType;
  weekdays: number[];
}

interface ReminderComposerProps {
  composerOpen: boolean;
  form: ReminderComposerForm;
  onToggleComposer: () => void;
  onFormChange: (updater: (current: ReminderComposerForm) => ReminderComposerForm) => void;
  onSave: () => void;
  onReset: () => void;
}

export const ReminderComposer = ({
  composerOpen,
  form,
  onToggleComposer,
  onFormChange,
  onSave,
  onReset
}: ReminderComposerProps) => {
  return (
    <article className="rounded-[1.25rem] bg-panel p-5">
      <button
        aria-expanded={composerOpen || form.id > 0}
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={onToggleComposer}
        type="button"
      >
        <div>
          <h4 className="font-display text-base text-textMain">
            {form.id ? "Editar lembrete" : "Novo lembrete"}
          </h4>
          <p className="text-sm text-textMuted">Horario, repeticao e dias da semana</p>
        </div>
        <span className="rounded-full border border-outlineSoft bg-panelAlt px-3 py-1 text-xs text-textMain">
          {composerOpen || form.id > 0 ? "Ocultar" : "Abrir formulario"}
        </span>
      </button>

      {(composerOpen || form.id > 0) && (
        <div className="mt-4 space-y-3">
          <input
            className="input"
            placeholder="Titulo"
            value={form.title}
            onChange={(event) => onFormChange((current) => ({ ...current, title: event.target.value }))}
          />
          <textarea
            className="input min-h-24"
            placeholder="Descricao opcional"
            value={form.description}
            onChange={(event) => onFormChange((current) => ({ ...current, description: event.target.value }))}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="input"
              type="date"
              value={form.startDate}
              onChange={(event) => onFormChange((current) => ({ ...current, startDate: event.target.value }))}
            />
            <input
              className="input"
              type="time"
              value={form.timeOfDay}
              onChange={(event) => onFormChange((current) => ({ ...current, timeOfDay: event.target.value }))}
            />
          </div>
          <select
            className="input"
            value={form.repeatType}
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                repeatType: event.target.value as ReminderRepeatType,
                weekdays: event.target.value === "weekdays" ? [1, 2, 3, 4, 5] : current.weekdays
              }))
            }
          >
            <option value="none">Sem repeticao</option>
            <option value="daily">Diaria</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
            <option value="weekdays">Dias uteis</option>
          </select>
          {form.repeatType === "weekly" && (
            <div className="flex flex-wrap gap-2">
              {REMINDER_WEEKDAY_LABELS.map((item) => (
                <button
                  key={item.value}
                  className={`rounded-full px-3 py-2 text-xs ${
                    form.weekdays.includes(item.value) ? "bg-accent text-white" : "bg-panelAlt text-textMuted"
                  }`}
                  onClick={() =>
                    onFormChange((current) => ({
                      ...current,
                      weekdays: current.weekdays.includes(item.value)
                        ? current.weekdays.filter((value) => value !== item.value)
                        : [...current.weekdays, item.value].sort((left, right) => left - right)
                    }))
                  }
                  type="button"
                >
                  {item.short}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button className="btn-primary" onClick={onSave}>
              {form.id ? "Salvar" : "Criar lembrete"}
            </button>
            {form.id > 0 && (
              <button className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain" onClick={onReset}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
};
