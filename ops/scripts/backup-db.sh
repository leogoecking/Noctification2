#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
DEFAULT_APP_ROOT="$(cd -- "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd)"

APP_ROOT="${APP_ROOT:-$DEFAULT_APP_ROOT}"
DB_FILE="${DB_FILE:-$APP_ROOT/apps/api/data/noctification.db}"
BACKUP_DIR="${BACKUP_DIR:-$APP_ROOT/backups/db}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_FILE" ]; then
  echo "Database file not found: $DB_FILE"
  exit 1
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
RAW_BACKUP="$BACKUP_DIR/noctification_${STAMP}.db"
ARCHIVE="$RAW_BACKUP.gz"

if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB_FILE" ".backup '$RAW_BACKUP'"
else
  cp "$DB_FILE" "$RAW_BACKUP"
fi

gzip "$RAW_BACKUP"
find "$BACKUP_DIR" -type f -name "noctification_*.db.gz" -mtime +"$RETENTION_DAYS" -delete

echo "Backup created: $ARCHIVE"
