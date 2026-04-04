import { isTaskTerminal } from "../domain/domain";
import type { TaskRow } from "../application/service";

export const parseTaskIdParam = (value: string): number | null => {
  const taskId = Number(value);
  return Number.isInteger(taskId) && taskId > 0 ? taskId : null;
};

export const getTaskForRoute = <T extends { archivedAt: string | null }>(
  taskIdParam: string,
  fetchTask: (taskId: number) => T | undefined
):
  | { error: string; status: number }
  | { taskId: number; task: T } => {
  const taskId = parseTaskIdParam(taskIdParam);
  if (!taskId) {
    return { error: "ID invalido", status: 400 };
  }

  const task = fetchTask(taskId);
  if (!task || task.archivedAt) {
    return { error: "Tarefa nao encontrada", status: 404 };
  }

  return { taskId, task };
};

export const validateTaskEditableForRoute = (status: TaskRow["status"]) => {
  if (isTaskTerminal(status)) {
    return { error: "Tarefa concluida ou cancelada nao pode ser editada", status: 409 };
  }

  return null;
};

export const validateTaskTerminalTransitionForRoute = (
  status: TaskRow["status"],
  targetStatus: "done" | "cancelled"
) => {
  if (targetStatus === "done") {
    if (status === "done") {
      return { error: "Tarefa ja concluida", status: 409 };
    }

    if (status === "cancelled") {
      return { error: "Tarefa cancelada nao pode ser concluida", status: 409 };
    }

    return null;
  }

  if (status === "cancelled") {
    return { error: "Tarefa ja cancelada", status: 409 };
  }

  if (status === "done") {
    return { error: "Tarefa concluida nao pode ser cancelada", status: 409 };
  }

  return null;
};
