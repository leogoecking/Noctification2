import { useCallback, useState, type KeyboardEvent, type MouseEvent } from "react";
import { ApiError } from "../../lib/api";
import type { TaskItem } from "../../types";

interface UseTaskPanelActionsOptions {
  commentBody: string;
  onError: (message: string) => void;
  onToast: (message: string) => void;
  reloadTaskDetail: (taskId: number) => Promise<void>;
  reloadTasks: () => Promise<TaskItem[]>;
  selectedTask: TaskItem | null;
  setCommentBody: (value: string) => void;
  setSelectedTask: (task: TaskItem | null) => void;
  createComment: (taskId: number, body: string) => Promise<unknown>;
  updateTaskStatusRequest: (
    taskId: number,
    status: "new" | "in_progress" | "waiting"
  ) => Promise<unknown>;
  completeTaskRequest: (taskId: number) => Promise<unknown>;
  cancelTaskRequest: (taskId: number) => Promise<unknown>;
  statusErrorMessage: string;
  completeErrorMessage: string;
  cancelErrorMessage: string;
  commentErrorMessage: string;
  commentEmptyMessage: string;
}

export const useTaskPanelActions = ({
  commentBody,
  onError,
  onToast,
  reloadTaskDetail,
  reloadTasks,
  selectedTask,
  setCommentBody,
  setSelectedTask,
  createComment,
  updateTaskStatusRequest,
  completeTaskRequest,
  cancelTaskRequest,
  statusErrorMessage,
  completeErrorMessage,
  cancelErrorMessage,
  commentErrorMessage,
  commentEmptyMessage
}: UseTaskPanelActionsOptions) => {
  const [commentSaving, setCommentSaving] = useState(false);

  const reloadAndSelect = useCallback(
    async (taskId: number, successMessage: string) => {
      const currentTasks = await reloadTasks();
      if (!currentTasks.some((task) => task.id === taskId)) {
        setSelectedTask(null);
        onToast(successMessage);
        return;
      }

      await reloadTaskDetail(taskId);
      onToast(successMessage);
    },
    [onToast, reloadTaskDetail, reloadTasks, setSelectedTask]
  );

  const updateTaskStatus = useCallback(
    async (taskId: number, status: "new" | "in_progress" | "waiting", statusLabel: string) => {
      try {
        await updateTaskStatusRequest(taskId, status);
        await reloadAndSelect(taskId, `Status atualizado para ${statusLabel}`);
      } catch (error) {
        onError(error instanceof ApiError ? error.message : statusErrorMessage);
      }
    },
    [onError, reloadAndSelect, statusErrorMessage, updateTaskStatusRequest]
  );

  const completeTask = useCallback(
    async (taskId: number) => {
      try {
        await completeTaskRequest(taskId);
        await reloadAndSelect(taskId, "Tarefa concluida");
      } catch (error) {
        onError(error instanceof ApiError ? error.message : completeErrorMessage);
      }
    },
    [completeErrorMessage, completeTaskRequest, onError, reloadAndSelect]
  );

  const cancelTask = useCallback(
    async (taskId: number) => {
      try {
        await cancelTaskRequest(taskId);
        await reloadAndSelect(taskId, "Tarefa cancelada");
      } catch (error) {
        onError(error instanceof ApiError ? error.message : cancelErrorMessage);
      }
    },
    [cancelErrorMessage, cancelTaskRequest, onError, reloadAndSelect]
  );

  const submitComment = useCallback(async () => {
    if (!selectedTask) {
      return;
    }

    const body = commentBody.trim();
    if (!body) {
      onError(commentEmptyMessage);
      return;
    }

    setCommentSaving(true);
    try {
      await createComment(selectedTask.id, body);
      setCommentBody("");
      await reloadTaskDetail(selectedTask.id);
      onToast("Comentario registrado");
    } catch (error) {
      onError(error instanceof ApiError ? error.message : commentErrorMessage);
    } finally {
      setCommentSaving(false);
    }
  }, [
    commentBody,
    commentEmptyMessage,
    commentErrorMessage,
    createComment,
    onError,
    onToast,
    reloadTaskDetail,
    selectedTask,
    setCommentBody
  ]);

  const runBoardAction = useCallback(
    (event: MouseEvent<HTMLButtonElement>, action: () => void) => {
      event.stopPropagation();
      void action();
    },
    []
  );

  const openTaskFromBoard = useCallback((task: TaskItem) => {
    setSelectedTask(task);
  }, [setSelectedTask]);

  const onBoardCardKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>, task: TaskItem) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedTask(task);
    }
  }, [setSelectedTask]);

  return {
    commentSaving,
    reloadAndSelect,
    updateTaskStatus,
    completeTask,
    cancelTask,
    submitComment,
    runBoardAction,
    openTaskFromBoard,
    onBoardCardKeyDown
  };
};
