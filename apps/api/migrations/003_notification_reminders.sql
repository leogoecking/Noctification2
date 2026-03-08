ALTER TABLE notification_recipients ADD COLUMN last_reminder_at TEXT;
ALTER TABLE notification_recipients ADD COLUMN reminder_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_recipients_reminder_status
  ON notification_recipients(response_status, last_reminder_at);
