CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  time_of_day TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Bahia',
  repeat_type TEXT NOT NULL CHECK (repeat_type IN ('none', 'daily', 'weekly', 'monthly', 'weekdays')),
  weekdays_json TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  last_scheduled_for TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_active
  ON reminders(user_id, is_active);
