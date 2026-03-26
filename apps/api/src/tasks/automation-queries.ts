import type Database from "better-sqlite3";
import {
  NON_TERMINAL_TASK_STATUS_FILTER,
  type TaskAutomationCandidateRow,
  type TaskAutomationLogRow,
  type TaskAutomationType
} from "./automation-types";

export const fetchDueSoonCandidates = (
  db: Database.Database,
  nowTimestamp: string,
  windowEnd: string
): TaskAutomationCandidateRow[] =>
  db
    .prepare(
      `
        SELECT
          t.id,
          t.title,
          t.status,
          t.priority,
          t.creator_user_id AS creatorUserId,
          t.assignee_user_id AS assigneeUserId,
          t.due_at AS dueAt,
          t.repeat_type AS repeatType,
          t.repeat_weekdays_json AS repeatWeekdaysJson,
          t.updated_at AS updatedAt,
          t.updated_at AS staleSince,
          t.completed_at AS completedAt
        FROM tasks t
        WHERE t.archived_at IS NULL
          AND t.status IN ${NON_TERMINAL_TASK_STATUS_FILTER}
          AND t.due_at IS NOT NULL
          AND t.due_at > ?
          AND t.due_at <= ?
          AND NOT EXISTS (
            SELECT 1
            FROM task_automation_logs tal
            WHERE tal.task_id = t.id
              AND tal.automation_type = 'due_soon'
              AND tal.dedupe_key = ('due_soon:' || t.due_at)
          )
        ORDER BY t.due_at ASC, t.id ASC
      `
    )
    .all(nowTimestamp, windowEnd) as TaskAutomationCandidateRow[];

export const fetchOverdueCandidates = (
  db: Database.Database,
  nowTimestamp: string
): TaskAutomationCandidateRow[] =>
  db
    .prepare(
      `
        SELECT
          t.id,
          t.title,
          t.status,
          t.priority,
          t.creator_user_id AS creatorUserId,
          t.assignee_user_id AS assigneeUserId,
          t.due_at AS dueAt,
          t.repeat_type AS repeatType,
          t.repeat_weekdays_json AS repeatWeekdaysJson,
          t.updated_at AS updatedAt,
          t.updated_at AS staleSince,
          t.completed_at AS completedAt
        FROM tasks t
        WHERE t.archived_at IS NULL
          AND t.status IN ${NON_TERMINAL_TASK_STATUS_FILTER}
          AND t.due_at IS NOT NULL
          AND t.due_at <= ?
          AND NOT EXISTS (
            SELECT 1
            FROM task_automation_logs tal
            WHERE tal.task_id = t.id
              AND tal.automation_type = 'overdue'
              AND tal.dedupe_key = ('overdue:' || t.due_at)
          )
        ORDER BY t.due_at ASC, t.id ASC
      `
    )
    .all(nowTimestamp) as TaskAutomationCandidateRow[];

export const fetchStaleCandidates = (
  db: Database.Database,
  staleCutoff: string,
  dueSoonWindowEnd: string
): TaskAutomationCandidateRow[] =>
  db
    .prepare(
      `
        SELECT
          t.id,
          t.title,
          t.status,
          t.priority,
          t.creator_user_id AS creatorUserId,
          t.assignee_user_id AS assigneeUserId,
          t.due_at AS dueAt,
          t.repeat_type AS repeatType,
          t.repeat_weekdays_json AS repeatWeekdaysJson,
          t.updated_at AS updatedAt,
          t.updated_at AS staleSince,
          t.completed_at AS completedAt
        FROM tasks t
        WHERE t.archived_at IS NULL
          AND t.status IN ${NON_TERMINAL_TASK_STATUS_FILTER}
          AND t.updated_at <= ?
          AND (t.due_at IS NULL OR t.due_at > ?)
          AND NOT EXISTS (
            SELECT 1
            FROM task_automation_logs tal
            WHERE tal.task_id = t.id
              AND tal.automation_type = 'stale_task'
              AND tal.dedupe_key = ('stale_task:' || t.updated_at)
          )
        ORDER BY t.updated_at ASC, t.id ASC
      `
    )
    .all(staleCutoff, dueSoonWindowEnd) as TaskAutomationCandidateRow[];

export const fetchRecurringCandidates = (db: Database.Database): TaskAutomationCandidateRow[] =>
  db
    .prepare(
      `
        SELECT
          t.id,
          t.title,
          t.status,
          t.priority,
          t.creator_user_id AS creatorUserId,
          t.assignee_user_id AS assigneeUserId,
          t.due_at AS dueAt,
          t.repeat_type AS repeatType,
          t.repeat_weekdays_json AS repeatWeekdaysJson,
          t.updated_at AS updatedAt,
          t.updated_at AS staleSince,
          t.completed_at AS completedAt
        FROM tasks t
        WHERE t.archived_at IS NULL
          AND t.status = 'done'
          AND t.repeat_type <> 'none'
          AND t.completed_at IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM task_automation_logs tal
            WHERE tal.task_id = t.id
              AND tal.automation_type = 'recurring_task'
              AND tal.dedupe_key = ('recurring_task:' || t.completed_at)
          )
        ORDER BY t.completed_at ASC, t.id ASC
      `
    )
    .all() as TaskAutomationCandidateRow[];

export const countActiveTasks = (db: Database.Database): number =>
  (
    db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM tasks
          WHERE archived_at IS NULL
            AND status IN ${NON_TERMINAL_TASK_STATUS_FILTER}
        `
      )
      .get() as { total: number }
  ).total;

export const countAutomationSentToday = (
  db: Database.Database,
  automationType: TaskAutomationType
): number =>
  (
    db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM task_automation_logs
          WHERE automation_type = ?
            AND date(datetime(created_at, 'localtime')) = date('now', 'localtime')
        `
      )
      .get(automationType) as { total: number }
  ).total;

export const listTaskAutomationLogs = (
  db: Database.Database,
  params: {
    automationType?: TaskAutomationType | "";
    taskId?: number | null;
    limit: number;
  }
) =>
  db
    .prepare(
      `
        SELECT
          tal.id,
          tal.task_id AS taskId,
          t.title AS taskTitle,
          tal.automation_type AS automationType,
          tal.dedupe_key AS dedupeKey,
          tal.notification_id AS notificationId,
          tal.metadata_json AS metadataJson,
          tal.created_at AS createdAt
        FROM task_automation_logs tal
        INNER JOIN tasks t ON t.id = tal.task_id
        WHERE (? = '' OR tal.automation_type = ?)
          AND (? IS NULL OR tal.task_id = ?)
        ORDER BY tal.created_at DESC, tal.id DESC
        LIMIT ?
      `
    )
    .all(
      params.automationType ?? "",
      params.automationType ?? "",
      params.taskId ?? null,
      params.taskId ?? null,
      params.limit
    ) as TaskAutomationLogRow[];
