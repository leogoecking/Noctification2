import type Database from "better-sqlite3";
import {
  buildDueSoonMessage,
  buildOverdueMessage,
  buildStaleTaskMessage,
  toDueSoonPriority,
  toOverduePriority,
  toStalePriority
} from "./automation-operations";
import type { TaskAutomationCandidateRow, TaskAutomationType } from "./automation-types";
import type { NotificationPriority } from "../types";
import {
  fetchDueSoonCandidates,
  fetchOverdueCandidates,
  fetchStaleCandidates
} from "./automation-queries";

export interface TaskAutomationCycleContext {
  nowTimestamp: string;
  dueSoonWindowEnd: string;
  staleCutoff: string;
}

export interface TaskAutomationNotificationDefinition {
  automationType: Exclude<TaskAutomationType, "recurring_task">;
  fetchCandidates: (db: Database.Database, context: TaskAutomationCycleContext) => TaskAutomationCandidateRow[];
  buildTitle: (task: TaskAutomationCandidateRow) => string;
  buildMessage: (task: TaskAutomationCandidateRow) => string;
  mapPriority: (priority: NotificationPriority) => NotificationPriority;
  buildDedupeKey: (task: TaskAutomationCandidateRow) => string;
}

export const createTaskAutomationNotificationDefinitions = (): TaskAutomationNotificationDefinition[] => [
  {
    automationType: "due_soon",
    fetchCandidates: (db, context) =>
      fetchDueSoonCandidates(db, context.nowTimestamp, context.dueSoonWindowEnd),
    buildTitle: (task) => `Prazo proximo: ${task.title}`,
    buildMessage: buildDueSoonMessage,
    mapPriority: toDueSoonPriority,
    buildDedupeKey: (task) => `due_soon:${task.dueAt}`
  },
  {
    automationType: "overdue",
    fetchCandidates: (db, context) => fetchOverdueCandidates(db, context.nowTimestamp),
    buildTitle: (task) => `Tarefa atrasada: ${task.title}`,
    buildMessage: buildOverdueMessage,
    mapPriority: toOverduePriority,
    buildDedupeKey: (task) => `overdue:${task.dueAt}`
  },
  {
    automationType: "stale_task",
    fetchCandidates: (db, context) =>
      fetchStaleCandidates(db, context.staleCutoff, context.dueSoonWindowEnd),
    buildTitle: (task) => `Tarefa parada: ${task.title}`,
    buildMessage: buildStaleTaskMessage,
    mapPriority: toStalePriority,
    buildDedupeKey: (task) => `stale_task:${task.updatedAt}`
  }
];
