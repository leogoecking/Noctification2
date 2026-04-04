# 01 - Reconhecimento

## Visao estrutural

- Tipo de repositorio: monorepo npm workspaces
- Workspaces detectados:
  - `apps/api`
  - `apps/web`
  - `packages/apr-core`
  - `packages/poste-kml-core`

## Stack detectada

- Backend:
  - Node.js
  - TypeScript
  - Express
  - Socket.IO
  - `better-sqlite3`
  - `vitest`
- Frontend:
  - React 18
  - Vite 6
  - TypeScript
  - `vitest`
  - Testing Library
- Qualidade:
  - `eslint`
  - `tsc --noEmit`
- CI:
  - `.github/workflows/main.yml` executa validacoes de repositorio, lint, typecheck, testes e `npm audit`

## Ferramentas disponiveis e indisponiveis

- Disponiveis: `git`, `node`, `npm`, `npx`, `python3`
- Indisponiveis: `rg`, `pnpm`, `docker`, `docker-compose`, `pytest`

## Entrypoints

- API:
  - `apps/api/src/index.ts`
  - `apps/api/src/app.ts`
- Frontend:
  - `apps/web/src/main.tsx`
  - `apps/web/src/App.tsx`
- Scripts relevantes:
  - `scripts/dev.cjs`
  - `scripts/setup.cjs`
  - `ops/scripts/*`

## Estrategia de testes existente

- API:
  - testes integrados e de rotas em `apps/api/src/test/*.test.ts`
- Web:
  - testes de componentes, hooks e libs em `apps/web/src/**/*.test.ts(x)`
- Core packages:
  - testes unitarios em `packages/*/src/*.test.ts`

## Modulos criticos observados

- `apps/web/src/components/ReminderUserPanel.tsx`
- `apps/web/src/components/OperationsBoardRail.tsx`
- `apps/api/src/reminders/me-route-helpers.ts`
- `apps/api/src/reminders/route-helpers.ts`
- `apps/api/src/modules/tasks/*` como referencia de modularizacao mais recente

## Areas de maior risco

- Frontend de lembretes:
  - concentracao elevada de estado, renderizacao, parsing e transformacoes no mesmo arquivo
- Operations board:
  - arquivo unico muito grande e sem teste dedicado adjacente
- Backend de lembretes:
  - helpers extensos com SQL inline e responsabilidades mistas

## Estrategia proposta para analise

1. Priorizar arquivos muito grandes com sinais de multiplas responsabilidades.
2. Escolher o alvo com melhor cobertura de testes para uma primeira refatoracao segura.
3. Executar validacao focada antes e depois da mudanca.
4. Documentar os proximos alvos sem expandir o escopo nesta rodada.

## Atualizacao 2026-04-04

## Visao estrutural atual

- Tipo de repositorio: monorepo npm workspaces
- Workspaces detectados por `package.json` raiz:
  - `apps/api`
  - `apps/web`
  - `packages/apr-core`
  - `packages/poste-kml-core`
- Infra e automacao detectadas:
  - workflow CI em `.github/workflows/main.yml`
  - scripts operacionais em `ops/scripts/*`
  - arquivos de systemd em `ops/systemd/*`
  - configuracao nginx em `ops/nginx/noctification.conf`

## Stack detectada com evidencia atual

- Backend:
  - Node.js + TypeScript
  - Express
  - Socket.IO
  - SQLite via `better-sqlite3`
  - `vitest` e `supertest`
- Frontend:
  - React 18
  - Vite 6
  - TypeScript
  - Testing Library + `vitest`
- Bibliotecas compartilhadas:
  - `packages/apr-core`
  - `packages/poste-kml-core`
- Qualidade:
  - `eslint`
  - `tsc --noEmit`
  - testes por workspace

## Ferramentas disponiveis e indisponiveis na rodada atual

- Disponiveis:
  - `git`
  - `node`
  - `npm`
  - `jq`
  - `sqlite3`
  - `python3`
- Indisponiveis:
  - `rg`
  - `pnpm`
  - `docker`
  - `docker-compose`
  - `pytest`

## Entrypoints e modulos criticos atuais

- API:
  - `apps/api/src/index.ts`
  - `apps/api/src/app.ts`
  - `apps/api/src/routes/*.ts`
  - `apps/api/src/modules/tasks/**`
  - `apps/api/src/reminders/**`
- Frontend:
  - `apps/web/src/main.tsx`
  - `apps/web/src/App.tsx`
  - `apps/web/src/components/**`
  - `apps/web/src/features/**`
- Pacotes compartilhados:
  - `packages/apr-core/src/index.ts`
  - `packages/poste-kml-core/src/index.ts`

## Areas de maior risco observadas nesta rodada

- `apps/api/src/modules/tasks/**`:
  - concentracao alta de arquivos alterados localmente em rotas, servico e infraestrutura
- `apps/api/src/routes/**` e `apps/api/src/reminders/**`:
  - rotas auxiliares em processo de modularizacao, com maior risco de quebra de importacao ou contrato
- `apps/web/src/components/admin/**`, `apps/web/src/components/app/**` e `apps/web/src/features/apr/**`:
  - muitas mudancas simultaneas, com risco de regressao de props, estado e roteamento

## Estrategia proposta para analise desta rodada

1. Registrar o estado atual e preservar os artefatos anteriores.
2. Rodar validacoes automaticas de alto sinal e menor custo primeiro.
3. Correlacionar falhas com o worktree atual, sem assumir que todo problema e um bug historico.
4. Corrigir apenas itens confirmados, localizados e de baixo risco de conflito com a refatoracao em curso.
