# Noctification2

Sistema interno de notificações com:

- `apps/api`: Express + Socket.IO + SQLite
- `apps/web`: React + Vite

## Subir com um comando

Na raiz do projeto:

```bash
./run.sh
```

O script faz o necessário para desenvolvimento local:

- instala dependências
- cria `apps/api/.env` e `apps/web/.env` se não existirem
- aplica migrações do banco
- garante o admin fixo
- sobe API e frontend juntos

## Endereços

- frontend: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:4000`

Se você abrir apenas na própria máquina, prefira `127.0.0.1` ou `localhost`.

Para acesso por outros dispositivos na mesma rede, nao use `http://IP_DA_VM` se o objetivo inclui notificacoes nativas do navegador. Use um hostname local em HTTPS, por exemplo:

- frontend: `https://noctification.lan`
- API: `https://noctification.lan/api/v1`

No dev com Vite em `:5173`, o frontend resolve a API e o Socket.IO usando o mesmo host da página na porta `4000`.
Quando servido pelo `nginx`, sem `VITE_API_BASE` e `VITE_SOCKET_URL`, o frontend usa o mesmo `origin` da página e aproveita o proxy reverso de `/api` e `/socket.io`.

## HTTPS local para rede interna

Para notebooks, navegadores desktop e celulares na mesma rede, a base recomendada agora e:

1. escolher um hostname local fixo, por exemplo `noctification.lan`
2. apontar esse hostname para o IP da maquina no DNS local ou no arquivo `hosts` dos dispositivos
3. servir o app via `nginx` em `https://noctification.lan`
4. instalar um certificado local confiavel nos dispositivos que vao acessar o sistema

O template de `nginx` em [`ops/nginx/noctification.conf`](ops/nginx/noctification.conf) ja foi ajustado para esse modelo e espera:

- certificado: `/etc/noctification/certs/noctification.lan.pem`
- chave privada: `/etc/noctification/certs/noctification.lan-key.pem`

Se voce nao tiver `mkcert`, o repositorio agora inclui um script usando `openssl`:

```bash
bash ops/scripts/generate-local-certs.sh
```

Ele gera em `.deploy/certs/`:

- `local-root-ca.pem`
- `noctification.lan.pem`
- `noctification.lan-key.pem`

Depois:

1. instale `local-root-ca.pem` como CA confiavel nos notebooks/celulares que vao acessar o sistema
2. aponte `noctification.lan` para o IP da maquina no DNS local ou no arquivo `hosts`
3. copie `noctification.lan.pem` e `noctification.lan-key.pem` para `/etc/noctification/certs/`
4. valide com `nginx -t` e recarregue o nginx

Em Linux/macOS/Windows desktop, o passo critico e confiar a CA raiz.
Em celular, o passo critico e importar a mesma CA raiz para o armazenamento de certificados do aparelho.

Sem HTTPS local confiavel, o navegador pode continuar bloqueando notificacoes nativas fora de `localhost`.

## PWA base

O frontend agora inclui base PWA:

- `manifest.webmanifest`
- `service worker` em `/sw.js`
- registro automatico do worker em contexto compativel (`https` ou `localhost`)

Essa etapa prepara o projeto para a proxima fase de `Web Push`, mantendo o modelo atual de `Socket.IO` para a interface aberta.

## Login inicial

Admin local de desenvolvimento:

- login: `admin`
- senha: `admin`

Usuários comuns podem ser criados pela tela de cadastro em `/login`.

Para ambientes fora de desenvolvimento, ajuste [`apps/api/.env.example`](apps/api/.env.example) como base:

- defina `ADMIN_LOGIN`, `ADMIN_PASSWORD` e `ADMIN_NAME`
- use `ALLOW_INSECURE_FIXED_ADMIN=false`
- use `COOKIE_SECURE=true` quando houver HTTPS
- use `COOKIE_SECURE=false` apenas em deploy HTTP controlado
- controle a ativacao de lembretes com `ENABLE_REMINDER_SCHEDULER`
- a timezone operacional dos lembretes e fixa em `America/Bahia`

## Fluxo disponível

Usuário:

- cadastro e login
- notificações em tempo real
- badge de não lidas
- dropdown com últimas notificações
- página completa de notificações
- filtro por lidas e não lidas
- marcar individualmente como lida
- marcar todas como lidas
- responder notificação com status operacional

Administrador:

- login em `/admin/login`
- listagem de usuários
- envio de notificações para múltiplos usuários
- envio para `all` restrito a usuários comuns ativos
- acompanhamento de leitura e auditoria

## Comandos úteis

Instalação:

```bash
npm install
```

Bootstrap manual:

```bash
npm run setup
```

Subir em desenvolvimento:

```bash
npm run dev
```

Checks:

```bash
npm run typecheck
npm run test
npm run test:web
npm run build
```

Auditoria de logins legados:

```bash
npm run audit-logins --workspace @noctification/api
```

O script nao altera dados. Ele lista colisoes de `login` por `LOWER(login)` e retorna codigo de saida `2` quando encontra conflito.

## Rollout seguro de lembretes

Para subir lembretes em producao com baixo risco:

1. aplique as migrations novas com o scheduler desligado
2. suba a API com `ENABLE_REMINDER_SCHEDULER=false`
3. valide:
   - CRUD de lembretes
   - painel do usuario
   - painel admin
   - logs e saude operacional de lembretes
   - timezone fixa `America/Bahia` refletida corretamente na criacao/edicao
4. depois habilite `ENABLE_REMINDER_SCHEDULER=true`
5. monitore expiracoes, retries e disparos no painel admin

Isso permite rollback simples:

- ocultar a feature no frontend se necessario
- voltar `ENABLE_REMINDER_SCHEDULER=false`
- preservar tabelas e historico sem afetar notificacoes existentes

## Debian

Requisitos:

- Node.js 20+
- npm 10+

O fluxo validado no Debian para desenvolvimento é:

```bash
./run.sh
```

Para deploy único em VM Debian, o caminho preferido agora é:

```bash
sudo APP_ROOT="$(pwd)" bash ops/scripts/deploy-debian.sh
```

Se o projeto estiver clonado em outro caminho, basta ajustar `APP_ROOT` para o diretório real do clone.

Para preparar uma instalacao local/LAN a partir da pasta atual do clone, use:

```bash
npm run prepare:local-lan
```

Guia operacional geral:

- [`docs/local-lan-operational-guide.md`](docs/local-lan-operational-guide.md)

Para serviço de sistema, os exemplos estão em [`ops/systemd`](ops/systemd).
Para deploy permanente em VM Debian com `systemd` + `nginx`, consulte [`docs/debian-vm-deploy.md`](docs/debian-vm-deploy.md).

### Atualizar uma VM ja em producao

Se a aplicacao ja esta rodando na VM e voce so quer publicar atualizacoes de codigo com o fluxo seguro validado neste projeto, use:

```bash
bash ops/scripts/update-vm-safe.sh
```

O script executa este procedimento:

1. mostra `git status --short`
2. faz `git pull`
3. roda `npm install`
4. roda `npm run build`
5. aplica migrations da API
6. roda `systemctl daemon-reload`
7. reinicia `noctification-api`
8. valida `systemctl status`
9. consulta `http://127.0.0.1:4000/api/v1/health`
10. valida `nginx -t`
11. recarrega o Nginx
12. orienta hard refresh no navegador

Observacoes:

- o script assume que o servico da API se chama `noctification-api`
- para outro nome de servico:

```bash
SERVICE_NAME=meu-servico bash ops/scripts/update-vm-safe.sh
```

- para outro endpoint de health:

```bash
API_HEALTH_URL=http://127.0.0.1:4000/api/v1/health bash ops/scripts/update-vm-safe.sh
```

- ele usa `sudo` para `systemctl` e `nginx`, entao o usuario precisa ter permissao
- se voce tiver alterado unit do `systemd`, configuracao do Nginx ou env de producao, este script continua valido para recarregar, mas nesses casos vale revisar tambem o fluxo completo em [`.deploy/README.md`](.deploy/README.md)

## Estrutura

- [`apps/api/migrations`](apps/api/migrations): migrações SQL
- [`apps/api/src`](apps/api/src): API, auth, realtime e scripts
- [`apps/web/src`](apps/web/src): frontend React
- [`ops/scripts/update-vm-safe.sh`](ops/scripts/update-vm-safe.sh): atualizacao segura de uma VM ja em producao
- [`ops/systemd`](ops/systemd): exemplos de serviço
- [`ops/nginx`](ops/nginx): exemplo de vhost para frontend e proxy da API
- [`docs/debian-vm-deploy.md`](docs/debian-vm-deploy.md): passo a passo de deploy em VM Debian

## Observações

- o admin fixo `admin/admin` continua disponível para desenvolvimento local, mas agora deve ser tratado como configuração insegura explícita
- o banco SQLite fica no contexto da API, respeitando a configuração de `DB_PATH`
- os scripts de migração e bootstrap agora funcionam independentemente do diretório em que forem executados
