import {
  isValidTimeOfDay,
  parseReminderColor,
  parseReminderChecklistItems,
  parseReminderNoteKind,
  parseReminderRepeatType,
  parseWeekdays,
  stringifyReminderChecklistItems,
  stringifyWeekdays
} from "./service";
import { getZonedParts, parseDateOnly, parseTimeOfDay, zonedDateTimeToUtc } from "./timezone";
import type {
  ParsedReminderColor,
  ParsedReminderCreateInput,
  ParsedReminderNoteKind,
  ParsedReminderRepeatType,
  ParsedReminderUpdateInput,
  ReminderCurrentSchedule,
  ResolvedReminderWrite
} from "./route-helper-types";

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_TIMEZONE_LENGTH = 64;
const MAX_TAG_LENGTH = 40;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateOnly = (value: string): boolean => {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const toDateOnlyString = (dateParts: { year: number; month: number; day: number }): string =>
  `${String(dateParts.year).padStart(4, "0")}-${String(dateParts.month).padStart(2, "0")}-${String(
    dateParts.day
  ).padStart(2, "0")}`;

const parseWeekdaysJson = (value: string): number[] => {
  try {
    return parseWeekdays(JSON.parse(value));
  } catch {
    return [];
  }
};

const parseChecklistJson = (value: string) => {
  try {
    return parseReminderChecklistItems(JSON.parse(value));
  } catch {
    return [];
  }
};

export const validateReminderFields = (params: {
  title?: string | null;
  description?: string | null;
  startDate?: string | null;
  timeOfDay?: string | null;
  timezone?: string | null;
  supportedTimezone: string;
  repeatType?: ReturnType<typeof parseReminderRepeatType> | null;
  weekdays?: number[];
  noteKind?: ReturnType<typeof parseReminderNoteKind> | null;
  tag?: string | null;
  color?: ReturnType<typeof parseReminderColor> | null;
  checklistItems?: ReturnType<typeof parseReminderChecklistItems>;
}) => {
  if (params.title !== undefined) {
    if (!params.title || params.title.length === 0) {
      return "title e obrigatorio";
    }

    if (params.title.length > MAX_TITLE_LENGTH) {
      return `title deve ter no maximo ${MAX_TITLE_LENGTH} caracteres`;
    }
  }

  if (
    params.description !== undefined &&
    params.description !== null &&
    params.description.length > MAX_DESCRIPTION_LENGTH
  ) {
    return `description deve ter no maximo ${MAX_DESCRIPTION_LENGTH} caracteres`;
  }

  if (params.tag !== undefined && params.tag !== null && params.tag.length > MAX_TAG_LENGTH) {
    return `tag deve ter no maximo ${MAX_TAG_LENGTH} caracteres`;
  }

  if (
    params.startDate !== undefined &&
    params.startDate !== null &&
    !isValidDateOnly(params.startDate)
  ) {
    return "startDate deve estar no formato YYYY-MM-DD";
  }

  if (
    params.timeOfDay !== undefined &&
    params.timeOfDay !== null &&
    !isValidTimeOfDay(params.timeOfDay)
  ) {
    return "timeOfDay deve estar no formato HH:MM";
  }

  if (
    params.timezone !== undefined &&
    params.timezone !== null &&
    (params.timezone.length === 0 || params.timezone.length > MAX_TIMEZONE_LENGTH)
  ) {
    return `timezone deve ter entre 1 e ${MAX_TIMEZONE_LENGTH} caracteres`;
  }

  if (
    params.timezone !== undefined &&
    params.timezone !== null &&
    params.timezone !== params.supportedTimezone
  ) {
    return `timezone invalida. Use ${params.supportedTimezone}`;
  }

  if (params.repeatType === "weekly" && (!params.weekdays || params.weekdays.length === 0)) {
    return "weekdays e obrigatorio para repeticao semanal";
  }

  if (params.noteKind !== undefined && params.noteKind === null) {
    return "noteKind invalido";
  }

  if (params.color !== undefined && params.color === null) {
    return "color invalida";
  }

  if (params.noteKind === "checklist" && (!params.checklistItems || params.checklistItems.length === 0)) {
    return "checklistItems e obrigatorio para nota checklist";
  }

  return null;
};

export const recalculateLastScheduledFor = (params: {
  currentLastScheduledFor: string | null;
  nextStartDate: string;
  nextTimeOfDay: string;
  nextTimezone: string;
}): string | null => {
  if (!params.currentLastScheduledFor) {
    return null;
  }

  const anchorDate = getZonedParts(new Date(params.currentLastScheduledFor), params.nextTimezone);
  const anchorDateOnly = toDateOnlyString(anchorDate);

  if (params.nextStartDate > anchorDateOnly) {
    return null;
  }

  return zonedDateTimeToUtc(
    parseDateOnly(anchorDateOnly),
    parseTimeOfDay(params.nextTimeOfDay),
    params.nextTimezone
  ).toISOString();
};

export const resolveReminderCreate = (input: ParsedReminderCreateInput): ResolvedReminderWrite => ({
  title: input.title ?? "",
  description: input.description,
  startDate: input.startDate ?? "",
  timeOfDay: input.timeOfDay ?? "",
  timezone: input.timezone,
  repeatType: input.repeatType as ParsedReminderRepeatType,
  weekdays: input.weekdays,
  weekdaysJson: stringifyWeekdays(input.weekdays),
  checklistItems: input.checklistItems,
  checklistJson: stringifyReminderChecklistItems(input.checklistItems),
  noteKind: (input.noteKind ?? "note") as ParsedReminderNoteKind,
  isPinned: input.isPinned,
  tag: input.tag,
  color: (input.color ?? "slate") as ParsedReminderColor,
  lastScheduledFor: null
});

export const resolveReminderUpdate = (
  current: ReminderCurrentSchedule,
  input: ParsedReminderUpdateInput,
  reminderTimezone: string
): ResolvedReminderWrite => {
  const currentTimezone =
    current.timezone === reminderTimezone ? current.timezone : reminderTimezone;
  const repeatType = (input.repeatType ??
    parseReminderRepeatType(current.repeatType)) as ParsedReminderRepeatType;
  const weekdays = input.weekdays ?? parseWeekdaysJson(current.weekdaysJson);
  const checklistItems = input.checklistItems ?? parseChecklistJson(current.checklistJson);
  const startDate = input.startDate ?? current.startDate;
  const timeOfDay = input.timeOfDay ?? current.timeOfDay;
  const timezone = input.timezone ?? currentTimezone;
  const weekdaysJson = stringifyWeekdays(weekdays);
  const noteKind = (input.noteKind ?? parseReminderNoteKind(current.noteKind) ?? "note") as ParsedReminderNoteKind;
  const isPinned = input.isPinned ?? (current.isPinned === true || current.isPinned === 1);
  const tag = input.tag ?? current.tag;
  const color = (input.color ?? parseReminderColor(current.color) ?? "slate") as ParsedReminderColor;
  const scheduleChanged =
    startDate !== current.startDate ||
    timeOfDay !== current.timeOfDay ||
    timezone !== currentTimezone ||
    repeatType !== current.repeatType ||
    weekdaysJson !== current.weekdaysJson;

  return {
    title: input.title ?? current.title,
    description: input.description ?? current.description,
    startDate,
    timeOfDay,
    timezone,
    repeatType,
    weekdays,
    weekdaysJson,
    checklistItems,
    checklistJson: stringifyReminderChecklistItems(checklistItems),
    noteKind,
    isPinned,
    tag,
    color,
    lastScheduledFor: scheduleChanged
      ? recalculateLastScheduledFor({
          currentLastScheduledFor: current.lastScheduledFor,
          nextStartDate: startDate,
          nextTimeOfDay: timeOfDay,
          nextTimezone: timezone
        })
      : current.lastScheduledFor
  };
};
