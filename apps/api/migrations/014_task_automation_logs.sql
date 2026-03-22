CREATE TABLE IF NOT EXISTS task_automation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  automation_type TEXT NOT NULL CHECK (automation_type IN ('due_soon', 'overdue', 'stale_task')),
  dedupe_key TEXT NOT NULL,
  notification_id INTEGER,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(task_id, automation_type, dedupe_key),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_task_automation_logs_created
  ON task_automation_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_automation_logs_task
  ON task_automation_logs(task_id, automation_type, created_at DESC);
