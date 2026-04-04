import type Database from "better-sqlite3";
import { logAudit, nowIso, sanitizeMetadata } from "../../../db";
import type { TaskEventType, TaskStatus } from "../../../types";

export const logTaskEvent = (
  db: Database.Database,
  params: {
    taskId: number;
    actorUserId?: number | null;
    eventType: TaskEventType;
    fromStatus?: TaskStatus | null;
    toStatus?: TaskStatus | null;
    metadata?: Record<string, unknown>;
    createdAt?: string;
  }
): void => {
  db.prepare(
    `
      INSERT INTO task_events (
        task_id,
        actor_user_id,
        event_type,
        from_status,
        to_status,
        metadata_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    params.taskId,
    params.actorUserId ?? null,
    params.eventType,
    params.fromStatus ?? null,
    params.toStatus ?? null,
    sanitizeMetadata(params.metadata),
    params.createdAt ?? nowIso()
  );
};

export const logTaskAudit = (
  db: Database.Database,
  params: {
    actorUserId: number;
    taskId: number;
    eventType: string;
    metadata?: Record<string, unknown>;
  }
): void => {
  logAudit(db, {
    actorUserId: params.actorUserId,
    eventType: params.eventType,
    targetType: "task",
    targetId: params.taskId,
    metadata: params.metadata
  });
};
