#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_ENV_EXAMPLE="$ROOT_DIR/apps/api/.env.example"
API_ENV_FILE="$ROOT_DIR/apps/api/.env"
WEB_ENV_EXAMPLE="$ROOT_DIR/apps/web/.env.example"
WEB_ENV_FILE="$ROOT_DIR/apps/web/.env"

ensure_env() {
    local example_file="$1"
    local target_file="$2"

    if [ -f "$target_file" ]; then
        return
    fi

    cp "$example_file" "$target_file"
    echo "Criado $(realpath --relative-to="$ROOT_DIR" "$target_file") a partir do exemplo."
}

cd "$ROOT_DIR"

echo "Instalando dependências..."
npm install

ensure_env "$API_ENV_EXAMPLE" "$API_ENV_FILE"
ensure_env "$WEB_ENV_EXAMPLE" "$WEB_ENV_FILE"

echo "Aplicando migrações..."
npm run migrate --workspace @noctification/api

echo "Garantindo admin fixo..."
npm run bootstrap-admin --workspace @noctification/api

echo "Subindo API e frontend..."
exec npm run dev
