# Deploy Debian VM

Guia para manter o Noctification2 sempre online em uma VM Debian ligada 24/7.

## Arquitetura recomendada

- `systemd` para manter a API ativa e reiniciar em falhas
- `nginx` para servir o frontend estatico e encaminhar API/WebSocket
- SQLite local com backup via cron

## Script unico

O projeto agora traz um deploy unico em [`ops/scripts/deploy-debian.sh`](/home/redes/Documentos/Leandro/Noctification2/ops/scripts/deploy-debian.sh).

Uso recomendado:

```bash
sudo APP_ROOT=/home/noctification/noctification bash ops/scripts/deploy-debian.sh
```

O script:

- instala `nginx` e `sqlite3`
- valida `Node.js 20+` e `npm 10+`
- cria `/etc/noctification/api.env` se ele nao existir
- executa `npm install`, `build`, `migrate` e `bootstrap-admin`
- instala o `systemd`
- instala o `nginx`
- instala o cron de backup
- roda a validacao final de health/CORS/login

Flags uteis:

- `--skip-apt`
- `--skip-npm-install`
- `--skip-build`
- `--skip-migrate`
- `--skip-bootstrap`
- `--skip-systemd`
- `--skip-nginx`
- `--skip-backup-cron`
- `--skip-validate`

## 1. Pacotes do sistema

```bash
sudo apt update
sudo apt install -y nginx sqlite3
```

Instale tambem Node.js 20+ e npm 10+ na VM.

## 2. Diretorio da aplicacao

Exemplo adotado neste guia:

```bash
mkdir -p /home/noctification
cd /home/noctification
git clone <URL_DO_REPOSITORIO> noctification
cd noctification
npm install
```

## 3. Variaveis da API

Crie o arquivo `/etc/noctification/api.env` a partir de [`ops/systemd/api.env.example`](/home/redes/Documentos/Leandro/Noctification2/ops/systemd/api.env.example).

```bash
sudo mkdir -p /etc/noctification
sudo cp ops/systemd/api.env.example /etc/noctification/api.env
sudo nano /etc/noctification/api.env
```

Ajuste no minimo:

- `APP_ROOT=/home/noctification/noctification`
- `NODE_ENV=production`
- `JWT_SECRET=` com um segredo forte
- `CORS_ORIGIN=http://IP_DA_VM` ou seu dominio
- `ALLOW_INSECURE_FIXED_ADMIN=false`
- `ADMIN_LOGIN`, `ADMIN_PASSWORD` e `ADMIN_NAME`

## 4. Variaveis do frontend

Crie `apps/web/.env.production` a partir de [`apps/web/.env.production.example`](/home/redes/Documentos/Leandro/Noctification2/apps/web/.env.production.example).

```bash
cp apps/web/.env.production.example apps/web/.env.production
nano apps/web/.env.production
```

Se usar IP da VM:

```bash
VITE_API_BASE=http://IP_DA_VM/api/v1
VITE_SOCKET_URL=http://IP_DA_VM
```

Se usar dominio:

```bash
VITE_API_BASE=https://seu-dominio/api/v1
VITE_SOCKET_URL=https://seu-dominio
```

## 5. Build e bootstrap

```bash
npm run build
npm run migrate --workspace @noctification/api
npm run bootstrap-admin --workspace @noctification/api
```

## 6. Servico systemd da API

Copie o exemplo de [`ops/systemd/noctification-api.service`](/home/redes/Documentos/Leandro/Noctification2/ops/systemd/noctification-api.service):

```bash
sudo cp ops/systemd/noctification-api.service /etc/systemd/system/noctification-api.service
```

Crie o usuario de servico se quiser isolar o processo:

```bash
sudo useradd --system --create-home --home-dir /home/noctification --shell /usr/sbin/nologin noctification
sudo chown -R noctification:noctification /home/noctification/noctification
```

Ative o servico:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now noctification-api
sudo systemctl status noctification-api
```

Ver logs:

```bash
sudo journalctl -u noctification-api -f
```

## 7. Nginx para frontend e proxy

Use [`ops/nginx/noctification.conf`](/home/redes/Documentos/Leandro/Noctification2/ops/nginx/noctification.conf) como base:

```bash
sudo cp ops/nginx/noctification.conf /etc/nginx/sites-available/noctification
sudo ln -s /etc/nginx/sites-available/noctification /etc/nginx/sites-enabled/noctification
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 8. Backup do SQLite

O projeto ja traz:

- script: [`ops/scripts/backup-db.sh`](/home/redes/Documentos/Leandro/Noctification2/ops/scripts/backup-db.sh)
- cron: [`ops/cron/noctification-db-backup.cron`](/home/redes/Documentos/Leandro/Noctification2/ops/cron/noctification-db-backup.cron)

Instalacao:

```bash
sudo mkdir -p /var/spool/cron/crontabs
sudo cp ops/cron/noctification-db-backup.cron /etc/cron.d/noctification-db-backup
sudo chmod 644 /etc/cron.d/noctification-db-backup
```

## 9. Atualizacao do deploy

Sempre que atualizar o codigo:

```bash
cd /home/noctification/noctification
git pull
npm install
npm run build
npm run migrate --workspace @noctification/api
sudo systemctl restart noctification-api
```

## 10. Verificacao

Checklist minimo:

- `systemctl status noctification-api` sem erro
- `curl http://127.0.0.1:4000/api/v1/health`
- acesso ao frontend pelo IP ou dominio
- login funcionando
- notificacoes em tempo real funcionando

## Observacoes

- Os lembretes usam timezone explicita `America/Bahia` no codigo e nao dependem mais da timezone global do processo.
- Sem `apps/web/.env.production`, o frontend tenta acessar a API na porta `4000` diretamente.
- Se quiser HTTPS, o passo seguinte e configurar um dominio e emitir certificado com `certbot`.
