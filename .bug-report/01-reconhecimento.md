# 01 - Reconhecimento do Repositório

## Visão estrutural

- Tipo: monorepo npm workspaces.
- Workspaces detectados:
  - `apps/api`
  - `apps/web`
- Pastas relevantes:
  - `apps/api/src`
  - `apps/api/migrations`
  - `apps/web/src`
  - `docs`
  - `ops`

## Stack detectada

### Backend

- Linguagem: TypeScript
- Runtime: Node.js
- Framework HTTP: Express
- Banco: SQLite via `better-sqlite3`
- Realtime: Socket.IO
- Push: `web-push`
- Testes: Vitest + Supertest
- Lint: ESLint
- Typecheck: TypeScript `tsc --noEmit`

### Frontend

- Linguagem: TypeScript
- UI: React 18
- Build/dev server: Vite
- Estilo: Tailwind CSS
- Testes: Vitest + Testing Library + JSDOM
- Lint: ESLint
- Typecheck: TypeScript `tsc --noEmit`

## Entrypoints confirmados

### API

- Bootstrap HTTP: `apps/api/src/index.ts`
- App Express: `apps/api/src/app.ts`
- Socket: `apps/api/src/socket.ts`
- Rotas:
  - `apps/api/src/routes/auth.ts`
  - `apps/api/src/routes/admin.ts`
  - `apps/api/src/routes/me.ts`
  - `apps/api/src/routes/reminders-admin.ts`
  - `apps/api/src/routes/reminders-me.ts`
  - `apps/api/src/routes/tasks-admin.ts`
  - `apps/api/src/routes/tasks-me.ts`

### Web

- Entry: `apps/web/src/main.tsx`
- Shell principal: `apps/web/src/App.tsx`

## Infra e automação

- CI detectada: `.github/workflows/main.yml`
- Jobs principais:
  - verificação de arquivos proibidos
  - lint
  - typecheck
  - `npm audit`
  - testes API
  - testes Web

## Ferramentas disponíveis e indisponíveis

- Disponíveis: `npm`, `node`, `git`, `sqlite3`
- Indisponíveis: `rg`, `docker`

## Áreas de maior risco observadas

- Contratos de runtime do frontend (`apps/web/src/lib/runtimeUrls.ts`, `apps/web/src/main.tsx`)
- Scripts raiz e fluxo local de validação (`package.json`)
- Integração Web Push (`apps/api/src/routes/me.ts`, `apps/web/src/lib/api.ts`)

## Estratégia proposta

1. Validar integridade global com lint, typecheck e testes.
2. Correlacionar qualquer falha com código.
3. Como a base passou, procurar bugs reproduzíveis por inspeção dirigida em áreas sensíveis.
4. Separar bug confirmado de risco potencial e erro de configuração.
