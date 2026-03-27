CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('new', 'in_progress', 'waiting', 'done', 'cancelled')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  creator_user_id INTEGER NOT NULL,
  assignee_user_id INTEGER,
  due_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  source_notification_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (creator_user_id) REFERENCES users(id),
  FOREIGN KEY (assignee_user_id) REFERENCES users(id),
  FOREIGN KEY (source_notification_id) REFERENCES notifications(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status_priority_due
  ON tasks(status, priority, due_at);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status
  ON tasks(assignee_user_id, status, archived_at);

CREATE INDEX IF NOT EXISTS idx_tasks_creator_created
  ON tasks(creator_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_source_notification
  ON tasks(source_notification_id);

CREATE TABLE IF NOT EXISTS task_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  actor_user_id INTEGER,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_task_events_task_created
  ON task_events(task_id, created_at DESC);
