# 02 - Plano de Analise

## Ordem de execucao

1. Ler `PATCH_PARA_CODEX_KML_MODULE.md`.
2. Mapear stack real do monorepo e divergencias com o patch.
3. Integrar backend, frontend e pacote compartilhado.
4. Ajustar flags e dependencias.
5. Validar com `npm install`, `npm run typecheck`, `npm run test` e `npm run build`.

## Ferramentas escolhidas

- `find` / `grep` / `sed`
  - Motivo: reconhecimento do repositorio e leitura de arquivos.
  - Escopo: estrutura, imports, scripts e mocks de teste.
  - Confiabilidade esperada: alta.
  - Tipo de achado esperado: integracoes existentes, pontos de conflito e arquivos alvo.

- `npm install`
  - Motivo: instalar dependencias novas do modulo.
  - Escopo: raiz do monorepo.
  - Confiabilidade esperada: alta.
  - Tipo de achado esperado: dependencias ausentes e lockfile atualizado.

- `npm run typecheck`
  - Motivo: validar integracao entre workspaces.
  - Escopo: api, web, apr-core e poste-kml-core.
  - Confiabilidade esperada: alta.
  - Tipo de achado esperado: erros de contrato, importacao e mocks.

- `npm run test`
  - Motivo: validar regressao funcional.
  - Escopo: workspaces core, api e web.
  - Confiabilidade esperada: alta.
  - Tipo de achado esperado: regressao de navegacao, mocks quebrados, algoritmo KML.

- `npm run build`
  - Motivo: garantir artefatos compilaveis de producao.
  - Escopo: api e web, com build dos pacotes compartilhados.
  - Confiabilidade esperada: alta.
  - Tipo de achado esperado: problemas finais de compilacao.

## Modulos prioritarios

- `packages/poste-kml-core`
- `apps/api/src/modules/kml-postes/routes.ts`
- `apps/api/src/app.ts`
- `apps/api/src/config.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/components/AdminDashboard.tsx`
- `apps/web/src/components/admin/AdminSidebar.tsx`
- `apps/web/src/components/app/appShell.tsx`

## Risco previsto

- Medio: a feature cruza backend, frontend, testes e scripts de workspace.

## Limitacoes

- Testes HTTP com `listen` nao sao confiaveis no sandbox atual.
