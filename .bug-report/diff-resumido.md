# Diff resumido

## Arquivos alterados nesta rodada

- `.bug-report/premissas.md`
  - Motivo: registrar premissas e limites da analise.
  - Risco: nenhum para o produto.
  - Validacao associada: nao aplicavel.

- `.bug-report/01-reconhecimento.md`
  - Motivo: documentar estrutura, stack e estrategia.
  - Risco: nenhum para o produto.
  - Validacao associada: nao aplicavel.

- `.bug-report/02-plano-de-analise.md`
  - Motivo: registrar o plano adaptativo executado.
  - Risco: nenhum para o produto.
  - Validacao associada: nao aplicavel.

- `.bug-report/03-achados-brutos.md`
  - Motivo: registrar evidencias iniciais e reproducoes.
  - Risco: nenhum para o produto.
  - Validacao associada: checks e reproducoes locais.

- `.bug-report/achados.json`
  - Motivo: estruturar os achados em formato consumivel.
  - Risco: nenhum para o produto.
  - Validacao associada: coerencia com o relatorio.

- `.bug-report/04-priorizacao.md`
  - Motivo: ordenar os itens por impacto e confianca.
  - Risco: nenhum para o produto.
  - Validacao associada: coerencia com evidencias coletadas.

- `.bug-report/05-validacao.md`
  - Motivo: registrar o que foi efetivamente executado.
  - Risco: nenhum para o produto.
  - Validacao associada: saidas dos comandos e reproducoes.

- `.bug-report/06-pos-correcao.md`
  - Motivo: explicitar que nao houve etapa de correcao nesta rodada.
  - Risco: nenhum para o produto.
  - Validacao associada: nao aplicavel.

- `.bug-report/RELATORIO.md`
  - Motivo: consolidar o resultado final.
  - Risco: nenhum para o produto.
  - Validacao associada: coerencia com os arquivos anteriores.

- `.bug-report/bugs-final.json`
  - Motivo: consolidar o status final dos itens relevantes.
  - Risco: nenhum para o produto.
  - Validacao associada: coerencia com `achados.json`.

- `.bug-report/metricas.csv`
  - Motivo: fornecer visao tabular minima dos itens.
  - Risco: nenhum para o produto.
  - Validacao associada: coerencia com `bugs-final.json`.

- `apps/api/src/routes/admin.ts`
  - Motivo: corrigir derivacao de status operacional legado no historico admin.
  - Risco: baixo.
  - Validacao associada: `npm run test:api`.

- `apps/api/src/routes/me.ts`
  - Motivo: corrigir derivacao de status operacional legado para o usuario.
  - Risco: baixo.
  - Validacao associada: testes focados de notificacao + `npm run test:api`.

- `apps/api/src/socket.ts`
  - Motivo: corrigir compatibilidade legada usada pelo realtime de lembretes.
  - Risco: baixo.
  - Validacao associada: `npm run test:api`, `npm run build`.

- `apps/api/migrations/011_fix_assumida_operational_status.sql`
  - Motivo: reparar bases ja migradas com `operational_status` incorreto para `assumida`.
  - Risco: baixo.
  - Validacao associada: `npm run test:api`.

- `apps/api/src/routes/reminders-me.ts`
  - Motivo: recalcular a ancora do scheduler ao editar a agenda de um lembrete.
  - Risco: baixo.
  - Validacao associada: teste focado de lembrete + `npm run test:api`.

- `apps/api/src/test/notification-routes.test.ts`
  - Motivo: cobrir regressao de notificacao legada `assumida`.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/notification-routes.test.ts`.

- `apps/api/src/test/reminder-routes.test.ts`
  - Motivo: cobrir regressao de reprocessamento do scheduler apos edicao.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/reminder-routes.test.ts`.

- `.bug-report/correcoes/BUG-001.md`
  - Motivo: rastreabilidade da correcao do bug 001.
  - Risco: nenhum para o produto.
  - Validacao associada: documentacao.

- `.bug-report/correcoes/BUG-002.md`
  - Motivo: rastreabilidade da correcao do bug 002.
  - Risco: nenhum para o produto.
  - Validacao associada: documentacao.

- `apps/api/src/routes/auth.ts`
  - Motivo: rejeitar `expected_role` divergente antes de criar cookie de sessao.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/auth-routes.test.ts`.

- `apps/api/src/test/auth-routes.test.ts`
  - Motivo: cobrir a rejeicao de papel divergente sem cookie.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/auth-routes.test.ts`.

- `apps/web/src/lib/api.ts`
  - Motivo: enviar `expected_role` no login do frontend.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/App.test.tsx`.

- `apps/web/src/App.tsx`
  - Motivo: adicionar logout compensatorio caso chegue papel divergente.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/App.test.tsx`.

- `apps/web/src/App.test.tsx`
  - Motivo: cobrir envio de `expected_role` e logout compensatorio.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/App.test.tsx`.

- `.bug-report/correcoes/RISK-001.md`
  - Motivo: rastreabilidade da correcao do bug RISK-001.
  - Risco: nenhum para o produto.
  - Validacao associada: documentacao.

## Atualizacao 2026-03-21 - etapa 1 da frente de tarefas

- `ROADMAP.md`
  - Motivo: detalhar uma frente prioritaria de rollout seguro para tarefas, notificacoes vinculadas e automacoes.
  - Risco: nenhum para o produto.
  - Validacao associada: revisao documental e coerencia com o estado real do repositorio.

- `apps/api/migrations/012_tasks_foundation.sql`
  - Motivo: criar schema passivo de `tasks` e `task_events` sem alterar o fluxo legado.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-migrations.test.ts`.

- `apps/api/src/types.ts`
  - Motivo: expor contratos passivos de tarefa no backend.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/api`.

- `apps/web/src/types.ts`
  - Motivo: expor contratos passivos de tarefa no frontend.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/web`.

- `apps/api/src/test/task-migrations.test.ts`
  - Motivo: provar convivencia entre o schema novo de tarefas e os modulos existentes de notificacoes e lembretes.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-migrations.test.ts`.

- `.bug-report/bugs.json`
  - Motivo: registrar a triagem estruturada incluindo a melhoria executada nesta rodada.
  - Risco: nenhum para o produto.
  - Validacao associada: coerencia com `achados.json` e `bugs-final.json`.

- `.bug-report/correcoes/MEL-001.md`
  - Motivo: manter rastreabilidade da etapa 1 da frente de tarefas.
  - Risco: nenhum para o produto.
  - Validacao associada: documentacao.

- `apps/api/src/tasks/service.ts`
  - Motivo: concentrar validacao, normalizacao, consultas e trilha de eventos de tarefas.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts src/test/task-migrations.test.ts`.

- `apps/api/src/routes/tasks-me.ts`
  - Motivo: expor CRUD/lista/detalhe de tarefas no escopo do usuario autenticado.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts`.

- `apps/api/src/routes/tasks-admin.ts`
  - Motivo: expor CRUD/lista/detalhe de tarefas no escopo administrativo.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts`.

- `apps/api/src/app.ts`
  - Motivo: montar as novas rotas de tarefas no app principal.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/api`.

- `apps/api/src/test/task-routes.test.ts`
  - Motivo: validar fluxos essenciais do CRUD inicial de tarefas.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts`.

- `apps/web/src/lib/api.ts`
  - Motivo: expor cliente HTTP para consumo futuro da UI de tarefas.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/web`.

- `apps/web/src/types.ts`
  - Motivo: alinhar tipos do frontend ao payload atual de tarefas e eventos.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/web`.

- `.bug-report/correcoes/MEL-002.md`
  - Motivo: manter rastreabilidade do CRUD inicial de tarefas.
  - Risco: nenhum para o produto.
  - Validacao associada: documentacao.

## Atualizacao 2026-03-21 - UI minima de tarefas

- `ROADMAP.md`
  - Motivo: refletir a conclusao das Etapas 1 e 2 da frente de tarefas e apontar a Etapa 3 como proxima recomendacao segura.
  - Risco: nenhum para o produto.
  - Validacao associada: coerencia com o estado real do repositorio.

- `apps/web/src/App.tsx`
  - Motivo: adicionar a rota `/tasks` e integrar o painel minimo de tarefas ao fluxo do usuario autenticado.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/App.test.tsx`.

- `apps/web/src/components/TaskUserPanel.tsx`
  - Motivo: expor lista/detalhe inicial e criacao basica de tarefas para usuario.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/components/TaskUserPanel.test.tsx`.

- `apps/web/src/components/admin/AdminTasksPanel.tsx`
  - Motivo: expor fila administrativa minima de tarefas com detalhe inicial e criacao com responsavel.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/components/admin/AdminTasksPanel.test.tsx`.

- `apps/web/src/components/tasks/taskUi.ts`
  - Motivo: centralizar labels, badges e formatacao compartilhada da UI de tarefas.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/web`.

- `apps/web/src/components/AdminDashboard.tsx`
  - Motivo: montar o painel administrativo de tarefas no dashboard existente.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/web`.

- `apps/web/src/components/admin/AdminSidebar.tsx`
  - Motivo: adicionar entrada de menu para tarefas no console administrativo.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/web`.

- `apps/web/src/components/admin/types.ts`
  - Motivo: incluir `tasks` no contrato de navegacao administrativa.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/web`.

- `apps/web/src/types.ts`
  - Motivo: alinhar o frontend aos campos enriquecidos de tarefa e evento usados na nova UI.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/web`.

- `apps/web/src/App.test.tsx`
  - Motivo: cobrir roteamento da nova rota `/tasks` para usuario autenticado.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/App.test.tsx`.

- `apps/web/src/components/TaskUserPanel.test.tsx`
  - Motivo: cobrir carga inicial, detalhe automatico e criacao basica da UI de tarefas do usuario.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/components/TaskUserPanel.test.tsx`.

- `apps/web/src/components/admin/AdminTasksPanel.test.tsx`
  - Motivo: cobrir carga inicial, usuarios ativos e criacao basica da fila administrativa.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/components/admin/AdminTasksPanel.test.tsx`.

- `.bug-report/correcoes/MEL-003.md`
  - Motivo: manter rastreabilidade da UI minima de tarefas.
  - Risco: nenhum para o produto.
  - Validacao associada: documentacao.

## Atualizacao 2026-03-21 - notificacoes vinculadas a tarefa

- `ROADMAP.md`
  - Motivo: marcar a Etapa 3 como concluida no recorte seguro e mover automacoes de prazo para a Etapa 4.
  - Risco: nenhum para o produto.
  - Validacao associada: coerencia com o estado real do repositorio.

- `apps/api/migrations/013_notification_task_links.sql`
  - Motivo: adicionar `source_task_id` opcional em `notifications`.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-migrations.test.ts`.

- `apps/api/src/tasks/notifications.ts`
  - Motivo: centralizar insercao e emissao de notificacoes vinculadas a tarefa.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts src/test/notification-routes.test.ts`.

- `apps/api/src/routes/admin.ts`
  - Motivo: aceitar `source_task_id` opcional no envio manual e expor o campo no historico admin.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/notification-routes.test.ts`.

- `apps/api/src/routes/me.ts`
  - Motivo: expor `sourceTaskId` na central de notificacoes do usuario.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/api`.

- `apps/api/src/routes/tasks-me.ts`
  - Motivo: emitir notificacoes vinculadas em atribuicao e mudanca relevante de status no escopo do usuario.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts`.

- `apps/api/src/routes/tasks-admin.ts`
  - Motivo: emitir notificacoes vinculadas em atribuicao e mudanca relevante de status no escopo administrativo.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts`.

- `apps/api/src/socket.ts`
  - Motivo: propagar `sourceTaskId` nos payloads de realtime e de lembrete operacional.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/components/NotificationAlertCenter.test.tsx`.

- `apps/api/src/types.ts`
  - Motivo: alinhar o contrato de notificacao persistida ao novo campo opcional.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/api`.

- `apps/api/src/test/task-migrations.test.ts`
  - Motivo: cobrir a migration `013` e a persistencia do vinculo `notification -> task`.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-migrations.test.ts`.

- `apps/api/src/test/task-routes.test.ts`
  - Motivo: cobrir notificacoes emitidas pelas rotas de tarefa com `source_task_id`.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts`.

- `apps/api/src/test/notification-routes.test.ts`
  - Motivo: cobrir envio manual de notificacao com `source_task_id` opcional.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/notification-routes.test.ts`.

- `apps/web/src/lib/notificationEvents.ts`
  - Motivo: propagar `sourceTaskId` no contrato de eventos do frontend.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/web`.

- `apps/web/src/types.ts`
  - Motivo: incluir o vinculo opcional de tarefa nos tipos de notificacao do frontend.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/web`.

- `apps/web/src/components/UserDashboard.tsx`
  - Motivo: exibir o identificador da tarefa vinculada na central do usuario.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/components/UserDashboard.test.tsx`.

- `apps/web/src/components/NotificationAlertCenter.tsx`
  - Motivo: preservar o campo `sourceTaskId` ao montar notificacoes vindas do realtime.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/components/NotificationAlertCenter.test.tsx`.

- `apps/web/src/components/admin/AdminHistoryPanel.tsx`
  - Motivo: exibir a tarefa vinculada no historico administrativo de notificacoes.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/components/admin/AdminHistoryPanel.test.tsx`.

- `apps/web/src/components/admin/useAdminActions.ts`
  - Motivo: alinhar o tipo local de resposta de notificacao ao novo campo opcional.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/web`.

- `apps/web/src/components/UserDashboard.test.tsx`
  - Motivo: cobrir a exibicao do vinculo de tarefa na central do usuario.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/components/UserDashboard.test.tsx`.

- `apps/web/src/components/admin/AdminHistoryPanel.test.tsx`
  - Motivo: cobrir a exibicao do vinculo de tarefa no historico admin.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/components/admin/AdminHistoryPanel.test.tsx`.

- `.bug-report/correcoes/MEL-004.md`
  - Motivo: manter rastreabilidade da vinculacao opcional de notificacoes a tarefas.
  - Risco: nenhum para o produto.
  - Validacao associada: documentacao.

## Atualizacao 2026-03-21 - automacoes operacionais iniciais de tarefa

- `ROADMAP.md`
  - Motivo: marcar a Etapa 4 como em andamento e registrar o primeiro corte seguro ja entregue.
  - Risco: nenhum para o produto.
  - Validacao associada: coerencia com o estado real do repositorio.

- `apps/api/migrations/014_task_automation_logs.sql`
  - Motivo: criar persistencia dedicada para logs e deduplicacao das automacoes de tarefa.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-migrations.test.ts`.

- `apps/api/src/tasks/automation.ts`
  - Motivo: concentrar regras de `due_soon`, `overdue` e `stale_task`, com notificacoes vinculadas e `task_events`.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-automation.test.ts`.

- `apps/api/src/reminders/scheduler.ts`
  - Motivo: reaproveitar o tick atual com flags separadas para lembretes e automacoes de tarefa.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/reminder-scheduler.test.ts src/test/task-automation.test.ts`.

- `apps/api/src/routes/tasks-admin.ts`
  - Motivo: expor observabilidade minima por `health` e `automation-logs` no dominio administrativo de tarefas.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts`.

- `apps/api/src/config.ts`
  - Motivo: adicionar flags e janelas configuraveis para as automacoes operacionais.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/api`.

- `apps/api/src/index.ts`
  - Motivo: subir um scheduler operacional compartilhado sem remover o controle explicito por flag.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/reminder-scheduler.test.ts src/test/task-automation.test.ts`.

- `apps/api/src/types.ts`
  - Motivo: ampliar os tipos de evento de tarefa para refletir automacoes.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/api`.

- `apps/api/src/test/task-migrations.test.ts`
  - Motivo: cobrir a migration `014` e a tabela `task_automation_logs`.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-migrations.test.ts`.

- `apps/api/src/test/task-automation.test.ts`
  - Motivo: validar automacoes, notificacoes vinculadas e deduplicacao por chave.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-automation.test.ts`.

- `apps/api/src/test/task-routes.test.ts`
  - Motivo: cobrir as novas rotas administrativas de observabilidade.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts`.

- `apps/web/src/types.ts`
  - Motivo: alinhar o frontend aos novos eventos de automacao de tarefa.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/web`.

- `apps/web/src/components/tasks/taskUi.ts`
  - Motivo: mapear labels dos novos eventos automaticos no historico de tarefas.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/web`.

- `.bug-report/correcoes/MEL-005.md`
  - Motivo: manter rastreabilidade da primeira fatia da Etapa 4.
  - Risco: nenhum para o produto.
  - Validacao associada: documentacao.

## Atualizacao 2026-03-21 - recorrencia de tarefa

- `ROADMAP.md`
  - Motivo: marcar a Etapa 4 como concluida e reposicionar o proximo passo para hardening e rollout.
  - Risco: nenhum para o produto.
  - Validacao associada: coerencia com o estado real do repositorio.

- `apps/api/migrations/015_task_recurrence.sql`
  - Motivo: adicionar configuracao de recorrencia em `tasks` e ampliar `task_automation_logs` para `recurring_task`.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-migrations.test.ts`.

- `apps/api/src/tasks/service.ts`
  - Motivo: expor e normalizar `repeat_type`, `weekdays` e `recurrence_source_task_id` no dominio de tarefas.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/api`.

- `apps/api/src/tasks/automation.ts`
  - Motivo: completar a Etapa 4 com `recurring_task` e criacao automatica da proxima tarefa.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-automation.test.ts`.

- `apps/api/src/routes/tasks-me.ts`
  - Motivo: aceitar configuracao de recorrencia no CRUD do usuario.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts`.

- `apps/api/src/routes/tasks-admin.ts`
  - Motivo: aceitar configuracao de recorrencia no CRUD administrativo e no filtro de logs de automacao.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts`.

- `apps/api/src/test/task-migrations.test.ts`
  - Motivo: cobrir a migration `015` e a persistencia de recorrencia em tarefas.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-migrations.test.ts`.

- `apps/api/src/test/task-automation.test.ts`
  - Motivo: validar geracao da proxima tarefa recorrente sem duplicidade.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-automation.test.ts`.

- `apps/api/src/test/task-routes.test.ts`
  - Motivo: validar criacao e edicao de tarefa com recorrencia em `me/admin`.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts`.

- `apps/web/src/types.ts`
  - Motivo: alinhar o frontend aos novos campos de recorrencia de tarefa.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/web`.

- `apps/web/src/components/tasks/taskUi.ts`
  - Motivo: introduzir labels e resumo de recorrencia na UI de tarefas.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/web`.

- `apps/web/src/components/TaskUserPanel.tsx`
  - Motivo: expor configuracao e resumo de recorrencia para o usuario.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/components/TaskUserPanel.test.tsx`.

- `apps/web/src/components/admin/AdminTasksPanel.tsx`
  - Motivo: expor configuracao e resumo de recorrencia no painel administrativo.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/components/admin/AdminTasksPanel.test.tsx`.

- `apps/web/src/components/TaskUserPanel.test.tsx`
  - Motivo: cobrir envio de recorrencia no formulario do usuario.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/components/TaskUserPanel.test.tsx`.

- `apps/web/src/components/admin/AdminTasksPanel.test.tsx`
  - Motivo: cobrir envio de recorrencia no formulario administrativo.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/components/admin/AdminTasksPanel.test.tsx`.

- `.bug-report/correcoes/MEL-006.md`
  - Motivo: manter rastreabilidade do fechamento seguro da Etapa 4.
  - Risco: nenhum para o produto.
  - Validacao associada: documentacao.

## Atualizacao 2026-03-21 - hardening e rollout operacional

- `ROADMAP.md`
  - Motivo: refletir inicio da Fase 8 e reposicionar o proximo passo para rollout controlado.
  - Risco: nenhum para o produto.
  - Validacao associada: coerencia com o estado real do repositorio.

- `apps/api/src/app.ts`
  - Motivo: enriquecer o health publico com estado de schedulers e janelas da automacao de tarefas.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/health-routes.test.ts`.

- `apps/api/src/test/health-routes.test.ts`
  - Motivo: cobrir o contrato operacional de `/api/v1/health`.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/health-routes.test.ts`.

- `ops/systemd/api.env.example`
  - Motivo: documentar flags e janelas da automacao de tarefa no env de producao.
  - Risco: nenhum para o produto.
  - Validacao associada: revisao documental e coerencia com `config.ts`.

- `ops/scripts/validate-debian-login.sh`
  - Motivo: verificar a coerencia entre env e health no deploy Debian.
  - Risco: baixo.
  - Validacao associada: `bash -n ops/scripts/validate-debian-login.sh`.

- `docs/task-automation-rollout.md`
  - Motivo: registrar checklist, sinais de aceite e rollback da automacao de tarefa.
  - Risco: nenhum para o produto.
  - Validacao associada: revisao documental.

- `.bug-report/correcoes/MEL-007.md`
  - Motivo: manter rastreabilidade do hardening operacional desta rodada.
  - Risco: nenhum para o produto.
  - Validacao associada: documentacao.

## Atualizacao 2026-03-22 - comentarios por tarefa

- `apps/api/migrations/016_task_comments.sql`
  - Motivo: adicionar persistencia dedicada para comentarios por tarefa.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- task-migrations`.

- `apps/api/src/tasks/service.ts`
  - Motivo: validar, listar e criar comentarios no dominio de tarefas.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/api`.

- `apps/api/src/routes/tasks-me.ts`
  - Motivo: expor comentarios no detalhe do usuario e criar `POST /me/tasks/:id/comments`.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- task-routes`.

- `apps/api/src/routes/tasks-admin.ts`
  - Motivo: expor comentarios no detalhe administrativo e criar `POST /admin/tasks/:id/comments`.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- task-routes`.

- `apps/api/src/test/task-migrations.test.ts`
  - Motivo: cobrir a migration `016` e a convivencia do novo schema.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- task-migrations`.

- `apps/api/src/test/task-routes.test.ts`
  - Motivo: validar criacao e retorno de comentarios em `me/admin`.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- task-routes`.

- `apps/web/src/types.ts`
  - Motivo: alinhar o frontend ao contrato de comentarios por tarefa.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/web`.

- `apps/web/src/lib/api.ts`
  - Motivo: expor detalhes com `comments` e rotas de criacao de comentario.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/web`.

- `apps/web/src/components/TaskUserPanel.tsx`
  - Motivo: exibir e registrar comentarios no detalhe da tarefa do usuario.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/web -- TaskUserPanel`.

- `apps/web/src/components/admin/AdminTasksPanel.tsx`
  - Motivo: exibir e registrar comentarios no detalhe administrativo da tarefa.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/web -- AdminTasksPanel`.

- `apps/web/src/components/TaskUserPanel.test.tsx`
  - Motivo: cobrir renderizacao e envio de comentario pelo usuario.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/web -- TaskUserPanel`.

- `apps/web/src/components/admin/AdminTasksPanel.test.tsx`
  - Motivo: cobrir renderizacao e envio de comentario pelo admin.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/web -- AdminTasksPanel`.

- `.bug-report/correcoes/MEL-008.md`
  - Motivo: manter rastreabilidade da rodada de comentarios por tarefa.
  - Risco: nenhum para o produto.
  - Validacao associada: documentacao.

## Atualizacao 2026-03-22 - timeline unificada

- `apps/api/src/tasks/service.ts`
  - Motivo: adicionar `listTaskTimeline` para mesclar comentarios e eventos.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- task-routes`.

- `apps/api/src/routes/tasks-me.ts`
  - Motivo: expor `timeline` no detalhe da tarefa do usuario.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- task-routes`.

- `apps/api/src/routes/tasks-admin.ts`
  - Motivo: expor `timeline` no detalhe administrativo da tarefa.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- task-routes`.

- `apps/web/src/components/tasks/taskUi.ts`
  - Motivo: centralizar resumo e classificacao visual do item de timeline.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/web`.

- `apps/web/src/components/TaskUserPanel.tsx`
  - Motivo: trocar blocos separados por um historico unico.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/web -- TaskUserPanel`.

- `apps/web/src/components/admin/AdminTasksPanel.tsx`
  - Motivo: trocar blocos separados por um historico unico no detalhe admin.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/web -- AdminTasksPanel`.

- `apps/web/src/components/TaskUserPanel.test.tsx`
  - Motivo: cobrir o contrato e a renderizacao do historico unico do usuario.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/web -- TaskUserPanel`.

- `apps/web/src/components/admin/AdminTasksPanel.test.tsx`
  - Motivo: cobrir o contrato e a renderizacao do historico unico admin.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/web -- AdminTasksPanel`.

- `.bug-report/correcoes/MEL-009.md`
  - Motivo: manter rastreabilidade da rodada de timeline unificada.
  - Risco: nenhum para o produto.
  - Validacao associada: documentacao.

## Atualizacao 2026-03-22 - limpeza do contrato de detalhe

- `apps/api/src/routes/tasks-me.ts`
  - Motivo: remover `events/comments` do detalhe do usuario.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- task-routes`.

- `apps/api/src/routes/tasks-admin.ts`
  - Motivo: remover `events/comments` do detalhe administrativo.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- task-routes`.

- `apps/web/src/lib/api.ts`
  - Motivo: alinhar o cliente HTTP ao contrato simplificado.
  - Risco: baixo.
  - Validacao associada: `npm run typecheck --workspace @noctification/web`.

- `apps/api/src/test/task-routes.test.ts`
  - Motivo: validar apenas `timeline` no detalhe da tarefa.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- task-routes`.

- `apps/web/src/components/TaskUserPanel.test.tsx`
  - Motivo: remover dependencia de mocks redundantes do detalhe do usuario.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/web -- TaskUserPanel`.

- `apps/web/src/components/admin/AdminTasksPanel.test.tsx`
  - Motivo: remover dependencia de mocks redundantes do detalhe administrativo.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/web -- AdminTasksPanel`.

- `.bug-report/correcoes/MEL-010.md`
  - Motivo: manter rastreabilidade da limpeza final de contrato.
  - Risco: nenhum para o produto.
  - Validacao associada: documentacao.
