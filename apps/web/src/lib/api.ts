import { adminApi } from "./apiAdmin";
import { authApi } from "./apiAuth";
import { notificationApi } from "./apiNotifications";
import { reminderApi } from "./apiReminders";
import { taskApi } from "./apiTasks";
import { webPushApi } from "./apiWebPush";

export { ApiError } from "./apiCore";

export const api = {
  ...authApi,
  ...adminApi,
  ...taskApi,
  ...notificationApi,
  ...reminderApi,
  ...webPushApi
};
