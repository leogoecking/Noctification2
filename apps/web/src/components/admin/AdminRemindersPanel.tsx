import { ReminderUserPanel } from "../ReminderUserPanel";

interface AdminRemindersPanelProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

export const AdminRemindersPanel = ({ onError, onToast }: AdminRemindersPanelProps) => (
  <ReminderUserPanel onError={onError} onToast={onToast} />
);
