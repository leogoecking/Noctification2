ALTER TABLE tasks
  ADD COLUMN repeat_type TEXT NOT NULL DEFAULT 'none'
  CHECK (repeat_type IN ('none', 'daily', 'weekly', 'monthly', 'weekdays'));

ALTER TABLE tasks
  ADD COLUMN repeat_weekdays_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE tasks
  ADD COLUMN recurrence_source_task_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_tasks_repeat_active
  ON tasks(repeat_type, status, archived_at);

CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_source
  ON tasks(recurrence_source_task_id);

CREATE TABLE IF NOT EXISTS task_automation_logs_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  automation_type TEXT NOT NULL CHECK (
    automation_type IN ('due_soon', 'overdue', 'stale_task', 'recurring_task')
  ),
  dedupe_key TEXT NOT NULL,
  notification_id INTEGER,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(task_id, automation_type, dedupe_key),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE SET NULL
);

INSERT INTO task_automation_logs_new (
  id,
  task_id,
  automation_type,
  dedupe_key,
  notification_id,
  metadata_json,
  created_at
)
SELECT
  id,
  task_id,
  automation_type,
  dedupe_key,
  notification_id,
  metadata_json,
  created_at
FROM task_automation_logs;

DROP TABLE task_automation_logs;

ALTER TABLE task_automation_logs_new RENAME TO task_automation_logs;

CREATE INDEX IF NOT EXISTS idx_task_automation_logs_created
  ON task_automation_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_automation_logs_task
  ON task_automation_logs(task_id, automation_type, created_at DESC);
