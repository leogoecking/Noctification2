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

Se você abrir de fora da VM, use o IP da máquina:

- frontend: `http://IP_DA_VM:5173`
- API: `http://IP_DA_VM:4000`

O frontend já resolve a API e o Socket.IO usando o mesmo host da página, na porta `4000`, quando `VITE_API_BASE` e `VITE_SOCKET_URL` não são definidos.

## Login inicial

Admin fixo:

- login: `admin`
- senha: `admin`

Usuários comuns podem ser criados pela tela de cadastro em `/login`.

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

## Debian

Requisitos:

- Node.js 20+
- npm 10+

O fluxo validado no Debian para desenvolvimento é:

```bash
./run.sh
```

Para serviço de sistema, os exemplos estão em [`ops/systemd`](/home/leo/Noctification2/ops/systemd).

## Estrutura

- [`apps/api/migrations`](/home/leo/Noctification2/apps/api/migrations): migrações SQL
- [`apps/api/src`](/home/leo/Noctification2/apps/api/src): API, auth, realtime e scripts
- [`apps/web/src`](/home/leo/Noctification2/apps/web/src): frontend React
- [`ops/systemd`](/home/leo/Noctification2/ops/systemd): exemplos de serviço

## Observações

- o admin fixo `admin/admin` é intencional neste ciclo do projeto
- o banco SQLite fica no contexto da API, respeitando a configuração de `DB_PATH`
- os scripts de migração e bootstrap agora funcionam independentemente do diretório em que forem executados
