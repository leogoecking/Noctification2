# 02 - Plano de analise

## Ordem de execucao

1. Reconhecer a estrutura do monorepo e as ferramentas realmente disponíveis.
2. Localizar entrypoints, módulos mais extensos e áreas com alta concentração de lógica.
3. Ler arquivos centrais das áreas `tasks`, `apr`, `admin`, `reminders` e `operations-board`.
4. Executar validações de qualidade já existentes:
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
5. Correlacionar evidências de complexidade estrutural com sinais dinâmicos de instabilidade.
6. Priorizar somente refatorações com forte justificativa e baixo risco incremental.

## Ferramentas escolhidas

- `find`:
  - Motivo: mapear estrutura sem `rg`.
  - Escopo: workspaces, configs, arquivos fonte.
  - Confiabilidade: alta.
  - Achados esperados: layout real do monorepo.
- `sed`:
  - Motivo: ler entrypoints, serviços e painéis.
  - Escopo: hotspots identificados por volume e centralidade.
  - Confiabilidade: alta.
  - Achados esperados: acoplamento, mistura de responsabilidades e fronteiras fracas.
- `wc -l`:
  - Motivo: localizar hotspots por tamanho.
  - Escopo: `.ts` e `.tsx` de `apps/` e `packages/`.
  - Confiabilidade: média.
  - Achados esperados: candidatos a refatoração, nunca prova isolada.
- `npm run lint`:
  - Motivo: validar higiene sintática/estática.
  - Escopo: todos os workspaces.
  - Confiabilidade: média.
  - Achados esperados: problemas de consistência e code smell detectáveis por regra.
- `npm run typecheck`:
  - Motivo: validar integridade de tipos e contratos internos.
  - Escopo: todos os workspaces.
  - Confiabilidade: alta.
  - Achados esperados: quebras de contratos e drift estrutural.
- `npm test`:
  - Motivo: separar complexidade estável de complexidade já degradando comportamento/testabilidade.
  - Escopo: core, api, web.
  - Confiabilidade: alta.
  - Achados esperados: falhas reais e áreas com baixa previsibilidade de efeitos.

## Modulos prioritarios

1. `apps/web/src/features/apr`
2. `apps/web/src/components/AdminDashboard.tsx` e `apps/web/src/features/tasks`
3. `apps/web/src/App.tsx` e `apps/web/src/components/app/appShell.tsx`
4. `apps/api/src/routes/reminders-me.ts` e `apps/api/src/routes/operations-board-me.ts`
5. `apps/api/src/modules/tasks/application/*`
6. `apps/api/src/modules/apr/service.ts`

## Risco previsto

- Risco de regressão alto se houver refatoração ampla de frontend admin/APR.
- Risco moderado em backend tasks/APR se houver extração incremental preservando contratos.
- Risco baixo ao começar por extração de hooks, services, query builders e test helpers.

## Limitacoes

- Sem `rg`, a busca foi mais custosa, porém suficiente.
- Sem ambiente de browser real, a validação UI se limitou à suíte de testes.
- Não foi executado benchmark de performance nem profiling.
