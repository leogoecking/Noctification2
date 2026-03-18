# Diagnostico da VM Debian

## Escopo

- Objetivo desta etapa: validar com evidencia o estado atual da VM Debian antes de qualquer deploy.
- Projeto alvo: `Noctification2`, monorepo Node.js com `apps/api` e `apps/web`.

## Evidencias coletadas

### Sistema operacional

- Comando: `cat /etc/os-release`
- Evidencia:
  - `PRETTY_NAME="Debian GNU/Linux 13 (trixie)"`
  - `VERSION_ID="13"`

### Usuario atual e privilegios

- Comando: `whoami && id`
- Evidencia:
  - usuario atual: `leo`
  - grupos: inclui `sudo`

- Comando: `sudo -n true`
- Evidencia:
  - falha com `sudo: a password is required`
- Conclusao:
  - o usuario tem sudo configurado, mas o deploy nao pode prosseguir de forma nao interativa sem fornecer senha.

### Init / systemd

- Comando: `systemctl --version`
- Evidencia:
  - `systemd 257`
- Conclusao:
  - `systemd` esta disponivel e e compativel com a estrategia de deploy via service.

### Recursos da VM

- Comando: `free -h`
- Evidencia:
  - RAM total: `3.8Gi`
  - disponivel: `2.3Gi`
  - swap: `1.1Gi`, em uso `206Mi`

- Comando: `df -h / /home /tmp`
- Evidencia:
  - raiz `/`: `19G` total, `11G` livres
  - `/tmp`: `2.0G` livres

### Portas em uso

- Comando: `ss -ltnp`
- Evidencia:
  - `0.0.0.0:5173` -> `node`, PID `91226`
  - `*:4000` -> `node`, PID `91896`
  - `0.0.0.0:22` -> SSH
  - `127.0.0.1:631` -> CUPS

### Processos atuais relacionados ao projeto

- Comando: `pgrep -af 'noctification|node|nginx'`
- Comando: `ps -fp 91193,91194,91223,91224,91226,91896`
- Evidencia:
  - `node scripts/dev.cjs`
  - `node --watch --import tsx src/index.ts`
  - `node .../vite`
- Conclusao:
  - a aplicacao esta rodando em modo de desenvolvimento.
  - nao ha evidencia de deploy de producao com `systemd`, `nginx` ou outro process manager.

### Endpoints locais atuais

- Comando: `wget -S -O - http://127.0.0.1:4000/api/v1/health`
- Evidencia:
  - `HTTP/1.1 200 OK`
  - corpo: `{"status":"ok","uptimeSeconds":8194,...}`

- Comando: `wget -S -O - http://127.0.0.1:5173`
- Evidencia:
  - `HTTP/1.1 200 OK`
  - retorno inclui `/@vite/client` e `/src/main.tsx`
- Conclusao:
  - frontend ativo e servido por Vite dev server.
  - backend ativo e saudavel, mas tambem ligado ao fluxo de desenvolvimento.

### Ferramentas disponiveis e ausentes

- Comando: `for cmd in ...; do command -v ...; done`
- Confirmadas:
  - `git`
  - `wget`
  - `node`
  - `npm`
  - `sqlite3`
  - `ss`
  - `free`
  - `df`
  - `lsb_release`
- Ausentes:
  - `curl`
  - `nginx`
  - `pm2`
  - `docker`
  - `docker-compose`
  - `certbot`
  - `ufw`
  - `nft`
  - `iptables`

### Diretórios e estrutura de producao

- Comando: `ls -ld /etc/nginx /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/noctification /home/noctification`
- Evidencia:
  - todos ausentes

- Comando: `ls -ld /opt /var/www`
- Evidencia:
  - `/opt` existe
  - nao houve evidencia de app instalada em `/var/www`

### Servicos systemd relacionados

- Comando: `systemctl list-units --type=service --all | grep -Ei 'noctification|nginx|node' || true`
- Evidencia:
  - nenhum service relacionado ao projeto, `nginx` ou `node`

## Diagnostico consolidado

- Stack operacional detectada na VM:
  - Node.js / npm
  - SQLite local
  - sem `nginx`
  - sem service `systemd` do projeto
- Estado atual:
  - existe execucao local em modo desenvolvimento nas portas `4000` e `5173`
  - nao existe configuracao de producao instalada
- Pre-requisitos faltantes para deploy guiado pelo repositório:
  - privilegio sudo interativo ou root
  - `nginx`
  - `curl`
  - criacao de `/etc/noctification/api.env`
  - criacao de service `systemd`
- Risco principal:
  - qualquer deploy de producao pode conflitar com a stack dev atual escutando nas mesmas portas.

## Status desta etapa

- Diagnostico da VM: concluido com evidencia.
- Deploy: bloqueado por falta de sudo nao interativo e por conflito com processos dev ativos.
