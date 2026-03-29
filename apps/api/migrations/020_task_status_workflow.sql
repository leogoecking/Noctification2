CREATE TABLE IF NOT EXISTS tasks_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (
    status IN ('new', 'assumed', 'in_progress', 'blocked', 'waiting_external', 'done', 'cancelled')
  ),
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
  repeat_type TEXT NOT NULL DEFAULT 'none'
    CHECK (repeat_type IN ('none', 'daily', 'weekly', 'monthly', 'weekdays')),
  repeat_weekdays_json TEXT NOT NULL DEFAULT '[]',
  recurrence_source_task_id INTEGER,
  FOREIGN KEY (creator_user_id) REFERENCES users(id),
  FOREIGN KEY (assignee_user_id) REFERENCES users(id),
  FOREIGN KEY (source_notification_id) REFERENCES notifications(id) ON DELETE SET NULL
);

INSERT INTO tasks_new (
  id,
  title,
  description,
  status,
  priority,
  creator_user_id,
  assignee_user_id,
  due_at,
  started_at,
  completed_at,
  cancelled_at,
  source_notification_id,
  created_at,
  updated_at,
  archived_at,
  repeat_type,
  repeat_weekdays_json,
  recurrence_source_task_id
)
SELECT
  id,
  title,
  description,
  CASE status
    WHEN 'waiting' THEN 'waiting_external'
    ELSE status
  END,
  priority,
  creator_user_id,
  assignee_user_id,
  due_at,
  started_at,
  completed_at,
  cancelled_at,
  source_notification_id,
  created_at,
  updated_at,
  archived_at,
  repeat_type,
  repeat_weekdays_json,
  recurrence_source_task_id
FROM tasks;

ALTER TABLE tasks RENAME TO tasks_old;
ALTER TABLE tasks_new RENAME TO tasks;

CREATE TABLE IF NOT EXISTS task_events_new (
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

INSERT INTO task_events_new (
  id,
  task_id,
  actor_user_id,
  event_type,
  from_status,
  to_status,
  metadata_json,
  created_at
)
SELECT
  id,
  task_id,
  actor_user_id,
  event_type,
  CASE from_status
    WHEN 'waiting' THEN 'waiting_external'
    ELSE from_status
  END,
  CASE to_status
    WHEN 'waiting' THEN 'waiting_external'
    ELSE to_status
  END,
  metadata_json,
  created_at
FROM task_events;

CREATE TABLE IF NOT EXISTS task_comments_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO task_comments_new (
  id,
  task_id,
  author_user_id,
  body,
  created_at,
  updated_at
)
SELECT
  id,
  task_id,
  author_user_id,
  body,
  created_at,
  updated_at
FROM task_comments;

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

DROP TABLE task_comments;
DROP TABLE task_automation_logs;
DROP TABLE task_events;
DROP TABLE tasks_old;

ALTER TABLE task_events_new RENAME TO task_events;
ALTER TABLE task_comments_new RENAME TO task_comments;
ALTER TABLE task_automation_logs_new RENAME TO task_automation_logs;

CREATE INDEX IF NOT EXISTS idx_tasks_status_priority_due
  ON tasks(status, priority, due_at);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status
  ON tasks(assignee_user_id, status, archived_at);

CREATE INDEX IF NOT EXISTS idx_tasks_creator_created
  ON tasks(creator_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_source_notification
  ON tasks(source_notification_id);

CREATE INDEX IF NOT EXISTS idx_tasks_repeat_active
  ON tasks(repeat_type, status, archived_at);

CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_source
  ON tasks(recurrence_source_task_id);

CREATE INDEX IF NOT EXISTS idx_task_events_task_created
  ON task_events(task_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_created
  ON task_comments(task_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_task_automation_logs_created
  ON task_automation_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_automation_logs_task
  ON task_automation_logs(task_id, automation_type, created_at DESC);
