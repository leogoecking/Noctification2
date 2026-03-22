#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." >/dev/null 2>&1 && pwd)"
SERVICE_NAME="${SERVICE_NAME:-noctification-api}"
API_HEALTH_URL="${API_HEALTH_URL:-http://127.0.0.1:4000/api/v1/health}"

log() {
  echo "[update:vm] $*"
}

run_step() {
  local step="$1"
  shift
  log "STEP ${step}: $*"
  "$@"
}

cd "$PROJECT_ROOT"

run_step "1/12" git status --short
run_step "2/12" git pull
run_step "3/12" npm install
run_step "4/12" npm run build
run_step "5/12" npm run migrate --workspace @noctification/api
run_step "6/12" sudo systemctl daemon-reload
run_step "7/12" sudo systemctl restart "$SERVICE_NAME"
run_step "8/12" systemctl status "$SERVICE_NAME" --no-pager
run_step "9/12" curl -sS "$API_HEALTH_URL"
run_step "10/12" sudo nginx -t
run_step "11/12" sudo systemctl reload nginx
run_step "12/12" printf '%s\n' "Atualizacao concluida. Faça um hard refresh no navegador: Ctrl+F5."
