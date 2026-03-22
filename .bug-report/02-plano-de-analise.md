# Plano de analise

## Ordem de execucao

1. Reconhecimento da stack e das ferramentas realmente disponiveis.
2. Execucao de `lint`, `typecheck`, testes de API, testes web e `build`.
3. Revisao manual de:
   - auth/sessao
   - notificacoes e filtros
   - socket/realtime
   - lembretes e scheduler
4. Reproducao minima dos achados com maior confianca.
5. Triagem e priorizacao.

## Ferramentas escolhidas

- `npm run lint`
  - Motivo: detectar erros objetivos de qualidade/sintaxe.
  - Escopo: workspaces `api` e `web`.
  - Confiabilidade: alta para problemas estaticos simples.
  - Achados esperados: erros de lint relevantes.

- `npm run typecheck`
  - Motivo: validar contratos TypeScript.
  - Escopo: workspaces `api` e `web`.
  - Confiabilidade: alta para inconsistencias de tipos.
  - Achados esperados: incompatibilidades de interfaces e chamadas.

- `npm run test:api`
  - Motivo: validar rotas, regras de negocio e scheduler cobertos.
  - Escopo: backend.
  - Confiabilidade: alta no que esta coberto; limitada fora da cobertura.
  - Achados esperados: regressao funcional nas rotas e no scheduler.

- `npm run test:web`
  - Motivo: validar fluxos principais de UI.
  - Escopo: frontend.
  - Confiabilidade: media/alta para os cenarios testados.
  - Achados esperados: regressao de tela, filtros e atualizacao de estado.

- `npm run build`
  - Motivo: comprovar integracao final e empacotamento.
  - Escopo: monorepo.
  - Confiabilidade: alta para problemas de compilacao/build.
  - Achados esperados: erros de build ou dependencia entre modulos.

- Reproducoes minimas com `node --import tsx -e ...`
  - Motivo: demonstrar bugs nao cobertos pelos testes automatizados.
  - Escopo: cenarios pontuais no backend.
  - Confiabilidade: alta, pois exercitam o codigo real com banco em memoria.

## Modulos prioritarios

- `apps/api/src/routes/me.ts`
- `apps/api/src/routes/admin.ts`
- `apps/api/src/socket.ts`
- `apps/api/src/routes/reminders-me.ts`
- `apps/api/src/reminders/scheduler.ts`
- `apps/web/src/App.tsx`

## Risco previsto

- Medio: varias regras dependem de compatibilidade com colunas legadas no SQLite.
- Medio: scheduler depende de estado persistido (`last_scheduled_for`).

## Limitacoes

- Nao houve exercicio manual em navegador real.
- Nao foi executado `npm audit`.
- A validacao de bugs fora da cobertura automatica foi feita com reproducoes minimas locais.

## Atualizacao 2026-03-21 - plano adaptado para frente de tarefas

### Ordem de execucao

1. Confirmar o `ROADMAP.md` atual como fonte de verdade e identificar a lacuna entre roadmap e implementacao real.
2. Atualizar o roadmap com uma nova frente incremental focada em:
   - tarefas como nucleo
   - notificacoes vinculadas como canal
   - automacoes reaproveitando o scheduler existente
3. Executar apenas a primeira etapa com baixo risco:
   - migration passiva de `tasks` e tabelas auxiliares minimas
   - tipos passivos no backend e frontend
   - sem alterar rotas, UI ou comportamento atual
4. Validar com teste direcionado de migracao e type safety no modulo afetado.

### Ferramentas escolhidas

- `sed`, `find`, `grep`
  - Motivo: reconhecimento e confirmacao de ausencia de modulo de tarefas no codigo atual.
  - Escopo: roadmap, migrations, rotas, tipos e estrutura do repositorio.
  - Confiabilidade: alta para evidencia estrutural.
  - Achados esperados: lacunas reais entre planejamento e implementacao.

- `npm run test --workspace @noctification/api -- <arquivo>`
  - Motivo: validar a nova migration e sua compatibilidade com o schema existente.
  - Escopo: backend, banco e migracoes.
  - Confiabilidade: alta para o escopo exercitado.
  - Achados esperados: regressao em migracao, schema ou contrato local.

- `npm run typecheck --workspace @noctification/api` e `npm run typecheck --workspace @noctification/web`
  - Motivo: confirmar que os novos tipos passivos nao quebram contratos existentes.
  - Escopo: workspaces afetados.
  - Confiabilidade: alta para compatibilidade estatica.
  - Achados esperados: erro de enum, tipo duplicado ou import inconsistente.

### Modulos prioritarios

- `ROADMAP.md`
- `apps/api/migrations`
- `apps/api/src/db.ts`
- `apps/api/src/types.ts`
- `apps/web/src/types.ts`

### Risco previsto

- Baixo, se a primeira etapa permanecer estritamente passiva e isolada em schema/tipos.
- Medio, caso a etapa tente acoplar notificacoes legadas a tarefas antes de haver CRUD e rollout controlado.

### Limitacoes desta rodada

- Nao sera implementado CRUD, UI, board, comentarios ou automacoes reais de tarefa.
- Nao sera alterada a tabela `notifications` nesta etapa.
- A validacao funcional ficara restrita a migracao e compatibilidade estatica dos contratos.

## Atualizacao 2026-03-21 - plano adaptado para UI minima de tarefas

### Ordem de execucao

1. Integrar `tasks` no roteamento do usuario e no menu administrativo existente.
2. Implementar painel minimo de tarefas para usuario e admin, reusando o cliente HTTP ja validado.
3. Extrair mapeamentos de status/prioridade e formatacao para helper compartilhado da UI.
4. Cobrir a nova superficie com testes direcionados de componentes e roteamento.
5. Validar com `typecheck` e suite focada do workspace `@noctification/web`.

### Ferramentas escolhidas

- `sed`, `grep`, `find`
  - Motivo: localizar pontos de entrada da navegacao atual e os contratos de tarefa ja expostos.
  - Escopo: `App.tsx`, componentes admin, testes e tipos do frontend.
  - Confiabilidade: alta para reconhecimento estrutural.
  - Achados esperados: lacunas de navegacao, tipos ausentes e areas de baixo risco para extensao.

- `npm run test --workspace @noctification/web -- <arquivos>`
  - Motivo: validar apenas a nova UI de tarefas e o roteamento relacionado.
  - Escopo: `TaskUserPanel`, `AdminTasksPanel` e `App`.
  - Confiabilidade: alta para o comportamento exercitado.
  - Achados esperados: regressao de renderizacao, integracao com cliente API e seletores ambiguos.

- `npm run typecheck --workspace @noctification/web`
  - Motivo: confirmar compatibilidade dos novos componentes e dos payloads enriquecidos de tarefa.
  - Escopo: workspace web.
  - Confiabilidade: alta para contratos estaticos.
  - Achados esperados: divergencia entre tipos, props e chamadas do cliente HTTP.

### Modulos prioritarios

- `apps/web/src/App.tsx`
- `apps/web/src/components/TaskUserPanel.tsx`
- `apps/web/src/components/admin/AdminTasksPanel.tsx`
- `apps/web/src/components/tasks/taskUi.ts`
- `apps/web/src/App.test.tsx`

### Risco previsto

- Baixo, se a etapa permanecer em UI minima consumindo o CRUD existente.
- Medio, se tentar introduzir board, realtime ou vinculacao de notificacao antes do proximo passo planejado.

### Limitacoes desta rodada

- A cobertura automatizada desta rodada e focada em carga inicial e criacao basica.
- Nao houve validacao em navegador real.
- A vinculacao opcional de notificacoes a tarefas continua fora de escopo.

## Atualizacao 2026-03-21 - plano adaptado para notificacoes vinculadas

### Ordem de execucao

1. Estender o schema de `notifications` com `source_task_id` opcional.
2. Atualizar o envio manual de notificacoes e o historico admin para carregar o novo campo sem quebrar o legado.
3. Introduzir helper compartilhado para emitir notificacoes vinculadas a tarefas nas rotas `tasks`.
4. Propagar `sourceTaskId` ate o frontend e exibir o vinculo na central do usuario e no historico admin.
5. Validar com migrations, rotas focadas, `typecheck` e testes de UI relacionados.

### Ferramentas escolhidas

- `sed`, `grep`, `find`
  - Motivo: localizar o caminho completo do payload de notificacao entre banco, API, socket e frontend.
  - Escopo: migrations, rotas, socket, tipos e componentes.
  - Confiabilidade: alta para reconhecimento estrutural.
  - Achados esperados: pontos de extensao de baixo risco e duplicacao de contrato.

- `npm run test --workspace @noctification/api -- <arquivos>`
  - Motivo: validar a coexistencia do novo campo com o legado e a emissao nas rotas de tarefa.
  - Escopo: migrations, `admin.ts`, `tasks-*.ts`.
  - Confiabilidade: alta para o fluxo exercitado.
  - Achados esperados: regressao de schema, listagem ou emissao de notificacao.

- `npm run test --workspace @noctification/web -- <arquivos>`
  - Motivo: validar a exibicao do vinculo de tarefa na UI atual.
  - Escopo: `UserDashboard`, `AdminHistoryPanel`, `AdminDashboard`, `NotificationAlertCenter`.
  - Confiabilidade: alta para o comportamento renderizado.
  - Achados esperados: perda do campo no payload, regressao de renderizacao ou quebra em tempo real.

### Modulos prioritarios

- `apps/api/migrations/013_notification_task_links.sql`
- `apps/api/src/tasks/notifications.ts`
- `apps/api/src/routes/admin.ts`
- `apps/api/src/routes/tasks-me.ts`
- `apps/api/src/routes/tasks-admin.ts`
- `apps/web/src/components/UserDashboard.tsx`
- `apps/web/src/components/admin/AdminHistoryPanel.tsx`

### Risco previsto

- Baixo, se o vinculo permanecer opcional e os disparos ficarem restritos a acoes manuais.
- Medio, se houver tentativa de incluir automacoes de prazo ou reuso do scheduler nesta mesma rodada.

### Limitacoes desta rodada

- Nao ha automacao de prazo, atraso ou recorrencia de tarefa.
- Nao ha navegacao dedicada de notificacao para abrir a tarefa.
- O historico legado continua sem `source_task_id`, por escolha deliberada de compatibilidade.

## Atualizacao 2026-03-21 - plano adaptado para automacoes operacionais

### Ordem de execucao

1. Introduzir schema passivo para logs de automacao com garantia de idempotencia.
2. Implementar um modulo dedicado de automacoes de tarefa separado das regras de lembrete.
3. Reaproveitar o tick do scheduler atual com flags independentes para os dois dominios.
4. Expor saude e logs minimos em rotas administrativas de tarefas.
5. Validar com testes focados de migration, scheduler/automacao, rotas administrativas e regressao do scheduler de lembretes.

### Ferramentas escolhidas

- `sed`, `find`, `grep`
  - Motivo: localizar os pontos de acoplamento entre scheduler, tarefas, notificacoes e admin.
  - Escopo: `scheduler.ts`, `tasks/*.ts`, `routes/tasks-admin.ts`, `config.ts`, `index.ts`.
  - Confiabilidade: alta para reconhecimento estrutural e delimitacao de baixo risco.
  - Achados esperados: locais de extensao do scheduler e contratos que exigem alinhamento.

- `npm run test --workspace @noctification/api -- <arquivos>`
  - Motivo: validar comportamento automatico, deduplicacao e nao regressao de lembretes.
  - Escopo: migrations, automacoes de tarefa, rotas administrativas e scheduler existente.
  - Confiabilidade: alta para os cenarios exercitados.
  - Achados esperados: duplicidade de disparo, conflito entre flags ou quebra de contrato HTTP.

- `npm run typecheck --workspace @noctification/api` e `npm run typecheck --workspace @noctification/web`
  - Motivo: alinhar os novos enums de evento, config flags e contratos consumidos pelo frontend.
  - Escopo: workspaces afetados.
  - Confiabilidade: alta para compatibilidade estatica.
  - Achados esperados: divergencia de tipos de evento, config ou payload de tarefa.

### Modulos prioritarios

- `apps/api/migrations/014_task_automation_logs.sql`
- `apps/api/src/tasks/automation.ts`
- `apps/api/src/reminders/scheduler.ts`
- `apps/api/src/routes/tasks-admin.ts`
- `apps/api/src/config.ts`
- `apps/api/src/index.ts`

### Risco previsto

- Baixo, se a automacao continuar desligada por flag e coberta por deduplicacao/logs.
- Medio, se a rodada tentar concluir recorrencia de tarefa ou alterar a semantica atual de lembretes no mesmo passo.

### Limitacoes desta rodada

- A recorrencia de tarefa permanece fora do primeiro corte seguro da Etapa 4.
- A validacao ficou concentrada no backend; nao houve nova interface web dedicada para observabilidade nesta rodada.
- Nao houve validacao em ambiente de longa execucao com scheduler real, apenas ciclos direcionados em teste.

## Atualizacao 2026-03-21 - plano adaptado para recorrencia de tarefa

### Ordem de execucao

1. Estender o schema de `tasks` para carregar configuracao de recorrencia e rastrear a tarefa de origem.
2. Atualizar o CRUD `me/admin` para aceitar `repeat_type` e `weekdays`.
3. Completar o scheduler de tarefas com `recurring_task`, mantendo logs e deduplicacao.
4. Expor a configuracao de recorrencia na UI minima existente para user/admin.
5. Validar com testes focados de migration, rotas, automacoes, regressao de lembretes e paineis web.

### Ferramentas escolhidas

- `sed`, `find`, `grep`
  - Motivo: localizar contratos de tarefa, pontos de conclusao e seletores da UI minima.
  - Escopo: migrations, `tasks/*.ts`, rotas `tasks-*`, paineis web e testes focados.
  - Confiabilidade: alta para reconhecimento estrutural.
  - Achados esperados: pontos minimos para encaixar recorrencia sem ampliar escopo.

- `npm run test --workspace @noctification/api -- <arquivos>`
  - Motivo: validar schema, CRUD recorrente, automacao `recurring_task` e nao regressao do scheduler legado.
  - Escopo: `task-migrations`, `task-routes`, `task-automation`, `reminder-*`, `notification-routes`.
  - Confiabilidade: alta para os fluxos exercitados.
  - Achados esperados: falhas de placeholder SQL, quebra de contrato de tarefa ou reprocessamento indevido.

- `npm run test --workspace @noctification/web -- <arquivos>`
  - Motivo: validar a nova configuracao de recorrencia nos dois paineis ja existentes.
  - Escopo: `TaskUserPanel` e `AdminTasksPanel`.
  - Confiabilidade: alta para a superficie renderizada.
  - Achados esperados: perda de payload, seletores ambiguos e regressao de formulario.

### Modulos prioritarios

- `apps/api/migrations/015_task_recurrence.sql`
- `apps/api/src/tasks/service.ts`
- `apps/api/src/tasks/automation.ts`
- `apps/api/src/routes/tasks-me.ts`
- `apps/api/src/routes/tasks-admin.ts`
- `apps/web/src/components/TaskUserPanel.tsx`
- `apps/web/src/components/admin/AdminTasksPanel.tsx`

### Risco previsto

- Baixo, se a recorrencia criar uma nova tarefa apenas apos conclusao e usar a mesma estrategia de deduplicacao ja adotada.
- Medio, se a rodada tentar introduzir board ou comentarios junto da recorrencia.

### Limitacoes desta rodada

- Nao houve nova tela administrativa de observabilidade; a superficie continua em `tasks/health` e `tasks/automation-logs`.
- Nao houve rollout real em scheduler de longa duracao.
- O passo seguinte ainda deve focar hardening e checklist de rollout, nao nova expansao de UX.

## Atualizacao 2026-03-21 - plano adaptado para hardening e rollout

### Ordem de execucao

1. Tornar `/api/v1/health` suficiente para inspecao externa do estado dos schedulers.
2. Cobrir esse contrato com teste dedicado.
3. Atualizar o env example da API com as flags de automacao de tarefa.
4. Adicionar documentacao versionada de rollout, sinais de aceite e rollback.
5. Endurecer o script de validacao Debian para checar a coerencia do health com o env.

### Ferramentas escolhidas

- `sed`, `find`, `grep`
  - Motivo: localizar os pontos operacionais existentes sem duplicar convencoes.
  - Escopo: `app.ts`, `ops/systemd`, `ops/scripts`, `docs/`.
  - Confiabilidade: alta para reconhecimento estrutural.
  - Achados esperados: lacunas entre codigo, env e validacao de deploy.

- `npm run typecheck --workspace @noctification/api`
  - Motivo: validar o ajuste de contrato do health.
  - Escopo: workspace API.
  - Confiabilidade: alta para compatibilidade estatica.
  - Achados esperados: regressao de tipos no app e nos testes.

- `npm run test --workspace @noctification/api -- <arquivos>`
  - Motivo: validar o health novo e preservar regressao das automacoes e lembretes.
  - Escopo: `health-routes`, `task-*`, `reminder-*`, `notification-routes`.
  - Confiabilidade: alta para o escopo exercitado.
  - Achados esperados: quebra no contrato do health ou regressao colateral na API.

- `bash -n ops/scripts/validate-debian-login.sh`
  - Motivo: validar sintaxe do script operacional alterado.
  - Escopo: script de validacao Debian.
  - Confiabilidade: media para sintaxe; nao substitui execucao real.
  - Achados esperados: erro de shell introduzido pela nova verificacao do health.

### Modulos prioritarios

- `apps/api/src/app.ts`
- `apps/api/src/test/health-routes.test.ts`
- `ops/systemd/api.env.example`
- `ops/scripts/validate-debian-login.sh`
- `docs/task-automation-rollout.md`

### Risco previsto

- Baixo, se a rodada permanecer em contrato de health e documentacao operacional.
- Medio, se tentar ativar de fato o scheduler ou mudar regras de negocio no mesmo passo.

### Limitacoes desta rodada

- Nao houve validacao em VM Debian real.
- O script operacional foi validado por sintaxe, nao por execucao completa nesta rodada.
- A conclusao da Fase 8 ainda depende de uso do checklist em ambiente real.

## Atualizacao 2026-03-22 - plano adaptado para comentarios por tarefa

### Ordem de execucao

1. Confirmar a ausencia de `task_comments` no schema e nas rotas atuais.
2. Introduzir migration e helpers dedicados no backend.
3. Expor comentarios no detalhe de tarefa e criar rotas de publicacao em `me/admin`.
4. Ajustar tipos e cliente HTTP do frontend.
5. Inserir bloco de comentarios no detalhe do usuario e do admin.
6. Validar com testes focados de API/web e `typecheck`.

### Ferramentas escolhidas

- `find`, `grep`, `sed`
  - Motivo: confirmar ausencia da feature e localizar os pontos de extensao reais.
  - Escopo: migrations, rotas, service, tipos e componentes de tarefas.
  - Confiabilidade: alta para reconhecimento estrutural.
  - Achados esperados: lacunas reais de schema, contrato e UI.

- `npm run test --workspace @noctification/api -- task-migrations task-routes`
  - Motivo: validar schema novo e contrato HTTP de comentarios sem rerodar a suite inteira.
  - Escopo: migration `016` e rotas `me/admin`.
  - Confiabilidade: alta para o comportamento exercitado.
  - Achados esperados: regressao em schema, autorizacao ou retorno de detalhe.

- `npm run test --workspace @noctification/web -- TaskUserPanel AdminTasksPanel`
  - Motivo: validar o detalhe de tarefa com comentarios nos dois paineis.
  - Escopo: componentes de tarefa do usuario e admin.
  - Confiabilidade: alta para o comportamento renderizado.
  - Achados esperados: quebra de contrato, falha no fluxo de envio ou regressao do board/detalhe.

- `npm run typecheck --workspace @noctification/api` e `npm run typecheck --workspace @noctification/web`
  - Motivo: alinhar contratos novos de comentario entre backend e frontend.
  - Escopo: workspaces afetados.
  - Confiabilidade: alta para incompatibilidades de tipo.
  - Achados esperados: divergencia de payload ou estado local.

### Modulos prioritarios

- `apps/api/migrations/016_task_comments.sql`
- `apps/api/src/tasks/service.ts`
- `apps/api/src/routes/tasks-me.ts`
- `apps/api/src/routes/tasks-admin.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/src/components/TaskUserPanel.tsx`
- `apps/web/src/components/admin/AdminTasksPanel.tsx`

### Risco previsto

- Baixo, se a rodada permanecer em comentarios HTTP-only e separados da timeline de eventos.
- Medio, se tentar mesclar comentarios ao stream de `task_events` ou incluir realtime.

### Limitacoes desta rodada

- A timeline continua separada de comentarios.
- Nao ha edicao ou exclusao de comentario.
- Nao ha notificacao ou socket especifico para comentario novo.
