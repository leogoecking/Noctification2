import { normalizeTaskRow } from "../application/service";
import type { TaskUpdateMutationOptions } from "./task-mutation-shared";
import { applyTaskUpdateEffects } from "./task-update-effects";
import { buildTaskUpdatePlan } from "./task-update-plan";

export const runTaskUpdateMutation = (
  params: TaskUpdateMutationOptions
): {
  assignmentNotification: ReturnType<typeof applyTaskUpdateEffects>["assignmentNotification"];
  statusNotification: ReturnType<typeof applyTaskUpdateEffects>["statusNotification"];
} | {
  error: string;
} => {
  const existingTask = normalizeTaskRow(params.existing);
  const plan = buildTaskUpdatePlan({
    body: params.body,
    actorUserId: params.actorUserId,
    policy: params.policy,
    timestamp: params.timestamp,
    existingTask
  });
  if ("error" in plan) {
    return plan;
  }

  const values = [...plan.values, params.timestamp, params.taskId];

  return params.db.transaction(() => {
    params.db.prepare(`UPDATE tasks SET ${plan.updates.join(", ")}, updated_at = ? WHERE id = ?`).run(...values);

    return applyTaskUpdateEffects({
      db: params.db,
      taskId: params.taskId,
      existingTask,
      body: params.body,
      actorUserId: params.actorUserId,
      actorName: params.actorName,
      timestamp: params.timestamp,
      policy: params.policy,
      plan
    });
  })();
};
