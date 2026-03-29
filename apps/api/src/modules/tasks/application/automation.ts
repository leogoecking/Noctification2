import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../../../config";
import {
  createAutomationNotification,
  createRecurringTaskAutomation
} from "./automation-operations";
import type { TaskAutomationType } from "../domain/automation-types";
import {
  createTaskLinkedNotification,
  dispatchTaskLinkedNotifications
} from "./notifications";
import {
  createTaskAutomationNotificationDefinitions,
  type TaskAutomationCycleContext
} from "./automation-definitions";
import {
  countActiveTasks,
  countAutomationSentToday,
  fetchDueSoonCandidates,
  fetchOverdueCandidates,
  fetchRecurringCandidates,
  fetchStaleCandidates,
  listTaskAutomationLogs as queryTaskAutomationLogs
} from "./automation-queries";

export const DEFAULT_TASK_AUTOMATION_DUE_SOON_MINUTES = 120;
export const DEFAULT_TASK_AUTOMATION_STALE_HOURS = 24;

export interface TaskAutomationHealthStats {
  schedulerEnabled: boolean;
  dueSoonWindowMinutes: number;
  staleWindowHours: number;
  activeTasks: number;
  dueSoonEligible: number;
  overdueEligible: number;
  staleEligible: number;
  recurringEligible: number;
  dueSoonSentToday: number;
  overdueSentToday: number;
  staleSentToday: number;
  recurringCreatedToday: number;
}

interface TaskAutomationCycleOptions {
  now?: () => Date;
}

const toTaskAutomationDueSoonMinutes = (config: AppConfig): number =>
  config.taskAutomationDueSoonMinutes ?? DEFAULT_TASK_AUTOMATION_DUE_SOON_MINUTES;

const toTaskAutomationStaleHours = (config: AppConfig): number =>
  config.taskAutomationStaleHours ?? DEFAULT_TASK_AUTOMATION_STALE_HOURS;

const collectTaskAutomationNotifications = (
  db: Database.Database,
  context: TaskAutomationCycleContext
): Array<ReturnType<typeof createTaskLinkedNotification>> => {
  const dispatches: Array<ReturnType<typeof createTaskLinkedNotification>> = [];

  for (const definition of createTaskAutomationNotificationDefinitions()) {
    const candidates = definition.fetchCandidates(db, context);
    for (const task of candidates) {
      const notification = createAutomationNotification(db, task, {
        automationType: definition.automationType,
        title: definition.buildTitle(task),
        message: definition.buildMessage(task),
        priority: definition.mapPriority(task.priority),
        dedupeKey: definition.buildDedupeKey(task),
        createdAt: context.nowTimestamp
      });

      if (notification) {
        dispatches.push(notification);
      }
    }
  }

  return dispatches;
};

const collectRecurringTaskAutomationNotifications = (
  db: Database.Database,
  createdAt: string
): Array<ReturnType<typeof createTaskLinkedNotification>> => {
  const dispatches: Array<ReturnType<typeof createTaskLinkedNotification>> = [];

  for (const task of fetchRecurringCandidates(db)) {
    const notification = createRecurringTaskAutomation(db, task, createdAt);
    if (notification) {
      dispatches.push(notification);
    }
  }

  return dispatches;
};

export const runTaskAutomationCycle = (
  db: Database.Database,
  io: Server,
  config: AppConfig,
  options: TaskAutomationCycleOptions = {}
) => {
  if (!config.enableTaskAutomationScheduler) {
    return;
  }

  const now = options.now ? options.now() : new Date();
  const nowTimestamp = now.toISOString();
  const dueSoonWindowMinutes = toTaskAutomationDueSoonMinutes(config);
  const staleWindowHours = toTaskAutomationStaleHours(config);
  const dueSoonWindowEnd = new Date(now.getTime() + dueSoonWindowMinutes * 60_000).toISOString();
  const staleCutoff = new Date(now.getTime() - staleWindowHours * 60 * 60_000).toISOString();
  const context: TaskAutomationCycleContext = {
    nowTimestamp,
    dueSoonWindowEnd,
    staleCutoff
  };
  const dispatches: Array<ReturnType<typeof createTaskLinkedNotification>> = [];

  db.transaction(() => {
    dispatches.push(...collectTaskAutomationNotifications(db, context));
    dispatches.push(...collectRecurringTaskAutomationNotifications(db, nowTimestamp));
  })();

  dispatchTaskLinkedNotifications(db, config, io, dispatches);
};

export const buildTaskAutomationHealth = (
  db: Database.Database,
  config: AppConfig,
  now = new Date()
): TaskAutomationHealthStats => {
  const dueSoonWindowMinutes = toTaskAutomationDueSoonMinutes(config);
  const staleWindowHours = toTaskAutomationStaleHours(config);
  const nowTimestamp = now.toISOString();
  const dueSoonWindowEnd = new Date(now.getTime() + dueSoonWindowMinutes * 60_000).toISOString();
  const staleCutoff = new Date(now.getTime() - staleWindowHours * 60 * 60_000).toISOString();

  return {
    schedulerEnabled: Boolean(config.enableTaskAutomationScheduler),
    dueSoonWindowMinutes,
    staleWindowHours,
    activeTasks: countActiveTasks(db),
    dueSoonEligible: fetchDueSoonCandidates(db, nowTimestamp, dueSoonWindowEnd).length,
    overdueEligible: fetchOverdueCandidates(db, nowTimestamp).length,
    staleEligible: fetchStaleCandidates(db, staleCutoff, dueSoonWindowEnd).length,
    recurringEligible: fetchRecurringCandidates(db).length,
    dueSoonSentToday: countAutomationSentToday(db, "due_soon"),
    overdueSentToday: countAutomationSentToday(db, "overdue"),
    staleSentToday: countAutomationSentToday(db, "stale_task"),
    recurringCreatedToday: countAutomationSentToday(db, "recurring_task")
  };
};

export const listTaskAutomationLogs = (
  db: Database.Database,
  params: {
    automationType?: TaskAutomationType | "";
    taskId?: number | null;
    limit: number;
  }
) => queryTaskAutomationLogs(db, params);
