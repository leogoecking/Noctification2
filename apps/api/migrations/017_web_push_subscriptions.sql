CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  expiration_time TEXT,
  user_agent TEXT NOT NULL DEFAULT '',
  device_label TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_success_at TEXT,
  last_failure_at TEXT,
  failure_reason TEXT,
  UNIQUE(user_id, endpoint),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_user
  ON web_push_subscriptions(user_id);
