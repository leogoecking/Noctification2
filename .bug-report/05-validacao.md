# Fase 6 - Validacao das correcoes

## Validacoes executadas

### Rodada funcional manual por HTTP

- Frontend servido localmente em `http://127.0.0.1:5173` durante a rodada:
  - `GET /` -> `200 OK`, HTML principal do Vite entregue com `#root`, manifesto e bootstrap React.
- API acessivel em `http://127.0.0.1:4000/api/v1`:
  - `GET /health` -> `200 OK`
  - `POST /auth/login` como admin -> `200 OK`, cookie `nc_access`
  - `GET /auth/me` como admin -> `200 OK`
  - `POST /auth/register` para usuario novo -> `201 Created`, cookie `nc_access`
  - `GET /auth/me` como usuario -> `200 OK`
  - `GET /admin/users` -> `200 OK`
  - `POST /admin/notifications` -> `201 Created`
  - `GET /me/notifications?status=unread` -> `200 OK`
  - `POST /me/notifications/{id}/respond` -> `200 OK`
  - `POST /me/tasks` -> `201 Created`
  - `PATCH /me/tasks/{id}` -> `200 OK`
  - `POST /me/tasks/{id}/comments` -> `201 Created`
  - `POST /me/tasks/{id}/complete` -> `200 OK`
  - `GET /me/tasks?status=done` -> `200 OK`
  - `POST /me/reminders` -> `201 Created`
  - `PATCH /me/reminders/{id}` -> `200 OK`
  - `PATCH /me/reminders/{id}/toggle` -> `200 OK`
  - `GET /me/reminders` -> `200 OK`
  - `GET /admin/reminders/health` -> `200 OK`

### Pacote compartilhado

- `npm run typecheck --workspace @noctification/apr-core` -> passou
- `npm run test --workspace @noctification/apr-core` -> 3 arquivos / 9 testes passaram

### API

- `npm run typecheck --workspace @noctification/api` -> passou
- `npm run test --workspace @noctification/api` -> 15 arquivos passaram, 1 arquivo com 14 testes skipados
- `npm run lint --workspace @noctification/api` -> falhou antes da correcao, passou depois

### Web

- `npm run typecheck --workspace @noctification/web` -> passou
- `npm run lint --workspace @noctification/web` -> passou
- `npm run test --workspace @noctification/web` -> falhou antes da correcao em `src/App.test.tsx`, passou depois com 17 arquivos / 94 testes

### Validacao agregada

- `npm run lint` -> passou
- `npm run typecheck` -> passou
- `npm run test` -> passou

## O que nao foi validado

- Nao executei browser real com interacao visual da UI nem fluxo de service worker/web push em navegador real.
- Nao validei deploy Debian/nginx/systemd durante esta rodada.
- A API em `:4000` ja estava ocupada antes da subida manual; a rodada HTTP validou a instancia existente que expunha o contrato esperado do projeto.
## Analise incremental 2026-03-28

### Validacoes executadas

- `npm run lint` na raiz: concluido com sucesso.
- `npm run typecheck` na raiz: concluido com sucesso.
- Leitura direcionada de [`package.json`](/home/leo/Noctification2/package.json), [`.github/workflows/main.yml`](/home/leo/Noctification2/.github/workflows/main.yml), [`.eslintrc.cjs`](/home/leo/Noctification2/.eslintrc.cjs), [`.gitignore`](/home/leo/Noctification2/.gitignore), [`apps/api/src/index.ts`](/home/leo/Noctification2/apps/api/src/index.ts) e [`apps/web/src/App.tsx`](/home/leo/Noctification2/apps/web/src/App.tsx).
- Medicao de tamanho por arquivo e inventario de diretorios criticos.

### Nao validado nesta rodada

- Suíte completa de testes `npm run test`.
- Fluxos de browser/e2e.
- Build e smoke de deploy Debian/nginx/systemd.
- Comportamentos em runtime dos modulos `tasks`, `reminders`, `APR` e `web push`.

## Implementacao Fase 1 - 2026-03-29

### Validacoes executadas

- `npm run lint`: concluido com sucesso.
- `npm run typecheck`: concluido com sucesso.
- `git rm --cached apps/web/tsconfig.tsbuildinfo`: concluido com sucesso para parar de versionar artefato gerado.
- Inspecao de configuracao `npm`: warning `globalignorefile` confirmado como externo ao repositorio via `npm config list -l`.

### Resultado observado

- [`.gitignore`](/home/leo/Noctification2/.gitignore) agora ignora `*.tsbuildinfo`.
- [`.github/workflows/main.yml`](/home/leo/Noctification2/.github/workflows/main.yml) reduziu reinstalacoes ao consolidar `lint`, `typecheck`, `test:api` e `test:web` em um unico job.
- O warning `globalignorefile` continua localmente porque sua origem foi identificada no `npm` global do ambiente, nao em arquivo versionado deste repositorio.

## Implementacao Fase 2 parcial - 2026-03-29

### Validacoes executadas

- `npm run lint`: concluido com sucesso.
- `npm run typecheck`: concluido com sucesso.
- `npm run test:web`: executado; os testes alterados passaram e houve uma falha isolada em `ReminderUserPanel`.
- `npm run test --workspace @noctification/web -- src/components/ReminderUserPanel.test.tsx`: rerun isolado passou.
- `npm run test --workspace @noctification/web -- src/components/TaskUserPanel.test.tsx src/components/admin/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: passou.

### Resultado observado

- [`package.json`](/home/leo/Noctification2/package.json) ganhou scripts seletivos de `build`, `test` e `check` por workspace, reduzindo atrito para validacao localizada.
- [`apps/web/src/test/fixtures.ts`](/home/leo/Noctification2/apps/web/src/test/fixtures.ts) centralizou factories reutilizaveis para testes web.
- Os testes [`apps/web/src/components/TaskUserPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/components/TaskUserPanel.test.tsx), [`apps/web/src/components/admin/AdminTasksPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/components/admin/AdminTasksPanel.test.tsx) e [`apps/web/src/components/AdminDashboard.test.tsx`](/home/leo/Noctification2/apps/web/src/components/AdminDashboard.test.tsx) ficaram menos repetitivos, usando fixtures e helpers de render.
- A falha observada em `ReminderUserPanel` nao apresentou reproducao no rerun isolado, entao foi tratada como flake pontual da suite e nao como regressao confirmada desta mudanca.

## Migracao tasks backend - presentation - 2026-03-29

### Validacoes executadas

- `npm run lint --workspace @noctification/api`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/api`: concluido com sucesso.
- `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts src/test/task-automation.test.ts`: concluido com sucesso.

### Resultado observado

- A borda HTTP de `tasks` saiu de `routes/` e passou para [`apps/api/src/modules/tasks/presentation`](/home/leo/Noctification2/apps/api/src/modules/tasks/presentation).
- Os consumidores imediatos foram atualizados com sucesso:
  - [`apps/api/src/app.ts`](/home/leo/Noctification2/apps/api/src/app.ts)
  - [`apps/api/src/test/task-routes.test.ts`](/home/leo/Noctification2/apps/api/src/test/task-routes.test.ts)
- Nao houve evidencia de regressao funcional nas rotas e na automacao de `tasks` dentro do escopo validado.

## Migracao tasks backend - application - 2026-03-29

### Validacoes executadas

- `npm run lint --workspace @noctification/api`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/api`: concluido com sucesso.
- `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts src/test/task-automation.test.ts`: concluido com sucesso.

### Resultado observado

- A camada `application` de `tasks` foi agrupada em [`apps/api/src/modules/tasks/application`](/home/leo/Noctification2/apps/api/src/modules/tasks/application).
- Foram migrados com sucesso:
  - `service.ts`
  - `notifications.ts`
  - `automation.ts`
  - `automation-definitions.ts`
  - `automation-operations.ts`
  - `automation-queries.ts`
- `automation-recurrence.ts`
- A infraestrutura ainda localizada em [`apps/api/src/tasks`](/home/leo/Noctification2/apps/api/src/tasks) foi ajustada para consumir a nova camada `application`, sem necessidade de mover a persistencia nesta rodada.

## Migracao tasks backend - infrastructure - 2026-03-29

### Validacoes executadas

- `npm run lint --workspace @noctification/api`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/api`: concluido com sucesso.
- `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts src/test/task-automation.test.ts`: concluido com sucesso.

### Resultado observado

- A camada `infrastructure` de `tasks` foi agrupada em [`apps/api/src/modules/tasks/infrastructure`](/home/leo/Noctification2/apps/api/src/modules/tasks/infrastructure).
- Foram migrados com sucesso:
  - `task-create-mutation.ts`
  - `task-update-mutation.ts`
  - `task-terminal-mutation.ts`
  - `task-mutation-shared.ts`
- `task-mutations.ts`
- A camada `presentation` passou a depender apenas de `modules/tasks/presentation`, `modules/tasks/application` e `modules/tasks/infrastructure`.
- A pasta legada [`apps/api/src/tasks`](/home/leo/Noctification2/apps/api/src/tasks) ficou reduzida aos artefatos ainda nao migrados de `domain`: `domain.ts` e `automation-types.ts`.

## Migracao tasks backend - domain e fechamento do modulo - 2026-03-29

### Validacoes executadas

- `npm run lint --workspace @noctification/api`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/api`: concluido com sucesso.
- `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts src/test/task-automation.test.ts`: concluido com sucesso.

### Resultado observado

- `domain.ts` e `automation-types.ts` foram migrados para [`apps/api/src/modules/tasks/domain`](/home/leo/Noctification2/apps/api/src/modules/tasks/domain).
- Foi criado [`apps/api/src/modules/tasks/index.ts`](/home/leo/Noctification2/apps/api/src/modules/tasks/index.ts) para expor as rotas principais do modulo.
- [`apps/api/src/app.ts`](/home/leo/Noctification2/apps/api/src/app.ts) passou a importar `tasks` pelo entrypoint do modulo.
- A pasta legada [`apps/api/src/tasks`](/home/leo/Noctification2/apps/api/src/tasks) nao contem mais arquivos ativos.

## Migracao tasks frontend - 2026-03-29

### Validacoes executadas

- `npm run lint --workspace @noctification/web`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/web`: concluido com sucesso.
- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: concluido com sucesso.

### Resultado observado

- A API da feature foi migrada para [`apps/web/src/features/tasks/api/tasksApi.ts`](/home/leo/Noctification2/apps/web/src/features/tasks/api/tasksApi.ts).
- O painel do usuario foi migrado para [`apps/web/src/features/tasks/components/TaskUserPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/components/TaskUserPanel.tsx).
- O painel admin e seu model foram migrados para:
  - [`apps/web/src/features/tasks/admin/AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx)
  - [`apps/web/src/features/tasks/admin/adminTasksPanelModel.ts`](/home/leo/Noctification2/apps/web/src/features/tasks/admin/adminTasksPanelModel.ts)
- Os testes de `tasks` foram movidos para:
  - [`apps/web/src/features/tasks/test/TaskUserPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/test/TaskUserPanel.test.tsx)
  - [`apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx)
- Foi criado [`apps/web/src/features/tasks/index.ts`](/home/leo/Noctification2/apps/web/src/features/tasks/index.ts) para expor a feature.

## Tasks workflow operacional - status expandidos - 2026-03-29

### Validacoes executadas

- `npm run test --workspace @noctification/api -- src/test/task-migrations.test.ts src/test/task-automation.test.ts`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/api`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/web`: concluido com sucesso.
- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: concluido com sucesso.
- `npm run lint --workspace @noctification/api`: concluido com sucesso.
- `npm run lint --workspace @noctification/web`: concluido com sucesso.

### Resultado observado

- O dominio de `tasks` passou a aceitar os status `assumed`, `blocked` e `waiting_external`, preservando `done` e `cancelled` como terminais.
- Foi criada a migracao [`apps/api/migrations/020_task_status_workflow.sql`](/home/leo/Noctification2/apps/api/migrations/020_task_status_workflow.sql), que converte `waiting` legado para `waiting_external` e recompõe as tabelas relacionadas sem perder dados.
- O board e o detalhe de tarefa no web passaram a expor acoes rapidas coerentes com o workflow operacional:
  - assumir
  - em andamento
  - bloqueada
  - aguardando externo
- Os filtros de status do usuario e do admin foram alinhados ao novo workflow.
- Os testes focados de backend e frontend foram atualizados para o novo estado `waiting_external`.

## Tasks workflow operacional - SLA visual e filas rapidas - 2026-03-29

### Validacoes executadas

- `npm run typecheck --workspace @noctification/web`: concluido com sucesso.
- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: concluido com sucesso.
- `npm run lint --workspace @noctification/web`: concluido com sucesso.

### Resultado observado

- O frontend de `tasks` passou a calcular SLA visual a partir de `dueAt`, `updatedAt`, `assigneeUserId` e `status`, sem depender de mudancas novas de backend.
- O board e o detalhe passaram a exibir sinais operacionais como `Atrasada`, `Vence hoje`, `Vence em breve`, `Bloqueada`, `Parada 24h+` e `Sem prazo`.
- Foram adicionadas filas rapidas no painel do usuario e no painel administrativo para acelerar leitura e priorizacao:
  - `Todas`
  - `Vence hoje`
  - `Atrasadas`
  - `Bloqueadas`
  - `Paradas 24h+`
  - `Sem responsavel` no admin
- As tarefas agora sao ordenadas no kanban por urgencia operacional e prioridade, reduzindo o custo de leitura da fila.
- Foram adicionados testes focados cobrindo:
  - fila rapida `Atrasadas` no usuario
  - fila rapida `Sem responsavel` no admin

## Tasks workflow operacional - filtros salvos persistidos - 2026-03-29

### Validacoes executadas

- `npm run typecheck --workspace @noctification/web`: concluido com sucesso.
- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: concluido com sucesso.
- `npm run lint --workspace @noctification/web`: concluido com sucesso.

### Resultado observado

- Os filtros operacionais do painel do usuario passaram a ser persistidos em `localStorage`:
  - status
  - prioridade
  - fila rapida
- Os filtros operacionais do painel admin passaram a ser persistidos em `localStorage`:
  - status
  - prioridade
  - responsavel
  - fila rapida
- A restauracao inicial foi coberta com testes focados para evitar perda de contexto ao recarregar a tela ou voltar para o modulo.

## Tasks workflow operacional - bulk actions no admin - 2026-03-29

### Validacoes executadas

- `npm run typecheck --workspace @noctification/web`: concluido com sucesso.
- `npm run test --workspace @noctification/web -- src/features/tasks/test/AdminTasksPanel.test.tsx src/features/tasks/test/TaskUserPanel.test.tsx src/components/AdminDashboard.test.tsx`: concluido com sucesso.
- `npm run lint --workspace @noctification/web`: concluido com sucesso.

### Resultado observado

- O board administrativo passou a suportar selecao multipla diretamente nos cards.
- Foi adicionada uma barra de `bulk actions` no admin para:
  - assumir em lote
  - mover para em andamento em lote
  - bloquear em lote
  - mover para aguardando externo em lote
  - concluir em lote
  - cancelar em lote
  - reatribuir responsavel em lote
- A execucao em lote reutiliza as rotas existentes de tarefa, sem introduzir endpoint novo nesta rodada.
- Foi adicionada cobertura de teste para mudanca de status em lote no admin.

## Tasks workflow operacional - drag and drop no kanban - 2026-03-29

### Validacoes executadas

- `npm run typecheck --workspace @noctification/web`: concluido com sucesso.
- `npm run test --workspace @noctification/web -- src/features/tasks/test/AdminTasksPanel.test.tsx src/features/tasks/test/TaskUserPanel.test.tsx src/components/AdminDashboard.test.tsx`: concluido com sucesso.
- `npm run lint --workspace @noctification/web`: concluido com sucesso.

### Resultado observado

- O kanban compartilhado passou a suportar `drag and drop` nativo entre colunas operacionais.
- Apenas status nao-terminais participam do arraste:
  - `new`
  - `assumed`
  - `in_progress`
  - `blocked`
  - `waiting_external`
- O drop reutiliza a mesma acao de atualizacao de status ja existente, sem rota nova.
- Foi adicionada cobertura de teste para mover tarefa por `drag and drop` no board administrativo.

## Tasks produtividade operacional - carga por responsavel - 2026-03-29

### Validacoes executadas

- `npm run test --workspace @noctification/web -- src/features/tasks/test/AdminTasksPanel.test.tsx src/features/tasks/test/TaskUserPanel.test.tsx src/components/AdminDashboard.test.tsx`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/web`: concluido com sucesso.
- `npm run lint --workspace @noctification/web`: concluido com sucesso.

### Resultado observado

- O painel administrativo passou a exibir um bloco de capacidade por responsavel dentro do filtro atual.
- O resumo operacional por pessoa consolida:
  - tarefas abertas
  - tarefas atrasadas
  - tarefas criticas
  - tarefas bloqueadas
  - tarefas concluidas
- A ordenacao prioriza maior risco operacional, favorecendo responsaveis com mais atraso, criticidade e carga aberta.
- Foi adicionada cobertura de teste para garantir a exibicao desse resumo sem depender de seletores ambiguos do restante do dashboard.

## Tasks produtividade operacional - metricas por periodo - 2026-03-29

### Validacoes executadas

- `npm run test --workspace @noctification/web -- src/features/tasks/test/AdminTasksPanel.test.tsx src/features/tasks/test/TaskUserPanel.test.tsx src/components/AdminDashboard.test.tsx`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/web`: concluido com sucesso.
- `npm run lint --workspace @noctification/web`: concluido com sucesso.

### Resultado observado

- O painel administrativo passou a exibir uma janela operacional com alternancia entre `7 dias` e `30 dias`.
- As metricas sao calculadas a partir da fila filtrada atual, sem depender de endpoint novo.
- O resumo passou a mostrar:
  - tarefas criadas no periodo
  - tarefas concluidas no periodo
  - concluidas no prazo
  - concluidas em atraso
  - ciclo medio
  - tempo medio ate iniciar
  - tarefas abertas atrasadas
- tarefas bloqueadas
- Foi adicionada cobertura de teste para a troca de janela e para os indicadores principais do resumo.

## Tasks frontend - limpeza visual inicial do board - 2026-03-29

### Validacoes executadas

- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/web`: concluido com sucesso.
- `npm run lint --workspace @noctification/web`: concluido com sucesso.

### Resultado observado

- Os cards do kanban deixaram de concentrar acoes inline em massa.
- As acoes da tarefa selecionada foram centralizadas em uma barra contextual no topo do board.
- O card voltou a cumprir papel mais claro de leitura, selecao e arraste.
- A navegacao pelo detalhe foi preservada e o `drag and drop` continuou funcionando.
- Os testes de interacao do board no painel do usuario e no admin foram ajustados para o novo fluxo.

## Tasks frontend - admin com foco operacional e visao gerencial secundaria - 2026-03-29

### Validacoes executadas

- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/web`: concluido com sucesso.
- `npm run lint --workspace @noctification/web`: concluido com sucesso.

### Resultado observado

- O topo do admin deixou de exibir imediatamente os blocos de produtividade, capacidade e automacao.
- Esses blocos passaram para uma secao `Visao gerencial`, recolhida por padrao e posicionada apos a area operacional.
- A fila, o formulario e as acoes de lote ficaram com prioridade visual na tela.
- Os testes administrativos foram ajustados para abrir explicitamente a visao gerencial antes de validar indicadores secundarios.

## Tasks frontend - simplificacao do drawer de detalhe - 2026-03-29

### Validacoes executadas

- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/web`: concluido com sucesso.
- `npm run lint --workspace @noctification/web`: concluido com sucesso.

### Resultado observado

- O `TaskDetailSheet` deixou de exibir um bloco com muitas acoes paralelas de status.
- O drawer passou a destacar apenas:
  - editar
  - acao principal contextual
  - concluir
  - cancelar
- O historico foi movido para uma area expansivel, mantendo acesso ao contexto sem ocupar tanto espaco visual.
- O fluxo principal de status segue no board, e o drawer ficou mais adequado para contexto e decisao final.

## Tasks frontend - formulario administrativo recolhivel - 2026-03-29

### Validacoes executadas

- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/web`: concluido com sucesso.
- `npm run lint --workspace @noctification/web`: concluido com sucesso.

### Resultado observado

- O formulario administrativo deixou de ficar aberto permanentemente na tela.
- A criacao de tarefa passou a exigir abertura explicita do formulario, reduzindo competicao visual com o board.
- A edicao continua abrindo o formulario automaticamente quando o usuario aciona `Editar`.
- O fechamento do formulario tambem limpa o estado local da composicao, mantendo o fluxo previsivel.

## Tasks frontend - visao rapida compactada - 2026-03-29

### Validacoes executadas

- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/web`: concluido com sucesso.
- `npm run lint --workspace @noctification/web`: concluido com sucesso.

### Resultado observado

- A antiga `Visao rapida` deixou de ocupar um card inteiro tanto no painel do usuario quanto no admin.
- O resumo passou a existir como uma faixa compacta de chips logo abaixo do header.
- Foram mantidos apenas sinais essenciais de leitura imediata:
  - total
  - abertas
  - concluidas
- criticidade ou sem responsavel quando relevante
- O topo dos paineis ficou mais leve e com menos competicao visual com a fila.

## Tasks frontend - criacao via kanban com modal - 2026-03-29

### Validacoes executadas

- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/web`: concluido com sucesso.
- `npm run lint --workspace @noctification/web`: concluido com sucesso.

### Resultado observado

- A criacao de tarefa deixou de depender de um formulario fixo na pagina.
- O `TaskBoard` passou a expor uma acao primaria `Novo` no contexto do kanban.
- Ao clicar em `Novo`, a criacao abre em modal tanto no painel do usuario quanto no admin.
- A edicao continua reaproveitando o mesmo formulario, tambem em modal.
- O fluxo de criacao ficou mais alinhado ao board e com menos deslocamento visual.

## Tasks frontend - edicao com modal centralizado - 2026-03-29

### Validacoes executadas

- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/web`: concluido com sucesso.
- `npm run lint --workspace @noctification/web`: concluido com sucesso.

### Resultado observado

- A edicao de tarefa passou a fechar o drawer de detalhe antes de abrir a composicao.
- O formulario de edicao agora usa o mesmo modal centralizado ja adotado na criacao por `Novo`.
- O fluxo ficou consistente entre criar e editar, sem manter duas superficies abertas ao mesmo tempo.

## Tasks frontend - detalhe com modal centralizado - 2026-03-29

### Validacoes executadas

- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/web`: concluido com sucesso.
- `npm run lint --workspace @noctification/web`: concluido com sucesso.

### Resultado observado

- O detalhe da tarefa deixou de abrir como drawer lateral.
- O conteiner do detalhe agora usa o mesmo padrao de overlay centralizado do formulario de composicao.
- O fluxo visual de `ver`, `editar` e `criar` ficou mais uniforme no contexto do kanban.

## Tasks roadmap - historico, alertas, metricas e filtros - 2026-03-29

### Validacoes executadas

- `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts src/test/task-automation.test.ts`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/api`: concluido com sucesso.
- `npm run lint --workspace @noctification/api`: concluido com sucesso.
- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx src/features/tasks/test/AdminTasksPanel.test.tsx src/components/AdminDashboard.test.tsx`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/web`: concluido com sucesso.
- `npm run lint --workspace @noctification/web`: concluido com sucesso.

### Resultado observado

- O historico operacional ficou mais forte:
  - eventos especificos para titulo, descricao e prioridade
  - detalhes adicionais no timeline para atribuicao, prazo e eventos terminais
- O scheduler passou a distinguir tarefas bloqueadas ha mais de 24h com automacao propria `blocked_task`.
- A saude da automacao no admin passou a expor elegiveis e alertas emitidos para bloqueio prolongado.
- As metricas gerenciais do admin ficaram mais ricas:
  - taxa no prazo
  - taxa de conclusao
  - ciclo medio por responsavel
  - agrupamento por responsavel ou equipe
- Os filtros do board ficaram mais compactos:
  - filtros principais sempre visiveis
  - prioridade em `Mais filtros`
  - limpeza rapida de filtros

## Tasks roadmap - metricas movidas para backend - 2026-03-29

### Validacoes executadas

- `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts src/test/task-automation.test.ts`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/api`: concluido com sucesso.
- `npm run lint --workspace @noctification/api`: concluido com sucesso.
- `npm run test --workspace @noctification/web -- src/features/tasks/test/AdminTasksPanel.test.tsx src/features/tasks/test/TaskUserPanel.test.tsx src/components/AdminDashboard.test.tsx`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/web`: concluido com sucesso.
- `npm run lint --workspace @noctification/web`: concluido com sucesso.

### Resultado observado

- O admin deixou de depender de agregacao local para produtividade e capacidade.
- As metricas passam a vir do endpoint administrativo dedicado `/admin/tasks/metrics`.
- O frontend continua controlando a experiencia de filtro e fila, mas a consolidacao gerencial agora fica no backend.

## Tasks roadmap - correcoes de varredura - 2026-03-29

### Validacoes executadas

- `npm run test --workspace @noctification/api -- src/test/task-automation.test.ts src/test/task-routes.test.ts`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/api`: concluido com sucesso.
- `npm run lint --workspace @noctification/api`: concluido com sucesso.
- `npm run test --workspace @noctification/web -- src/features/tasks/test/AdminTasksPanel.test.tsx src/features/tasks/test/TaskUserPanel.test.tsx src/components/AdminDashboard.test.tsx`: concluido com sucesso.
- `npm run typecheck --workspace @noctification/web`: concluido com sucesso.
- `npm run lint --workspace @noctification/web`: concluido com sucesso.

### Resultado observado

- Tarefas `blocked` deixaram de disparar tambem a automacao `stale_task`, evitando alerta duplicado no mesmo ciclo.
- O painel admin passou a degradar metricas de forma isolada:
  - a fila operacional continua carregando
  - a area gerencial mostra `Metricas indisponiveis no momento.`
- O indicador `completionRate` deixou de representar uma proporcao potencialmente acima de 100% e foi apresentado no frontend como `throughput`, coerente com o calculo atual.
