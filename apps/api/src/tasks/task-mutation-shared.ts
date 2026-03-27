import type Database from "better-sqlite3";
import type { TaskStatus } from "../types";
import type { TaskRow } from "./service";

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  new: "Nova",
  in_progress: "Em andamento",
  waiting: "Aguardando",
  done: "Concluida",
  cancelled: "Cancelada"
};

export const buildTaskAssignmentMessage = (
  taskTitle: string,
  actorName: string,
  dueAt: string | null
): string => {
  const dueSuffix = dueAt ? ` Prazo atual: ${dueAt}.` : "";
  return `${actorName} atribuiu a tarefa "${taskTitle}" para voce.${dueSuffix}`;
};

export const buildTaskStatusMessage = (
  taskTitle: string,
  actorName: string,
  status: TaskStatus
): string => `${actorName} atualizou a tarefa "${taskTitle}" para ${TASK_STATUS_LABELS[status]}.`;

export const buildRecipientIds = (...values: Array<number | null | undefined>): number[] =>
  Array.from(
    new Set(values.filter((value): value is number => typeof value === "number" && Number.isInteger(value) && value > 0))
  );

export interface AssigneeValidationContext {
  actorUserId: number;
  nextAssigneeUserId: number | null;
}

export interface TaskCreatePolicy {
  auditEventType: string;
  notificationTrigger: string;
  validateAssignee: (context: AssigneeValidationContext) => string | null;
}

export interface TaskCreateMutationOptions {
  db: Database.Database;
  body: Record<string, unknown>;
  actorUserId: number;
  actorName: string;
  timestamp: string;
  policy: TaskCreatePolicy;
}

export interface TaskUpdatePolicy {
  changedBy: string;
  auditEventType: string;
  notificationTrigger: string;
  validateAssignee: (context: AssigneeValidationContext) => string | null;
}

export interface TaskUpdateMutationOptions {
  db: Database.Database;
  taskId: number;
  body: Record<string, unknown>;
  existing: TaskRow;
  actorUserId: number;
  actorName: string;
  timestamp: string;
  policy: TaskUpdatePolicy;
}

export interface TerminalTransitionOptions {
  db: Database.Database;
  taskId: number;
  existing: TaskRow;
  actorUserId: number;
  actorName: string;
  targetStatus: "done" | "cancelled";
  auditEventType: string;
  notificationTrigger: string;
  timestamp: string;
}
