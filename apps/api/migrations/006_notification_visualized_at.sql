ALTER TABLE notification_recipients ADD COLUMN visualized_at TEXT;

UPDATE notification_recipients
SET visualized_at = read_at
WHERE visualized_at IS NULL
  AND read_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recipients_user_visualized
  ON notification_recipients(user_id, visualized_at);
