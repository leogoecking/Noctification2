export type ReminderRepeatType = "none" | "daily" | "weekly" | "monthly" | "weekdays";
export type ReminderOccurrenceStatus = "pending" | "completed" | "expired" | "cancelled";
export type ReminderNoteKind = "note" | "checklist" | "alarm";
export type ReminderColorKey = "slate" | "sky" | "amber" | "emerald" | "rose";
export interface ReminderChecklistItem {
  checked: boolean;
  label: string;
}

export interface ReminderRow {
  id: number;
  userId: number;
  userName?: string;
  userLogin?: string;
  title: string;
  description: string;
  startDate: string;
  timeOfDay: string;
  timezone: string;
  repeatType: ReminderRepeatType;
  weekdaysJson: string;
  checklistJson: string;
  isActive: number;
  noteKind: ReminderNoteKind;
  isPinned: number;
  tag: string;
  color: ReminderColorKey;
  lastScheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderOccurrenceRow {
  id: number;
  reminderId: number;
  userId: number;
  userName?: string;
  userLogin?: string;
  timezone: string;
  scheduledFor: string;
  triggeredAt: string | null;
  status: ReminderOccurrenceStatus;
  retryCount: number;
  nextRetryAt: string | null;
  completedAt: string | null;
  expiredAt: string | null;
  triggerSource: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  description: string;
}

export interface ReminderLogRow {
  id: number;
  reminderId: number | null;
  occurrenceId: number | null;
  userId: number | null;
  userName?: string | null;
  userLogin?: string | null;
  eventType: string;
  metadataJson: string | null;
  createdAt: string;
}

export interface ReminderHealthStats {
  schedulerEnabled: boolean;
  totalReminders: number;
  activeReminders: number;
  pendingOccurrences: number;
  completedToday: number;
  expiredToday: number;
  deliveriesToday: number;
  retriesToday: number;
}
