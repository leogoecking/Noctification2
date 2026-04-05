import { createTaskLinkedNotification } from "../application/notifications";
import { logTaskAudit, logTaskEvent } from "../application/service";
import {
  buildRecipientIds,
  buildTaskAssignmentMessage,
  buildTaskStatusMessage,
  type TaskUpdateMutationOptions
} from "./task-mutation-shared";
import type { TaskUpdatePlan } from "./task-update-plan";

type NormalizedTask = ReturnType<typeof import("../application/service").normalizeTaskRow>;
type LinkedNotification = ReturnType<typeof createTaskLinkedNotification>;

interface TaskUpdateEffectsParams {
  db: TaskUpdateMutationOptions["db"];
  taskId: number;
  existingTask: NormalizedTask;
  body: TaskUpdateMutationOptions["body"];
  actorUserId: number;
  actorName: string;
  timestamp: string;
  policy: TaskUpdateMutationOptions["policy"];
  plan: TaskUpdatePlan;
}

export const applyTaskUpdateEffects = ({
  db,
  taskId,
  existingTask,
  body,
  actorUserId,
  actorName,
  timestamp,
  policy,
  plan
}: TaskUpdateEffectsParams): {
  assignmentNotification: LinkedNotification;
  statusNotification: LinkedNotification;
} => {
  let assignmentNotification: LinkedNotification = null;
  let statusNotification: LinkedNotification = null;

  if (plan.titleRaw !== undefined && existingTask.title !== plan.metadata.title) {
    logTaskEvent(db, {
      taskId,
      actorUserId,
      eventType: "title_changed",
      metadata: {
        previousTitle: existingTask.title,
        nextTitle: plan.metadata.title
      },
      createdAt: timestamp
    });
  }

  if (body.description !== undefined && existingTask.description !== plan.metadata.description) {
    logTaskEvent(db, {
      taskId,
      actorUserId,
      eventType: "description_changed",
      metadata: {
        previousDescription: existingTask.description,
        nextDescription: plan.metadata.description
      },
      createdAt: timestamp
    });
  }

  if (body.priority !== undefined && existingTask.priority !== plan.metadata.priority) {
    logTaskEvent(db, {
      taskId,
      actorUserId,
      eventType: "priority_changed",
      metadata: {
        previousPriority: existingTask.priority,
        nextPriority: plan.metadata.priority
      },
      createdAt: timestamp
    });
  }

  if (plan.nextStatus && plan.nextStatus !== existingTask.status) {
    logTaskEvent(db, {
      taskId,
      actorUserId,
      eventType: "status_changed",
      fromStatus: existingTask.status,
      toStatus: plan.nextStatus,
      metadata: { changedBy: policy.changedBy },
      createdAt: timestamp
    });
  }

  if (
    (body.assignee_user_id !== undefined || body.assigneeUserId !== undefined) &&
    plan.nextAssigneeUserId !== existingTask.assigneeUserId
  ) {
    logTaskEvent(db, {
      taskId,
      actorUserId,
      eventType: "assigned",
      metadata: {
        previousAssigneeUserId: existingTask.assigneeUserId,
        nextAssigneeUserId: plan.nextAssigneeUserId,
        changedBy: policy.changedBy
      },
      createdAt: timestamp
    });
  }

  if (plan.dueAtInput.provided && plan.dueAtInput.value !== existingTask.dueAt) {
    logTaskEvent(db, {
      taskId,
      actorUserId,
      eventType: "due_date_changed",
      metadata: {
        previousDueAt: existingTask.dueAt,
        nextDueAt: plan.dueAtInput.value
      },
      createdAt: timestamp
    });
  }

  if (
    plan.recurrenceProvided &&
    (plan.nextRepeatType !== existingTask.repeatType ||
      JSON.stringify(plan.nextRepeatWeekdays) !== JSON.stringify(existingTask.repeatWeekdays))
  ) {
    logTaskEvent(db, {
      taskId,
      actorUserId,
      eventType: "recurrence_changed",
      metadata: {
        previousRepeatType: existingTask.repeatType,
        nextRepeatType: plan.nextRepeatType,
        previousRepeatWeekdays: existingTask.repeatWeekdays,
        nextRepeatWeekdays: plan.nextRepeatWeekdays
      },
      createdAt: timestamp
    });
  }

  logTaskEvent(db, {
    taskId,
    actorUserId,
    eventType: "updated",
    metadata: plan.metadata,
    createdAt: timestamp
  });

  logTaskAudit(db, {
    actorUserId,
    taskId,
    eventType: policy.auditEventType,
    metadata: plan.metadata
  });

  if (
    plan.nextAssigneeUserId !== undefined &&
    plan.nextAssigneeUserId !== null &&
    plan.nextAssigneeUserId !== existingTask.assigneeUserId &&
    plan.nextAssigneeUserId !== actorUserId
  ) {
    assignmentNotification = createTaskLinkedNotification(db, {
      actorUserId,
      sourceTaskId: taskId,
      title: `Tarefa atribuida: ${existingTask.title}`,
      message: buildTaskAssignmentMessage(
        existingTask.title,
        actorName,
        plan.dueAtInput.provided ? plan.dueAtInput.value : existingTask.dueAt
      ),
      priority: existingTask.priority,
      recipientIds: [plan.nextAssigneeUserId],
      auditEventType: "task.notification.assignment",
      auditMetadata: {
        trigger: policy.notificationTrigger,
        previousAssigneeUserId: existingTask.assigneeUserId,
        nextAssigneeUserId: plan.nextAssigneeUserId
      },
      createdAt: timestamp
    });
  }

  if (
    plan.nextStatus &&
    plan.nextStatus !== existingTask.status &&
    (plan.nextStatus === "assumed" ||
      plan.nextStatus === "in_progress" ||
      plan.nextStatus === "blocked" ||
      plan.nextStatus === "waiting_external")
  ) {
    const effectiveAssigneeUserId =
      plan.nextAssigneeUserId === undefined ? existingTask.assigneeUserId : plan.nextAssigneeUserId;
    const recipientIds = buildRecipientIds(existingTask.creatorUserId, effectiveAssigneeUserId).filter(
      (userId) => userId !== actorUserId
    );

    if (recipientIds.length > 0) {
      statusNotification = createTaskLinkedNotification(db, {
        actorUserId,
        sourceTaskId: taskId,
        title: `Atualizacao de tarefa: ${existingTask.title}`,
        message: buildTaskStatusMessage(existingTask.title, actorName, plan.nextStatus),
        priority: existingTask.priority,
        recipientIds,
        auditEventType: "task.notification.status_changed",
        auditMetadata: {
          trigger: policy.notificationTrigger,
          fromStatus: existingTask.status,
          toStatus: plan.nextStatus
        },
        createdAt: timestamp
      });
    }
  }

  return {
    assignmentNotification,
    statusNotification
  };
};
