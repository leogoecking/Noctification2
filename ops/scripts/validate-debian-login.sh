#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd)"
SYSTEM_ENV_FILE="/etc/noctification/api.env"
LOCAL_ENV_FILE="$PROJECT_ROOT/apps/api/.env"

API_BASE="http://127.0.0.1:4000"
ENV_FILE="$SYSTEM_ENV_FILE"
if [[ ! -f "$ENV_FILE" && -f "$LOCAL_ENV_FILE" ]]; then
  ENV_FILE="$LOCAL_ENV_FILE"
fi
ORIGIN=""
LOGIN="admin"
PASSWORD="admin"
TIMEOUT_SECONDS="10"

print_help() {
  cat <<EOF
Usage: bash ops/scripts/validate-debian-login.sh [options]

Validates API health, CORS, login, cookie creation and /auth/me.

Options:
  --api-base <url>       API base (default: http://127.0.0.1:4000)
  --origin <url>         Frontend origin for CORS check (default: read from CORS_ORIGIN in env file)
  --env-file <path>      Env file path (default: /etc/noctification/api.env; fallback: apps/api/.env)
  --login <value>        Login credential (default: admin)
  --password <value>     Password credential (default: admin)
  --timeout <seconds>    Curl timeout (default: 10)
  --help                 Show this help

Examples:
  bash ops/scripts/validate-debian-login.sh
  bash ops/scripts/validate-debian-login.sh --origin http://192.168.0.123:5173
EOF
}

log() {
  echo "[validate:debian] $*"
}

fail() {
  echo "[validate:debian] FAIL: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Command not found: $1"
}

read_cors_origin_from_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    return
  fi

  sed -n -e 's/^\xEF\xBB\xBFCORS_ORIGIN=//p' -e 's/^CORS_ORIGIN=//p' "$ENV_FILE" | tail -n1 | tr -d '\r'
}

read_env_value() {
  local key="$1"

  if [[ ! -f "$ENV_FILE" ]]; then
    return
  fi

  sed -n -e "s/^\xEF\xBB\xBF${key}=//p" -e "s/^${key}=//p" "$ENV_FILE" | tail -n1 | tr -d '\r'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-base)
      API_BASE="$2"
      shift 2
      ;;
    --origin)
      ORIGIN="$2"
      shift 2
      ;;
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --login)
      LOGIN="$2"
      shift 2
      ;;
    --password)
      PASSWORD="$2"
      shift 2
      ;;
    --timeout)
      TIMEOUT_SECONDS="$2"
      shift 2
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

require_cmd curl

API_BASE="${API_BASE%/}"

if [[ -z "$ORIGIN" ]]; then
  ORIGIN="$(read_cors_origin_from_env || true)"
fi

if [[ "$LOGIN" == "admin" ]]; then
  LOGIN="$(read_env_value ADMIN_LOGIN || true)"
  LOGIN="${LOGIN:-admin}"
fi

if [[ "$PASSWORD" == "admin" ]]; then
  PASSWORD="$(read_env_value ADMIN_PASSWORD || true)"
  PASSWORD="${PASSWORD:-admin}"
fi

if [[ -z "$ORIGIN" ]]; then
  fail "Could not determine origin. Pass --origin or configure CORS_ORIGIN in $ENV_FILE"
fi

TMP_DIR="$(mktemp -d)"
HEADERS_FILE="$TMP_DIR/headers.txt"
BODY_FILE="$TMP_DIR/body.json"
COOKIE_FILE="$TMP_DIR/cookies.txt"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

log "Env file used: $ENV_FILE"
log "Login used: $LOGIN"
log "Checking health endpoint..."
curl -fsS --max-time "$TIMEOUT_SECONDS" "$API_BASE/api/v1/health" -o "$BODY_FILE" >/dev/null

if ! grep -q '"taskAutomationEnabled"' "$BODY_FILE"; then
  fail "Health response does not expose schedulers.taskAutomationEnabled"
fi

if ! grep -q '"remindersEnabled"' "$BODY_FILE"; then
  fail "Health response does not expose schedulers.remindersEnabled"
fi

EXPECTED_TASK_AUTOMATION="$(read_env_value ENABLE_TASK_AUTOMATION_SCHEDULER || true)"
if [[ "$EXPECTED_TASK_AUTOMATION" == "true" ]]; then
  grep -q '"taskAutomationEnabled":[[:space:]]*true' "$BODY_FILE" || fail "Health response does not reflect ENABLE_TASK_AUTOMATION_SCHEDULER=true"
fi

if [[ "$EXPECTED_TASK_AUTOMATION" == "false" ]]; then
  grep -q '"taskAutomationEnabled":[[:space:]]*false' "$BODY_FILE" || fail "Health response does not reflect ENABLE_TASK_AUTOMATION_SCHEDULER=false"
fi

log "Checking CORS preflight for /auth/login..."
PREFLIGHT_STATUS="$(
  {
    curl -sS -o /dev/null -D "$HEADERS_FILE" -w '%{http_code}' \
      -X OPTIONS "$API_BASE/api/v1/auth/login" \
      -H "Origin: $ORIGIN" \
      -H 'Access-Control-Request-Method: POST' \
      -H 'Access-Control-Request-Headers: content-type' \
      --max-time "$TIMEOUT_SECONDS"
  } || true
)"

if [[ "$PREFLIGHT_STATUS" != "200" && "$PREFLIGHT_STATUS" != "204" ]]; then
  fail "Preflight returned HTTP $PREFLIGHT_STATUS (expected 200 or 204)"
fi

ALLOW_ORIGIN="$(tr -d '\r' < "$HEADERS_FILE" | awk 'tolower($1)=="access-control-allow-origin:" {print $2}' | tail -n1)"
if [[ "$ALLOW_ORIGIN" != "$ORIGIN" ]]; then
  fail "CORS mismatch: allow-origin='$ALLOW_ORIGIN' expected='$ORIGIN'"
fi

log "Testing login..."
LOGIN_PAYLOAD="$(printf '{"login":"%s","password":"%s"}' "$LOGIN" "$PASSWORD")"
LOGIN_STATUS="$(
  {
    curl -sS -o "$BODY_FILE" -D "$HEADERS_FILE" -c "$COOKIE_FILE" -w '%{http_code}' \
      -X POST "$API_BASE/api/v1/auth/login" \
      -H "Origin: $ORIGIN" \
      -H 'Content-Type: application/json' \
      --data "$LOGIN_PAYLOAD" \
      --max-time "$TIMEOUT_SECONDS"
  } || true
)"

if [[ "$LOGIN_STATUS" != "200" ]]; then
  MSG="$(cat "$BODY_FILE" 2>/dev/null || true)"
  fail "Login returned HTTP $LOGIN_STATUS. Response: $MSG"
fi

if ! tr -d '\r' < "$HEADERS_FILE" | grep -qi '^set-cookie: nc_access='; then
  fail "Login succeeded but nc_access cookie was not set"
fi

log "Testing /auth/me using issued cookie..."
ME_STATUS="$(
  {
    curl -sS -o "$BODY_FILE" -b "$COOKIE_FILE" -w '%{http_code}' \
      "$API_BASE/api/v1/auth/me" \
      -H "Origin: $ORIGIN" \
      --max-time "$TIMEOUT_SECONDS"
  } || true
)"

if [[ "$ME_STATUS" != "200" ]]; then
  MSG="$(cat "$BODY_FILE" 2>/dev/null || true)"
  fail "/auth/me returned HTTP $ME_STATUS. Response: $MSG"
fi

log "PASS: health, CORS, login, cookie and /auth/me are OK"
log "Origin used: $ORIGIN"
log "API used: $API_BASE"
