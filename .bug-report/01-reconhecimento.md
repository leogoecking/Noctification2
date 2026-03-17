# Reconhecimento do repositorio

## Visao estrutural

- Tipo: monorepo npm workspaces.
- Workspaces:
  - `apps/api`: API Express + Socket.IO + SQLite.
  - `apps/web`: frontend React + Vite.
- Pastas de suporte:
  - `apps/api/migrations`: migracoes SQL.
  - `ops/`: scripts de deploy, nginx, systemd e cron.
  - `.github/workflows/main.yml`: CI de seguranca, lint, typecheck, audit e testes.

## Stack detectada

- Runtime principal: Node.js.
- Linguagens: TypeScript no backend e frontend.
- Backend:
  - Express
  - Socket.IO
  - better-sqlite3
  - bcryptjs
  - jsonwebtoken
- Frontend:
  - React 18
  - Vite
  - Tailwind CSS
  - socket.io-client
- Qualidade:
  - ESLint
  - TypeScript (`tsc`)
  - Vitest
  - React Testing Library

## Ferramentas disponiveis

- Confirmadas no ambiente: `node`, `npm`, `npx`, `git`, `find`, `sed`.
- Disponiveis via dependencias locais/scripts: `tsc`, `eslint`, `vite`, `vitest`.
- Indisponivel: `rg`.
- Restricao relevante: sem necessidade de rede para a analise executada.

## Entrypoints

- API:
  - `apps/api/src/index.ts`
  - `apps/api/src/app.ts`
  - routers principais:
    - `apps/api/src/routes/auth.ts`
    - `apps/api/src/routes/admin.ts`
    - `apps/api/src/routes/me.ts`
    - `apps/api/src/routes/reminders-admin.ts`
    - `apps/api/src/routes/reminders-me.ts`
- Realtime:
  - `apps/api/src/socket.ts`
- Scheduler:
  - `apps/api/src/reminders/scheduler.ts`
- Frontend:
  - `apps/web/src/main.tsx`
  - `apps/web/src/App.tsx`

## Modulos criticos

- Autenticacao e sessao por cookie.
- Entrega e leitura de notificacoes.
- Compatibilidade entre `response_status` legado e `operational_status`.
- Scheduler e recorrencia de lembretes.
- Integracao frontend/socket para eventos em tempo real.

## Areas de maior risco

- Compatibilidade de dados legados em `notification_recipients`.
- Regras de agendamento baseadas em `last_scheduled_for`.
- Fluxos de mutacao com efeitos colaterais em realtime e auditoria.

## Estrategia proposta para analise

1. Validar lint, typecheck, testes e build para detectar regressao objetiva.
2. Revisar manualmente modulos criticos com foco em estado legado, scheduler e integracao.
3. Reproduzir cenarios minimos quando houver suspeita concreta de bug.
