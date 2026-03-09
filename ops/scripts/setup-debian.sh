#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="noctification-api"
SERVICE_USER="noctification"
APP_ROOT="/opt/noctification"
ENV_FILE="/etc/noctification/api.env"
REPO_SOURCE=""
CORS_ORIGIN=""
JWT_SECRET=""
ADMIN_PASSWORD=""
RUN_BACKUP_NOW="1"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_REPO_SOURCE="$(cd "$SCRIPT_DIR/../.." && pwd)"

print_help() {
  cat <<EOF
Usage: sudo bash ops/scripts/setup-debian.sh [options]

Options:
  --app-root <path>          Target app directory (default: /opt/noctification)
  --repo-source <path>       Source repo path to copy from (default: script repo root)
  --env-file <path>          API env file path (default: /etc/noctification/api.env)
  --cors-origin <url>        Sets CORS_ORIGIN in env file
  --jwt-secret <secret>      Sets JWT_SECRET in env file
  --admin-password <value>   Sets ADMIN_PASSWORD in env file
  --skip-backup-now          Do not execute initial backup after setup
  --help                     Show this help

Example:
  sudo bash ops/scripts/setup-debian.sh \\
    --cors-origin https://app.example.com \\
    --jwt-secret "super-secret" \\
    --admin-password "StrongPass123!"
EOF
}

log() {
  echo "[setup:debian] $*"
}

fail() {
  echo "[setup:debian] ERROR: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Command not found: $1"
}

escape_sed_replacement() {
  printf '%s' "$1" | sed -e 's/[&#\\]/\\&/g'
}

set_env_key() {
  local key="$1"
  local value="$2"
  local escaped
  escaped="$(escape_sed_replacement "$value")"

  if grep -qE "^${key}=" "$ENV_FILE"; then
    sed -i "s#^${key}=.*#${key}=${escaped}#" "$ENV_FILE"
  else
    echo "${key}=${value}" >>"$ENV_FILE"
  fi
}

copy_project() {
  log "Copying project to $APP_ROOT ..."

  if command -v rsync >/dev/null 2>&1; then
    rsync -a \
      --exclude ".git" \
      --exclude "node_modules" \
      --exclude "apps/api/data" \
      --exclude "apps/web/node_modules" \
      --exclude "apps/api/node_modules" \
      "$REPO_SOURCE/" "$APP_ROOT/"
    return
  fi

  log "rsync not found; using cp -a fallback"
  cp -a "$REPO_SOURCE/." "$APP_ROOT/"
  rm -rf "$APP_ROOT/.git" "$APP_ROOT/node_modules" "$APP_ROOT/apps/web/node_modules" "$APP_ROOT/apps/api/node_modules" || true
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-root)
      APP_ROOT="$2"
      shift 2
      ;;
    --repo-source)
      REPO_SOURCE="$2"
      shift 2
      ;;
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --cors-origin)
      CORS_ORIGIN="$2"
      shift 2
      ;;
    --jwt-secret)
      JWT_SECRET="$2"
      shift 2
      ;;
    --admin-password)
      ADMIN_PASSWORD="$2"
      shift 2
      ;;
    --skip-backup-now)
      RUN_BACKUP_NOW="0"
      shift
      ;;
    --help)
      print_help
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

if [[ -z "$REPO_SOURCE" ]]; then
  REPO_SOURCE="$DEFAULT_REPO_SOURCE"
fi

if [[ "$EUID" -ne 0 ]]; then
  fail "Run as root (use sudo)."
fi

require_cmd node
require_cmd npm
require_cmd systemctl

[[ -d "$REPO_SOURCE" ]] || fail "Repo source not found: $REPO_SOURCE"
[[ -f "$REPO_SOURCE/package.json" ]] || fail "Invalid repo source (package.json not found): $REPO_SOURCE"

log "Creating service user and directories..."
useradd --system --home "$APP_ROOT" --shell /usr/sbin/nologin "$SERVICE_USER" 2>/dev/null || true
mkdir -p "$APP_ROOT" "$(dirname "$ENV_FILE")" "$APP_ROOT/backups/db" "$APP_ROOT/apps/api/data"

copy_project

chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_ROOT"

if [[ ! -f "$ENV_FILE" ]]; then
  log "Creating env file from template..."
  cp "$APP_ROOT/ops/systemd/api.env.example" "$ENV_FILE"
fi

if [[ -n "$CORS_ORIGIN" ]]; then
  set_env_key "CORS_ORIGIN" "$CORS_ORIGIN"
fi

if [[ -n "$JWT_SECRET" ]]; then
  set_env_key "JWT_SECRET" "$JWT_SECRET"
fi

if [[ -n "$ADMIN_PASSWORD" ]]; then
  set_env_key "ADMIN_PASSWORD" "$ADMIN_PASSWORD"
fi

log "Installing dependencies and building..."
(cd "$APP_ROOT" && npm install)
(cd "$APP_ROOT" && npm run build)
chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_ROOT"

log "Running migrations and bootstrap-admin..."
(
  cd "$APP_ROOT/apps/api"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  npm run migrate
  npm run bootstrap-admin
)

log "Installing and starting systemd service..."
cp "$APP_ROOT/ops/systemd/noctification-api.service" "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl daemon-reload
systemctl enable --now "$SERVICE_NAME"

log "Configuring backup cron..."
chmod +x "$APP_ROOT/ops/scripts/backup-db.sh"
cp "$APP_ROOT/ops/cron/noctification-db-backup.cron" "/etc/cron.d/noctification-db-backup"

if [[ "$RUN_BACKUP_NOW" == "1" ]]; then
  log "Running first backup..."
  "$APP_ROOT/ops/scripts/backup-db.sh"
fi

log "Health check:"
if command -v curl >/dev/null 2>&1; then
  curl -fsS http://127.0.0.1:4000/api/v1/health || true
else
  log "curl not installed; skipping HTTP health check"
fi

if grep -q "CHANGE_ME" "$ENV_FILE"; then
  log "WARNING: env file still contains CHANGE_ME values. Update $ENV_FILE"
fi

log "Done."
log "Service status: systemctl status --no-pager $SERVICE_NAME"
log "Logs: journalctl -u $SERVICE_NAME -n 100 --no-pager"