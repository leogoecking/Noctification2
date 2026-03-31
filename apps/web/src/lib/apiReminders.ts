import type {
  ReminderItem,
  ReminderOccurrenceItem
} from "../types";
import { request } from "./apiCore";

type ReminderListResponse = { reminders: ReminderItem[] };
type ReminderOccurrencesResponse = { occurrences: ReminderOccurrenceItem[] };

export const reminderApi = {
  myReminders: (query = "") => request<ReminderListResponse>(`/me/reminders${query}`),

  archiveMyStaleReminders: () =>
    request<{ archivedCount: number }>("/me/reminders/archive-stale", {
      method: "POST"
    }),

  createMyReminder: (payload: unknown) =>
    request<{ reminder: ReminderItem }>("/me/reminders", {
      method: "POST",
      bodyJson: payload
    }),

  updateMyReminder: (id: number, payload: unknown) =>
    request<{ reminder: ReminderItem }>(`/me/reminders/${id}`, {
      method: "PATCH",
      bodyJson: payload
    }),

  toggleMyReminder: (id: number, isActive: boolean) =>
    request<{ ok: boolean }>(`/me/reminders/${id}/toggle`, {
      method: "PATCH",
      bodyJson: { is_active: isActive }
    }),

  deleteMyReminder: (id: number) =>
    request<void>(`/me/reminders/${id}`, {
      method: "DELETE"
    }),

  myReminderOccurrences: (query = "") =>
    request<ReminderOccurrencesResponse>(`/me/reminder-occurrences${query}`),

  completeReminderOccurrence: (id: number) =>
    request<{ ok: boolean; completedAt: string }>(`/me/reminder-occurrences/${id}/complete`, {
      method: "POST"
    }),

};
