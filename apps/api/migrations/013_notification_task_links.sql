ALTER TABLE notifications ADD COLUMN source_task_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_notifications_source_task
  ON notifications(source_task_id);
