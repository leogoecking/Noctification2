CREATE TABLE IF NOT EXISTS apr_collaborators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  occurrence_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_apr_collaborators_display_name
  ON apr_collaborators(display_name);
