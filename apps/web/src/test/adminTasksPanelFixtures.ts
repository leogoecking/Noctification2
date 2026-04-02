import { buildTaskCommentItem, buildTaskItem, buildTaskMetricsSummaryItem, buildUserItem } from "./fixtures";

export const buildAdminTask = (overrides: Partial<ReturnType<typeof buildTaskItem>> = {}) =>
  buildTaskItem({
    creatorUserId: 1,
    creatorName: "Admin",
    creatorLogin: "admin",
    assigneeUserId: 2,
    assigneeName: "Operador",
    assigneeLogin: "operador",
    ...overrides
  });

export const buildAdminTaskComment = (
  overrides: Partial<ReturnType<typeof buildTaskCommentItem>> = {}
) =>
  buildTaskCommentItem({
    authorUserId: 1,
    authorName: "Admin",
    authorLogin: "admin",
    ...overrides
  });

export const buildMetricsSummary = buildTaskMetricsSummaryItem;

export const buildAdminTasksResponse = (
  tasks: ReturnType<typeof buildAdminTask>[] = [],
  pagination: Partial<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> = {}
) => ({
  tasks,
  pagination: {
    page: 1,
    limit: 100,
    total: tasks.length,
    totalPages: 1,
    ...pagination
  }
});

export const buildAdminTaskDetailResponse = (
  task = buildAdminTask(),
  timeline: Array<Record<string, unknown>> = []
) => ({
  task,
  timeline
});

export const buildAdminUsersResponse = (
  users: ReturnType<typeof buildUserItem>[] = [buildUserItem()]
) => ({
  users
});

export const buildBoardDataTransfer = () => ({
  effectAllowed: "",
  dropEffect: "",
  data: new Map<string, string>(),
  setData(type: string, value: string) {
    this.data.set(type, value);
  },
  getData(type: string) {
    return this.data.get(type) ?? "";
  }
});
