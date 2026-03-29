# Diff resumido

## [`apps/web/src/lib/featureFlags.ts`](/home/leo/Noctification2/apps/web/src/lib/featureFlags.ts)

- Motivo da mudanca: centralizar leitura da flag APR.
- Risco: baixo.
- Validacao associada: `npm run typecheck --workspace @noctification/web`, `npm run test --workspace @noctification/web`.

## [`apps/web/src/App.tsx`](/home/leo/Noctification2/apps/web/src/App.tsx)

- Motivo da mudanca: remover acoplamento do roteamento APR a constante de modulo.
- Risco: baixo.
- Validacao associada: `npm run typecheck --workspace @noctification/web`, `npm run test --workspace @noctification/web`, `npm run test`.

## [`apps/web/src/components/app/appShell.tsx`](/home/leo/Noctification2/apps/web/src/components/app/appShell.tsx)

- Motivo da mudanca: alinhar navegacao e normalizacao de paths a leitura dinamica da flag APR.
- Risco: baixo.
- Validacao associada: `npm run typecheck --workspace @noctification/web`, `npm run test --workspace @noctification/web`.

## [`apps/web/src/App.test.tsx`](/home/leo/Noctification2/apps/web/src/App.test.tsx)

- Motivo da mudanca: tornar a suite deterministica e independente do `.env` local.
- Risco: baixo.
- Validacao associada: `npm run test --workspace @noctification/web`.

## [`apps/api/src/modules/apr/import.ts`](/home/leo/Noctification2/apps/api/src/modules/apr/import.ts)

- Motivo da mudanca: corrigir quebra de `lint` por import nao utilizado.
- Risco: muito baixo.
- Validacao associada: `npm run lint --workspace @noctification/api`, `npm run lint`.
## Implementacao Fase 1 - 2026-03-29

- [`.gitignore`](/home/leo/Noctification2/.gitignore)
  Motivo: ignorar artefatos `*.tsbuildinfo` e evitar ruido no worktree.
  Risco: baixo.
  Validacao associada: `git rm --cached apps/web/tsconfig.tsbuildinfo`, `npm run lint`, `npm run typecheck`.

- [`.github/workflows/main.yml`](/home/leo/Noctification2/.github/workflows/main.yml)
  Motivo: reduzir reinstalacoes repetidas no CI consolidando qualidade e testes em um unico job.
  Risco: baixo a medio, por reduzir paralelismo mas preservar cobertura.
  Validacao associada: revisao estrutural do workflow; `lint` e `typecheck` locais seguiram verdes.

- [`apps/web/tsconfig.tsbuildinfo`](/home/leo/Noctification2/apps/web/tsconfig.tsbuildinfo)
  Motivo: retirar artefato gerado do controle de versao.
  Risco: baixo.
  Validacao associada: remocao do indice com `git rm --cached`.

## Implementacao Fase 2 parcial - 2026-03-29

- [`package.json`](/home/leo/Noctification2/package.json)
  Motivo: adicionar scripts seletivos por workspace para reduzir custo de validacao local.
  Risco: baixo.
  Validacao associada: `npm run lint`, `npm run typecheck`.

- [`apps/web/src/test/fixtures.ts`](/home/leo/Noctification2/apps/web/src/test/fixtures.ts)
  Motivo: centralizar builders/factories de teste e reduzir repeticao estrutural.
  Risco: baixo.
  Validacao associada: testes web focados nos arquivos alterados.

- [`apps/web/src/components/TaskUserPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/components/TaskUserPanel.test.tsx)
  Motivo: substituir fixtures inline por helpers compartilhados e helper de render.
  Risco: baixo.
  Validacao associada: teste focado passou.

- [`apps/web/src/components/admin/AdminTasksPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/components/admin/AdminTasksPanel.test.tsx)
  Motivo: reduzir duplicacao de fixtures administrativas e helper de render.
  Risco: baixo.
  Validacao associada: teste focado passou.

- [`apps/web/src/components/AdminDashboard.test.tsx`](/home/leo/Noctification2/apps/web/src/components/AdminDashboard.test.tsx)
  Motivo: reaproveitar fixtures e reduzir montagem repetitiva de payloads.
  Risco: baixo.
  Validacao associada: teste focado passou.

## Migracao tasks backend - presentation - 2026-03-29

- [`apps/api/src/modules/tasks/presentation/admin-routes.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/presentation/admin-routes.ts)
  Motivo: concentrar a borda HTTP administrativa de `tasks` dentro do modulo.
  Risco: baixo.
  Validacao associada: `lint`, `typecheck` e testes focados de `tasks` da API.

- [`apps/api/src/modules/tasks/presentation/me-routes.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/presentation/me-routes.ts)
  Motivo: concentrar a borda HTTP do usuario dentro do modulo.
  Risco: baixo.
  Validacao associada: `lint`, `typecheck` e testes focados de `tasks` da API.

- [`apps/api/src/modules/tasks/presentation/route-helpers.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/presentation/route-helpers.ts)
  Motivo: manter helpers de presentation perto das rotas do modulo.
  Risco: baixo.
  Validacao associada: `lint`, `typecheck` e testes focados de `tasks` da API.

- [`apps/api/src/app.ts`](/home/leo/Noctification2/apps/api/src/app.ts)
  Motivo: atualizar o ponto de montagem das rotas apos a migracao.
  Risco: baixo.
  Validacao associada: testes focados de `tasks` da API.

- [`apps/api/src/test/task-routes.test.ts`](/home/leo/Noctification2/apps/api/src/test/task-routes.test.ts)
  Motivo: atualizar imports apos a migracao da camada presentation.
  Risco: baixo.
  Validacao associada: o proprio arquivo de teste passou.

## Migracao tasks backend - application - 2026-03-29

- [`apps/api/src/modules/tasks/application/service.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/application/service.ts)
  Motivo: centralizar servicos e leitura/escrita aplicada da feature `tasks`.
  Risco: baixo.
  Validacao associada: `lint`, `typecheck` e testes focados de `tasks`.

- [`apps/api/src/modules/tasks/application/notifications.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/application/notifications.ts)
  Motivo: concentrar notificacoes ligadas a `tasks` na camada application.
  Risco: baixo.
  Validacao associada: `lint`, `typecheck` e testes focados de `tasks`.

- [`apps/api/src/modules/tasks/application/automation.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/application/automation.ts)
  Motivo: concentrar o ciclo de automacao de `tasks`.
  Risco: baixo.
  Validacao associada: `lint`, `typecheck` e testes focados de `tasks`.

- [`apps/api/src/modules/tasks/application/automation-definitions.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/application/automation-definitions.ts)
  Motivo: aproximar definicoes de automacao do orquestrador.
  Risco: baixo.
  Validacao associada: testes focados de automacao.

- [`apps/api/src/modules/tasks/application/automation-operations.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/application/automation-operations.ts)
  Motivo: manter operacoes de automacao na camada application.
  Risco: baixo.
  Validacao associada: testes focados de automacao.

- [`apps/api/src/modules/tasks/application/automation-queries.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/application/automation-queries.ts)
  Motivo: manter queries de automacao proximas da orquestracao nesta fase intermediaria.
  Risco: baixo.
  Validacao associada: testes focados de automacao.

- [`apps/api/src/modules/tasks/application/automation-recurrence.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/application/automation-recurrence.ts)
  Motivo: centralizar calculo de recorrencia na camada application.
  Risco: baixo.
  Validacao associada: testes focados de automacao.

## Migracao tasks backend - infrastructure - 2026-03-29

- [`apps/api/src/modules/tasks/infrastructure/task-create-mutation.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/infrastructure/task-create-mutation.ts)
  Motivo: agrupar mutacao de criacao na camada infrastructure do modulo.
  Risco: baixo.
  Validacao associada: `lint`, `typecheck` e testes focados de `tasks`.

- [`apps/api/src/modules/tasks/infrastructure/task-update-mutation.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/infrastructure/task-update-mutation.ts)
  Motivo: agrupar mutacao de atualizacao na camada infrastructure do modulo.
  Risco: baixo.
  Validacao associada: `lint`, `typecheck` e testes focados de `tasks`.

- [`apps/api/src/modules/tasks/infrastructure/task-terminal-mutation.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/infrastructure/task-terminal-mutation.ts)
  Motivo: agrupar transicoes terminais na camada infrastructure do modulo.
  Risco: baixo.
  Validacao associada: `lint`, `typecheck` e testes focados de `tasks`.

- [`apps/api/src/modules/tasks/infrastructure/task-mutation-shared.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/infrastructure/task-mutation-shared.ts)
  Motivo: concentrar contratos compartilhados de mutacao na camada infrastructure.
  Risco: baixo.
  Validacao associada: `lint`, `typecheck` e testes focados de `tasks`.

- [`apps/api/src/modules/tasks/infrastructure/task-mutations.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/infrastructure/task-mutations.ts)
  Motivo: manter o facade de mutacoes dentro da mesma camada do modulo.
  Risco: baixo.
  Validacao associada: `lint`, `typecheck` e testes focados de `tasks`.

## Migracao tasks backend - domain e fechamento do modulo - 2026-03-29

- [`apps/api/src/modules/tasks/domain/domain.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/domain/domain.ts)
  Motivo: centralizar regras, parsers e validacoes da feature `tasks`.
  Risco: baixo.
  Validacao associada: `lint`, `typecheck` e testes focados de `tasks`.

- [`apps/api/src/modules/tasks/domain/automation-types.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/domain/automation-types.ts)
  Motivo: centralizar tipos de automacao no dominio do modulo.
  Risco: baixo.
  Validacao associada: `lint`, `typecheck` e testes focados de `tasks`.

- [`apps/api/src/modules/tasks/index.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/index.ts)
  Motivo: expor uma superficie unica de import para o modulo.
  Risco: baixo.
  Validacao associada: `lint`, `typecheck` e testes focados de `tasks`.

- [`apps/api/src/app.ts`](/home/leo/Noctification2/apps/api/src/app.ts)
  Motivo: consumir o modulo `tasks` pelo entrypoint consolidado.
  Risco: baixo.
  Validacao associada: testes focados de `tasks`.

## Migracao tasks frontend - 2026-03-29

- [`apps/web/src/features/tasks/api/tasksApi.ts`](/home/leo/Noctification2/apps/web/src/features/tasks/api/tasksApi.ts)
  Motivo: aproximar a API HTTP da propria feature `tasks`.
  Risco: baixo.
  Validacao associada: `lint`, `typecheck` e testes focados do web.

- [`apps/web/src/features/tasks/components/TaskUserPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/components/TaskUserPanel.tsx)
  Motivo: colocar o painel do usuario dentro da area da feature.
  Risco: baixo.
  Validacao associada: testes focados do painel do usuario.

- [`apps/web/src/features/tasks/admin/AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx)
  Motivo: aproximar o painel admin da feature `tasks`.
  Risco: baixo.
  Validacao associada: testes focados do painel admin.

- [`apps/web/src/features/tasks/admin/adminTasksPanelModel.ts`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/adminTasksPanelModel.ts)
  Motivo: manter o model do painel admin no mesmo contexto da feature.
  Risco: baixo.
  Validacao associada: testes focados do painel admin.

- [`apps/web/src/features/tasks/test/TaskUserPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/test/TaskUserPanel.test.tsx)
  Motivo: manter testes do painel do usuario junto da feature.
  Risco: baixo.
  Validacao associada: o proprio arquivo de teste passou.

- [`apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx)
  Motivo: manter testes do painel admin junto da feature.
  Risco: baixo.
  Validacao associada: o proprio arquivo de teste passou.

- [`apps/web/src/features/tasks/index.ts`](/home/leo/Noctification2/apps/web/src/features/tasks/index.ts)
  Motivo: expor uma superficie unica de import para a feature.
  Risco: baixo.
  Validacao associada: `typecheck` e consumidores atualizados.
