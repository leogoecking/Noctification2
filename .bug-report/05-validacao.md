# Fase 6 - Validacao das correcoes

## Validacoes executadas

### Rodada funcional manual por HTTP

- Frontend servido localmente em `http://127.0.0.1:5173` durante a rodada:
  - `GET /` -> `200 OK`, HTML principal do Vite entregue com `#root`, manifesto e bootstrap React.
- API acessivel em `http://127.0.0.1:4000/api/v1`:
  - `GET /health` -> `200 OK`
  - `POST /auth/login` como admin -> `200 OK`, cookie `nc_access`
  - `GET /auth/me` como admin -> `200 OK`
  - `POST /auth/register` para usuario novo -> `201 Created`, cookie `nc_access`
  - `GET /auth/me` como usuario -> `200 OK`
  - `GET /admin/users` -> `200 OK`
  - `POST /admin/notifications` -> `201 Created`
  - `GET /me/notifications?status=unread` -> `200 OK`
  - `POST /me/notifications/{id}/respond` -> `200 OK`
  - `POST /me/tasks` -> `201 Created`
  - `PATCH /me/tasks/{id}` -> `200 OK`
  - `POST /me/tasks/{id}/comments` -> `201 Created`
  - `POST /me/tasks/{id}/complete` -> `200 OK`
  - `GET /me/tasks?status=done` -> `200 OK`
  - `POST /me/reminders` -> `201 Created`
  - `PATCH /me/reminders/{id}` -> `200 OK`
  - `PATCH /me/reminders/{id}/toggle` -> `200 OK`
  - `GET /me/reminders` -> `200 OK`
  - `GET /admin/reminders/health` -> `200 OK`

### Pacote compartilhado

- `npm run typecheck --workspace @noctification/apr-core` -> passou
- `npm run test --workspace @noctification/apr-core` -> 3 arquivos / 9 testes passaram

### API

- `npm run typecheck --workspace @noctification/api` -> passou
- `npm run test --workspace @noctification/api` -> 15 arquivos passaram, 1 arquivo com 14 testes skipados
- `npm run lint --workspace @noctification/api` -> falhou antes da correcao, passou depois

### Web

- `npm run typecheck --workspace @noctification/web` -> passou
- `npm run lint --workspace @noctification/web` -> passou
- `npm run test --workspace @noctification/web` -> falhou antes da correcao em `src/App.test.tsx`, passou depois com 17 arquivos / 94 testes

### Validacao agregada

- `npm run lint` -> passou
- `npm run typecheck` -> passou
- `npm run test` -> passou

## O que nao foi validado

- Nao executei browser real com interacao visual da UI nem fluxo de service worker/web push em navegador real.
- Nao validei deploy Debian/nginx/systemd durante esta rodada.
- A API em `:4000` ja estava ocupada antes da subida manual; a rodada HTTP validou a instancia existente que expunha o contrato esperado do projeto.
