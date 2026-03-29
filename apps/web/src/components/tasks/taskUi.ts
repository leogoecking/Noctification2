import type {
  TaskEventItem,
  TaskItem,
  TaskPriority,
  TaskRepeatType,
  TaskStatus,
  TaskTimelineItem
} from "../../types";

export const TASK_BOARD_COLUMNS: TaskStatus[] = [
  "new",
  "assumed",
  "in_progress",
  "blocked",
  "waiting_external",
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
  assumed: "Assumida",
  in_progress: "Em andamento",
  blocked: "Bloqueada",
  waiting_external: "Aguardando externo",
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
  assumed: "bg-sky-500/15 text-sky-300",
  in_progress: "bg-warning/20 text-warning",
  blocked: "bg-danger/20 text-danger",
  waiting_external: "bg-panel text-textMuted",
  done: "bg-success/20 text-success",
  cancelled: "bg-danger/20 text-danger"
};

export type TaskQueueFilter = "all" | "attention" | "due_today" | "overdue" | "blocked" | "stale" | "unassigned";

export const TASK_QUEUE_LABELS: Record<TaskQueueFilter, string> = {
  all: "Todas",
  attention: "Precisa de atencao",
  due_today: "Vence hoje",
  overdue: "Atrasadas",
  blocked: "Bloqueadas",
  stale: "Paradas 24h+",
  unassigned: "Sem responsavel"
};

type TaskSlaKind = "overdue" | "due_today" | "due_soon" | "blocked" | "stale" | "no_due" | "terminal";

export interface TaskSlaInfo {
  kind: TaskSlaKind;
  label: string;
  detail: string;
  badgeClassName: string;
  sortWeight: number;
}

export const TASK_EVENT_LABELS: Record<string, string> = {
  created: "Criacao",
  updated: "Atualizacao",
  title_changed: "Titulo atualizado",
  description_changed: "Descricao atualizada",
  priority_changed: "Prioridade atualizada",
  status_changed: "Mudanca de status",
  assigned: "Atribuicao",
  due_date_changed: "Mudanca de prazo",
  recurrence_changed: "Mudanca de recorrencia",
  completed: "Conclusao",
  cancelled: "Cancelamento",
  automation_due_soon: "Automacao de prazo proximo",
  automation_overdue: "Automacao de atraso",
  automation_stale_task: "Automacao de tarefa parada",
  automation_blocked_task: "Automacao de bloqueio prolongado",
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

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3
};

const isTaskTerminal = (status: TaskStatus): boolean => status === "done" || status === "cancelled";

const isSameLocalDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const buildTaskSlaInfo = (task: TaskItem, now = new Date()): TaskSlaInfo => {
  if (isTaskTerminal(task.status)) {
    return {
      kind: "terminal",
      label: "Encerrada",
      detail: TASK_STATUS_LABELS[task.status],
      badgeClassName: "bg-panel text-textMuted",
      sortWeight: 7
    };
  }

  const updatedAt = new Date(task.updatedAt);
  const dueAt = task.dueAt ? new Date(task.dueAt) : null;
  const isStale = now.getTime() - updatedAt.getTime() >= 24 * 60 * 60 * 1000;

  if (dueAt) {
    if (dueAt.getTime() < now.getTime()) {
      return {
        kind: "overdue",
        label: "Atrasada",
        detail: `Prazo ${formatTaskDateTime(task.dueAt)}`,
        badgeClassName: "bg-danger/20 text-danger",
        sortWeight: 0
      };
    }

    if (isSameLocalDay(dueAt, now)) {
      return {
        kind: "due_today",
        label: "Vence hoje",
        detail: `Prazo ${formatTaskDateTime(task.dueAt)}`,
        badgeClassName: "bg-warning/20 text-warning",
        sortWeight: 1
      };
    }

    if (dueAt.getTime() - now.getTime() <= 24 * 60 * 60 * 1000) {
      return {
        kind: "due_soon",
        label: "Vence em breve",
        detail: `Prazo ${formatTaskDateTime(task.dueAt)}`,
        badgeClassName: "bg-accent/10 text-accent",
        sortWeight: 3
      };
    }
  }

  if (task.status === "blocked") {
    return {
      kind: "blocked",
      label: "Bloqueada",
      detail: isStale ? "Bloqueada e parada ha mais de 24h" : "Bloqueio operacional",
      badgeClassName: "bg-danger/20 text-danger",
      sortWeight: 2
    };
  }

  if (isStale) {
    return {
      kind: "stale",
      label: "Parada 24h+",
      detail: `Sem atualizacao desde ${formatTaskDateTime(task.updatedAt)}`,
      badgeClassName: "bg-warning/20 text-warning",
      sortWeight: 4
    };
  }

  return {
    kind: "no_due",
    label: task.dueAt ? "No prazo" : "Sem prazo",
    detail: task.dueAt ? `Prazo ${formatTaskDateTime(task.dueAt)}` : "Sem prazo definido",
    badgeClassName: "bg-panel text-textMuted",
    sortWeight: 5
  };
};

export const matchesTaskQueueFilter = (
  task: TaskItem,
  filter: TaskQueueFilter,
  now = new Date()
): boolean => {
  if (filter === "all") {
    return true;
  }

  if (isTaskTerminal(task.status)) {
    return false;
  }

  const sla = buildTaskSlaInfo(task, now);

  if (filter === "due_today") {
    return sla.kind === "due_today";
  }

  if (filter === "attention") {
    return sla.kind === "overdue" || sla.kind === "due_today" || task.status === "blocked" || sla.kind === "stale";
  }

  if (filter === "overdue") {
    return sla.kind === "overdue";
  }

  if (filter === "blocked") {
    return task.status === "blocked";
  }

  if (filter === "stale") {
    return sla.kind === "stale" || (task.status === "blocked" && sla.detail.includes("24h"));
  }

  return task.assigneeUserId === null;
};

export const compareTasksByOperationalOrder = (left: TaskItem, right: TaskItem, now = new Date()): number => {
  const leftSla = buildTaskSlaInfo(left, now);
  const rightSla = buildTaskSlaInfo(right, now);

  if (leftSla.sortWeight !== rightSla.sortWeight) {
    return leftSla.sortWeight - rightSla.sortWeight;
  }

  if (PRIORITY_ORDER[left.priority] !== PRIORITY_ORDER[right.priority]) {
    return PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority];
  }

  if (left.dueAt && right.dueAt) {
    const dueDiff = new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
    if (dueDiff !== 0) {
      return dueDiff;
    }
  }

  if (left.dueAt && !right.dueAt) {
    return -1;
  }

  if (!left.dueAt && right.dueAt) {
    return 1;
  }

  return new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
};

export const buildTaskEventSummary = (event: TaskEventItem): string => {
  if (event.eventType === "title_changed") {
    return "Titulo atualizado";
  }

  if (event.eventType === "description_changed") {
    return "Descricao atualizada";
  }

  if (event.eventType === "priority_changed") {
    return "Prioridade atualizada";
  }

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

const readStringMetadata = (metadata: Record<string, unknown> | null, key: string): string | null => {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

export const buildTaskTimelineDetail = (item: TaskTimelineItem): string | null => {
  if (item.kind !== "event" || !item.eventType) {
    return null;
  }

  if (item.eventType === "title_changed") {
    const previousTitle = readStringMetadata(item.metadata, "previousTitle");
    const nextTitle = readStringMetadata(item.metadata, "nextTitle");
    if (previousTitle && nextTitle) {
      return `"${previousTitle}" -> "${nextTitle}"`;
    }
  }

  if (item.eventType === "priority_changed") {
    const previousPriority = readStringMetadata(item.metadata, "previousPriority");
    const nextPriority = readStringMetadata(item.metadata, "nextPriority");
    if (previousPriority && nextPriority) {
      return `${TASK_PRIORITY_LABELS[previousPriority as TaskPriority] ?? previousPriority} -> ${
        TASK_PRIORITY_LABELS[nextPriority as TaskPriority] ?? nextPriority
      }`;
    }
  }

  if (item.eventType === "assigned") {
    const nextAssigneeUserId = item.metadata?.nextAssigneeUserId;
    if (typeof nextAssigneeUserId === "number") {
      return `Novo responsavel ID ${nextAssigneeUserId}`;
    }

    if (nextAssigneeUserId === null) {
      return "Responsavel removido";
    }
  }

  if (item.eventType === "due_date_changed") {
    const nextDueAt = readStringMetadata(item.metadata, "nextDueAt");
    return nextDueAt ? `Novo prazo ${formatTaskDateTime(nextDueAt)}` : "Prazo removido";
  }

  if (item.eventType === "completed") {
    const completedAt = readStringMetadata(item.metadata, "completedAt");
    return completedAt ? `Concluida em ${formatTaskDateTime(completedAt)}` : null;
  }

  if (item.eventType === "cancelled") {
    const cancelledAt = readStringMetadata(item.metadata, "cancelledAt");
    return cancelledAt ? `Cancelada em ${formatTaskDateTime(cancelledAt)}` : null;
  }

  if (item.eventType === "automation_blocked_task") {
    return "Bloqueio prolongado detectado automaticamente";
  }

  if (item.eventType === "automation_stale_task") {
    return "Sem atualizacao recente";
  }

  return null;
};

export const buildTaskTimelineSummary = (item: TaskTimelineItem): string => {
  if (item.kind === "comment") {
    return "Comentario";
  }

  return buildTaskEventSummary({
    id: Number(item.id.split(":")[1] ?? 0),
    taskId: item.taskId,
    actorUserId: item.actorUserId,
    actorName: item.actorName,
    actorLogin: item.actorLogin,
    eventType: item.eventType ?? "updated",
    fromStatus: item.fromStatus,
    toStatus: item.toStatus,
    metadata: item.metadata,
    createdAt: item.createdAt
  });
};

export const isTaskTimelineAutomatic = (item: TaskTimelineItem): boolean =>
  item.kind === "event" && typeof item.eventType === "string" && item.eventType.startsWith("automation_");

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
