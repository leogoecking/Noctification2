export interface IncomingNotification {
  id: number;
  title: string;
  message: string;
  priority: "low" | "normal" | "high" | "critical";
  sourceTaskId: number | null;
  createdAt: string;
  sender: {
    id: number;
    name: string;
    login: string;
  };
}

export interface IncomingReminder extends IncomingNotification {
  reminderCount: number;
}

export interface IncomingNotificationUpdated {
  id: number;
  visualizedAt: string | null;
  operationalStatus: string;
  responseAt?: string | null;
  responseMessage?: string | null;
  isVisualized: boolean;
}

const NOTIFICATION_NEW_EVENT = "noctification:notification:new";
const NOTIFICATION_REMINDER_EVENT = "noctification:notification:reminder";
const NOTIFICATION_UPDATED_EVENT = "noctification:notification:updated";

export const dispatchNotificationNew = (payload: IncomingNotification) => {
  window.dispatchEvent(new CustomEvent<IncomingNotification>(NOTIFICATION_NEW_EVENT, { detail: payload }));
};

export const dispatchNotificationReminder = (payload: IncomingReminder) => {
  window.dispatchEvent(new CustomEvent<IncomingReminder>(NOTIFICATION_REMINDER_EVENT, { detail: payload }));
};

export const dispatchNotificationUpdated = (payload: IncomingNotificationUpdated) => {
  window.dispatchEvent(
    new CustomEvent<IncomingNotificationUpdated>(NOTIFICATION_UPDATED_EVENT, { detail: payload })
  );
};

export const subscribeNotificationEvents = (callbacks: {
  onNew: (payload: IncomingNotification) => void;
  onReminder: (payload: IncomingReminder) => void;
  onUpdated?: (payload: IncomingNotificationUpdated) => void;
}) => {
  const handleNew = (event: Event) => {
    callbacks.onNew((event as CustomEvent<IncomingNotification>).detail);
  };

  const handleReminder = (event: Event) => {
    callbacks.onReminder((event as CustomEvent<IncomingReminder>).detail);
  };

  const handleUpdated = (event: Event) => {
    callbacks.onUpdated?.((event as CustomEvent<IncomingNotificationUpdated>).detail);
  };

  window.addEventListener(NOTIFICATION_NEW_EVENT, handleNew as EventListener);
  window.addEventListener(NOTIFICATION_REMINDER_EVENT, handleReminder as EventListener);
  window.addEventListener(NOTIFICATION_UPDATED_EVENT, handleUpdated as EventListener);

  return () => {
    window.removeEventListener(NOTIFICATION_NEW_EVENT, handleNew as EventListener);
    window.removeEventListener(NOTIFICATION_REMINDER_EVENT, handleReminder as EventListener);
    window.removeEventListener(NOTIFICATION_UPDATED_EVENT, handleUpdated as EventListener);
  };
};
