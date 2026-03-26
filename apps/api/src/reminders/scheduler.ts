import type Database from "better-sqlite3";
import type { Server } from "socket.io";
import type { AppConfig } from "../config";
import { runTaskAutomationCycle } from "../tasks/automation";
import { deliverPendingOccurrences, generateDueOccurrences } from "./operations";

export const MAX_RETRIES = 3;
export const RETRY_INTERVAL_MS = 10 * 60 * 1000;
const TICK_INTERVAL_MS = 60 * 1000;

export interface ReminderSchedulerOptions {
  now?: () => Date;
}

export const runReminderSchedulerCycle = (
  db: Database.Database,
  io: Server,
  options: ReminderSchedulerOptions = {}
) => {
  const now = options.now ? options.now() : new Date();
  generateDueOccurrences(db, now);
  deliverPendingOccurrences(db, io, now, MAX_RETRIES, RETRY_INTERVAL_MS);
};

export const startReminderScheduler = (
  db: Database.Database,
  io: Server,
  options: ReminderSchedulerOptions = {}
) => {
  let running = false;

  const tick = () => {
    if (running) {
      return;
    }

    running = true;
    try {
      runReminderSchedulerCycle(db, io, options);
    } finally {
      running = false;
    }
  };

  tick();
  const timer = setInterval(tick, TICK_INTERVAL_MS);
  return () => clearInterval(timer);
};

export const startOperationalScheduler = (
  db: Database.Database,
  io: Server,
  config: AppConfig,
  options: ReminderSchedulerOptions = {}
) => {
  let running = false;

  const tick = () => {
    if (running) {
      return;
    }

    running = true;
    try {
      if (config.enableReminderScheduler) {
        runReminderSchedulerCycle(db, io, options);
      }

      if (config.enableTaskAutomationScheduler) {
        runTaskAutomationCycle(db, io, config, options);
      }
    } finally {
      running = false;
    }
  };

  tick();
  const timer = setInterval(tick, TICK_INTERVAL_MS);
  return () => clearInterval(timer);
};
