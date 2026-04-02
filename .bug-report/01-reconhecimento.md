# 01 - Reconhecimento do repositorio

## Visao estrutural

- Tipo: monorepo npm workspaces.
- Workspaces detectados:
  - `apps/api`
  - `apps/web`
  - `packages/apr-core`
  - `packages/poste-kml-core`

## Stack detectada

- Backend:
  - Node.js
  - Express
  - Better SQLite3
  - Socket.IO
  - TypeScript
  - Vitest
  - ESLint
- Frontend:
  - React 18
  - Vite
  - TypeScript
  - Vitest
  - Testing Library
  - Tailwind CSS
- Pacotes compartilhados:
  - `packages/apr-core`
  - `packages/poste-kml-core`

## Ferramentas e automacao

- Package manager efetivo: `npm` com `package-lock.json`.
- CI: `.github/workflows/main.yml`.
- Scripts principais no root:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
- Scripts auxiliares em `scripts/` e `ops/`.

## Entrypoints

- API:
  - `apps/api/src/index.ts`
  - `apps/api/src/app.ts`
- Web:
  - `apps/web/src/main.tsx`
  - `apps/web/src/App.tsx`
- Modulos principais:
  - `apps/api/src/modules/tasks`
  - `apps/api/src/modules/apr`
  - `apps/api/src/routes/reminders-*`
  - `apps/api/src/routes/operations-board-me.ts`
  - `apps/web/src/components/AdminDashboard.tsx`
  - `apps/web/src/features/tasks`
  - `apps/web/src/features/apr`

## Estrategia de testes existente

- Core packages:
  - `apr-core`: testes unitários presentes.
  - `poste-kml-core`: testes unitários presentes.
- API:
  - rota, integração e migração em `apps/api/src/test`.
- Web:
  - componentes, hooks e features em `apps/web/src/**.test.tsx`.

## Hotspots por volume

- API:
  - `apps/api/src/modules/apr/service.ts` com 489 linhas.
  - `apps/api/src/modules/tasks/application/metrics.ts` com 407 linhas.
  - `apps/api/src/routes/reminders-me.ts` com 406 linhas.
  - `apps/api/src/routes/operations-board-me.ts` com 399 linhas.
  - `apps/api/src/routes/admin-user-helpers.ts` com 394 linhas.
  - `apps/api/src/modules/tasks/application/service.ts` com 376 linhas.
  - `apps/api/src/modules/tasks/presentation/admin-routes.ts` com 359 linhas.
- Web:
  - `apps/web/src/features/tasks/admin/AdminTasksPanel.tsx` com 824 linhas.
  - `apps/web/src/features/apr/AprPageSections.tsx` com 741 linhas.
  - `apps/web/src/components/admin/adminOverviewSections.tsx` com 650 linhas.
  - `apps/web/src/components/UserDashboard.tsx` com 611 linhas.
  - `apps/web/src/components/AdminDashboard.tsx` com 492 linhas.
  - `apps/web/src/components/app/appShell.tsx` com 482 linhas.
  - `apps/web/src/features/apr/useAprPageController.ts` com 392 linhas.

## Modulos criticos

- Criticos por acoplamento operacional:
  - `tasks` no backend e frontend.
  - `apr` no backend e frontend.
  - `reminders` e `notifications`.
  - `admin dashboard` e realtime.
- Criticos por centralizacao de responsabilidades:
  - `apps/web/src/App.tsx`
  - `apps/web/src/components/AdminDashboard.tsx`
  - `apps/web/src/features/tasks/admin/AdminTasksPanel.tsx`
  - `apps/web/src/features/apr/useAprPageController.ts`
  - `apps/api/src/routes/reminders-me.ts`
  - `apps/api/src/routes/operations-board-me.ts`
  - `apps/api/src/modules/tasks/application/metrics.ts`
  - `apps/api/src/modules/apr/service.ts`

## Areas de maior risco

- Frontend APR: há falha real de teste e warnings de lifecycle/`act(...)`.
- Dashboard/admin/task UI: painéis extensos com muita orquestração local.
- Rotas API antigas: ainda concentram validação, SQL e regras de negócio na camada HTTP.
- Métricas e serviços de tarefas: regras de SLA, agregação e acesso a dados misturados.

## Estrategia proposta

- Priorizar refatoração em camadas com baixa mudança de comportamento:
  1. Isolar orquestração de tela e navegação.
  2. Separar queries/mutations e regras de domínio da camada HTTP.
  3. Extrair hooks/modelos menores para APR e tarefas.
  4. Reduzir tamanho dos arquivos de teste via fixtures e helpers.
