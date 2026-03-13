CREATE TABLE IF NOT EXISTS reminder_occurrences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reminder_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  scheduled_for TEXT NOT NULL,
  triggered_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT,
  completed_at TEXT,
  expired_at TEXT,
  trigger_source TEXT NOT NULL DEFAULT 'scheduler',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(reminder_id, scheduled_for)
);

CREATE INDEX IF NOT EXISTS idx_reminder_occurrences_pending
  ON reminder_occurrences(user_id, status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_reminder_occurrences_retry
  ON reminder_occurrences(next_retry_at, status);
