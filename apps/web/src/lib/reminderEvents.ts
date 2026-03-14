import type { ReminderOccurrenceItem } from "../types";

export interface IncomingReminderDue {
  occurrenceId: number;
  reminderId: number;
  userId: number;
  title: string;
  description: string;
  scheduledFor: string;
  retryCount: number;
  audioBlocked?: boolean;
}

export interface IncomingReminderUpdated {
  occurrenceId: number;
  reminderId: number;
  userId: number;
  status: ReminderOccurrenceItem["status"];
  retryCount: number;
  completedAt?: string | null;
  expiredAt?: string | null;
}

const REMINDER_DUE_EVENT = "noctification:reminder-due";
const REMINDER_UPDATED_EVENT = "noctification:reminder-updated";

export const dispatchReminderDue = (payload: IncomingReminderDue) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<IncomingReminderDue>(REMINDER_DUE_EVENT, { detail: payload }));
};

export const dispatchReminderUpdated = (payload: IncomingReminderUpdated) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<IncomingReminderUpdated>(REMINDER_UPDATED_EVENT, { detail: payload })
  );
};

export const subscribeReminderDue = (handler: (payload: IncomingReminderDue) => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<IncomingReminderDue>;
    handler(customEvent.detail);
  };

  window.addEventListener(REMINDER_DUE_EVENT, listener);
  return () => window.removeEventListener(REMINDER_DUE_EVENT, listener);
};

export const subscribeReminderUpdated = (handler: (payload: IncomingReminderUpdated) => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<IncomingReminderUpdated>;
    handler(customEvent.detail);
  };

  window.addEventListener(REMINDER_UPDATED_EVENT, listener);
  return () => window.removeEventListener(REMINDER_UPDATED_EVENT, listener);
};
