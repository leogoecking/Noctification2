import {
  addDaysToDateParts,
  addMonthsToDateParts,
  getWeekdayFromDateParts,
  getZonedParts,
  parseDateOnly,
  parseTimeOfDay,
  zonedDateTimeToUtc
} from "./timezone";
import type { ReminderRepeatType, ReminderRow } from "./types";

const parseWeekdaysJson = (value: string): number[] => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => Number(item)).filter(Number.isInteger)
      : [];
  } catch {
    return [];
  }
};

const nextWeeklyDate = (
  baseDate: { year: number; month: number; day: number },
  weekdays: number[]
): { year: number; month: number; day: number } => {
  const allowed = weekdays.length > 0 ? weekdays : [getWeekdayFromDateParts(baseDate)];
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = addDaysToDateParts(baseDate, offset);
    if (allowed.includes(getWeekdayFromDateParts(candidate))) {
      return candidate;
    }
  }

  return addDaysToDateParts(baseDate, 7);
};

const nextWeekdayDate = (baseDate: { year: number; month: number; day: number }) => {
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = addDaysToDateParts(baseDate, offset);
    const day = getWeekdayFromDateParts(candidate);
    if (day >= 1 && day <= 5) {
      return candidate;
    }
  }

  return addDaysToDateParts(baseDate, 1);
};

export const computeNextScheduledFor = (reminder: ReminderRow): string | null => {
  const timezone = reminder.timezone;
  const anchor = reminder.lastScheduledFor
    ? getZonedParts(new Date(reminder.lastScheduledFor), timezone)
    : {
        ...parseDateOnly(reminder.startDate),
        ...parseTimeOfDay(reminder.timeOfDay)
      };

  if (!reminder.lastScheduledFor) {
    return zonedDateTimeToUtc(anchor, anchor, timezone).toISOString();
  }

  switch (reminder.repeatType as ReminderRepeatType) {
    case "none":
      return null;
    case "daily":
      return zonedDateTimeToUtc(addDaysToDateParts(anchor, 1), anchor, timezone).toISOString();
    case "weekly":
      return zonedDateTimeToUtc(
        nextWeeklyDate(anchor, parseWeekdaysJson(reminder.weekdaysJson)),
        anchor,
        timezone
      ).toISOString();
    case "monthly":
      return zonedDateTimeToUtc(addMonthsToDateParts(anchor, 1), anchor, timezone).toISOString();
    case "weekdays":
      return zonedDateTimeToUtc(nextWeekdayDate(anchor), anchor, timezone).toISOString();
    default:
      return null;
  }
};

export const shouldExpireOccurrence = (
  scheduledFor: string,
  timezone: string,
  now: Date
): boolean => {
  const scheduled = getZonedParts(new Date(scheduledFor), timezone);
  const nextDayStart = zonedDateTimeToUtc(
    addDaysToDateParts(scheduled, 1),
    {
      hour: 0,
      minute: 0,
      second: 0
    },
    timezone
  );

  return now.getTime() >= nextDayStart.getTime();
};
