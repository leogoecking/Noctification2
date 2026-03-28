CREATE TABLE IF NOT EXISTS apr_reference_months (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month_ref TEXT NOT NULL UNIQUE CHECK (month_ref GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_apr_reference_months_month_ref
  ON apr_reference_months(month_ref);

CREATE TABLE IF NOT EXISTS apr_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_month_id INTEGER NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'system')),
  external_id TEXT NOT NULL,
  opened_on TEXT NOT NULL,
  subject TEXT NOT NULL,
  collaborator TEXT NOT NULL,
  raw_payload_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(reference_month_id, source_type, external_id),
  FOREIGN KEY (reference_month_id) REFERENCES apr_reference_months(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_apr_entries_month_source
  ON apr_entries(reference_month_id, source_type, opened_on, external_id);

CREATE INDEX IF NOT EXISTS idx_apr_entries_subject_collaborator
  ON apr_entries(subject, collaborator);

CREATE TABLE IF NOT EXISTS apr_import_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_month_id INTEGER NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'system')),
  file_name TEXT,
  imported_at TEXT NOT NULL,
  total_valid INTEGER NOT NULL DEFAULT 0,
  total_invalid INTEGER NOT NULL DEFAULT 0,
  duplicates INTEGER NOT NULL DEFAULT 0,
  total_invalid_global INTEGER NOT NULL DEFAULT 0,
  duplicates_global INTEGER NOT NULL DEFAULT 0,
  month_detected_by_date INTEGER NOT NULL DEFAULT 0 CHECK (month_detected_by_date IN (0, 1)),
  metadata_json TEXT,
  FOREIGN KEY (reference_month_id) REFERENCES apr_reference_months(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_apr_import_runs_month_source
  ON apr_import_runs(reference_month_id, source_type, imported_at DESC);

CREATE TABLE IF NOT EXISTS apr_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_month_id INTEGER,
  snapshot_reason TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  checksum TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (reference_month_id) REFERENCES apr_reference_months(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_apr_snapshots_month_created
  ON apr_snapshots(reference_month_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_apr_snapshots_checksum
  ON apr_snapshots(checksum);
