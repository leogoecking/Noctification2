import type {
  NotificationItem,
  PaginationInfo
} from "../types";
import { request } from "./apiCore";

type NotificationListResponse = { notifications: NotificationItem[] };
type NotificationReadResponse = {
  notificationId: number;
  visualizedAt: string | null;
  operationalStatus: string;
  responseStatus: string | null;
  isVisualized: boolean;
  isOperationallyPending: boolean;
};
type NotificationRespondResponse = {
  notificationId: number;
  visualizedAt: string | null;
  operationalStatus: string;
  responseStatus: string;
  responseMessage: string | null;
  responseAt: string;
  isVisualized: boolean;
  isOperationallyPending: boolean;
};

export const notificationApi = {
  myNotifications: (query = "") =>
    request<NotificationListResponse>(`/me/notifications${query}`),

  markRead: (id: number) =>
    request<NotificationReadResponse>(`/me/notifications/${id}/read`, {
      method: "POST"
    }),

  markAllRead: () =>
    request<{ updatedCount: number; visualizedAt: string | null }>("/me/notifications/read-all", {
      method: "POST"
    }),

  respondNotification: (id: number, responseStatus: string, responseMessage?: string) =>
    request<NotificationRespondResponse>(`/me/notifications/${id}/respond`, {
      method: "POST",
      bodyJson: {
        operational_status: responseStatus,
        response_message: responseMessage
      }
    })
};
