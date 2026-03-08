ALTER TABLE notification_recipients ADD COLUMN response_status TEXT;
ALTER TABLE notification_recipients ADD COLUMN response_at TEXT;

CREATE INDEX IF NOT EXISTS idx_recipients_response_status
  ON notification_recipients(response_status);
