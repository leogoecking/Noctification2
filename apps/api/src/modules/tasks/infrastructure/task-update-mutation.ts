import {
  parseNonTerminalTaskStatus,
  parseOptionalDueAt,
  parseOptionalUserId,
  parseTaskPriority,
  parseTaskRepeatType,
  parseTaskWeekdays,
  stringifyTaskWeekdays,
  validateTaskDescription,
  validateTaskRecurrence,
  validateTaskTitle
} from "../domain/domain";
import { createTaskLinkedNotification } from "../application/notifications";
import { logTaskAudit, logTaskEvent, normalizeTaskRow } from "../application/service";
import {
  buildRecipientIds,
  buildTaskAssignmentMessage,
  buildTaskStatusMessage,
  type TaskUpdateMutationOptions
} from "./task-mutation-shared";

export const runTaskUpdateMutation = (
  params: TaskUpdateMutationOptions
): {
  assignmentNotification: ReturnType<typeof createTaskLinkedNotification>;
  statusNotification: ReturnType<typeof createTaskLinkedNotification>;
} | {
  error: string;
} => {
  const existingTask = normalizeTaskRow(params.existing);
  const updates: string[] = [];
  const values: Array<string | number | null> = [];
  const metadata: Record<string, unknown> = {};

  const titleRaw = params.body.title;
  if (titleRaw !== undefined) {
    const title = validateTaskTitle(titleRaw);
    if (!title) {
      return { error: "title deve ter entre 1 e 200 caracteres" };
    }

    updates.push("title = ?");
    values.push(title);
    metadata.title = title;
  }

  if (params.body.description !== undefined) {
    const description = validateTaskDescription(params.body.description);
    updates.push("description = ?");
    values.push(description);
    metadata.description = description;
  }

  if (params.body.priority !== undefined) {
    const priority = parseTaskPriority(params.body.priority);
    if (!priority) {
      return { error: "priority invalida" };
    }

    updates.push("priority = ?");
    values.push(priority);
    metadata.priority = priority;
  }

  let nextAssigneeUserId: number | null | undefined;
  if (params.body.assignee_user_id !== undefined || params.body.assigneeUserId !== undefined) {
    nextAssigneeUserId = parseOptionalUserId(params.body.assignee_user_id ?? params.body.assigneeUserId);
    if (nextAssigneeUserId === undefined) {
      return { error: "assignee_user_id invalido" };
    }

    const assigneeError = params.policy.validateAssignee({
      actorUserId: params.actorUserId,
      nextAssigneeUserId
    });
    if (assigneeError) {
      return { error: assigneeError };
    }

    updates.push("assignee_user_id = ?");
    values.push(nextAssigneeUserId);
    metadata.assigneeUserId = nextAssigneeUserId;
  }

  const dueAtInput = parseOptionalDueAt(params.body.due_at ?? params.body.dueAt);
  if (dueAtInput.error) {
    return { error: dueAtInput.error };
  }

  if (dueAtInput.provided) {
    updates.push("due_at = ?");
    values.push(dueAtInput.value);
    metadata.dueAt = dueAtInput.value;
  }

  const recurrenceTypeRaw = params.body.repeat_type ?? params.body.repeatType;
  const recurrenceProvided = recurrenceTypeRaw !== undefined || params.body.weekdays !== undefined;
  let nextRepeatType = existingTask.repeatType;
  let nextRepeatWeekdays = existingTask.repeatWeekdays;

  if (recurrenceTypeRaw !== undefined) {
    const parsedRepeatType = parseTaskRepeatType(recurrenceTypeRaw);
    if (!parsedRepeatType) {
      return { error: "repeat_type invalido" };
    }

    nextRepeatType = parsedRepeatType;
  }

  if (params.body.weekdays !== undefined) {
    nextRepeatWeekdays = parseTaskWeekdays(params.body.weekdays);
  }

  if (nextRepeatType !== "weekly") {
    nextRepeatWeekdays = [];
  }

  const recurrenceError = validateTaskRecurrence(nextRepeatType, nextRepeatWeekdays);
  if (recurrenceProvided && recurrenceError) {
    return { error: recurrenceError };
  }

  if (recurrenceProvided) {
    if (nextRepeatType !== existingTask.repeatType) {
      updates.push("repeat_type = ?");
      values.push(nextRepeatType);
    }

    if (JSON.stringify(nextRepeatWeekdays) !== JSON.stringify(existingTask.repeatWeekdays)) {
      updates.push("repeat_weekdays_json = ?");
      values.push(stringifyTaskWeekdays(nextRepeatWeekdays));
    }

    metadata.repeatType = nextRepeatType;
    metadata.repeatWeekdays = nextRepeatWeekdays;
  }

  let nextStatus = null;
  if (params.body.status !== undefined) {
    nextStatus = parseNonTerminalTaskStatus(params.body.status);
    if (!nextStatus) {
      return { error: "status invalido para PATCH. Use: new, in_progress, waiting" };
    }

    updates.push("status = ?");
    values.push(nextStatus);
    metadata.status = nextStatus;

    if (nextStatus === "in_progress" && !params.existing.startedAt) {
      updates.push("started_at = ?");
      values.push(params.timestamp);
    }
  }

  if (updates.length === 0) {
    return { error: "Nenhum campo valido para atualizar" };
  }

  updates.push("updated_at = ?");
  values.push(params.timestamp);
  values.push(params.taskId);

  let assignmentNotification: ReturnType<typeof createTaskLinkedNotification> = null;
  let statusNotification: ReturnType<typeof createTaskLinkedNotification> = null;

  params.db.transaction(() => {
    params.db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    if (nextStatus && nextStatus !== params.existing.status) {
      logTaskEvent(params.db, {
        taskId: params.taskId,
        actorUserId: params.actorUserId,
        eventType: "status_changed",
        fromStatus: params.existing.status,
        toStatus: nextStatus,
        metadata: { changedBy: params.policy.changedBy },
        createdAt: params.timestamp
      });
    }

    if (
      (params.body.assignee_user_id !== undefined || params.body.assigneeUserId !== undefined) &&
      nextAssigneeUserId !== params.existing.assigneeUserId
    ) {
      logTaskEvent(params.db, {
        taskId: params.taskId,
        actorUserId: params.actorUserId,
        eventType: "assigned",
        metadata: {
          previousAssigneeUserId: params.existing.assigneeUserId,
          nextAssigneeUserId
        },
        createdAt: params.timestamp
      });
    }

    if (dueAtInput.provided && dueAtInput.value !== params.existing.dueAt) {
      logTaskEvent(params.db, {
        taskId: params.taskId,
        actorUserId: params.actorUserId,
        eventType: "due_date_changed",
        metadata: {
          previousDueAt: params.existing.dueAt,
          nextDueAt: dueAtInput.value
        },
        createdAt: params.timestamp
      });
    }

    if (
      recurrenceProvided &&
      (nextRepeatType !== existingTask.repeatType ||
        JSON.stringify(nextRepeatWeekdays) !== JSON.stringify(existingTask.repeatWeekdays))
    ) {
      logTaskEvent(params.db, {
        taskId: params.taskId,
        actorUserId: params.actorUserId,
        eventType: "recurrence_changed",
        metadata: {
          previousRepeatType: existingTask.repeatType,
          nextRepeatType,
          previousRepeatWeekdays: existingTask.repeatWeekdays,
          nextRepeatWeekdays
        },
        createdAt: params.timestamp
      });
    }

    logTaskEvent(params.db, {
      taskId: params.taskId,
      actorUserId: params.actorUserId,
      eventType: "updated",
      metadata,
      createdAt: params.timestamp
    });

    logTaskAudit(params.db, {
      actorUserId: params.actorUserId,
      taskId: params.taskId,
      eventType: params.policy.auditEventType,
      metadata
    });

    if (
      nextAssigneeUserId !== undefined &&
      nextAssigneeUserId !== null &&
      nextAssigneeUserId !== params.existing.assigneeUserId &&
      nextAssigneeUserId !== params.actorUserId
    ) {
      assignmentNotification = createTaskLinkedNotification(params.db, {
        actorUserId: params.actorUserId,
        sourceTaskId: params.taskId,
        title: `Tarefa atribuida: ${params.existing.title}`,
        message: buildTaskAssignmentMessage(
          params.existing.title,
          params.actorName,
          dueAtInput.provided ? dueAtInput.value : params.existing.dueAt
        ),
        priority: params.existing.priority,
        recipientIds: [nextAssigneeUserId],
        auditEventType: "task.notification.assignment",
        auditMetadata: {
          trigger: params.policy.notificationTrigger,
          previousAssigneeUserId: params.existing.assigneeUserId,
          nextAssigneeUserId
        },
        createdAt: params.timestamp
      });
    }

    if (
      nextStatus &&
      nextStatus !== params.existing.status &&
      (nextStatus === "in_progress" || nextStatus === "waiting")
    ) {
      const effectiveAssigneeUserId =
        nextAssigneeUserId === undefined ? params.existing.assigneeUserId : nextAssigneeUserId;
      const recipientIds = buildRecipientIds(
        params.existing.creatorUserId,
        effectiveAssigneeUserId
      ).filter((userId) => userId !== params.actorUserId);

      if (recipientIds.length > 0) {
        statusNotification = createTaskLinkedNotification(params.db, {
          actorUserId: params.actorUserId,
          sourceTaskId: params.taskId,
          title: `Atualizacao de tarefa: ${params.existing.title}`,
          message: buildTaskStatusMessage(params.existing.title, params.actorName, nextStatus),
          priority: params.existing.priority,
          recipientIds,
          auditEventType: "task.notification.status_changed",
          auditMetadata: {
            trigger: params.policy.notificationTrigger,
            fromStatus: params.existing.status,
            toStatus: nextStatus
          },
          createdAt: params.timestamp
        });
      }
    }
  })();

  return {
    assignmentNotification,
    statusNotification
  };
};
