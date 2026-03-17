interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

interface LocalDateParts {
  year: number;
  month: number;
  day: number;
}

interface LocalTimeParts {
  hour: number;
  minute: number;
  second?: number;
}

const zonedFormatterCache = new Map<string, Intl.DateTimeFormat>();

const getZonedFormatter = (timeZone: string): Intl.DateTimeFormat => {
  const cached = zonedFormatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });

  zonedFormatterCache.set(timeZone, formatter);
  return formatter;
};

const parseZonedNumber = (value: string): number => Number.parseInt(value, 10);

export const getZonedParts = (date: Date, timeZone: string): ZonedParts => {
  const parts = getZonedFormatter(timeZone).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, parseZonedNumber(part.value)])
  ) as Record<string, number>;

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second
  };
};

const toEpochFromLocalParts = (
  dateParts: LocalDateParts,
  timeParts: Required<LocalTimeParts>
): number => {
  return Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hour,
    timeParts.minute,
    timeParts.second,
    0
  );
};

export const parseTimeOfDay = (timeOfDay: string): Required<LocalTimeParts> => {
  const [hour, minute] = timeOfDay.split(":").map((value) => Number.parseInt(value, 10));
  return {
    hour,
    minute,
    second: 0
  };
};

export const parseDateOnly = (dateValue: string): LocalDateParts => {
  const [year, month, day] = dateValue.split("-").map((value) => Number.parseInt(value, 10));
  return { year, month, day };
};

export const zonedDateTimeToUtc = (
  dateParts: LocalDateParts,
  timeParts: LocalTimeParts,
  timeZone: string
): Date => {
  const normalizedTime = {
    hour: timeParts.hour,
    minute: timeParts.minute,
    second: timeParts.second ?? 0
  };

  const targetEpoch = toEpochFromLocalParts(dateParts, normalizedTime);
  let guess = targetEpoch;

  for (let index = 0; index < 4; index += 1) {
    const actual = getZonedParts(new Date(guess), timeZone);
    const actualEpoch = toEpochFromLocalParts(actual, actual);
    const diff = targetEpoch - actualEpoch;

    if (diff === 0) {
      break;
    }

    guess += diff;
  }

  return new Date(guess);
};

export const addDaysToDateParts = (dateParts: LocalDateParts, amount: number): LocalDateParts => {
  const next = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day + amount));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate()
  };
};

const daysInMonth = (year: number, month: number): number => {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
};

export const addMonthsToDateParts = (dateParts: LocalDateParts, amount: number): LocalDateParts => {
  const totalMonths = dateParts.year * 12 + (dateParts.month - 1) + amount;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  const day = Math.min(dateParts.day, daysInMonth(year, month));

  return { year, month, day };
};

export const getWeekdayFromDateParts = (dateParts: LocalDateParts): number => {
  return new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day)).getUTCDay();
};
