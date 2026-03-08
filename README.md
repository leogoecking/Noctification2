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
- Usuario marca leitura manualmente
- Admin acompanha lidas/nao lidas com horario de leitura
- Auditoria basica (`audit_log`)

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
- `POST /api/v1/admin/users`
- `PATCH /api/v1/admin/users/:id`
- `PATCH /api/v1/admin/users/:id/status`
- `POST /api/v1/admin/notifications`
- `GET /api/v1/admin/notifications?status=&user_id=&from=&to=`
- `GET /api/v1/me/notifications?status=`
- `POST /api/v1/me/notifications/:id/read`

## Eventos Socket.IO

- Servidor -> usuario: `notification:new`
- Servidor -> admin: `notification:read_update`
- Cliente -> servidor: `notifications:subscribe`

## Build e testes

```bash
npm run build --workspace @noctification/api
npm run build --workspace @noctification/web
npm run test --workspace @noctification/api
```

## Deploy Debian (sem Nginx)

### 1. Build

```bash
npm install
npm run build
```

### 2. Ambiente de producao

- Copiar `ops/systemd/api.env.example` para `/etc/noctification/api.env`
- Ajustar `JWT_SECRET`, `ADMIN_PASSWORD`, `CORS_ORIGIN`

### 3. Criar usuario de servico e permissao

```bash
sudo useradd --system --home /opt/noctification --shell /usr/sbin/nologin noctification || true
sudo mkdir -p /opt/noctification
sudo chown -R noctification:noctification /opt/noctification
```

### 4. Instalar service

```bash
sudo cp ops/systemd/noctification-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now noctification-api
```

### 5. Backup diario do banco

```bash
sudo mkdir -p /opt/noctification/ops/scripts
sudo cp ops/scripts/backup-db.sh /opt/noctification/ops/scripts/
sudo chmod +x /opt/noctification/ops/scripts/backup-db.sh
sudo cp ops/cron/noctification-db-backup.cron /etc/cron.d/noctification-db-backup
```

## Banco de dados

Tabelas:

- `users`
- `notifications`
- `notification_recipients`
- `audit_log`
- `schema_migrations`
