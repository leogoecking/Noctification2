import {
  parseReminderColor,
  parseReminderChecklistItems,
  parseReminderNoteKind,
  parseReminderRepeatType,
  parseWeekdays
} from "./service";
import type { ParsedReminderCreateInput, ParsedReminderUpdateInput } from "./route-helper-types";

export const toNullableString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const parseReminderCreateInput = (
  body: Record<string, unknown> | undefined,
  reminderTimezone: string
): ParsedReminderCreateInput => ({
  title: toNullableString(body?.title),
  description: toNullableString(body?.description) ?? "",
  startDate: toNullableString(body?.startDate ?? body?.start_date),
  timeOfDay: toNullableString(body?.timeOfDay ?? body?.time_of_day),
  timezone: toNullableString(body?.timezone) ?? reminderTimezone,
  repeatType: parseReminderRepeatType(body?.repeatType ?? body?.repeat_type),
  weekdays: parseWeekdays(body?.weekdays),
  checklistItems: parseReminderChecklistItems(body?.checklistItems ?? body?.checklist_items),
  noteKind: parseReminderNoteKind(body?.noteKind ?? body?.note_kind) ?? "note",
  isPinned: body?.isPinned === true || body?.is_pinned === true,
  tag: toNullableString(body?.tag) ?? "",
  color: parseReminderColor(body?.color) ?? "slate"
});

export const parseReminderUpdateInput = (
  body: Record<string, unknown> | undefined
): ParsedReminderUpdateInput => {
  const repeatTypeRaw = body?.repeatType ?? body?.repeat_type;
  const noteKindRaw = body?.noteKind ?? body?.note_kind;
  const colorRaw = body?.color;

  return {
    title: toNullableString(body?.title),
    description: toNullableString(body?.description),
    startDate: toNullableString(body?.startDate ?? body?.start_date),
    timeOfDay: toNullableString(body?.timeOfDay ?? body?.time_of_day),
    timezone: toNullableString(body?.timezone),
    repeatTypeRaw,
    repeatType: repeatTypeRaw !== undefined ? parseReminderRepeatType(repeatTypeRaw) : undefined,
    weekdays: body?.weekdays !== undefined ? parseWeekdays(body?.weekdays) : undefined,
    checklistItems:
      body?.checklistItems !== undefined || body?.checklist_items !== undefined
        ? parseReminderChecklistItems(body?.checklistItems ?? body?.checklist_items)
        : undefined,
    noteKindRaw,
    noteKind: noteKindRaw !== undefined ? parseReminderNoteKind(noteKindRaw) : undefined,
    isPinned:
      body?.isPinned === true || body?.is_pinned === true
        ? true
        : body?.isPinned === false || body?.is_pinned === false
          ? false
          : undefined,
    tag: body?.tag !== undefined ? toNullableString(body?.tag) ?? "" : undefined,
    colorRaw,
    color: colorRaw !== undefined ? parseReminderColor(colorRaw) : undefined
  };
};
