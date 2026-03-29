import { createTaskLinkedNotification } from "../application/notifications";
import { logTaskAudit, logTaskEvent } from "../application/service";
import {
  buildRecipientIds,
  buildTaskStatusMessage,
  type TerminalTransitionOptions
} from "./task-mutation-shared";

export const runTaskTerminalTransition = (
  params: TerminalTransitionOptions
): ReturnType<typeof createTaskLinkedNotification> => {
  const notificationTitle = `Atualizacao de tarefa: ${params.existing.title}`;
  let notification: ReturnType<typeof createTaskLinkedNotification> = null;

  params.db.transaction(() => {
    if (params.targetStatus === "done") {
      params.db
        .prepare(
          `
            UPDATE tasks
            SET
              status = 'done',
              started_at = COALESCE(started_at, ?),
              completed_at = ?,
              cancelled_at = NULL,
              updated_at = ?
            WHERE id = ?
          `
        )
        .run(params.timestamp, params.timestamp, params.timestamp, params.taskId);
    } else {
      params.db
        .prepare(
          `
            UPDATE tasks
            SET
              status = 'cancelled',
              cancelled_at = ?,
              completed_at = NULL,
              updated_at = ?
            WHERE id = ?
          `
        )
        .run(params.timestamp, params.timestamp, params.taskId);
    }

    logTaskEvent(params.db, {
      taskId: params.taskId,
      actorUserId: params.actorUserId,
      eventType: params.targetStatus === "done" ? "completed" : "cancelled",
      fromStatus: params.existing.status,
      toStatus: params.targetStatus,
      createdAt: params.timestamp
    });

    logTaskAudit(params.db, {
      actorUserId: params.actorUserId,
      taskId: params.taskId,
      eventType: params.auditEventType,
      metadata:
        params.targetStatus === "done"
          ? {
              previousStatus: params.existing.status,
              completedAt: params.timestamp
            }
          : {
              previousStatus: params.existing.status,
              cancelledAt: params.timestamp
            }
    });

    const recipientIds = buildRecipientIds(
      params.existing.creatorUserId,
      params.existing.assigneeUserId
    ).filter((userId) => userId !== params.actorUserId);

    if (recipientIds.length > 0) {
      notification = createTaskLinkedNotification(params.db, {
        actorUserId: params.actorUserId,
        sourceTaskId: params.taskId,
        title: notificationTitle,
        message: buildTaskStatusMessage(params.existing.title, params.actorName, params.targetStatus),
        priority: params.existing.priority,
        recipientIds,
        auditEventType: "task.notification.status_changed",
        auditMetadata: {
          trigger: params.notificationTrigger,
          fromStatus: params.existing.status,
          toStatus: params.targetStatus
        },
        createdAt: params.timestamp
      });
    }
  })();

  return notification;
};
