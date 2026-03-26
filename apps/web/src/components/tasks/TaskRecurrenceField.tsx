import type { TaskRepeatType } from "../../types";
import { TASK_REPEAT_LABELS, WEEKDAY_SHORT_LABELS } from "./taskUi";

interface TaskRecurrenceFieldProps {
  repeatType: TaskRepeatType;
  weekdays: number[];
  recurrenceAriaLabel: string;
  weekdayAriaLabelPrefix: string;
  onRepeatTypeChange: (value: TaskRepeatType) => void;
  onWeekdaysChange: (value: number[]) => void;
}

export const TaskRecurrenceField = ({
  repeatType,
  weekdays,
  recurrenceAriaLabel,
  weekdayAriaLabelPrefix,
  onRepeatTypeChange,
  onWeekdaysChange
}: TaskRecurrenceFieldProps) => {
  return (
    <div className="space-y-2">
      <select
        aria-label={recurrenceAriaLabel}
        className="input"
        value={repeatType}
        onChange={(event) => {
          const nextRepeatType = event.target.value as TaskRepeatType;
          onRepeatTypeChange(nextRepeatType);
          if (nextRepeatType !== "weekly") {
            onWeekdaysChange([]);
          }
        }}
      >
        <option value="none">{TASK_REPEAT_LABELS.none}</option>
        <option value="daily">{TASK_REPEAT_LABELS.daily}</option>
        <option value="weekly">{TASK_REPEAT_LABELS.weekly}</option>
        <option value="monthly">{TASK_REPEAT_LABELS.monthly}</option>
        <option value="weekdays">{TASK_REPEAT_LABELS.weekdays}</option>
      </select>

      {repeatType === "weekly" && (
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_SHORT_LABELS.map((item) => (
            <button
              key={item.value}
              aria-label={`${weekdayAriaLabelPrefix} ${item.full}`}
              className={`rounded-lg border px-3 py-2 text-xs ${
                weekdays.includes(item.value)
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-slate-600 text-textMuted"
              }`}
              onClick={() =>
                onWeekdaysChange(
                  weekdays.includes(item.value)
                    ? weekdays.filter((value) => value !== item.value)
                    : [...weekdays, item.value].sort((left, right) => left - right)
                )
              }
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
