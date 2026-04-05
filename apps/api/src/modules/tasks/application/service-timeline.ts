import type Database from "better-sqlite3";
import type { TaskTimelineItem } from "./service-types";
import { listTaskComments, listTaskEvents } from "./service-queries";

export const listTaskTimeline = (db: Database.Database, taskId: number): TaskTimelineItem[] => {
  const events = listTaskEvents(db, taskId).map((event) => ({
    id: `event:${event.id}`,
    kind: "event" as const,
    taskId: event.taskId,
    actorUserId: event.actorUserId,
    actorName: event.actorName ?? null,
    actorLogin: event.actorLogin ?? null,
    eventType: event.eventType,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    body: null,
    metadata: event.metadata,
    createdAt: event.createdAt,
    updatedAt: null
  }));
  const comments = listTaskComments(db, taskId).map((comment) => ({
    id: `comment:${comment.id}`,
    kind: "comment" as const,
    taskId: comment.taskId,
    actorUserId: comment.authorUserId,
    actorName: comment.authorName,
    actorLogin: comment.authorLogin,
    eventType: null,
    fromStatus: null,
    toStatus: null,
    body: comment.body,
    metadata: null,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt
  }));

  return [...events, ...comments].sort((left, right) => {
    const createdAtCompare = right.createdAt.localeCompare(left.createdAt);
    if (createdAtCompare !== 0) {
      return createdAtCompare;
    }

    return right.id.localeCompare(left.id);
  });
};
