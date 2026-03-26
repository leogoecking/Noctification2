import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../lib/api";
import type { TaskItem, TaskTimelineItem } from "../../types";

interface TaskDetailResult {
  task: TaskItem;
  timeline: TaskTimelineItem[];
}

interface UseTaskPanelDataOptions<TListResult extends { tasks: TaskItem[] }> {
  loadTaskList: () => Promise<TListResult>;
  loadTaskDetail: (taskId: number) => Promise<TaskDetailResult>;
  onError: (message: string) => void;
  listErrorMessage: string;
  detailErrorMessage: string;
  onListLoaded?: (result: TListResult) => void;
}

const toErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof ApiError ? error.message : fallback;

export const useTaskPanelData = <TListResult extends { tasks: TaskItem[] }>({
  loadTaskList,
  loadTaskDetail,
  onError,
  listErrorMessage,
  detailErrorMessage,
  onListLoaded
}: UseTaskPanelDataOptions<TListResult>) => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [taskTimeline, setTaskTimeline] = useState<TaskTimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const loadRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);
  const selectedTaskId = selectedTask?.id ?? null;

  const reloadTasks = useCallback(async (): Promise<TaskItem[]> => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);

    try {
      const result = await loadTaskList();
      if (requestId !== loadRequestIdRef.current) {
        return [];
      }

      setTasks(result.tasks);
      onListLoaded?.(result);
      setSelectedTask((current) =>
        current ? result.tasks.find((task) => task.id === current.id) ?? null : null
      );
      return result.tasks;
    } catch (error) {
      if (requestId !== loadRequestIdRef.current) {
        return [];
      }

      onError(toErrorMessage(error, listErrorMessage));
      return [];
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [listErrorMessage, loadTaskList, onError, onListLoaded]);

  const reloadTaskDetail = useCallback(
    async (taskId: number) => {
      const requestId = detailRequestIdRef.current + 1;
      detailRequestIdRef.current = requestId;
      setDetailLoading(true);

      try {
        const result = await loadTaskDetail(taskId);
        if (requestId !== detailRequestIdRef.current) {
          return;
        }

        setSelectedTask(result.task);
        setTasks((current) =>
          current.some((task) => task.id === result.task.id)
            ? current.map((task) => (task.id === result.task.id ? result.task : task))
            : current
        );
        setTaskTimeline(result.timeline);
      } catch (error) {
        if (requestId !== detailRequestIdRef.current) {
          return;
        }

        onError(toErrorMessage(error, detailErrorMessage));
      } finally {
        if (requestId === detailRequestIdRef.current) {
          setDetailLoading(false);
        }
      }
    },
    [detailErrorMessage, loadTaskDetail, onError]
  );

  const refreshTaskViews = useCallback(async () => {
    const currentTasks = await reloadTasks();

    if (selectedTaskId) {
      if (!currentTasks.some((task) => task.id === selectedTaskId)) {
        setSelectedTask(null);
        return;
      }

      await reloadTaskDetail(selectedTaskId);
    }
  }, [reloadTaskDetail, reloadTasks, selectedTaskId]);

  useEffect(() => {
    void reloadTasks();
  }, [reloadTasks]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshTaskViews();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [refreshTaskViews]);

  useEffect(() => {
    if (!selectedTaskId) {
      setTaskTimeline([]);
      setCommentBody("");
      return;
    }

    void reloadTaskDetail(selectedTaskId);
  }, [reloadTaskDetail, selectedTaskId]);

  useEffect(() => {
    if (!selectedTaskId) {
      return;
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedTask(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedTaskId]);

  return {
    commentBody,
    detailLoading,
    refreshTaskViews,
    loading,
    reloadTaskDetail,
    reloadTasks,
    selectedTask,
    setCommentBody,
    setSelectedTask,
    taskTimeline,
    tasks
  };
};
