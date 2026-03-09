# Noctification2 - Sistema Interno de Notificacoes

Monorepo TypeScript com:

- `apps/api`: Express + Socket.IO + SQLite (`better-sqlite3`)
- `apps/web`: React + Tailwind (dark)

## Funcionalidades v1

- Login/logout com JWT em cookie HttpOnly (`nc_access`)
- Perfis `admin` e `user`
- Admin pode criar/editar/ativar/desativar usuarios
- Admin envia notificacao para um, varios ou todos os usuarios
- Entrega instantanea para usuarios online via Socket.IO
- Persistencia para usuarios offline (recebem ao logar)
- Popup/toast no canto + badge de pendencias + som curto
- Modal para notificacoes criticas
- Usuario pode registrar leitura manualmente (`read_at`), mas so conta como lida quando resposta = `resolvido`
- Quando resposta = `em_andamento`, a notificacao fica pendente e dispara lembrete a cada 30 minutos ate `resolvido`
- Usuario responde notificacoes com status curto:
  - `em_andamento`
  - `resolvido`
- Em ambos os status, o usuario pode enviar uma mensagem de retorno opcional
- Admin acompanha lidas/nao lidas e respostas por destinatario
- Painel admin com usuarios online em tempo real
- Auditoria detalhada (`audit_log`) com envio, leitura e resposta

## Estrutura

- `apps/api/migrations`: schema SQL do banco
- `apps/api/src`: API, auth, rotas e realtime
- `apps/web/src`: UI login/admin/usuario
- `ops/systemd`: servico systemd e exemplo de env
- `ops/scripts/backup-db.sh`: backup do SQLite
- `ops/cron/noctification-db-backup.cron`: exemplo de cron diario

## Requisitos

- Node.js 20+
- npm 10+

## Setup rapido (1 comando)

```bash
npm run setup
npm run dev
```

O `setup` instala dependencias, cria `.env` a partir dos exemplos (se nao existir), aplica migracoes e prepara o admin inicial.

Senha inicial do admin no primeiro login: `admin`.

## Setup rapido Debian (1 comando)

Execute no servidor Debian (com o repositorio ja disponivel na maquina):

```bash
sudo bash ops/scripts/setup-debian.sh \
  --cors-origin https://app.seudominio.com \
  --jwt-secret "troque-por-um-segredo-forte" \
  --admin-password "troque-por-uma-senha-forte"
```

Esse comando automatiza copia para `/opt/noctification`, install/build, migracoes, bootstrap do admin, `systemd` e cron de backup.

No primeiro login do admin em Debian, a senha tambem sera `admin`.

## Setup local

1. Instalar dependencias:

```bash
npm install
```

2. Configurar ambiente API:

```bash
cp apps/api/.env.example apps/api/.env
```

3. Configurar ambiente web:

```bash
cp apps/web/.env.example apps/web/.env
```

4. Executar migracoes (na pasta da API):

```bash
cd apps/api
npm run migrate
```

5. Criar/atualizar admin inicial com variaveis do `.env`:

```bash
npm run bootstrap-admin
```

6. Rodar API e web (em terminais separados):

```bash
npm run dev --workspace @noctification/api
npm run dev --workspace @noctification/web
```

API: `http://localhost:4000`
Web: `http://localhost:5173`

## Endpoints principais

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/online-users`
- `GET /api/v1/admin/audit?limit=`
- `POST /api/v1/admin/users`
- `PATCH /api/v1/admin/users/:id`
- `PATCH /api/v1/admin/users/:id/status`
- `POST /api/v1/admin/notifications`
- `GET /api/v1/admin/notifications?status=&user_id=&from=&to=`
- `GET /api/v1/me/notifications?status=`
- `POST /api/v1/me/notifications/:id/read`
- `POST /api/v1/me/notifications/:id/respond`

## Eventos Socket.IO

- Servidor -> usuario: `notification:new`
- Servidor -> usuario: `notification:reminder`
- Servidor -> admin: `notification:read_update`
- Servidor -> admin: `online_users:update`
- Cliente -> servidor: `notifications:subscribe`

## Build e testes

```bash
npm run build --workspace @noctification/api
npm run build --workspace @noctification/web
npm run test --workspace @noctification/api
```

## Deploy Debian (API via systemd, sem Nginx)

Este guia publica a API em `:4000` com `systemd`. O frontend (`apps/web`) deve ser servido separadamente (Nginx, Caddy, Vercel etc) e o `CORS_ORIGIN` precisa apontar para a URL real do frontend.

Opcao automatica: `npm run setup:debian` (ou `bash ops/scripts/setup-debian.sh`) no servidor Debian.

### 1. Preparar servidor

- Garantir Node.js 20+ e npm 10+.
- Criar usuario de servico e diretorios base:

```bash
sudo useradd --system --home /opt/noctification --shell /usr/sbin/nologin noctification || true
sudo mkdir -p /opt/noctification /etc/noctification /opt/noctification/backups/db
sudo chown -R noctification:noctification /opt/noctification
```

### 2. Copiar codigo para o servidor

No servidor, o projeto precisa existir em `/opt/noctification` (o service usa `WorkingDirectory=/opt/noctification/apps/api`).

Exemplo com `rsync` a partir da sua maquina local:

```bash
rsync -av --delete ./ usuario@SEU_SERVIDOR:/opt/noctification/
```

### 3. Instalar dependencias e buildar

```bash
cd /opt/noctification
npm install
npm run build
```

### 4. Configurar ambiente de producao

```bash
sudo cp /opt/noctification/ops/systemd/api.env.example /etc/noctification/api.env
sudo nano /etc/noctification/api.env
```

Ajuste no minimo:

- `JWT_SECRET` (valor forte e unico)
- `ADMIN_PASSWORD`
- `CORS_ORIGIN` (URL publica do frontend)
- `DB_PATH` (padrao: `/opt/noctification/apps/api/data/noctification.db`)

### 5. Criar banco, migrar e preparar admin

```bash
sudo mkdir -p /opt/noctification/apps/api/data
sudo chown -R noctification:noctification /opt/noctification/apps/api/data

cd /opt/noctification/apps/api
set -a
source /etc/noctification/api.env
set +a
npm run migrate
npm run bootstrap-admin
```

### 6. Instalar e iniciar o service

```bash
sudo cp /opt/noctification/ops/systemd/noctification-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now noctification-api
```

### 7. Validar operacao

```bash
systemctl status --no-pager noctification-api
curl http://127.0.0.1:4000/api/v1/health
journalctl -u noctification-api -n 100 --no-pager
```

### 8. Ativar backup diario do SQLite

```bash
sudo chmod +x /opt/noctification/ops/scripts/backup-db.sh
sudo cp /opt/noctification/ops/cron/noctification-db-backup.cron /etc/cron.d/noctification-db-backup
sudo /opt/noctification/ops/scripts/backup-db.sh
```

## Banco de dados

Tabelas:

- `users`
- `notifications`
- `notification_recipients`
- `audit_log`
- `schema_migrations`
