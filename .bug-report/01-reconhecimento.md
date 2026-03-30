# 01 - Reconhecimento

## Visao estrutural do repositorio

- Tipo: monorepo npm workspaces.
- Workspaces detectados:
  - `apps/api`
  - `apps/web`
  - `packages/apr-core`
  - `packages/poste-kml-core` (novo nesta rodada)

## Stack detectada

- Backend: Node.js + TypeScript + Express + better-sqlite3 + socket.io + Vitest.
- Frontend: React 18 + Vite + TypeScript + Vitest + Testing Library.
- Pacotes compartilhados: `apr-core` e novo `poste-kml-core`.
- Package manager: npm com workspaces.

## Ferramentas disponiveis e indisponiveis

- Disponiveis: `node`, `npm`, `git`, `find`, `grep`, `sed`, `eslint`.
- Indisponivel: `rg`.

## Entrypoints relevantes

- API: `apps/api/src/index.ts`, `apps/api/src/app.ts`
- Frontend: `apps/web/src/main.tsx`, `apps/web/src/App.tsx`
- Shell admin/user: `apps/web/src/components/app/appShell.tsx`
- Dashboard admin: `apps/web/src/components/AdminDashboard.tsx`

## Modulos criticos

- Autenticacao e middlewares do backend.
- Shell de navegacao do frontend.
- Dashboard administrativo e sidebar.
- Novo fluxo de upload/processamento KML/KMZ.

## Areas de maior risco

- Regressao na navegacao admin por causa da nova rota `/kml-postes`.
- Divergencia entre patch fornecido e estrutura atual do repositrio.
- Dependencias novas (`adm-zip`, `@xmldom/xmldom`) e scripts de workspace.

## Estrategia proposta

- Integrar a feature de forma incremental.
- Manter o layout e contratos existentes do monorepo.
- Cobrir o algoritmo central no pacote compartilhado e validar a exposicao do modulo no backend/frontend.
