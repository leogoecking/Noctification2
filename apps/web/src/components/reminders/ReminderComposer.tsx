import type { ReactNode } from "react";
import type { ReminderColorKey, ReminderNoteKind } from "../../types";
import {
  REMINDER_WEEKDAY_LABELS,
  REMINDER_COLOR_STYLES,
  type ReminderFormState
} from "./reminderUi";

const parseDraftChecklistItems = (body: string): Array<{ checked: boolean; label: string }> =>
  body
    .split("\n")
    .map((line) => line.trimStart())
    .filter((line) => line.startsWith("- [ ] ") || line.startsWith("- [x] "))
    .map((line) => ({
      checked: line.startsWith("- [x] "),
      label: line.slice(6)
    }));

const stringifyDraftChecklistItems = (items: Array<{ checked: boolean; label: string }>): string =>
  items.map((item) => `- [${item.checked ? "x" : " "}] ${item.label}`).join("\n");

interface ReminderComposerProps {
  open: boolean;
  form: ReminderFormState;
  onFormChange: (updater: (current: ReminderFormState) => ReminderFormState) => void;
  onSave: () => void;
  onReset: () => void;
  onClose: () => void;
  extraFields?: ReactNode;
}

export const ReminderComposer = ({
  open,
  form,
  onFormChange,
  onSave,
  onReset,
  onClose,
  extraFields
}: ReminderComposerProps) => {
  const focusChecklistInput = (position: number) => {
    window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLInputElement>(
        `[aria-label="Checklist item ${position}"]`
      );
      target?.focus();
    });
  };

  const kindButtons: Array<{ kind: ReminderNoteKind; label: string }> = [
    { kind: "note", label: "Texto" },
    { kind: "checklist", label: "Lista" },
    { kind: "alarm", label: "Alarme" }
  ];
  const colorOptions: ReminderColorKey[] = ["slate", "sky", "amber", "emerald", "rose"];
  const checklistItems =
    form.noteKind === "checklist"
      ? (() => {
          const parsedItems = parseDraftChecklistItems(form.description);
          return parsedItems.length > 0 ? parsedItems : [{ checked: false, label: "" }];
        })()
      : [];

  const syncChecklistItems = (
    updater: (
      currentItems: Array<{ checked: boolean; label: string }>
    ) => Array<{ checked: boolean; label: string }>
  ) => {
    onFormChange((current) => {
      const currentItems = parseDraftChecklistItems(current.description);
      const nextItems = updater(currentItems.length > 0 ? currentItems : [{ checked: false, label: "" }]);
      return {
        ...current,
        description: stringifyDraftChecklistItems(nextItems)
      };
    });
  };

  const duplicateChecklistItem = (index: number) => {
    syncChecklistItems((currentItems) => {
      const sourceItem = currentItems[index];
      if (!sourceItem) {
        return currentItems;
      }

      return [
        ...currentItems.slice(0, index + 1),
        { ...sourceItem },
        ...currentItems.slice(index + 1)
      ];
    });
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-950/55 p-4 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-outlineSoft bg-panel shadow-glow">
        <article className="max-h-[92vh] overflow-y-auto p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted">Novo lembrete</p>
              <h4 className="mt-1 font-display text-base text-textMain">
                {form.id ? "Editar nota operacional" : "Nova nota operacional"}
              </h4>
              <p className="text-sm text-textMuted">Anote, fixe, categorize ou transforme em alarme sem abrir outra tela.</p>
            </div>
            <div className="flex items-center gap-2">
              {form.id > 0 ? (
                <button
                  className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain"
                  onClick={onReset}
                  type="button"
                >
                  Cancelar edicao
                </button>
              ) : null}
              <button
                aria-label="Fechar composicao de lembrete"
                className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain"
                onClick={onClose}
                type="button"
              >
                Fechar
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {extraFields}
            <input
              className="input"
              placeholder="Titulo da nota"
              value={form.title}
              onChange={(event) => onFormChange((current) => ({ ...current, title: event.target.value }))}
            />
            <div className="flex flex-wrap gap-2">
              <button
                className={`rounded-full px-3 py-2 text-xs ${form.pinned ? "bg-accent text-white" : "border border-outlineSoft bg-panelAlt text-textMain"}`}
                onClick={() => onFormChange((current) => ({ ...current, pinned: !current.pinned }))}
                type="button"
              >
                Fixar
              </button>
              {kindButtons.map((option) => (
                <button
                  key={option.kind}
                  className={`rounded-full px-3 py-2 text-xs ${form.noteKind === option.kind ? "bg-accent text-white" : "border border-outlineSoft bg-panelAlt text-textMain"}`}
                  onClick={() =>
                    onFormChange((current) => {
                      if (current.noteKind === option.kind) {
                        return current;
                      }

                      if (option.kind === "checklist") {
                        const items = parseDraftChecklistItems(current.description);
                        return {
                          ...current,
                          noteKind: option.kind,
                          description:
                            items.length > 0
                              ? current.description
                              : stringifyDraftChecklistItems([{ checked: false, label: "" }])
                        };
                      }

                      return { ...current, noteKind: option.kind };
                    })
                  }
                  type="button"
                >
                  {option.label}
                </button>
              ))}
              <input
                className="input max-w-40"
                placeholder="Tag"
                value={form.tag}
                onChange={(event) => onFormChange((current) => ({ ...current, tag: event.target.value }))}
              />
            </div>

            {form.noteKind === "checklist" ? (
              <div className="space-y-3 rounded-2xl border border-outlineSoft bg-panelAlt/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-textMuted">Checklist operacional</p>
                  <button
                    className="rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-xs text-textMain"
                    onClick={() =>
                      syncChecklistItems((currentItems) => [
                        ...currentItems,
                        { checked: false, label: `Novo item ${currentItems.length + 1}` }
                      ])
                    }
                    type="button"
                  >
                    Adicionar item
                  </button>
                </div>
                <div className="space-y-2">
                  {checklistItems.map((item, index) => (
                    <div key={`composer-checklist-${index}`} className="flex items-center gap-2">
                      <input
                        aria-label={`Checklist item ${index + 1}`}
                        checked={item.checked}
                        onChange={() =>
                          syncChecklistItems((currentItems) =>
                            currentItems.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, checked: !entry.checked } : entry
                            )
                          )
                        }
                        type="checkbox"
                      />
                      <input
                        className="input flex-1"
                        placeholder="Descreva o item"
                        value={item.label}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            syncChecklistItems((currentItems) => [
                              ...currentItems.slice(0, index + 1),
                              { checked: false, label: "" },
                              ...currentItems.slice(index + 1)
                            ]);
                            focusChecklistInput(index + 2);
                            return;
                          }

                          if (event.key === "Backspace" && item.label.length === 0 && checklistItems.length > 1) {
                            event.preventDefault();
                            syncChecklistItems((currentItems) =>
                              currentItems.filter((_, entryIndex) => entryIndex !== index)
                            );
                          }
                        }}
                        onChange={(event) =>
                          syncChecklistItems((currentItems) =>
                            currentItems.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, label: event.target.value } : entry
                            )
                          )
                        }
                      />
                      <button
                        aria-label={`Mover item ${index + 1} para cima`}
                        className="rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-xs text-textMain disabled:opacity-40"
                        disabled={index === 0}
                        onClick={() =>
                          syncChecklistItems((currentItems) => {
                            if (index === 0) {
                              return currentItems;
                            }

                            const nextItems = [...currentItems];
                            const currentItem = nextItems[index];
                            nextItems[index] = nextItems[index - 1];
                            nextItems[index - 1] = currentItem;
                            return nextItems;
                          })
                        }
                        type="button"
                      >
                        ↑
                      </button>
                      <button
                        aria-label={`Mover item ${index + 1} para baixo`}
                        className="rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-xs text-textMain disabled:opacity-40"
                        disabled={index === checklistItems.length - 1}
                        onClick={() =>
                          syncChecklistItems((currentItems) => {
                            if (index >= currentItems.length - 1) {
                              return currentItems;
                            }

                            const nextItems = [...currentItems];
                            const currentItem = nextItems[index];
                            nextItems[index] = nextItems[index + 1];
                            nextItems[index + 1] = currentItem;
                            return nextItems;
                          })
                        }
                        type="button"
                      >
                        ↓
                      </button>
                      <button
                        aria-label={`Duplicar item ${index + 1}`}
                        className="rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-xs text-textMain"
                        onClick={() => duplicateChecklistItem(index)}
                        type="button"
                      >
                        Duplicar
                      </button>
                      <button
                        aria-label={`Remover item ${index + 1}`}
                        className="rounded-lg border border-danger/60 px-3 py-2 text-xs text-danger"
                        onClick={() =>
                          syncChecklistItems((currentItems) => {
                            const nextItems = currentItems.filter((_, entryIndex) => entryIndex !== index);
                            return nextItems.length > 0 ? nextItems : [{ checked: false, label: "" }];
                          })
                        }
                        type="button"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <textarea
                className="input min-h-28"
                placeholder="Descricao, passos, contatos ou procedimento"
                value={form.description}
                onChange={(event) => onFormChange((current) => ({ ...current, description: event.target.value }))}
              />
            )}

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr),minmax(0,1fr),minmax(0,1fr)]">
              <input
                aria-label="Data do lembrete"
                className="input"
                type="date"
                value={form.startDate}
                onChange={(event) => onFormChange((current) => ({ ...current, startDate: event.target.value }))}
              />
              <input
                aria-label="Hora do lembrete"
                className="input"
                type="time"
                value={form.timeOfDay}
                onChange={(event) => onFormChange((current) => ({ ...current, timeOfDay: event.target.value }))}
              />
              <select
                className="input"
                value={form.repeatType}
                onChange={(event) =>
                  onFormChange((current) => ({
                    ...current,
                    repeatType: event.target.value as ReminderFormState["repeatType"],
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
            </div>

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

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.18em] text-textMuted">Cor</span>
                <div className="flex gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      aria-label={`Cor ${color}`}
                      className={`h-6 w-6 rounded-full ${REMINDER_COLOR_STYLES[color].swatch} ${
                        form.color === color ? "ring-2 ring-white" : "ring-1 ring-outlineSoft"
                      }`}
                      onClick={() => onFormChange((current) => ({ ...current, color }))}
                      type="button"
                    />
                  ))}
                </div>
              </div>
              <button className="btn-primary" onClick={onSave} type="button">
                {form.id ? "Salvar nota" : "Criar nota"}
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};
