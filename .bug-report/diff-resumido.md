# Diff Resumido

## `package.json` / `package-lock.json` / `apps/api/package.json`

- Motivo: adicionar workspace, scripts e dependencias do modulo KML/KMZ.
- Risco: baixo a medio, restrito a instalacao/build/test.
- Validacao associada: `npm install`, `npm run typecheck`, `npm run test`, `npm run build`.

## `packages/poste-kml-core/*`

- Motivo: criar o core compartilhado de parsing, padronizacao e testes.
- Risco: medio, por introduzir nova logica de dominio.
- Validacao associada: testes do pacote e build do workspace.

## `apps/api/src/config.ts`, `apps/api/src/app.ts`, `apps/api/src/modules/kml-postes/routes.ts`

- Motivo: habilitar flag de backend e expor endpoint admin `kml-postes`.
- Risco: medio, por tocar bootstrap e roteamento.
- Validacao associada: typecheck, testes da API e build da API.

## `apps/web/src/App.tsx`, `apps/web/src/components/AdminDashboard.tsx`, `apps/web/src/components/admin/AdminSidebar.tsx`, `apps/web/src/components/app/appShell.tsx`

- Motivo: integrar a nova rota administrativa sem quebrar navegacao existente.
- Risco: medio, por tocar shell e dashboard.
- Validacao associada: suite web completa.

## `apps/web/src/features/kml-postes/*`, `apps/web/src/lib/api.ts`, `apps/web/src/lib/featureFlags.ts`

- Motivo: adicionar UI, client HTTP e feature flag do frontend.
- Risco: baixo a medio.
- Validacao associada: typecheck, testes web e build Vite.

## `.env` / `.env.example`

- Motivo: registrar as flags obrigatorias da feature.
- Risco: baixo.
- Validacao associada: leitura do config e navegacao condicionada por flag.
