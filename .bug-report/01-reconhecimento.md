# 01 - Reconhecimento do Repositorio

## Visao estrutural

- Tipo: monorepo npm com multi-app e multi-package.
- Workspaces detectados: `apps/api`, `apps/web`, `packages/apr-core`.
- Documentacao-base: `README.md`.
- CI detectado: `.github/workflows/main.yml`.
- Infra/deploy detectados: `ops/`, `.deploy/`, scripts `deploy-debian`, nginx, systemd, backup de banco.

## Stack detectada

- Linguagem principal: TypeScript.
- Frontend: React 18 + Vite + Vitest + ESLint.
- Backend: Node.js + Express + Socket.IO + SQLite (`better-sqlite3`) + Vitest.
- Build tools: `tsc`, `vite`.
- Package manager: npm com `workspaces`.
- Typecheck: `tsc --noEmit`.
- Test runner: `vitest`.

## Ferramentas disponiveis e indisponiveis

- Disponiveis com evidencia: `npm`, `git`, `find`, `grep`, `sed`, `tsc`, `vitest`.
- Indisponivel com evidencia: `rg` (`/bin/bash: linha 1: rg: comando nao encontrado`).

## Entrypoints relevantes

- Frontend: `apps/web/src/*`, bootstrap Vite.
- Backend: `apps/api/src/index.ts`.
- Modulo alvo desta solicitacao: `apps/web/src/features/apr/AprPage.tsx`.

## Modulos criticos

- APR frontend: importacao, tabela manual, auditoria e historico.
- API de notificacoes/autenticacao.
- Scripts de deploy e configuracao operacional.

## Areas de maior risco

- Fluxos APR com alta densidade de estado local no frontend.
- Integracoes API/frontend que dependem de formatos estaveis.
- Arquivos operacionais em `ops/` e `.deploy/`.

## Estrategia proposta para analise

1. Identificar o componente exato da "Tabela manual".
2. Confirmar o fluxo de dados e o ponto de renderizacao.
3. Implementar paginação local no frontend para evitar mudancas de API.
4. Validar com teste focalizado do componente e `typecheck` do workspace `apps/web`.
