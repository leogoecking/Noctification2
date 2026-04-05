import type { ReminderFormState } from "./reminderUi";
import { buildQuickReminderDefaults } from "./reminderUi";
import {
  getNotePalette,
  mapReminderColorToUi,
  mapUiColorToReminder,
  NOTE_COLOR_STYLES,
  NOTE_KIND_OPTIONS,
  parseDraftChecklistItems,
  stringifyDraftChecklistItems,
  type DraftChecklistItem,
  type NoteUiColor
} from "./reminderNoteUi";

interface ReminderComposeInlineProps {
  darkMode: boolean;
  form: ReminderFormState;
  onArchive: () => void;
  onCancel: () => void;
  onFormChange: (patch: Partial<ReminderFormState>) => void;
  onSave: () => void;
}

const ensureChecklistItems = (items: DraftChecklistItem[]) =>
  items.length > 0 ? items : [{ checked: false, label: "" }];

export const ReminderComposeInline = ({
  darkMode,
  form,
  onArchive,
  onCancel,
  onFormChange,
  onSave
}: ReminderComposeInlineProps) => {
  const uiColor = mapReminderColorToUi(form.color);
  const palette = getNotePalette(uiColor, darkMode);

  const focusChecklistInput = (position: number) => {
    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLInputElement>(
        `[aria-label="Texto do item ${position}"]`
      );
      target?.focus();
    });
  };

  const checklistItems =
    form.noteKind === "checklist" ? ensureChecklistItems(parseDraftChecklistItems(form.description)) : [];

  const syncChecklistItems = (
    updater: (currentItems: DraftChecklistItem[]) => DraftChecklistItem[]
  ) => {
    const currentItems = ensureChecklistItems(parseDraftChecklistItems(form.description));
    onFormChange({
      description: stringifyDraftChecklistItems(updater(currentItems))
    });
  };

  const insertChecklistItemAfter = (index: number, currentLabel: string) => {
    const nextItems = [
      ...checklistItems.slice(0, index),
      { ...checklistItems[index], label: currentLabel },
      { checked: false, label: "" },
      ...checklistItems.slice(index + 1)
    ];

    onFormChange({
      description: stringifyDraftChecklistItems(nextItems)
    });
    focusChecklistInput(index + 2);
  };

  return (
    <div
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 14,
        overflow: "hidden",
        animation: "composeSlide .2s ease"
      }}
    >
      <style>{`@keyframes composeSlide { from { opacity:0; transform:translateY(-8px)} to { opacity:1; transform:translateY(0)} }`}</style>

      <div style={{ padding: "13px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          autoFocus
          onChange={(event) => onFormChange({ title: event.target.value })}
          placeholder="Título da nota…"
          style={{
            fontSize: 13,
            fontWeight: 500,
            border: "none",
            outline: "none",
            background: "transparent",
            color: palette.text,
            fontFamily: "inherit",
            width: "100%"
          }}
          value={form.title}
        />
        {form.noteKind === "checklist" ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8
            }}
          >
            {checklistItems.map((item, index) => (
              <div
                key={`checklist-draft-${index}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                <button
                  aria-label={`Checklist item ${index + 1}`}
                  onClick={() =>
                    syncChecklistItems((currentItems) =>
                      currentItems.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, checked: !entry.checked } : entry
                      )
                    )
                  }
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: `1px solid ${item.checked ? palette.dot : palette.buttonBorder}`,
                    background: item.checked ? palette.dot : "transparent",
                    color: "#ffffff",
                    fontSize: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0
                  }}
                  type="button"
                >
                  {item.checked ? "✓" : ""}
                </button>
                <input
                  aria-label={`Texto do item ${index + 1}`}
                  onChange={(event) =>
                    syncChecklistItems((currentItems) =>
                      currentItems.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, label: event.target.value } : entry
                      )
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" && item.label.length === 0 && checklistItems.length > 1) {
                      event.preventDefault();
                      syncChecklistItems((currentItems) =>
                        currentItems.filter((_, entryIndex) => entryIndex !== index)
                      );
                      return;
                    }

                    if (event.key === "Enter") {
                      event.preventDefault();
                      insertChecklistItemAfter(index, event.currentTarget.value);
                    }
                  }}
                  placeholder="Descreva o item"
                  style={{
                    fontSize: 12,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: palette.text,
                    fontFamily: "inherit",
                    width: "100%",
                    lineHeight: 1.5
                  }}
                  value={item.label}
                />
              </div>
            ))}
            <button
              onClick={() =>
                syncChecklistItems((currentItems) => [...currentItems, { checked: false, label: "" }])
              }
              style={{
                alignSelf: "flex-start",
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 12,
                border: `0.5px solid ${palette.buttonBorder}`,
                background: palette.buttonBg,
                color: palette.text,
                cursor: "pointer",
                fontFamily: "inherit"
              }}
              type="button"
            >
              Adicionar item
            </button>
          </div>
        ) : (
          <textarea
            onChange={(event) => onFormChange({ description: event.target.value })}
            placeholder="Escreva aqui…"
            rows={3}
            style={{
              fontSize: 12,
              border: "none",
              outline: "none",
              resize: "none",
              background: "transparent",
              color: palette.text,
              opacity: 0.8,
              fontFamily: "inherit",
              width: "100%",
              lineHeight: 1.5
            }}
            value={form.description}
          />
        )}

        {form.noteKind === "alarm" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              onChange={(event) => onFormChange({ startDate: event.target.value })}
              style={{
                fontSize: 12,
                border: `1px solid ${palette.border}`,
                borderRadius: 8,
                padding: "5px 10px",
                background: palette.buttonBg,
                color: palette.text,
                fontFamily: "inherit",
                outline: "none"
              }}
              type="date"
              value={form.startDate}
            />
            <input
              onChange={(event) => onFormChange({ timeOfDay: event.target.value })}
              style={{
                fontSize: 12,
                border: `1px solid ${palette.border}`,
                borderRadius: 8,
                padding: "5px 10px",
                background: palette.buttonBg,
                color: palette.text,
                fontFamily: "inherit",
                outline: "none"
              }}
              type="time"
              value={form.timeOfDay}
            />
          </div>
        ) : null}
      </div>

      <div
        style={{
          borderTop: `0.5px solid ${palette.border}`,
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap"
        }}
      >
        {NOTE_KIND_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => {
              const nextPatch: Partial<ReminderFormState> = {
                noteKind: option.key,
                ...buildQuickReminderDefaults(option.key)
              };

              if (option.key === "checklist") {
                nextPatch.description = stringifyDraftChecklistItems(
                  ensureChecklistItems(parseDraftChecklistItems(form.description))
                );
              }

              onFormChange(nextPatch);
            }}
            style={{
              fontSize: 11,
              padding: "3px 10px",
              borderRadius: 12,
              border: `0.5px solid ${form.noteKind === option.key ? palette.dot : palette.buttonBorder}`,
              background: form.noteKind === option.key ? palette.chipBg : palette.buttonBg,
              color: palette.text,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: form.noteKind === option.key ? 500 : 400
            }}
            type="button"
          >
            {option.label}
          </button>
        ))}

        <div style={{ display: "flex", gap: 5, alignItems: "center", marginLeft: 4 }}>
          {(Object.keys(NOTE_COLOR_STYLES) as NoteUiColor[]).map((color) => {
            const swatch = getNotePalette(color, darkMode);
            return (
              <button
                aria-label={`Cor ${color}`}
                key={color}
                onClick={() => onFormChange({ color: mapUiColorToReminder(color) })}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: swatch.dot,
                  border: `2px solid ${uiColor === color ? "rgb(var(--color-text-main) / 1)" : "transparent"}`,
                  cursor: "pointer",
                  transform: uiColor === color ? "scale(1.25)" : "scale(1)",
                  transition: "transform .12s"
                }}
                title={color}
                type="button"
              />
            );
          })}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {form.id ? (
            <button
              onClick={onArchive}
              style={{
                fontSize: 11,
                padding: "4px 12px",
                borderRadius: 12,
                border: `0.5px solid ${palette.buttonBorder}`,
                background: palette.buttonBg,
                color: palette.text,
                cursor: "pointer",
                fontFamily: "inherit"
              }}
              type="button"
            >
              Arquivar
            </button>
          ) : null}
          <button
            onClick={onCancel}
            style={{
              fontSize: 11,
              padding: "4px 12px",
              borderRadius: 12,
              border: `0.5px solid ${palette.buttonBorder}`,
              background: palette.buttonBg,
              color: palette.text,
              cursor: "pointer",
              fontFamily: "inherit"
            }}
            type="button"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: "4px 14px",
              borderRadius: 12,
              border: "none",
              background: palette.dot,
              color: "#ffffff",
              cursor: "pointer",
              fontFamily: "inherit",
              opacity: form.title.trim() ? 1 : 0.4,
              transition: "opacity .15s"
            }}
            type="button"
          >
            {form.id ? "Salvar" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
};
