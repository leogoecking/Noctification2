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
import type { TaskUpdateMutationOptions } from "./task-mutation-shared";

type NormalizedTask = ReturnType<typeof import("../application/service").normalizeTaskRow>;

export interface TaskUpdatePlan {
  updates: string[];
  values: Array<string | number | null>;
  metadata: Record<string, unknown>;
  titleRaw: unknown;
  nextAssigneeUserId: number | null | undefined;
  dueAtInput: ReturnType<typeof parseOptionalDueAt>;
  recurrenceProvided: boolean;
  nextRepeatType: NormalizedTask["repeatType"];
  nextRepeatWeekdays: NormalizedTask["repeatWeekdays"];
  nextStatus: ReturnType<typeof parseNonTerminalTaskStatus>;
}

export const buildTaskUpdatePlan = (
  params: Pick<TaskUpdateMutationOptions, "body" | "actorUserId" | "policy" | "timestamp"> & {
    existingTask: NormalizedTask;
  }
): TaskUpdatePlan | { error: string } => {
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
  let nextRepeatType = params.existingTask.repeatType;
  let nextRepeatWeekdays = params.existingTask.repeatWeekdays;

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
    if (nextRepeatType !== params.existingTask.repeatType) {
      updates.push("repeat_type = ?");
      values.push(nextRepeatType);
    }

    if (JSON.stringify(nextRepeatWeekdays) !== JSON.stringify(params.existingTask.repeatWeekdays)) {
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
      return {
        error: "status invalido para PATCH. Use: new, assumed, in_progress, blocked, waiting_external"
      };
    }

    updates.push("status = ?");
    values.push(nextStatus);
    metadata.status = nextStatus;

    if (nextStatus === "in_progress" && !params.existingTask.startedAt) {
      updates.push("started_at = ?");
      values.push(params.timestamp);
    }
  }

  if (updates.length === 0) {
    return { error: "Nenhum campo valido para atualizar" };
  }

  return {
    updates,
    values,
    metadata,
    titleRaw,
    nextAssigneeUserId,
    dueAtInput,
    recurrenceProvided,
    nextRepeatType,
    nextRepeatWeekdays,
    nextStatus
  };
};
