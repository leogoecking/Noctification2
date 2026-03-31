ALTER TABLE reminders ADD COLUMN note_kind TEXT NOT NULL DEFAULT 'note' CHECK (note_kind IN ('note', 'checklist', 'alarm'));
ALTER TABLE reminders ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1));
ALTER TABLE reminders ADD COLUMN tag TEXT NOT NULL DEFAULT '';
ALTER TABLE reminders ADD COLUMN color TEXT NOT NULL DEFAULT 'slate' CHECK (color IN ('slate', 'sky', 'amber', 'emerald', 'rose'));

CREATE INDEX IF NOT EXISTS idx_reminders_user_pinned
  ON reminders(user_id, is_pinned, is_active);
