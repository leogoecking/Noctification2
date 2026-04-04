import { useEffect, useMemo, useState } from "react";
import type { ReminderItem } from "../../types";
import {
  getReminderKindLabel,
  REMINDER_COLOR_STYLES,
  toggleChecklistLine,
  type ReminderViewModel
} from "./reminderUi";

type ReminderBoardLaneId = "inbox" | "doing" | "reference";

type ReminderBoardLayout = Record<ReminderBoardLaneId, number[]>;

const BOARD_STORAGE_KEY = "reminder-user-panel-board-layout";

const BOARD_LANES: Array<{
  id: ReminderBoardLaneId;
  title: string;
  description: string;
}> = [
  {
    id: "inbox",
    title: "Entrada rapida",
    description: "Novos lembretes e capturas do turno."
  },
  {
    id: "doing",
    title: "Em organizacao",
    description: "Itens ativos da rotina e alarmes do momento."
  },
  {
    id: "reference",
    title: "Referencia",
    description: "Fixados, procedimentos e notas-chave."
  }
];

const parseStoredLayout = (raw: string | null): ReminderBoardLayout | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ReminderBoardLayout>;
    return {
      inbox: Array.isArray(parsed.inbox) ? parsed.inbox.filter((value) => typeof value === "number") : [],
      doing: Array.isArray(parsed.doing) ? parsed.doing.filter((value) => typeof value === "number") : [],
      reference: Array.isArray(parsed.reference)
        ? parsed.reference.filter((value) => typeof value === "number")
        : []
    };
  } catch {
    return null;
  }
};

const emptyBoardLayout = (): ReminderBoardLayout => ({
  inbox: [],
  doing: [],
  reference: []
});

const getDefaultLane = (entry: ReminderViewModel): ReminderBoardLaneId => {
  if (entry.meta.pinned) {
    return "reference";
  }

  if (entry.meta.noteKind === "checklist" || entry.meta.noteKind === "alarm") {
    return "doing";
  }

  return "inbox";
};

const normalizeBoardLayout = (
  entries: ReminderViewModel[],
  previousLayout: ReminderBoardLayout | null
): ReminderBoardLayout => {
  const activeEntries = entries.filter((entry) => entry.item.isActive);
  const activeIds = new Set(activeEntries.map((entry) => entry.item.id));
  const nextLayout = emptyBoardLayout();
  const assignedIds = new Set<number>();

  if (previousLayout) {
    for (const lane of BOARD_LANES) {
      for (const reminderId of previousLayout[lane.id]) {
        if (!activeIds.has(reminderId) || assignedIds.has(reminderId)) {
          continue;
        }

        nextLayout[lane.id].push(reminderId);
        assignedIds.add(reminderId);
      }
    }
  }

  for (const entry of activeEntries) {
    if (assignedIds.has(entry.item.id)) {
      continue;
    }

    nextLayout[getDefaultLane(entry)].push(entry.item.id);
  }

  return nextLayout;
};

const moveReminderWithinBoard = (
  layout: ReminderBoardLayout,
  reminderId: number,
  destinationLane: ReminderBoardLaneId,
  destinationIndex: number
): ReminderBoardLayout => {
  const cleaned: ReminderBoardLayout = {
    inbox: layout.inbox.filter((id) => id !== reminderId),
    doing: layout.doing.filter((id) => id !== reminderId),
    reference: layout.reference.filter((id) => id !== reminderId)
  };

  const laneItems = [...cleaned[destinationLane]];
  const safeIndex = Math.max(0, Math.min(destinationIndex, laneItems.length));
  laneItems.splice(safeIndex, 0, reminderId);

  return {
    ...cleaned,
    [destinationLane]: laneItems
  };
};

interface ReminderQuickBoardProps {
  reminders: ReminderViewModel[];
  onEditReminder: (item: ReminderItem) => void;
  onTogglePinnedReminder: (item: ReminderItem) => void;
  onDeleteReminder: (id: number) => void;
  onSendToBoard: (item: ReminderItem, body: string) => void;
  onToggleChecklistItem: (item: ReminderItem, nextDescription: string) => void;
  getContextLabel?: (item: ReminderItem) => string | null;
}

export const ReminderQuickBoard = ({
  reminders,
  onEditReminder,
  onTogglePinnedReminder,
  onDeleteReminder,
  onSendToBoard,
  onToggleChecklistItem,
  getContextLabel
}: ReminderQuickBoardProps) => {
  const [boardLayout, setBoardLayout] = useState<ReminderBoardLayout>(() => {
    if (typeof window === "undefined") {
      return normalizeBoardLayout(reminders, null);
    }

    return normalizeBoardLayout(reminders, parseStoredLayout(window.localStorage.getItem(BOARD_STORAGE_KEY)));
  });
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const entryById = useMemo(
    () => new Map(reminders.map((entry) => [entry.item.id, entry])),
    [reminders]
  );

  useEffect(() => {
    setBoardLayout((current) => normalizeBoardLayout(reminders, current));
  }, [reminders]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(boardLayout));
  }, [boardLayout]);

  const activeCount = reminders.filter((entry) => entry.item.isActive).length;

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-outlineSoft bg-[linear-gradient(135deg,rgba(148,163,184,0.08),rgba(15,23,42,0.02))] shadow-sm">
      <div className="border-b border-outlineSoft/80 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-textMuted">Quadro rapido</p>
            <h4 className="mt-1 font-display text-base text-textMain">Organizacao visual dos lembretes</h4>
            <p className="text-sm text-textMuted">
              Arraste os cards entre colunas para manter a rotina organizada sem mexer na biblioteca completa.
            </p>
          </div>
          <span className="rounded-full border border-outlineSoft bg-panelAlt/80 px-3 py-1 text-xs text-textMuted">
            {activeCount} ativos no quadro
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-3">
        {BOARD_LANES.map((lane) => {
          const laneEntries = boardLayout[lane.id]
            .map((reminderId) => entryById.get(reminderId))
            .filter((entry): entry is ReminderViewModel => Boolean(entry));

          return (
            <section
              key={lane.id}
              className="rounded-md border border-dashed border-outlineSoft bg-panelAlt p-3"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const rawReminderId = event.dataTransfer.getData("text/plain");
                const reminderId = Number(rawReminderId);
                if (!Number.isFinite(reminderId)) {
                  return;
                }

                setBoardLayout((current) =>
                  moveReminderWithinBoard(current, reminderId, lane.id, current[lane.id].length)
                );
                setDraggingId(null);
              }}
            >
              <div className="mb-3">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-sm font-semibold text-textMain">{lane.title}</h5>
                  <span className="rounded-full bg-panelAlt px-2.5 py-1 text-[11px] text-textMuted">
                    {laneEntries.length}
                  </span>
                </div>
                <p className="mt-1 text-xs text-textMuted">{lane.description}</p>
              </div>

              <div className="space-y-3">
                {laneEntries.map((entry, index) => {
                  const colorStyle = REMINDER_COLOR_STYLES[entry.meta.color];
                  const contextLabel = getContextLabel?.(entry.item) ?? null;

                  return (
                    <div
                      key={entry.item.id}
                      draggable
                      className={`cursor-grab rounded-xl border border-outlineSoft bg-panelAlt/95 p-3 transition ${
                        draggingId === entry.item.id ? "opacity-60" : "opacity-100"
                      } ${entry.meta.pinned ? "ring-1 ring-warning/50" : ""}`}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", String(entry.item.id));
                        setDraggingId(entry.item.id);
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const rawReminderId = event.dataTransfer.getData("text/plain");
                        const reminderId = Number(rawReminderId);
                        if (!Number.isFinite(reminderId)) {
                          return;
                        }

                        setBoardLayout((current) =>
                          moveReminderWithinBoard(current, reminderId, lane.id, index)
                        );
                        setDraggingId(null);
                      }}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-1 text-[11px] ${colorStyle.chip}`}>
                              {getReminderKindLabel(entry.meta.noteKind, entry.meta.pinned)}
                            </span>
                            {entry.meta.tag ? (
                              <span className="rounded-full bg-panel px-2 py-1 text-[11px] text-textMuted">
                                #{entry.meta.tag}
                              </span>
                            ) : null}
                          </div>
                          <p className="font-semibold text-textMain">{entry.item.title}</p>
                          {contextLabel ? (
                            <p className="text-[11px] text-textMuted">{contextLabel}</p>
                          ) : null}
                        </div>
                        <span className={`rounded-lg px-2.5 py-1 text-[11px] ${colorStyle.soft}`}>
                          {entry.item.timeOfDay}
                        </span>
                      </div>

                      {entry.meta.noteKind === "checklist" ? (
                        <div className="space-y-2">
                          <p className="text-xs text-textMuted">
                            {entry.checklistCompleted}/{entry.checklistTotal} itens concluídos
                          </p>
                          <div className="space-y-1.5">
                            {entry.checklistItems.slice(0, 3).map((task, taskIndex) => (
                              <button
                                key={`${entry.item.id}-board-task-${taskIndex}`}
                                className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-textMain transition hover:bg-panel"
                                onClick={() =>
                                  onToggleChecklistItem(entry.item, toggleChecklistLine(entry.body, taskIndex))
                                }
                                type="button"
                              >
                                <span className="mt-0.5 text-textMuted">{task.checked ? "☑" : "☐"}</span>
                                <span className={task.checked ? "line-through text-textMuted" : ""}>
                                  {task.label}
                                </span>
                              </button>
                            ))}
                            {entry.checklistTotal > 3 ? (
                              <p className="text-[11px] text-textMuted">
                                +{entry.checklistTotal - 3} itens no checklist
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : entry.body ? (
                        <p className="line-clamp-3 text-xs text-textMuted">{entry.body}</p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="mr-auto text-[11px] text-textMuted">Arraste para organizar</span>
                        <button
                          className="rounded-lg border border-outlineSoft bg-panel px-3 py-1.5 text-xs text-textMain"
                          onClick={() => onTogglePinnedReminder(entry.item)}
                          type="button"
                        >
                          {entry.meta.pinned ? "Desfixar" : "Fixar"}
                        </button>
                        <button
                          className="rounded-lg border border-outlineSoft bg-panel px-3 py-1.5 text-xs text-textMain"
                          onClick={() => onSendToBoard(entry.item, entry.body)}
                          type="button"
                        >
                          No mural
                        </button>
                        <button
                          className="rounded-lg border border-outlineSoft bg-panel px-3 py-1.5 text-xs text-textMain"
                          onClick={() => onEditReminder(entry.item)}
                          type="button"
                        >
                          Editar
                        </button>
                        <button
                          className="rounded-lg border border-danger/60 px-3 py-1.5 text-xs text-danger"
                          onClick={() => onDeleteReminder(entry.item.id)}
                          type="button"
                        >
                          Arquivar
                        </button>
                      </div>
                    </div>
                  );
                })}

                {laneEntries.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-outlineSoft/80 bg-panelAlt/50 px-3 py-5 text-center text-xs text-textMuted">
                    Solte lembretes aqui.
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
};
