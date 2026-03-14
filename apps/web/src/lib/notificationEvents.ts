export interface IncomingNotification {
  id: number;
  title: string;
  message: string;
  priority: "normal" | "high" | "critical";
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

const NOTIFICATION_NEW_EVENT = "noctification:notification:new";
const NOTIFICATION_REMINDER_EVENT = "noctification:notification:reminder";

export const dispatchNotificationNew = (payload: IncomingNotification) => {
  window.dispatchEvent(new CustomEvent<IncomingNotification>(NOTIFICATION_NEW_EVENT, { detail: payload }));
};

export const dispatchNotificationReminder = (payload: IncomingReminder) => {
  window.dispatchEvent(new CustomEvent<IncomingReminder>(NOTIFICATION_REMINDER_EVENT, { detail: payload }));
};

export const subscribeNotificationEvents = (callbacks: {
  onNew: (payload: IncomingNotification) => void;
  onReminder: (payload: IncomingReminder) => void;
}) => {
  const handleNew = (event: Event) => {
    callbacks.onNew((event as CustomEvent<IncomingNotification>).detail);
  };

  const handleReminder = (event: Event) => {
    callbacks.onReminder((event as CustomEvent<IncomingReminder>).detail);
  };

  window.addEventListener(NOTIFICATION_NEW_EVENT, handleNew as EventListener);
  window.addEventListener(NOTIFICATION_REMINDER_EVENT, handleReminder as EventListener);

  return () => {
    window.removeEventListener(NOTIFICATION_NEW_EVENT, handleNew as EventListener);
    window.removeEventListener(NOTIFICATION_REMINDER_EVENT, handleReminder as EventListener);
  };
};
