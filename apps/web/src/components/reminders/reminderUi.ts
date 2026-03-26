import type { ReminderItem, ReminderOccurrenceItem, ReminderRepeatType } from "../../types";

export type ReminderFilterMode = "all" | "active" | "inactive";
export type OccurrenceFilterMode = "all" | "today" | ReminderOccurrenceItem["status"];

export const REMINDER_FILTER_LABELS: Record<ReminderFilterMode, string> = {
  all: "Todos",
  active: "Ativos",
  inactive: "Inativos"
};

export const OCCURRENCE_FILTER_LABELS: Record<OccurrenceFilterMode, string> = {
  all: "Todas",
  today: "Hoje",
  pending: "Pendentes",
  completed: "Concluidas",
  expired: "Expiradas",
  cancelled: "Canceladas"
};

export const REMINDER_EMPTY_FORM = {
  id: 0,
  title: "",
  description: "",
  startDate: "",
  timeOfDay: "",
  timezone: "America/Bahia",
  repeatType: "none" as ReminderRepeatType,
  weekdays: [] as number[]
};

export const REMINDER_WEEKDAY_LABELS = [
  { short: "Dom", full: "domingo", value: 0 },
  { short: "Seg", full: "segunda", value: 1 },
  { short: "Ter", full: "terca", value: 2 },
  { short: "Qua", full: "quarta", value: 3 },
  { short: "Qui", full: "quinta", value: 4 },
  { short: "Sex", full: "sexta", value: 5 },
  { short: "Sab", full: "sabado", value: 6 }
] as const;

export const matchesReminderFilter = (item: ReminderItem, filter: ReminderFilterMode): boolean => {
  if (filter === "active") {
    return item.isActive;
  }

  if (filter === "inactive") {
    return !item.isActive;
  }

  return true;
};

export const sortReminders = (items: ReminderItem[]): ReminderItem[] =>
  [...items].sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });

export const matchesOccurrenceFilter = (
  item: ReminderOccurrenceItem,
  filter: OccurrenceFilterMode
): boolean => {
  if (filter === "today") {
    return (
      new Date(item.scheduledFor).toLocaleDateString("sv-SE") ===
      new Date().toLocaleDateString("sv-SE")
    );
  }

  if (filter !== "all") {
    return item.status === filter;
  }

  return true;
};

export const formatOccurrenceStatus = (status: ReminderOccurrenceItem["status"]) => {
  if (status === "pending") return "Pendente";
  if (status === "completed") return "Concluida";
  if (status === "expired") return "Expirada";
  return "Cancelada";
};

export const formatRepeatType = (repeatType: ReminderRepeatType) => {
  if (repeatType === "none") return "Sem repeticao";
  if (repeatType === "daily") return "Diaria";
  if (repeatType === "weekly") return "Semanal";
  if (repeatType === "monthly") return "Mensal";
  return "Dias uteis";
};

export const formatReminderSummary = (
  item: Pick<ReminderItem, "repeatType" | "weekdays" | "timeOfDay">
) => {
  if (item.repeatType === "none") {
    return `Uma vez as ${item.timeOfDay}`;
  }

  if (item.repeatType === "daily") {
    return `Todos os dias as ${item.timeOfDay}`;
  }

  if (item.repeatType === "monthly") {
    return `Todo mes as ${item.timeOfDay}`;
  }

  if (item.repeatType === "weekdays") {
    return `Dias uteis as ${item.timeOfDay}`;
  }

  const days = REMINDER_WEEKDAY_LABELS.filter((day) => item.weekdays.includes(day.value)).map((day) => day.full);
  return days.length > 0 ? `${days.join(", ")} as ${item.timeOfDay}` : `Semanal as ${item.timeOfDay}`;
};
