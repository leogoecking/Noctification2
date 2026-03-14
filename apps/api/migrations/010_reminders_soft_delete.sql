ALTER TABLE reminders ADD COLUMN deleted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_reminders_user_deleted_active
  ON reminders(user_id, deleted_at, is_active);
