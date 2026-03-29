# Relatorio Final

## Resumo executivo

- Repositorio identificado como monorepo Node.js/TypeScript com `apps/api`, `apps/web` e `packages/apr-core`.
- A analise combinou reconhecimento estrutural, validacoes por workspace, leitura dirigida de modulos criticos e revalidacao agregada.
- Foram confirmados 2 itens relevantes:
  - 1 `bug_reproduzivel`
  - 1 `problema_de_qualidade`
- Ambos foram corrigidos com mudancas localizadas e revalidados com sucesso.

## Visao geral do repositorio

- Backend: Express + Socket.IO + SQLite.
- Frontend: React + Vite.
- Shared package: `@noctification/apr-core`.
- CI: GitHub Actions com verificacoes de seguranca, lint, typecheck, audit e testes.

## Estrategia adotada

1. Reconhecimento do monorepo e das ferramentas disponiveis.
2. Validacao incremental de `apr-core`, API e web.
3. Correlacao das falhas com o codigo-fonte.
4. Correcao minima e revalidacao local do escopo afetado.
5. Execucao final agregada na raiz (`lint`, `typecheck`, `test`).
6. Rodada funcional manual por HTTP cobrindo auth, notificacoes, tarefas e lembretes.

## Quantidade de achados por tipo

- `bug_reproduzivel`: 1
- `problema_de_qualidade`: 1
- `vulnerabilidade_confirmada`: 0
- `integracao_quebrada`: 0
- `erro_de_configuracao`: 0
- `risco_potencial`: 0
- `divida_tecnica`: 0
- `melhoria`: 0

## Bugs confirmados

### BUG-001

- Contexto: frontend web.
- Sintoma: teste de roteamento APR falhava em ambiente com `.env` local ativando o modulo.
- Causa raiz: feature flag lida em escopo de modulo, acoplando a suite ao ambiente local.
- Status: corrigido.

## Bugs corrigidos

- `BUG-001`
- `QLT-001`

## Bugs pendentes

- Nenhum bug reproduzivel pendente foi confirmado nesta rodada.

## Vulnerabilidades confirmadas

- Nenhuma vulnerabilidade confirmada com evidencia suficiente nesta analise.

## Riscos potenciais

- Novos testes ligados a feature flags Vite podem voltar a depender do `.env` local se nao isolarem explicitamente o ambiente.
- Os avisos de `npm config globalignorefile` merecem revisao do ambiente do runner/desenvolvedor, mas nao foram atribuiveis ao codigo versionado.

## Principais padroes recorrentes

- Acoplamento sutil entre testes frontend e configuracao de ambiente.
- Pequenos residuos de manutencao que afetam qualidade automatizada (`lint`) sem necessariamente quebrar runtime.

## Limitacoes da analise

- Sem execucao de browser real ou e2e visual.
- Sem validacao de deploy Debian/nginx/systemd.
- Sem uso de internet ou scanners externos.
- `rg` indisponivel; a busca textual foi feita com ferramentas alternativas.
- A API em `:4000` ja estava ativa antes da subida manual; o smoke HTTP validou essa instancia exposta localmente.

## Recomendacoes praticas

- Centralizar consumo de feature flags do frontend em um helper/modulo unico.
- Exigir stub explicito de variaveis Vite em testes que dependam de flags.
- Manter `lint`, `typecheck` e testes por workspace como etapa rapida obrigatoria antes de validar a raiz.

## Analise incremental 2026-03-28

### Resumo executivo

Nesta rodada nao identifiquei bug reproduzivel novo. A base esta relativamente saudavel em `lint` e `typecheck`, mas ha gargalos claros de produtividade e organizacao que aumentam custo de manutencao e tempo de feedback do time.

### Melhorias recomendadas

1. Ignorar `*.tsbuildinfo` no [`.gitignore`](/home/leo/Noctification2/.gitignore).
   Evidencia: `git status --short` mostrou `apps/web/tsconfig.tsbuildinfo` modificado.

2. Reduzir duplicacao de instalacao no CI em [`.github/workflows/main.yml`](/home/leo/Noctification2/.github/workflows/main.yml).
   Evidencia: quatro jobs executam `npm ci` separadamente.

3. Adotar orquestracao com cache para workspaces no [`package.json`](/home/leo/Noctification2/package.json).
   Evidencia: `build` e `test` da raiz sao seriais e nao usam cache incremental por grafo.

4. Extrair roteamento/autenticacao do shell em [`apps/web/src/App.tsx`](/home/leo/Noctification2/apps/web/src/App.tsx).
   Evidencia: o arquivo centraliza sessao, navegacao manual, toasts e decisao de telas.

5. Reorganizar diretorios por dominio no backend e frontend.
   Evidencia: densidade alta de arquivos em `routes`, `tasks`, `components` e `lib`.

6. Fatiar arquivos e testes monoliticos.
   Evidencia: varios arquivos acima de 300 linhas; testes com 708-839 linhas.

7. Endurecer lint e regras arquiteturais em [`.eslintrc.cjs`](/home/leo/Noctification2/.eslintrc.cjs).
   Evidencia: configuracao atual cobre apenas um subconjunto pequeno de riscos recorrentes.

8. Limpar o warning recorrente de `globalignorefile` do ambiente `npm`.
   Evidencia: aviso apareceu em `lint` e `typecheck`, poluindo o feedback operacional.

### Ganho esperado

- Menos ruido operacional no worktree e na CI.
- Feedback mais rapido para PRs.
- Melhor navegabilidade do codigo.
- Menor custo para adicionar features em `tasks`, `reminders`, `APR` e dashboards.

### Desdobramento pratico

- Plano de execucao em 3 fases registrado em [`.bug-report/plano-pratico-melhorias-2026-03-29.md`](/home/leo/Noctification2/.bug-report/plano-pratico-melhorias-2026-03-29.md).

## Implementacao Fase 1 - 2026-03-29

### Mudancas aplicadas

- Adicionado `*.tsbuildinfo` em [`.gitignore`](/home/leo/Noctification2/.gitignore).
- Removido `apps/web/tsconfig.tsbuildinfo` do controle de versao.
- Consolidado o workflow de qualidade e testes em [`.github/workflows/main.yml`](/home/leo/Noctification2/.github/workflows/main.yml), reduzindo reinstalacoes redundantes.

### Validacao

- `npm run lint`: ok.
- `npm run typecheck`: ok.

### Limite confirmado

- O warning `globalignorefile` permaneceu localmente e foi rastreado para a instalacao global do `npm`, fora do escopo versionado do repositorio.

## Implementacao Fase 2 parcial - 2026-03-29

### Mudancas aplicadas

- Adicionados scripts de execucao seletiva por workspace em [`package.json`](/home/leo/Noctification2/package.json): `build:core`, `build:api`, `build:web`, `test:core`, `check:core`, `check:api`, `check:web`, `check:fast`.
- Criado o arquivo de fixtures compartilhadas [`apps/web/src/test/fixtures.ts`](/home/leo/Noctification2/apps/web/src/test/fixtures.ts).
- Reduzida duplicacao em [`apps/web/src/components/TaskUserPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/components/TaskUserPanel.test.tsx), [`apps/web/src/components/admin/AdminTasksPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/components/admin/AdminTasksPanel.test.tsx) e [`apps/web/src/components/AdminDashboard.test.tsx`](/home/leo/Noctification2/apps/web/src/components/AdminDashboard.test.tsx).

### Validacao

- `npm run lint`: ok.
- `npm run typecheck`: ok.
- Rerun focado dos testes alterados: ok.
- `ReminderUserPanel.test.tsx` falhou uma vez na suite completa e passou no rerun isolado; mantido como risco residual de flake, sem evidencia de regressao causada por esta rodada.

## Planejamento detalhado de migracao de tasks - 2026-03-29

- Roteiro arquivo por arquivo registrado em [`.bug-report/plano-migracao-tasks-por-arquivo-2026-03-29.md`](/home/leo/Noctification2/.bug-report/plano-migracao-tasks-por-arquivo-2026-03-29.md).

## Execucao da migracao tasks backend - presentation - 2026-03-29

### Mudancas aplicadas

- [`apps/api/src/routes/tasks-admin.ts`](/home/leo/Noctification2/apps/api/src/routes/tasks-admin.ts) foi migrado para [`apps/api/src/modules/tasks/presentation/admin-routes.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/presentation/admin-routes.ts).
- [`apps/api/src/routes/tasks-me.ts`](/home/leo/Noctification2/apps/api/src/routes/tasks-me.ts) foi migrado para [`apps/api/src/modules/tasks/presentation/me-routes.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/presentation/me-routes.ts).
- [`apps/api/src/tasks/route-helpers.ts`](/home/leo/Noctification2/apps/api/src/tasks/route-helpers.ts) foi migrado para [`apps/api/src/modules/tasks/presentation/route-helpers.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/presentation/route-helpers.ts).
- Ajustados os imports em [`apps/api/src/app.ts`](/home/leo/Noctification2/apps/api/src/app.ts) e [`apps/api/src/test/task-routes.test.ts`](/home/leo/Noctification2/apps/api/src/test/task-routes.test.ts).

### Validacao

- `npm run lint --workspace @noctification/api`: ok.
- `npm run typecheck --workspace @noctification/api`: ok.
- `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts src/test/task-automation.test.ts`: ok.

## Execucao da migracao tasks backend - application - 2026-03-29

### Mudancas aplicadas

- [`apps/api/src/tasks/service.ts`](/home/leo/Noctification2/apps/api/src/tasks/service.ts) foi migrado para [`apps/api/src/modules/tasks/application/service.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/application/service.ts).
- [`apps/api/src/tasks/notifications.ts`](/home/leo/Noctification2/apps/api/src/tasks/notifications.ts) foi migrado para [`apps/api/src/modules/tasks/application/notifications.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/application/notifications.ts).
- [`apps/api/src/tasks/automation.ts`](/home/leo/Noctification2/apps/api/src/tasks/automation.ts) foi migrado para [`apps/api/src/modules/tasks/application/automation.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/application/automation.ts).
- [`apps/api/src/tasks/automation-definitions.ts`](/home/leo/Noctification2/apps/api/src/tasks/automation-definitions.ts) foi migrado para [`apps/api/src/modules/tasks/application/automation-definitions.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/application/automation-definitions.ts).
- [`apps/api/src/tasks/automation-operations.ts`](/home/leo/Noctification2/apps/api/src/tasks/automation-operations.ts) foi migrado para [`apps/api/src/modules/tasks/application/automation-operations.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/application/automation-operations.ts).
- [`apps/api/src/tasks/automation-queries.ts`](/home/leo/Noctification2/apps/api/src/tasks/automation-queries.ts) foi migrado para [`apps/api/src/modules/tasks/application/automation-queries.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/application/automation-queries.ts).
- [`apps/api/src/tasks/automation-recurrence.ts`](/home/leo/Noctification2/apps/api/src/tasks/automation-recurrence.ts) foi migrado para [`apps/api/src/modules/tasks/application/automation-recurrence.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/application/automation-recurrence.ts).
- Foram ajustados os consumidores em:
  - [`apps/api/src/modules/tasks/presentation/admin-routes.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/presentation/admin-routes.ts)
  - [`apps/api/src/modules/tasks/presentation/me-routes.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/presentation/me-routes.ts)
  - [`apps/api/src/modules/tasks/presentation/route-helpers.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/presentation/route-helpers.ts)
  - [`apps/api/src/reminders/scheduler.ts`](/home/leo/Noctification2/apps/api/src/reminders/scheduler.ts)
  - [`apps/api/src/test/task-automation.test.ts`](/home/leo/Noctification2/apps/api/src/test/task-automation.test.ts)
  - arquivos de mutacao ainda em [`apps/api/src/tasks`](/home/leo/Noctification2/apps/api/src/tasks)

### Validacao

- `npm run lint --workspace @noctification/api`: ok.
- `npm run typecheck --workspace @noctification/api`: ok.
- `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts src/test/task-automation.test.ts`: ok.

## Execucao da migracao tasks backend - infrastructure - 2026-03-29

### Mudancas aplicadas

- [`apps/api/src/tasks/task-create-mutation.ts`](/home/leo/Noctification2/apps/api/src/tasks/task-create-mutation.ts) foi migrado para [`apps/api/src/modules/tasks/infrastructure/task-create-mutation.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/infrastructure/task-create-mutation.ts).
- [`apps/api/src/tasks/task-update-mutation.ts`](/home/leo/Noctification2/apps/api/src/tasks/task-update-mutation.ts) foi migrado para [`apps/api/src/modules/tasks/infrastructure/task-update-mutation.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/infrastructure/task-update-mutation.ts).
- [`apps/api/src/tasks/task-terminal-mutation.ts`](/home/leo/Noctification2/apps/api/src/tasks/task-terminal-mutation.ts) foi migrado para [`apps/api/src/modules/tasks/infrastructure/task-terminal-mutation.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/infrastructure/task-terminal-mutation.ts).
- [`apps/api/src/tasks/task-mutation-shared.ts`](/home/leo/Noctification2/apps/api/src/tasks/task-mutation-shared.ts) foi migrado para [`apps/api/src/modules/tasks/infrastructure/task-mutation-shared.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/infrastructure/task-mutation-shared.ts).
- [`apps/api/src/tasks/task-mutations.ts`](/home/leo/Noctification2/apps/api/src/tasks/task-mutations.ts) foi migrado para [`apps/api/src/modules/tasks/infrastructure/task-mutations.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/infrastructure/task-mutations.ts).
- Foram ajustados os imports em [`apps/api/src/modules/tasks/presentation/admin-routes.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/presentation/admin-routes.ts) e [`apps/api/src/modules/tasks/presentation/me-routes.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/presentation/me-routes.ts).

### Validacao

- `npm run lint --workspace @noctification/api`: ok.
- `npm run typecheck --workspace @noctification/api`: ok.
- `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts src/test/task-automation.test.ts`: ok.

### Estado atual

- [`apps/api/src/tasks`](/home/leo/Noctification2/apps/api/src/tasks) agora contem apenas `domain.ts` e `automation-types.ts`, sinalizando que o cleanup final esta proximo.

## Execucao da migracao tasks backend - domain e fechamento do modulo - 2026-03-29

### Mudancas aplicadas

- [`apps/api/src/tasks/domain.ts`](/home/leo/Noctification2/apps/api/src/tasks/domain.ts) foi migrado para [`apps/api/src/modules/tasks/domain/domain.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/domain/domain.ts).
- [`apps/api/src/tasks/automation-types.ts`](/home/leo/Noctification2/apps/api/src/tasks/automation-types.ts) foi migrado para [`apps/api/src/modules/tasks/domain/automation-types.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/domain/automation-types.ts).
- Foi criado [`apps/api/src/modules/tasks/index.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/index.ts).
- [`apps/api/src/app.ts`](/home/leo/Noctification2/apps/api/src/app.ts) passou a importar o modulo `tasks` pelo entrypoint.
- Os imports remanescentes de `domain` e `automation-types` em `application`, `infrastructure` e `presentation` foram atualizados.

### Validacao

- `npm run lint --workspace @noctification/api`: ok.
- `npm run typecheck --workspace @noctification/api`: ok.
- `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts src/test/task-automation.test.ts`: ok.

### Estado atual

- A pasta [`apps/api/src/modules/tasks`](/home/leo/Noctification2/apps/api/src/modules/tasks) agora contem `application`, `domain`, `infrastructure`, `presentation` e `index.ts`.
- A pasta legada [`apps/api/src/tasks`](/home/leo/Noctification2/apps/api/src/tasks) ficou vazia e pode ser removida em cleanup posterior se desejado.

## Execucao da migracao tasks frontend - 2026-03-29

### Mudancas aplicadas

- [`apps/web/src/lib/apiTasks.ts`](/home/leo/Noctification2/apps/web/src/lib/apiTasks.ts) foi migrado para [`apps/web/src/features/tasks/api/tasksApi.ts`](/home/leo/Noctification2/apps/web/src/features/tasks/api/tasksApi.ts).
- [`apps/web/src/components/TaskUserPanel.tsx`](/home/leo/Noctification2/apps/web/src/components/TaskUserPanel.tsx) foi migrado para [`apps/web/src/features/tasks/components/TaskUserPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/components/TaskUserPanel.tsx).
- [`apps/web/src/components/admin/AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/components/admin/AdminTasksPanel.tsx) foi migrado para [`apps/web/src/features/tasks/admin/AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx).
- [`apps/web/src/components/admin/adminTasksPanelModel.ts`](/home/leo/Noctification2/apps/web/src/components/admin/adminTasksPanelModel.ts) foi migrado para [`apps/web/src/features/tasks/admin/adminTasksPanelModel.ts`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/adminTasksPanelModel.ts).
- Os testes foram movidos para `apps/web/src/features/tasks/test`.
- Foi criado [`apps/web/src/features/tasks/index.ts`](/home/leo/Noctification2/apps/web/src/features/tasks/index.ts).
- Foram ajustados os consumidores em:
  - [`apps/web/src/lib/api.ts`](/home/leo/Noctification2/apps/web/src/lib/api.ts)
  - [`apps/web/src/components/app/appShell.tsx`](/home/leo/Noctification2/apps/web/src/components/app/appShell.tsx)
  - [`apps/web/src/components/AdminDashboard.tsx`](/home/leo/Noctification2/apps/web/src/components/AdminDashboard.tsx)

### Validacao

- `npm run lint --workspace @noctification/web`: ok.
- `npm run typecheck --workspace @noctification/web`: ok.
- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: ok.

### Estado atual

- A feature [`apps/web/src/features/tasks`](/home/leo/Noctification2/apps/web/src/features/tasks) agora concentra API, componentes principais, admin, testes e entrypoint.
- Nao restaram arquivos `TaskUserPanel`, `AdminTasksPanel`, `apiTasks` ou `adminTasksPanelModel` nos diretórios antigos.

## Roadmap funcional de tasks - 2026-03-29

- Roadmap registrado em [`docs/tasks-roadmap.md`](/home/leo/Noctification2/docs/tasks-roadmap.md) como fonte principal de verdade para evolucao do modulo, com fases, criterios de aceite e regras para evitar deriva de escopo e perda de contexto.

## Execucao roadmap tasks - Fase 1 - workflow operacional - 2026-03-29

### Mudancas aplicadas

- O tipo `TaskStatus` foi ampliado em [`apps/api/src/types.ts`](/home/leo/Noctification2/apps/api/src/types.ts) e [`apps/web/src/types.ts`](/home/leo/Noctification2/apps/web/src/types.ts) para suportar `assumed`, `blocked` e `waiting_external`.
- O dominio de `tasks` em [`apps/api/src/modules/tasks/domain/domain.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/domain/domain.ts) passou a reconhecer os novos status nao-terminais.
- A automacao de tarefas em [`apps/api/src/modules/tasks/domain/automation-types.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/domain/automation-types.ts) foi atualizada para considerar o novo conjunto de tarefas ativas.
- A infraestrutura de mutacao em:
  - [`apps/api/src/modules/tasks/infrastructure/task-update-mutation.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/infrastructure/task-update-mutation.ts)
  - [`apps/api/src/modules/tasks/infrastructure/task-mutation-shared.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/infrastructure/task-mutation-shared.ts)
  foi ajustada para validar, rotular e notificar os novos status.
- Foi criada a migracao [`apps/api/migrations/020_task_status_workflow.sql`](/home/leo/Noctification2/apps/api/migrations/020_task_status_workflow.sql), responsavel por migrar `waiting` legado para `waiting_external` e reconstruir as tabelas de `tasks`, `task_events`, `task_comments` e `task_automation_logs`.
- O kanban e o detalhe do frontend foram ajustados em:
  - [`apps/web/src/components/tasks/TaskBoard.tsx`](/home/leo/Noctification2/apps/web/src/components/tasks/TaskBoard.tsx)
  - [`apps/web/src/components/tasks/TaskDetailSheet.tsx`](/home/leo/Noctification2/apps/web/src/components/tasks/TaskDetailSheet.tsx)
  - [`apps/web/src/components/tasks/taskUi.ts`](/home/leo/Noctification2/apps/web/src/components/tasks/taskUi.ts)
  - [`apps/web/src/components/tasks/useTaskPanelActions.ts`](/home/leo/Noctification2/apps/web/src/components/tasks/useTaskPanelActions.ts)
- Os filtros de status e os testes focados foram alinhados em:
  - [`apps/web/src/features/tasks/components/TaskUserPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/components/TaskUserPanel.tsx)
  - [`apps/web/src/features/tasks/admin/AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx)
  - [`apps/web/src/features/tasks/test/TaskUserPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/test/TaskUserPanel.test.tsx)
  - [`apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx)
  - [`apps/api/src/test/task-automation.test.ts`](/home/leo/Noctification2/apps/api/src/test/task-automation.test.ts)
  - [`apps/api/src/test/task-migrations.test.ts`](/home/leo/Noctification2/apps/api/src/test/task-migrations.test.ts)

### Validacao

- `npm run test --workspace @noctification/api -- src/test/task-migrations.test.ts src/test/task-automation.test.ts`: ok.
- `npm run typecheck --workspace @noctification/api`: ok.
- `npm run typecheck --workspace @noctification/web`: ok.
- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: ok.
- `npm run lint --workspace @noctification/api`: ok.
- `npm run lint --workspace @noctification/web`: ok.

### Estado atual

- O modulo de `tasks` agora suporta um workflow mais operacional sem quebrar o board existente.
- A fase de workflow ficou pronta para a proxima entrega do roadmap: SLA visual, filas operacionais ou acoes rapidas mais contextuais.

## Execucao roadmap tasks - Fase 2 parcial - SLA visual e filas operacionais - 2026-03-29

### Mudancas aplicadas

- Foi centralizada a leitura operacional de SLA em [`apps/web/src/components/tasks/taskUi.ts`](/home/leo/Noctification2/apps/web/src/components/tasks/taskUi.ts), com regras para:
  - atrasada
  - vence hoje
  - vence em breve
  - bloqueada
  - parada ha mais de 24h
  - sem prazo
- O detalhe da tarefa em [`apps/web/src/components/tasks/TaskDetailSheet.tsx`](/home/leo/Noctification2/apps/web/src/components/tasks/TaskDetailSheet.tsx) agora exibe o estado de SLA junto do prazo.
- O painel do usuario em [`apps/web/src/features/tasks/components/TaskUserPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/components/TaskUserPanel.tsx) passou a ter filas rapidas locais e badge de SLA no card.
- O painel admin em [`apps/web/src/features/tasks/admin/AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx) passou a ter filas operacionais locais, incluindo `Sem responsavel`.
- A ordenacao das colunas do board foi alinhada a urgencia operacional em:
  - [`apps/web/src/components/tasks/taskUi.ts`](/home/leo/Noctification2/apps/web/src/components/tasks/taskUi.ts)
  - [`apps/web/src/features/tasks/admin/adminTasksPanelModel.ts`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/adminTasksPanelModel.ts)
- Foram adicionados testes focados em:
  - [`apps/web/src/features/tasks/test/TaskUserPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/test/TaskUserPanel.test.tsx)
  - [`apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx)

### Validacao

- `npm run typecheck --workspace @noctification/web`: ok.
- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: ok.
- `npm run lint --workspace @noctification/web`: ok.

### Estado atual

- O kanban de `tasks` agora entrega leitura operacional mais clara sem depender de dashboard separado.
- A proxima entrega mais coerente do roadmap passa a ser bulk actions, filtros salvos persistidos ou alertas/filas automáticas no backend.

## Execucao roadmap tasks - Fase 2 parcial - filtros salvos persistidos - 2026-03-29

### Mudancas aplicadas

- O painel do usuario em [`apps/web/src/features/tasks/components/TaskUserPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/components/TaskUserPanel.tsx) passou a restaurar e persistir:
  - `statusFilter`
  - `priorityFilter`
  - `queueFilter`
- O painel admin em [`apps/web/src/features/tasks/admin/AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx) passou a restaurar e persistir:
  - `statusFilter`
  - `priorityFilter`
  - `assigneeFilter`
  - `queueFilter`
- Foram adicionados testes de restauracao inicial em:
  - [`apps/web/src/features/tasks/test/TaskUserPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/test/TaskUserPanel.test.tsx)
  - [`apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx)

### Validacao

- `npm run typecheck --workspace @noctification/web`: ok.
- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: ok.
- `npm run lint --workspace @noctification/web`: ok.

### Estado atual

- O modulo de `tasks` agora preserva o contexto operacional local entre recargas e retorno de tela.
- A proxima entrega com maior impacto operacional passa a ser bulk actions no admin ou envio mais acionavel de alertas dentro do dashboard.

## Execucao roadmap tasks - Fase 2 parcial - bulk actions no admin - 2026-03-29

### Mudancas aplicadas

- O board compartilhado em [`apps/web/src/components/tasks/TaskBoard.tsx`](/home/leo/Noctification2/apps/web/src/components/tasks/TaskBoard.tsx) passou a aceitar selecao multipla opcional via checkbox por card.
- O painel admin em [`apps/web/src/features/tasks/admin/AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx) ganhou uma barra de `bulk actions` para aplicar operacoes em lote.
- As acoes em lote foram implementadas por reuso de chamadas ja existentes:
  - `updateAdminTask`
  - `completeAdminTask`
  - `cancelAdminTask`
- O fluxo limpa selecao ao final, recarrega a fila e trata falhas parciais sem exigir backend novo.
- Foi adicionada cobertura de teste em [`apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx) para mudanca de status em lote.

### Validacao

- `npm run typecheck --workspace @noctification/web`: ok.
- `npm run test --workspace @noctification/web -- src/features/tasks/test/AdminTasksPanel.test.tsx src/features/tasks/test/TaskUserPanel.test.tsx src/components/AdminDashboard.test.tsx`: ok.
- `npm run lint --workspace @noctification/web`: ok.

### Estado atual

- O modulo de `tasks` agora combina workflow operacional, SLA visual, filas rapidas, filtros persistidos e operacao em lote no admin.
- A proxima entrega mais coerente passa a ser levar alertas operacionais para um ponto mais acionavel do dashboard ou consolidar historico/telemetria de produtividade.

## Execucao roadmap tasks - Fase 2 parcial - drag and drop no kanban - 2026-03-29

### Mudancas aplicadas

- O board compartilhado em [`apps/web/src/components/tasks/TaskBoard.tsx`](/home/leo/Noctification2/apps/web/src/components/tasks/TaskBoard.tsx) ganhou suporte a `drag and drop` nativo.
- O arraste foi limitado a transicoes entre colunas operacionais, preservando `done` e `cancelled` como estados finais por acao explicita.
- O `drop` reutiliza a mesma atualizacao de status ja usada pelos botoes de acao rapida, reduzindo risco e mantendo o fluxo consistente.
- Foi adicionada cobertura de teste de `drag and drop` em [`apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx).

### Validacao

- `npm run typecheck --workspace @noctification/web`: ok.
- `npm run test --workspace @noctification/web -- src/features/tasks/test/AdminTasksPanel.test.tsx src/features/tasks/test/TaskUserPanel.test.tsx src/components/AdminDashboard.test.tsx`: ok.
- `npm run lint --workspace @noctification/web`: ok.

### Estado atual

- O kanban de `tasks` agora suporta operacao rapida por clique, por lote e por arraste.
- O proximo passo de maior impacto passa a ser consolidar indicadores de produtividade individual/equipe ou levar alertas para um ponto central do dashboard.

## Execucao roadmap tasks - Fase 4 parcial - carga por responsavel no admin - 2026-03-29

### Mudancas aplicadas

- O modelo do painel admin em [`apps/web/src/features/tasks/admin/adminTasksPanelModel.ts`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/adminTasksPanelModel.ts) passou a consolidar capacidade operacional por responsavel a partir da fila filtrada.
- O painel em [`apps/web/src/features/tasks/admin/AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx) agora exibe um bloco `Carga por responsavel` acima da automacao.
- Cada card desse resumo mostra, por pessoa ou fila sem responsavel:
  - abertas
  - atrasadas
  - criticas
  - bloqueadas
  - concluidas
- A ordenacao do resumo prioriza maior atraso, maior criticidade e maior volume aberto, para tornar o gargalo mais visivel.
- Foi adicionada cobertura de teste em [`apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx) para a nova visao de capacidade.

### Validacao

- `npm run test --workspace @noctification/web -- src/features/tasks/test/AdminTasksPanel.test.tsx src/features/tasks/test/TaskUserPanel.test.tsx src/components/AdminDashboard.test.tsx`: ok.
- `npm run typecheck --workspace @noctification/web`: ok.
- `npm run lint --workspace @noctification/web`: ok.

### Estado atual

- O modulo de `tasks` passou a oferecer uma primeira leitura de produtividade operacional por responsavel no proprio admin.
- O proximo passo mais forte dentro do roadmap e complementar essa visao com metricas por periodo ou com uma visao agregada por equipe.

## Execucao roadmap tasks - Fase 4 parcial - metricas por periodo no admin - 2026-03-29

### Mudancas aplicadas

- O modelo em [`apps/web/src/features/tasks/admin/adminTasksPanelModel.ts`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/adminTasksPanelModel.ts) passou a calcular metricas de produtividade com base no filtro atual e na janela escolhida.
- O painel em [`apps/web/src/features/tasks/admin/AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx) ganhou uma secao `Janela operacional` com alternancia entre `7 dias` e `30 dias`.
- O resumo operacional agora exibe:
  - criadas no periodo
  - concluidas no periodo
  - concluidas no prazo
  - concluidas em atraso
  - ciclo medio
  - tempo medio ate iniciar
  - atrasadas abertas
  - bloqueadas abertas
- A implementacao foi feita apenas com dados ja presentes no `TaskItem`, sem inventar historico adicional nem exigir endpoint novo.
- Foi adicionada cobertura de teste em [`apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx) para a troca de janela e leitura dos indicadores.

### Validacao

- `npm run test --workspace @noctification/web -- src/features/tasks/test/AdminTasksPanel.test.tsx src/features/tasks/test/TaskUserPanel.test.tsx src/components/AdminDashboard.test.tsx`: ok.
- `npm run typecheck --workspace @noctification/web`: ok.
- `npm run lint --workspace @noctification/web`: ok.

### Estado atual

- O admin de `tasks` agora combina saude operacional, carga por responsavel e leitura de produtividade por periodo dentro da mesma tela.
- O proximo passo mais forte no roadmap e subir isso para uma visao agregada por equipe ou introduzir metricas historicas mais precisas via backend.

## Execucao tasks frontend - limpeza visual inicial do board - 2026-03-29

### Mudancas aplicadas

- O board compartilhado em [`apps/web/src/components/tasks/TaskBoard.tsx`](/home/leo/Noctification2/apps/web/src/components/tasks/TaskBoard.tsx) deixou de renderizar acoes inline dentro de cada card selecionado.
- As acoes operacionais da tarefa selecionada passaram para uma barra contextual unica no topo do board, reduzindo repeticao visual e concorrencia entre card, drag and drop e detalhe.
- Os paineis [`TaskUserPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/components/TaskUserPanel.tsx) e [`AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx) passaram a fornecer a tarefa selecionada explicitamente para o board.
- Os testes de board em [`TaskUserPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/test/TaskUserPanel.test.tsx) e [`AdminTasksPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx) foram ajustados para o novo fluxo.

### Validacao

- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: ok.
- `npm run typecheck --workspace @noctification/web`: ok.
- `npm run lint --workspace @noctification/web`: ok.

### Estado atual

- O kanban continua funcional para abrir detalhe, arrastar e operar status, mas com menos densidade visual por card.
- O proximo passo mais coerente para reduzir poluicao e mover metricas e blocos gerenciais do admin para uma visao secundaria, deixando a fila operacional como foco principal.

## Execucao tasks frontend - admin com foco operacional - 2026-03-29

### Mudancas aplicadas

- O admin em [`apps/web/src/features/tasks/admin/AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx) passou a priorizar visualmente a fila operacional.
- Os blocos de `Produtividade`, `Capacidade` e `Automacao` foram movidos para uma secao colapsavel `Visao gerencial`, fechada por padrao.
- A area principal da tela agora destaca:
  - resumo rapido da fila
  - bulk actions
  - formulario
  - board
- Os testes em [`apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx) foram ajustados para abrir explicitamente essa secao secundaria quando necessario.

### Validacao

- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: ok.
- `npm run typecheck --workspace @noctification/web`: ok.
- `npm run lint --workspace @noctification/web`: ok.

### Estado atual

- O frontend de `tasks` ficou menos poluido no admin sem remover funcionalidade.
- A proxima etapa mais coerente para continuar a limpeza e aplicar o mesmo raciocinio no `TaskDetailSheet`, reduzindo a quantidade de acoes simultaneas no drawer.

## Execucao tasks frontend - simplificacao do detalhe da tarefa - 2026-03-29

### Mudancas aplicadas

- O drawer em [`apps/web/src/components/tasks/TaskDetailSheet.tsx`](/home/leo/Noctification2/apps/web/src/components/tasks/TaskDetailSheet.tsx) deixou de listar varias transicoes de status ao mesmo tempo.
- As acoes do detalhe foram reduzidas para um conjunto mais claro:
  - `Editar`
  - uma acao principal contextual conforme o status atual
  - `Concluir`
  - `Cancelar tarefa`
- O historico passou a usar uma area expansivel, preservando acesso ao contexto sem ocupar tanto espaco fixo.
- O detalhe agora fica mais focado em leitura, comentario e decisao principal, enquanto o board segue como superficie principal de movimentacao operacional.

### Validacao

- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: ok.
- `npm run typecheck --workspace @noctification/web`: ok.
- `npm run lint --workspace @noctification/web`: ok.

### Estado atual

- O frontend de `tasks` ficou visivelmente menos poluido nas duas superficies mais densas: board e detalhe.
- O proximo passo mais coerente seria simplificar o formulario administrativo, hoje ainda fixo na tela, ou aplicar um tratamento parecido de hierarquia visual no painel do usuario.

## Execucao tasks frontend - formulario administrativo recolhivel - 2026-03-29

### Mudancas aplicadas

- O painel em [`apps/web/src/features/tasks/admin/AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx) passou a tratar o formulario administrativo como secao recolhivel.
- A criacao de tarefa agora exige abertura explicita do formulario, reduzindo ruido visual acima do board.
- A edicao continua abrindo automaticamente o formulario quando o usuario parte do detalhe da tarefa.
- O reset do formulario tambem fecha a composicao, devolvendo a tela ao foco operacional principal.
- O teste de criacao em [`apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx) foi ajustado para refletir o novo fluxo.

### Validacao

- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: ok.
- `npm run typecheck --workspace @noctification/web`: ok.
- `npm run lint --workspace @noctification/web`: ok.

### Estado atual

- O admin de `tasks` ficou mais focado em operar a fila do que em exibir configuracao e analiticos ao mesmo tempo.
- O proximo passo mais coerente, se quiser continuar refinando, e aplicar compactacao visual semelhante aos filtros rapidos ou reduzir o peso do resumo superior no painel do usuario.

## Execucao tasks frontend - compactacao da visao rapida - 2026-03-29

### Mudancas aplicadas

- Os paineis [`TaskUserPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/components/TaskUserPanel.tsx) e [`AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx) deixaram de usar um card dedicado para `Visao rapida`.
- O resumo foi convertido em uma faixa compacta de chips logo abaixo do header.
- A leitura imediata foi reduzida ao essencial:
  - total de tarefas
  - abertas
  - concluidas
  - criticas ou sem responsavel quando aplicavel
- Isso reduziu o peso visual do topo sem remover informacao util para orientacao rapida.

### Validacao

- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: ok.
- `npm run typecheck --workspace @noctification/web`: ok.
- `npm run lint --workspace @noctification/web`: ok.

### Estado atual

- O frontend de `tasks` agora usa menos cards informacionais e mais leitura compacta.
- O proximo refinamento mais coerente, se quiser continuar, e simplificar a area de filtros para reduzir ainda mais o ruído do topo do board.

## Execucao tasks frontend - criacao pelo kanban com modal - 2026-03-29

### Mudancas aplicadas

- O board compartilhado em [`apps/web/src/components/tasks/TaskBoard.tsx`](/home/leo/Noctification2/apps/web/src/components/tasks/TaskBoard.tsx) ganhou uma acao primaria opcional, usada como `Novo`.
- Nos paineis [`TaskUserPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/components/TaskUserPanel.tsx) e [`AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx), a criacao passou a ser iniciada diretamente do contexto do kanban.
- O formulario inline foi substituido por modal de composicao:
  - criacao por `Novo`
  - edicao pelo mesmo formulario reaproveitado
- A mudanca aproxima criacao e operacao da fila, reduzindo dispersao visual e deslocamento na tela.
- Os testes de criacao nos paineis do usuario e do admin foram ajustados para o novo gatilho no board.

### Validacao

- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: ok.
- `npm run typecheck --workspace @noctification/web`: ok.
- `npm run lint --workspace @noctification/web`: ok.

### Estado atual

- A criacao e a edicao de tarefas agora seguem um fluxo consistente e contextual ao kanban.
- O proximo passo mais coerente, se quiser seguir refinando, e compactar a area de filtros do board ou reduzir ainda mais o peso da barra de acoes em lote no admin.

## Execucao tasks frontend - edicao com modal centralizado - 2026-03-29

### Mudancas aplicadas

- A edicao de tarefa nos paineis [`TaskUserPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/components/TaskUserPanel.tsx) e [`AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx) passou a abrir diretamente no modal centralizado de composicao.
- O fluxo de `Editar` agora fecha o `TaskDetailSheet` antes de preencher o formulario, evitando manter drawer e modal abertos ao mesmo tempo.
- Criacao e edicao passaram a usar a mesma experiencia visual e o mesmo ponto de foco na tela.

### Validacao

- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: ok.
- `npm run typecheck --workspace @noctification/web`: ok.
- `npm run lint --workspace @noctification/web`: ok.

### Estado atual

- O fluxo de edicao ficou mais coerente com o de criacao e com menos poluicao visual.
- A interacao agora tem um unico ponto principal de composicao para nova tarefa e edicao de tarefa existente.

## Execucao tasks frontend - detalhe com modal centralizado - 2026-03-29

### Mudancas aplicadas

- O componente [`TaskDetailSheet.tsx`](/home/leo/Noctification2/apps/web/src/components/tasks/TaskDetailSheet.tsx) deixou de se comportar como drawer lateral.
- O detalhe passou a usar overlay centralizado, com largura e foco visual alinhados ao modal de composicao ja usado em `Novo` e `Editar`.
- O conteudo e as acoes do detalhe foram preservados; a mudanca ficou restrita ao formato e hierarquia visual do modal.

### Validacao

- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: ok.
- `npm run typecheck --workspace @noctification/web`: ok.
- `npm run lint --workspace @noctification/web`: ok.

### Estado atual

- O modulo de `tasks` agora usa o mesmo padrao visual de modal para detalhe, criacao e edicao.
- A experiencia ficou mais uniforme e com menos ruptura visual entre os fluxos principais do kanban.

## Execucao tasks roadmap - historico, alertas, metricas e filtros - 2026-03-29

### Mudancas aplicadas

- O backend de `tasks` passou a registrar eventos operacionais mais granulares em [`task-update-mutation.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/infrastructure/task-update-mutation.ts):
  - `title_changed`
  - `description_changed`
  - `priority_changed`
- O timeline do frontend em [`taskUi.ts`](/home/leo/Noctification2/apps/web/src/components/tasks/taskUi.ts) e [`TaskDetailSheet.tsx`](/home/leo/Noctification2/apps/web/src/components/tasks/TaskDetailSheet.tsx) passou a mostrar mais contexto por evento, reduzindo o valor de um historico apenas generico.
- A automacao ganhou uma nova categoria `blocked_task` em [`automation.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/application/automation.ts), [`automation-definitions.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/application/automation-definitions.ts), [`automation-queries.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/application/automation-queries.ts) e [`021_task_blocked_automation.sql`](/home/leo/Noctification2/apps/api/migrations/021_task_blocked_automation.sql), cobrindo tarefas bloqueadas por mais de 24h.
- O admin em [`AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx) passou a expor:
  - taxa no prazo
  - taxa de conclusao
  - visao de capacidade por responsavel
  - visao de capacidade por equipe
  - indicadores de alerta para bloqueio prolongado
- Os filtros do board foram compactados nos paineis [`TaskUserPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/components/TaskUserPanel.tsx) e [`AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx), mantendo visiveis apenas os controles primarios e movendo prioridade para `Mais filtros`.

### Validacao

- `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts src/test/task-automation.test.ts`: ok.
- `npm run typecheck --workspace @noctification/api`: ok.
- `npm run lint --workspace @noctification/api`: ok.
- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: ok.
- `npm run typecheck --workspace @noctification/web`: ok.
- `npm run lint --workspace @noctification/web`: ok.

### Estado atual

- O modulo de `tasks` agora cobre melhor os cinco proximos passos recomendados no roadmap sem introduzir refatoracao estrutural ampla.
- O que ainda fica pendente para um proximo ciclo mais profundo e migrar parte das metricas para agregacao backend/historico completo, caso queira reduzir inferencia feita no frontend.

## Execucao tasks roadmap - metricas agregadas no backend - 2026-03-29

### Mudancas aplicadas

- Foi criado um agregador administrativo em [`metrics.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/application/metrics.ts) para consolidar:
  - produtividade por janela
  - capacidade por responsavel
  - capacidade por equipe
- A rota [`/admin/tasks/metrics`](/home/leo/Noctification2/apps/api/src/modules/tasks/presentation/admin-routes.ts) passou a expor esse resumo usando os mesmos filtros operacionais do painel, incluindo `queue` e `window`.
- O frontend administrativo em [`AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx) deixou de calcular essas metricas localmente e passou a consumir o resumo retornado pela API via [`tasksApi.ts`](/home/leo/Noctification2/apps/web/src/features/tasks/api/tasksApi.ts).
- O arquivo [`adminTasksPanelModel.ts`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/adminTasksPanelModel.ts) ficou restrito a board, query e formulario, reduzindo mistura de responsabilidade no frontend.

### Validacao

- `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts src/test/task-automation.test.ts`: ok.
- `npm run typecheck --workspace @noctification/api`: ok.
- `npm run lint --workspace @noctification/api`: ok.
- `npm run test --workspace @noctification/web -- src/features/tasks/test/AdminTasksPanel.test.tsx src/features/tasks/test/TaskUserPanel.test.tsx src/components/AdminDashboard.test.tsx`: ok.
- `npm run typecheck --workspace @noctification/web`: ok.
- `npm run lint --workspace @noctification/web`: ok.

### Estado atual

- A camada gerencial do modulo de `tasks` ficou mais coerente: operacao no frontend, consolidacao gerencial no backend.
- O proximo passo natural, se quiser aprofundar, e expandir esse mesmo padrao para historico temporal mais detalhado por status e por usuario.

## Execucao tasks roadmap - correcoes da varredura - 2026-03-29

### Mudancas aplicadas

- A query [`fetchStaleCandidates`](/home/leo/Noctification2/apps/api/src/modules/tasks/application/automation-queries.ts) passou a excluir tarefas `blocked`, deixando o caso de bloqueio prolongado exclusivamente para `blocked_task`.
- O admin em [`AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx) passou a tratar falha de `adminTaskMetrics` como degradacao parcial:
  - tarefas, usuarios e saude continuam carregando
  - metricas podem falhar sem derrubar o board
- O indicador antes exibido como `conclusao` foi ajustado para `throughput`, alinhando melhor a leitura ao calculo atual retornado pelo backend.
- Entraram testes de protecao para:
  - ausencia de duplicidade `blocked_task` + `stale_task`
  - falha isolada do endpoint de metricas no admin

### Validacao

- `npm run test --workspace @noctification/api -- src/test/task-automation.test.ts src/test/task-routes.test.ts`: ok.
- `npm run typecheck --workspace @noctification/api`: ok.
- `npm run lint --workspace @noctification/api`: ok.
- `npm run test --workspace @noctification/web -- src/features/tasks/test/AdminTasksPanel.test.tsx src/features/tasks/test/TaskUserPanel.test.tsx src/components/AdminDashboard.test.tsx`: ok.
- `npm run typecheck --workspace @noctification/web`: ok.
- `npm run lint --workspace @noctification/web`: ok.

### Estado atual

- Os erros encontrados na varredura foram corrigidos sem ampliar o escopo funcional do modulo.
- O principal risco remanescente nao e mais regressao de fluxo, e sim refinamento semantico futuro das metricas gerenciais conforme a operacao amadurecer.
