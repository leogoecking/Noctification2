# Portabilidade do clone para deploy Debian

Data: 2026-03-17

## Objetivo

Remover o acoplamento do repositório a caminhos fixos como `/home/noctification/noctification` e permitir que o deploy use o diretório real do clone informado em `APP_ROOT`.

## Problemas confirmados antes da mudança

- templates versionados de `systemd`, `nginx`, `cron` e `api.env.example` continham caminhos absolutos fixos
- `README.md` continha links e exemplos presos ao caminho atual do autor do checkout
- `ops/scripts/deploy-debian.sh` dependia de substituicoes por texto com o caminho antigo e nao reescrevia `APP_ROOT` quando o env file ja existia

## Correcoes aplicadas

- `ops/systemd/noctification-api.service`
  - passou a usar placeholders: `__APP_ROOT__`, `__SYSTEM_USER__`, `__SYSTEM_GROUP__`, `__SYSTEM_ENV_FILE__`
- `ops/nginx/noctification.conf`
  - passou a usar `__APP_ROOT__`
- `ops/cron/noctification-db-backup.cron`
  - passou a usar `__APP_ROOT__` e `__SYSTEM_USER__`
- `ops/systemd/api.env.example`
  - passou a usar `APP_ROOT=__APP_ROOT__`
- `ops/scripts/deploy-debian.sh`
  - agora renderiza templates por placeholder
  - agora reescreve `APP_ROOT` no env file existente
  - agora falha se `ADMIN_LOGIN/ADMIN_PASSWORD` ainda estiverem em `admin/admin`
  - agora valida acesso real do `SYSTEM_USER` aos artefatos de build antes de ativar o service
- `README.md`
  - links relativos
  - exemplo de deploy genérico com `sudo APP_ROOT="$(pwd)" bash ops/scripts/deploy-debian.sh`

## Validacao executada

- `bash -n ops/scripts/deploy-debian.sh`
- `bash -n ops/scripts/backup-db.sh`
- `bash -n ops/scripts/validate-debian-login.sh`
- `npm run typecheck --workspace @noctification/api`
- busca por caminhos absolutos versionados fora de `.deploy/`

## Limites

- `.deploy/` continua com caminhos locais renderizados. Isso e esperado porque representa artefatos locais nao versionados.
- a validacao completa do script de deploy continua dependendo de execucao com root e ambiente Debian com `systemd`/`nginx`.

## Resultado

O fluxo versionado do projeto passou a reconhecer o caminho real do clone via `APP_ROOT`, sem depender de um diretório absoluto fixo para instalar `systemd`, `nginx`, `cron` e `api.env`.
