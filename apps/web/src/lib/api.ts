import { adminApi } from "./apiAdmin";
import { authApi } from "./apiAuth";
import { notificationApi } from "./apiNotifications";
import { operationsBoardApi } from "./apiOperationsBoard";
import { reminderApi } from "./apiReminders";
import { webPushApi } from "./apiWebPush";
import { taskApi } from "../features/tasks/api/tasksApi";

export { ApiError } from "./apiCore";

export const api = {
  ...authApi,
  ...adminApi,
  ...taskApi,
  ...notificationApi,
  ...operationsBoardApi,
  ...reminderApi,
  ...webPushApi
};
