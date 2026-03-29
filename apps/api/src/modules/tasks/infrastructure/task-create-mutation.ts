import {
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
import { logTaskAudit, logTaskEvent, type TaskRow } from "../application/service";
import {
  buildTaskAssignmentMessage,
  type AssigneeValidationContext,
  type TaskCreateMutationOptions
} from "./task-mutation-shared";

interface PreparedTaskCreateInput {
  title: string;
  description: string;
  priority: TaskRow["priority"];
  dueAt: string | null;
  repeatType: TaskRow["repeatType"];
  repeatWeekdays: number[];
  assigneeUserId: number | null;
}

export const prepareTaskCreateInput = (
  body: Record<string, unknown>,
  params: {
    actorUserId: number;
    validateAssignee: (context: AssigneeValidationContext) => string | null;
  }
): { error?: string; value?: PreparedTaskCreateInput } => {
  const title = validateTaskTitle(body.title);
  const description = validateTaskDescription(body.description);
  const priority = parseTaskPriority(body.priority) ?? "normal";
  const dueAtInput = parseOptionalDueAt(body.due_at ?? body.dueAt);
  const repeatTypeRaw = body.repeat_type ?? body.repeatType;
  const repeatType = repeatTypeRaw === undefined ? "none" : parseTaskRepeatType(repeatTypeRaw);
  const repeatWeekdaysInput = parseTaskWeekdays(body.weekdays);
  const repeatWeekdays = repeatType === "weekly" ? repeatWeekdaysInput : [];
  const assigneeUserId = parseOptionalUserId(body.assignee_user_id ?? body.assigneeUserId);
  const normalizedAssigneeUserId = assigneeUserId === undefined ? null : assigneeUserId;

  if (!title) {
    return { error: "title e obrigatorio e deve ter ate 200 caracteres" };
  }

  if (dueAtInput.error) {
    return { error: dueAtInput.error };
  }

  if (!repeatType) {
    return { error: "repeat_type invalido" };
  }

  const recurrenceError = validateTaskRecurrence(repeatType, repeatWeekdays);
  if (recurrenceError) {
    return { error: recurrenceError };
  }

  const assigneeError = params.validateAssignee({
    actorUserId: params.actorUserId,
    nextAssigneeUserId: normalizedAssigneeUserId
  });
  if (assigneeError) {
    return { error: assigneeError };
  }

  return {
    value: {
      title,
      description,
      priority,
      dueAt: dueAtInput.value,
      repeatType,
      repeatWeekdays,
      assigneeUserId: normalizedAssigneeUserId
    }
  };
};

export const runTaskCreateMutation = (
  params: TaskCreateMutationOptions
): { taskId: number; assignmentNotification: ReturnType<typeof createTaskLinkedNotification> } => {
  const parsed = prepareTaskCreateInput(params.body, {
    actorUserId: params.actorUserId,
    validateAssignee: params.policy.validateAssignee
  });

  if (parsed.error || !parsed.value) {
    throw new Error(parsed.error ?? "Falha ao preparar criacao de tarefa");
  }

  const {
    title,
    description,
    priority,
    dueAt,
    repeatType,
    repeatWeekdays,
    assigneeUserId
  } = parsed.value;

  let assignmentNotification: ReturnType<typeof createTaskLinkedNotification> = null;

  const taskId = params.db.transaction(() => {
    const insert = params.db
      .prepare(
        `
          INSERT INTO tasks (
            title,
            description,
            status,
            priority,
            creator_user_id,
            assignee_user_id,
            due_at,
            repeat_type,
            repeat_weekdays_json,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        title,
        description,
        "new",
        priority,
        params.actorUserId,
        assigneeUserId,
        dueAt,
        repeatType,
        stringifyTaskWeekdays(repeatWeekdays),
        params.timestamp,
        params.timestamp
      );

    const createdTaskId = Number(insert.lastInsertRowid);
    const metadata = {
      priority,
      assigneeUserId,
      dueAt,
      repeatType,
      repeatWeekdays
    };

    logTaskEvent(params.db, {
      taskId: createdTaskId,
      actorUserId: params.actorUserId,
      eventType: "created",
      toStatus: "new",
      metadata,
      createdAt: params.timestamp
    });

    logTaskAudit(params.db, {
      actorUserId: params.actorUserId,
      taskId: createdTaskId,
      eventType: params.policy.auditEventType,
      metadata
    });

    if (assigneeUserId !== null && assigneeUserId !== params.actorUserId) {
      assignmentNotification = createTaskLinkedNotification(params.db, {
        actorUserId: params.actorUserId,
        sourceTaskId: createdTaskId,
        title: `Tarefa atribuida: ${title}`,
        message: buildTaskAssignmentMessage(title, params.actorName, dueAt),
        priority,
        recipientIds: [assigneeUserId],
        auditEventType: "task.notification.assignment",
        auditMetadata: {
          trigger: params.policy.notificationTrigger,
          assigneeUserId
        },
        createdAt: params.timestamp
      });
    }

    return createdTaskId;
  })();

  return {
    taskId,
    assignmentNotification
  };
};
