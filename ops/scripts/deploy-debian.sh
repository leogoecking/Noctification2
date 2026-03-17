#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd)"

APP_ROOT="${APP_ROOT:-$PROJECT_ROOT}"
SERVICE_NAME="${SERVICE_NAME:-noctification-api}"
SYSTEM_USER="${SYSTEM_USER:-noctification}"
SYSTEM_GROUP="${SYSTEM_GROUP:-$SYSTEM_USER}"
SYSTEM_ENV_DIR="${SYSTEM_ENV_DIR:-/etc/noctification}"
SYSTEM_ENV_FILE="${SYSTEM_ENV_FILE:-$SYSTEM_ENV_DIR/api.env}"
SYSTEMD_UNIT_PATH="${SYSTEMD_UNIT_PATH:-/etc/systemd/system/${SERVICE_NAME}.service}"
NGINX_SITE_NAME="${NGINX_SITE_NAME:-noctification}"
NGINX_SITE_AVAILABLE="${NGINX_SITE_AVAILABLE:-/etc/nginx/sites-available/${NGINX_SITE_NAME}}"
NGINX_SITE_ENABLED="${NGINX_SITE_ENABLED:-/etc/nginx/sites-enabled/${NGINX_SITE_NAME}}"
CRON_FILE_PATH="${CRON_FILE_PATH:-/etc/cron.d/noctification-db-backup}"
NODE_REQUIRED_MAJOR="${NODE_REQUIRED_MAJOR:-20}"
NPM_REQUIRED_MAJOR="${NPM_REQUIRED_MAJOR:-10}"

SKIP_APT=0
SKIP_NPM_INSTALL=0
SKIP_BUILD=0
SKIP_MIGRATE=0
SKIP_BOOTSTRAP=0
SKIP_SYSTEMD=0
SKIP_NGINX=0
SKIP_BACKUP_CRON=0
SKIP_VALIDATE=0

print_help() {
  cat <<EOF
Usage: sudo bash ops/scripts/deploy-debian.sh [options]

Performs a full Debian deploy for Noctification2:
- installs required system packages
- checks Node.js and npm versions
- installs project dependencies
- builds web and API
- runs API migrations and admin bootstrap
- installs systemd service and nginx site
- installs backup cron
- validates health/login/CORS after restart

Options:
  --skip-apt            Skip apt update/install
  --skip-npm-install    Skip npm install
  --skip-build          Skip npm run build
  --skip-migrate        Skip API migrations
  --skip-bootstrap      Skip admin bootstrap
  --skip-systemd        Skip systemd unit installation/restart
  --skip-nginx          Skip nginx site installation/reload
  --skip-backup-cron    Skip cron installation for DB backups
  --skip-validate       Skip post-deploy validation
  --help                Show this help

Environment overrides:
  APP_ROOT              Project root (default: current repository root)
  SERVICE_NAME          systemd service name (default: noctification-api)
  SYSTEM_USER           Service user owner (default: noctification)
  SYSTEM_GROUP          Service group owner (default: same as user)
  SYSTEM_ENV_FILE       API env file path (default: /etc/noctification/api.env)
  NGINX_SITE_NAME       nginx site name (default: noctification)

Examples:
  sudo APP_ROOT=/home/noctification/noctification bash ops/scripts/deploy-debian.sh
  sudo bash ops/scripts/deploy-debian.sh --skip-apt
EOF
}

log() {
  echo "[deploy:debian] $*"
}

fail() {
  echo "[deploy:debian] FAIL: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Command not found: $1"
}

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    fail "Run this script as root (sudo)."
  fi
}

check_project_root() {
  [[ -f "$APP_ROOT/package.json" ]] || fail "package.json not found in APP_ROOT=$APP_ROOT"
  [[ -f "$APP_ROOT/ops/systemd/noctification-api.service" ]] || fail "systemd template not found in $APP_ROOT"
  [[ -f "$APP_ROOT/ops/nginx/noctification.conf" ]] || fail "nginx template not found in $APP_ROOT"
}

check_node_and_npm() {
  require_cmd node
  require_cmd npm

  local node_major npm_major
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  npm_major="$(npm -v | cut -d. -f1)"

  if (( node_major < NODE_REQUIRED_MAJOR )); then
    fail "Node.js $(node -v) found. Required: ${NODE_REQUIRED_MAJOR}+"
  fi

  if (( npm_major < NPM_REQUIRED_MAJOR )); then
    fail "npm $(npm -v) found. Required: ${NPM_REQUIRED_MAJOR}+"
  fi
}

read_env_value() {
  local key="$1"

  if [[ ! -f "$SYSTEM_ENV_FILE" ]]; then
    return
  fi

  sed -n -e "s/^\xEF\xBB\xBF${key}=//p" -e "s/^${key}=//p" "$SYSTEM_ENV_FILE" | tail -n1 | tr -d '\r'
}

ensure_system_user() {
  if id "$SYSTEM_USER" >/dev/null 2>&1; then
    log "System user already exists: $SYSTEM_USER"
    return
  fi

  log "Creating system user: $SYSTEM_USER"
  useradd --system --create-home --home-dir "/home/${SYSTEM_USER}" --shell /usr/sbin/nologin "$SYSTEM_USER"
}

ensure_api_env() {
  mkdir -p "$SYSTEM_ENV_DIR"

  if [[ ! -f "$SYSTEM_ENV_FILE" ]]; then
    cp "$APP_ROOT/ops/systemd/api.env.example" "$SYSTEM_ENV_FILE"
    log "Created env file from template: $SYSTEM_ENV_FILE"
    log "Edit it before exposing the service publicly."
  else
    log "Using existing env file: $SYSTEM_ENV_FILE"
  fi

  grep -q '^APP_ROOT=' "$SYSTEM_ENV_FILE" || printf '\nAPP_ROOT=%s\n' "$APP_ROOT" >> "$SYSTEM_ENV_FILE"
}

validate_api_env() {
  local jwt_secret admin_login admin_password cors_origin allow_insecure

  jwt_secret="$(read_env_value JWT_SECRET)"
  admin_login="$(read_env_value ADMIN_LOGIN)"
  admin_password="$(read_env_value ADMIN_PASSWORD)"
  cors_origin="$(read_env_value CORS_ORIGIN)"
  allow_insecure="$(read_env_value ALLOW_INSECURE_FIXED_ADMIN)"

  [[ -n "$jwt_secret" ]] || fail "JWT_SECRET is missing in $SYSTEM_ENV_FILE"
  [[ "$jwt_secret" != "CHANGE_ME_TO_A_LONG_RANDOM_SECRET" ]] || fail "JWT_SECRET still uses the template placeholder in $SYSTEM_ENV_FILE"
  [[ -n "$admin_login" ]] || fail "ADMIN_LOGIN is missing in $SYSTEM_ENV_FILE"
  [[ "$admin_login" != "CHANGE_ME_ADMIN_LOGIN" ]] || fail "ADMIN_LOGIN still uses the template placeholder in $SYSTEM_ENV_FILE"
  [[ -n "$admin_password" ]] || fail "ADMIN_PASSWORD is missing in $SYSTEM_ENV_FILE"
  [[ "$admin_password" != "CHANGE_ME_ADMIN_PASSWORD" ]] || fail "ADMIN_PASSWORD still uses the template placeholder in $SYSTEM_ENV_FILE"
  [[ -n "$cors_origin" ]] || fail "CORS_ORIGIN is missing in $SYSTEM_ENV_FILE"

  if [[ "$allow_insecure" != "false" ]]; then
    fail "ALLOW_INSECURE_FIXED_ADMIN must be false in production env file: $SYSTEM_ENV_FILE"
  fi
}

run_apt() {
  log "Installing system packages"
  apt update
  apt install -y nginx sqlite3
}

run_npm_install() {
  log "Installing project dependencies"
  npm install
}

run_build() {
  log "Building project"
  npm run build
}

run_migrate() {
  log "Running API migrations"
  npm run migrate --workspace @noctification/api
}

run_bootstrap() {
  log "Bootstrapping admin"
  npm run bootstrap-admin --workspace @noctification/api
}

install_systemd_unit() {
  log "Installing systemd service"
  cp "$APP_ROOT/ops/systemd/noctification-api.service" "$SYSTEMD_UNIT_PATH"
  sed -i "s|/home/noctification/noctification|$APP_ROOT|g" "$SYSTEMD_UNIT_PATH"
  sed -i "s|User=noctification|User=$SYSTEM_USER|g" "$SYSTEMD_UNIT_PATH"
  sed -i "s|Group=noctification|Group=$SYSTEM_GROUP|g" "$SYSTEMD_UNIT_PATH"
  sed -i "s|EnvironmentFile=/etc/noctification/api.env|EnvironmentFile=$SYSTEM_ENV_FILE|g" "$SYSTEMD_UNIT_PATH"

  chown -R "$SYSTEM_USER:$SYSTEM_GROUP" "$APP_ROOT"

  systemctl daemon-reload
  systemctl enable --now "$SERVICE_NAME"
  systemctl restart "$SERVICE_NAME"
  systemctl --no-pager --full status "$SERVICE_NAME" || true
}

install_nginx_site() {
  log "Installing nginx site"
  cp "$APP_ROOT/ops/nginx/noctification.conf" "$NGINX_SITE_AVAILABLE"
  sed -i "s|/home/noctification/noctification|$APP_ROOT|g" "$NGINX_SITE_AVAILABLE"

  ln -sfn "$NGINX_SITE_AVAILABLE" "$NGINX_SITE_ENABLED"
  rm -f /etc/nginx/sites-enabled/default

  nginx -t
  systemctl reload nginx
}

install_backup_cron() {
  log "Installing DB backup cron"
  cp "$APP_ROOT/ops/cron/noctification-db-backup.cron" "$CRON_FILE_PATH"
  sed -i "s|/home/noctification/noctification|$APP_ROOT|g" "$CRON_FILE_PATH"
  sed -i "s| noctification | ${SYSTEM_USER} |g" "$CRON_FILE_PATH"
  chmod 644 "$CRON_FILE_PATH"
}

run_validation() {
  log "Running post-deploy validation"
  bash "$APP_ROOT/ops/scripts/validate-debian-login.sh" --env-file "$SYSTEM_ENV_FILE"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-apt)
      SKIP_APT=1
      shift
      ;;
    --skip-npm-install)
      SKIP_NPM_INSTALL=1
      shift
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --skip-migrate)
      SKIP_MIGRATE=1
      shift
      ;;
    --skip-bootstrap)
      SKIP_BOOTSTRAP=1
      shift
      ;;
    --skip-systemd)
      SKIP_SYSTEMD=1
      shift
      ;;
    --skip-nginx)
      SKIP_NGINX=1
      shift
      ;;
    --skip-backup-cron)
      SKIP_BACKUP_CRON=1
      shift
      ;;
    --skip-validate)
      SKIP_VALIDATE=1
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

require_root
require_cmd sed
require_cmd grep
require_cmd systemctl
check_project_root
check_node_and_npm
ensure_system_user
ensure_api_env
validate_api_env

cd "$APP_ROOT"

if (( SKIP_APT == 0 )); then
  run_apt
fi

if (( SKIP_NPM_INSTALL == 0 )); then
  run_npm_install
fi

if (( SKIP_BUILD == 0 )); then
  run_build
fi

if (( SKIP_MIGRATE == 0 )); then
  run_migrate
fi

if (( SKIP_BOOTSTRAP == 0 )); then
  run_bootstrap
fi

if (( SKIP_SYSTEMD == 0 )); then
  install_systemd_unit
fi

if (( SKIP_NGINX == 0 )); then
  install_nginx_site
fi

if (( SKIP_BACKUP_CRON == 0 )); then
  install_backup_cron
fi

if (( SKIP_VALIDATE == 0 )); then
  run_validation
fi

log "Deploy completed"
