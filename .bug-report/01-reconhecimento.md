# Fase 1 - Reconhecimento do repositorio

## Visao estrutural

- Tipo de repositorio: monorepo Node.js/TypeScript com workspaces npm.
- Workspaces detectados:
  - `apps/api`
  - `apps/web`
  - `packages/apr-core`
- Pastas de apoio relevantes:
  - `docs/`
  - `ops/`
  - `scripts/`
  - `.github/workflows/`

## Stack detectada com evidencia

- Runtime principal: Node.js.
  Evidencia: scripts com `node`, `tsx` e `vite` em `package.json`.
- Gerenciador de pacotes: npm workspaces.
  Evidencia: campo `workspaces` na raiz e `package-lock.json`.
- Backend: Express + Socket.IO + SQLite (`better-sqlite3`).
  Evidencia: [`apps/api/package.json`](/home/leo/Noctification2/apps/api/package.json), [`apps/api/src/app.ts`](/home/leo/Noctification2/apps/api/src/app.ts), [`apps/api/src/index.ts`](/home/leo/Noctification2/apps/api/src/index.ts).
- Frontend: React 18 + Vite + TypeScript.
  Evidencia: [`apps/web/package.json`](/home/leo/Noctification2/apps/web/package.json), [`apps/web/src/main.tsx`](/home/leo/Noctification2/apps/web/src/main.tsx), [`apps/web/vite.config.ts`](/home/leo/Noctification2/apps/web/vite.config.ts).
- Pacote compartilhado: biblioteca TypeScript `@noctification/apr-core`.
  Evidencia: [`packages/apr-core/package.json`](/home/leo/Noctification2/packages/apr-core/package.json).
- Test runner: Vitest em API, web e pacote compartilhado.
- Lint: ESLint com `@typescript-eslint` e `react-hooks`.
- Typecheck: `tsc --noEmit` e build TypeScript por workspace.
- CI: GitHub Actions com lint, typecheck, testes, auditoria e verificacoes de seguranca.
  Evidencia: [`.github/workflows/main.yml`](/home/leo/Noctification2/.github/workflows/main.yml).

## Ferramentas disponiveis e indisponiveis

- Disponiveis: `git`, `node`, `npm`, `sqlite3`, `python3`.
- Indisponiveis confirmadas: `rg`, `pnpm`, `yarn`, `bun`, `docker`, `docker-compose`, `pytest`, `cargo`, `go`, `javac`, `mvn`, `gradle`.

## Pontos de entrada

- API HTTP:
  - [`apps/api/src/index.ts`](/home/leo/Noctification2/apps/api/src/index.ts)
  - Healthcheck em `/api/v1/health`
- Composicao da API:
  - [`apps/api/src/app.ts`](/home/leo/Noctification2/apps/api/src/app.ts)
- Frontend:
  - [`apps/web/src/main.tsx`](/home/leo/Noctification2/apps/web/src/main.tsx)
  - [`apps/web/src/App.tsx`](/home/leo/Noctification2/apps/web/src/App.tsx)
- Scripts operacionais:
  - `scripts/setup.cjs`
  - `scripts/dev.cjs`
  - `scripts/prepare-deploy.cjs`
  - `scripts/prepare-local-lan.cjs`
  - `ops/scripts/*.sh`

## Estrutura funcional relevante

- API:
  - autenticacao e sessao
  - notificacoes admin/me
  - reminders
  - tasks e automacao
  - APR
  - web push
  - testes integrados em `apps/api/src/test`
- Web:
  - login
  - dashboard admin
  - dashboard do usuario
  - notificacoes, reminders e tasks
  - feature APR
  - hooks de socket e web push
- Core:
  - normalizacao/importacao/comparacao APR

## Infra e automacao

- Workflow CI com:
  - varredura de arquivos sensiveis
  - busca de segredos hardcoded
  - `npm ci`
  - lint
  - typecheck
  - `npm audit`
  - testes API
  - testes web
- Templates e scripts de deploy Debian, nginx, systemd, backup e certificados locais.

## Modulos criticos e areas de maior risco

- [`apps/api/src/routes/auth.ts`](/home/leo/Noctification2/apps/api/src/routes/auth.ts) e helpers correlatos.
  Motivo: autenticacao, sessao, controle de acesso.
- [`apps/api/src/routes/me.ts`](/home/leo/Noctification2/apps/api/src/routes/me.ts) e [`apps/api/src/routes/admin.ts`](/home/leo/Noctification2/apps/api/src/routes/admin.ts).
  Motivo: superficie principal da API.
- Modulos `reminders`, `tasks` e `socket*`.
  Motivo: logica de estado, scheduler e eventos em tempo real.
- Modulo APR (`apps/api/src/modules/apr`, `apps/web/src/features/apr`, `packages/apr-core/src`).
  Motivo: integracao multiworkspace e regras de dominio.
- Hooks e runtime URLs do frontend.
  Motivo: acoplamento com API/socket e chance de regressao de ambiente.

## Estrategia proposta para analise

1. Validar primeiro o pacote compartilhado `packages/apr-core`, porque ele influencia API e web.
2. Rodar `typecheck`, `lint` e testes por workspace, registrando falhas com evidencias brutas.
3. Correlacionar qualquer falha com leitura direcionada do modulo afetado.
4. Inspecionar manualmente modulos criticos mesmo se a automacao passar, buscando inconsistencias logicas demonstraveis.
5. Corrigir apenas bugs confirmados com baixo risco de regressao e validacao objetiva.
