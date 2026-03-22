import type { TaskEventItem, TaskPriority, TaskRepeatType, TaskStatus } from "../../types";

export const TASK_BOARD_COLUMNS: TaskStatus[] = [
  "new",
  "in_progress",
  "waiting",
  "done",
  "cancelled"
];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  critical: "Critica"
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  new: "Nova",
  in_progress: "Em andamento",
  waiting: "Aguardando",
  done: "Concluida",
  cancelled: "Cancelada"
};

export const TASK_REPEAT_LABELS: Record<TaskRepeatType, string> = {
  none: "Sem recorrencia",
  daily: "Diaria",
  weekly: "Semanal",
  monthly: "Mensal",
  weekdays: "Dias uteis"
};

export const WEEKDAY_SHORT_LABELS = [
  { value: 0, label: "D", full: "Domingo" },
  { value: 1, label: "S", full: "Segunda" },
  { value: 2, label: "T", full: "Terca" },
  { value: 3, label: "Q", full: "Quarta" },
  { value: 4, label: "Q", full: "Quinta" },
  { value: 5, label: "S", full: "Sexta" },
  { value: 6, label: "S", full: "Sabado" }
];

export const TASK_PRIORITY_BADGES: Record<TaskPriority, string> = {
  low: "bg-panel text-textMuted",
  normal: "bg-accent/10 text-accent",
  high: "bg-warning/20 text-warning",
  critical: "bg-danger/20 text-danger"
};

export const TASK_STATUS_BADGES: Record<TaskStatus, string> = {
  new: "bg-accent/10 text-accent",
  in_progress: "bg-warning/20 text-warning",
  waiting: "bg-panel text-textMuted",
  done: "bg-success/20 text-success",
  cancelled: "bg-danger/20 text-danger"
};

export const TASK_EVENT_LABELS: Record<string, string> = {
  created: "Criacao",
  updated: "Atualizacao",
  status_changed: "Mudanca de status",
  assigned: "Atribuicao",
  due_date_changed: "Mudanca de prazo",
  recurrence_changed: "Mudanca de recorrencia",
  completed: "Conclusao",
  cancelled: "Cancelamento",
  automation_due_soon: "Automacao de prazo proximo",
  automation_overdue: "Automacao de atraso",
  automation_stale_task: "Automacao de tarefa parada",
  automation_recurring_task: "Automacao de recorrencia"
};

export const formatTaskDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("pt-BR");
};

export const toDateTimeLocalValue = (value: string | null | undefined): string => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

export const toApiDueAt = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

export const buildTaskEventSummary = (event: TaskEventItem): string => {
  if (event.eventType === "status_changed") {
    const from = event.fromStatus ? TASK_STATUS_LABELS[event.fromStatus] : "-";
    const to = event.toStatus ? TASK_STATUS_LABELS[event.toStatus] : "-";
    return `${from} -> ${to}`;
  }

  if (event.eventType === "assigned") {
    return "Responsavel atualizado";
  }

  if (event.eventType === "due_date_changed") {
    return "Prazo atualizado";
  }

  if (event.eventType === "recurrence_changed") {
    return "Recorrencia atualizada";
  }

  return TASK_EVENT_LABELS[event.eventType] ?? event.eventType;
};

export const buildTaskRecurrenceSummary = (
  repeatType: TaskRepeatType,
  repeatWeekdays: number[]
): string => {
  if (repeatType !== "weekly") {
    return TASK_REPEAT_LABELS[repeatType];
  }

  const labels = WEEKDAY_SHORT_LABELS.filter((item) => repeatWeekdays.includes(item.value))
    .map((item) => item.label)
    .join(", ");

  return labels ? `Semanal (${labels})` : TASK_REPEAT_LABELS.weekly;
};
