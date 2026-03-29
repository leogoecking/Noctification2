import type { TaskAutomationCandidateRow } from "../domain/automation-types";

const RECURRING_WEEKDAY_VALUES = new Set([0, 1, 2, 3, 4, 5, 6]);

export const parseRecurringWeekdaysJson = (value: string): number[] => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed
          .map((item) => Number(item))
          .filter((item) => Number.isInteger(item) && RECURRING_WEEKDAY_VALUES.has(item))
      : [];
  } catch {
    return [];
  }
};

const addUtcDays = (date: Date, amount: number): Date => {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
};

const daysInUtcMonth = (year: number, monthIndex: number): number => {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
};

const addUtcMonths = (date: Date, amount: number): Date => {
  const next = new Date(date.getTime());
  const totalMonths = date.getUTCFullYear() * 12 + date.getUTCMonth() + amount;
  const monthIndex = ((totalMonths % 12) + 12) % 12;
  const year = (totalMonths - monthIndex) / 12;
  const day = Math.min(date.getUTCDate(), daysInUtcMonth(year, monthIndex));

  next.setUTCFullYear(year, monthIndex, day);
  return next;
};

const nextWeeklyUtcDate = (date: Date, weekdays: number[]): Date => {
  const allowed = weekdays.length > 0 ? weekdays : [date.getUTCDay()];
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = addUtcDays(date, offset);
    if (allowed.includes(candidate.getUTCDay())) {
      return candidate;
    }
  }

  return addUtcDays(date, 7);
};

const nextWeekdayUtcDate = (date: Date): Date => {
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = addUtcDays(date, offset);
    const day = candidate.getUTCDay();
    if (day >= 1 && day <= 5) {
      return candidate;
    }
  }

  return addUtcDays(date, 1);
};

export const computeNextRecurringDueAt = (task: TaskAutomationCandidateRow): string | null => {
  if (task.repeatType === "none") {
    return null;
  }

  const anchorValue = task.dueAt ?? task.completedAt;
  if (!anchorValue) {
    return null;
  }

  const anchor = new Date(anchorValue);
  if (Number.isNaN(anchor.getTime())) {
    return null;
  }

  switch (task.repeatType) {
    case "daily":
      return addUtcDays(anchor, 1).toISOString();
    case "weekly":
      return nextWeeklyUtcDate(anchor, parseRecurringWeekdaysJson(task.repeatWeekdaysJson)).toISOString();
    case "monthly":
      return addUtcMonths(anchor, 1).toISOString();
    case "weekdays":
      return nextWeekdayUtcDate(anchor).toISOString();
    default:
      return null;
  }
};
