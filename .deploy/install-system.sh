#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." >/dev/null 2>&1 && pwd)"
SERVICE_NAME="noctification-api"
SYSTEMD_TARGET="/etc/systemd/system/${SERVICE_NAME}.service"
NGINX_TARGET="/etc/nginx/sites-available/noctification"
NGINX_ENABLED="/etc/nginx/sites-enabled/noctification"
CRON_TARGET="/etc/cron.d/noctification-db-backup"
LOCAL_ENV_FILE="${PROJECT_ROOT}/.deploy/shared/api.env"
BACKUP_ROOT="${PROJECT_ROOT}/.deploy/shared/backups"
SYSTEM_USER="${SYSTEM_USER:-$(stat -c '%U' "$PROJECT_ROOT")}"
SYSTEM_GROUP="${SYSTEM_GROUP:-$(stat -c '%G' "$PROJECT_ROOT")}"
LOCAL_SYSTEMD_FILE="${PROJECT_ROOT}/.deploy/systemd/noctification-api.service"
LOCAL_NGINX_FILE="${PROJECT_ROOT}/.deploy/nginx/noctification.conf"
LOCAL_CRON_FILE="${PROJECT_ROOT}/.deploy/cron/noctification-db-backup.cron"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    echo "[install-system] run this script with sudo/root" >&2
    exit 1
  fi
}

prepare_local_layout() {
  node "${PROJECT_ROOT}/scripts/prepare-deploy.cjs" \
    --require-real-env \
    --app-root "${PROJECT_ROOT}" \
    --local-env-file "${LOCAL_ENV_FILE}" \
    --system-env-file "${LOCAL_ENV_FILE}" \
    --system-user "${SYSTEM_USER}" \
    --system-group "${SYSTEM_GROUP}"
}

backup_if_exists() {
  local source_path="$1"
  local label="$2"

  if [[ -e "${source_path}" ]]; then
    mkdir -p "${BACKUP_DIR}"
    cp -a "${source_path}" "${BACKUP_DIR}/${label}"
    echo "[install-system] backup created: ${BACKUP_DIR}/${label}"
  fi
}

require_root
prepare_local_layout
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled "${BACKUP_ROOT}"

backup_if_exists "${SYSTEMD_TARGET}" "${SERVICE_NAME}.service"
backup_if_exists "${NGINX_TARGET}" "nginx-noctification.conf"
backup_if_exists "${NGINX_ENABLED}" "nginx-noctification.enabled"
backup_if_exists "${CRON_TARGET}" "noctification-db-backup.cron"

echo "[install-system] copying systemd unit"
cp "${LOCAL_SYSTEMD_FILE}" "${SYSTEMD_TARGET}"

echo "[install-system] copying nginx site"
cp "${LOCAL_NGINX_FILE}" "${NGINX_TARGET}"
ln -sfn "${NGINX_TARGET}" "${NGINX_ENABLED}"
rm -f /etc/nginx/sites-enabled/default

echo "[install-system] copying backup cron"
cp "${LOCAL_CRON_FILE}" "${CRON_TARGET}"
chmod 644 "${CRON_TARGET}"

echo "[install-system] validating nginx"
/usr/sbin/nginx -t

echo "[install-system] enabling service"
systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"
systemctl reload nginx

echo "[install-system] done"
