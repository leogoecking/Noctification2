CREATE TABLE operations_board_events_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL REFERENCES operations_board_messages(id) ON DELETE CASCADE,
  actor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'updated', 'commented', 'resolved', 'reopened', 'viewed')),
  body TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

INSERT INTO operations_board_events_new SELECT * FROM operations_board_events;

DROP TABLE operations_board_events;

ALTER TABLE operations_board_events_new RENAME TO operations_board_events;

CREATE INDEX IF NOT EXISTS idx_operations_board_events_message_created_at
  ON operations_board_events (message_id, created_at DESC, id DESC);
