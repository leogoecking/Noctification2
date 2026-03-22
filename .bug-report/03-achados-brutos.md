# Achados brutos

## Validacoes executadas

- `npm run lint`: aprovado.
- `npm run typecheck`: aprovado.
- `npm run test:api`: aprovado.
- `npm run test:web`: aprovado.
- `npm run build`: aprovado.

Observacao:
- `npm` emitiu warnings sobre `globalignorefile`, mas sem bloquear execucao.

## Achado 1

- ID: `BUG-001`
- Tipo: `bug_reproduzivel`
- Severidade preliminar: alta
- Componente: notificacoes de usuario / compatibilidade legado
- Arquivos:
  - `apps/api/migrations/005_notification_operational_status.sql`
  - `apps/api/src/routes/me.ts`
  - `apps/api/src/socket.ts`
- Evidencia:
  - A migracao de backfill nao trata `response_status = 'assumida'`.
  - A rota do usuario tambem nao mapeia `assumida` ao derivar `operationalStatus`.
  - O realtime de lembretes repete a mesma omissao.
  - Reproducao minima local:
    - inserido registro com `response_status = 'assumida'` e `operational_status = NULL`
    - `GET /me/notifications` retornou `operationalStatus = "recebida"` e `responseStatus = null`
    - resultado observado:

```json
{
  "notifications": [
    {
      "operationalStatus": "recebida",
      "responseStatus": null
    }
  ]
}
```

- Impacto observado:
  - estado operacional legado fica incorreto para o usuario;
  - filtros e UI podem exibir item como nao assumido;
  - lembretes de progresso podem nao ser enviados para esses casos.

## Achado 2

- ID: `BUG-002`
- Tipo: `bug_reproduzivel`
- Severidade preliminar: alta
- Componente: edicao de lembretes / scheduler
- Arquivos:
  - `apps/api/src/routes/reminders-me.ts`
  - `apps/api/src/reminders/scheduler.ts`
- Evidencia:
  - a rota de edicao atualiza `start_date`, `time_of_day`, `timezone` e `repeat_type`, mas preserva `last_scheduled_for`;
  - o scheduler calcula o proximo disparo a partir de `last_scheduled_for` quando esse campo existe.
  - Reproducao minima local:
    - lembrete diario com `last_scheduled_for = 2026-03-13T12:00:00.000Z` (09:00 local)
    - `PATCH /me/reminders/:id` alterando `timeOfDay` para `20:00`
    - scheduler executado em `2026-03-14T23:30:00.000Z`
    - resultado observado:

```json
{
  "patchStatus": 200,
  "updated": {
    "timeOfDay": "20:00",
    "lastScheduledFor": "2026-03-13T12:00:00.000Z"
  },
  "occurrence": {
    "scheduledFor": "2026-03-14T12:00:00.000Z"
  }
}
```

- Impacto observado:
  - o usuario altera o horario para `20:00`, mas o proximo disparo continua sendo calculado como `09:00`;
  - o problema tambem pode afetar mudancas de data inicial, timezone e recorrencia.

## Achado 3

- ID: `RISK-001`
- Tipo: `bug_reproduzivel`
- Severidade preliminar: media
- Componente: login web
- Arquivo: `apps/web/src/App.tsx`
- Evidencia:
  - o frontend chama `api.login()` antes de validar se o papel do usuario corresponde a rota;
  - em caso de papel divergente, o codigo mostra erro e nao limpa a sessao que acabou de ser criada pelo backend;
  - teste de verificacao em `apps/web/.bug-report/risk-001-verification.test.tsx` confirmou o fluxo:
    - login em `/login` com usuario admin retorna erro visual;
    - sem `logout`, um novo mount da aplicacao carrega a sessao via `api.me()`;
    - a aplicacao entra no console administrativo.

- Impacto observado:
  - a UI informa falha de acesso, mas a sessao permanece valida;
  - um refresh ou remount pode autenticar o usuario na area administrativa ou de usuario mesmo apos a mensagem de erro.

## Atualizacao 2026-03-21

## Achado 4

- ID: `MEL-001`
- Tipo: `melhoria`
- Severidade preliminar: media
- Componente: base estrutural para tarefas
- Arquivos:
  - `ROADMAP.md`
  - `apps/api/migrations/012_tasks_foundation.sql`
  - `apps/api/src/types.ts`
  - `apps/web/src/types.ts`
- Evidencia:
  - o `ROADMAP.md` atual define `task` como entidade principal futura do produto;
  - busca estrutural no codigo confirmou ausencia de modulo real de tarefas em runtime;
  - o schema existente tinha notificacoes e lembretes, mas nenhuma tabela `tasks` ou `task_events`;
  - os contratos de tipos atuais tambem nao expunham tipos de tarefa.
- Impacto observado:
  - a evolucao para tarefas ainda nao tinha fundacao passiva no banco;
  - qualquer proxima etapa correria risco maior de acoplamento direto em notificacoes legadas;
  - faltava uma base segura para CRUD, vinculacao de notificacoes e automacoes futuras.
- Acao executada nesta rodada:
  - roadmap atualizado com frente incremental explicita;
  - migration passiva de `tasks` e `task_events` criada;
  - tipos passivos de tarefa adicionados em backend e frontend;
  - teste direcionado confirmou convivencia com notificacoes e lembretes existentes.

## Atualizacao 2026-03-21 - CRUD inicial de tarefas

## Achado 5

- ID: `MEL-002`
- Tipo: `melhoria`
- Severidade preliminar: alta
- Componente: backend HTTP inicial de tarefas
- Arquivos:
  - `apps/api/src/routes/tasks-me.ts`
  - `apps/api/src/routes/tasks-admin.ts`
  - `apps/api/src/tasks/service.ts`
  - `apps/api/src/app.ts`
  - `apps/web/src/lib/api.ts`
- Evidencia:
  - a Etapa 1 deixou schema e contratos prontos, mas ainda nao havia superficie HTTP para uso real;
  - sem CRUD/lista inicial, a entidade `task` permanecia apenas estrutural, sem validacao operacional;
  - as novas rotas permitem create/list/detail/update/complete/cancel para `me` e `admin`;
  - os testes novos validaram:
    - criacao, listagem, atualizacao e conclusao pelo usuario
    - bloqueio de atribuicao indevida por usuario comum
    - criacao, filtro e cancelamento pelo admin
- Impacto observado:
  - a base de tarefas passa a ser operavel sem quebrar notificacoes e lembretes;
  - a proxima etapa de UI pode consumir contrato ja validado;
  - a vinculacao de notificacoes e as automacoes continuam desacopladas nesta rodada.
- Acao executada nesta rodada:
  - modulo de servico de tarefas criado
  - rotas `me/admin` adicionadas ao app
  - auditoria e `task_events` ligados ao CRUD basico
  - cliente HTTP do frontend exposto para consumo futuro da UI

## Atualizacao 2026-03-21 - UI minima de tarefas

## Achado 6

- ID: `MEL-003`
- Tipo: `melhoria`
- Severidade preliminar: alta
- Componente: UI minima de tarefas no frontend
- Arquivos:
  - `apps/web/src/App.tsx`
  - `apps/web/src/components/TaskUserPanel.tsx`
  - `apps/web/src/components/admin/AdminTasksPanel.tsx`
  - `apps/web/src/components/tasks/taskUi.ts`
- Evidencia:
  - apos `MEL-002`, a entidade `task` estava disponivel apenas por HTTP, sem rota dedicada no app;
  - o frontend nao expunha aba de tarefas para usuario e o menu admin ainda nao tinha entrada para `tasks`;
  - nao existia painel que consumisse `api.myTasks` ou `api.adminTasks` para lista/detalhe inicial;
  - os testes novos validam carga inicial, detalhe automatico, criacao basica e roteamento em `/tasks`.
- Impacto observado:
  - tarefas existiam no dominio, mas ainda dependiam de consumo manual da API para uso real;
  - a validacao operacional do CRUD ficava incompleta do ponto de vista do produto;
  - a proxima etapa de notificacoes vinculadas nao teria superficie visivel para o usuario.
- Acao executada nesta rodada:
  - rota `/tasks` adicionada no fluxo do usuario
  - paineis minimos de tarefas criados para usuario e admin
  - helper visual compartilhado de status, prioridade, badges e datas introduzido
  - testes focados adicionados para user/admin e roteamento

## Atualizacao 2026-03-21 - notificacoes vinculadas a tarefa

## Achado 7

- ID: `MEL-004`
- Tipo: `melhoria`
- Severidade preliminar: alta
- Componente: notificacoes vinculadas opcionalmente a tarefa
- Arquivos:
  - `apps/api/migrations/013_notification_task_links.sql`
  - `apps/api/src/tasks/notifications.ts`
  - `apps/api/src/routes/admin.ts`
  - `apps/api/src/routes/tasks-me.ts`
  - `apps/api/src/routes/tasks-admin.ts`
  - `apps/web/src/components/UserDashboard.tsx`
  - `apps/web/src/components/admin/AdminHistoryPanel.tsx`
- Evidencia:
  - apos `MEL-003`, tarefas ja podiam ser operadas na UI, mas notificacoes continuavam sem referencia opcional para `task`;
  - a emissao manual em `admin.ts` inseria notificacoes sem `source_task_id`;
  - as rotas de tarefa ainda nao disparavam notificacoes para atribuicao ou mudanca relevante de status;
  - a central do usuario e o historico admin nao exibiam qualquer indicio de vinculacao com tarefa.
- Impacto observado:
  - a etapa 3 do roadmap permanecia incompleta;
  - novas notificacoes operacionais nao conseguiam apontar de forma explicita para a tarefa relacionada;
  - o rollout para automacoes futuras ficava sem chave de rastreabilidade entre `notification` e `task`.
- Acao executada nesta rodada:
  - migration nova adicionou `source_task_id` opcional em `notifications`
  - helper compartilhado passou a emitir notificacoes vinculadas a tarefa em atribuicao e mudanca relevante de status
  - API, socket e UI passaram a propagar e exibir o vinculo sem quebrar o legado

## Atualizacao 2026-03-21 - automacoes operacionais de tarefa

## Achado 8

- ID: `MEL-005`
- Tipo: `melhoria`
- Severidade preliminar: alta
- Componente: automacoes operacionais iniciais de tarefa
- Arquivos:
  - `apps/api/migrations/014_task_automation_logs.sql`
  - `apps/api/src/tasks/automation.ts`
  - `apps/api/src/reminders/scheduler.ts`
  - `apps/api/src/routes/tasks-admin.ts`
  - `apps/api/src/config.ts`
  - `apps/api/src/index.ts`
- Evidencia:
  - apos `MEL-004`, a frente de tarefas ainda nao tinha regras automaticas de `due_soon`, `overdue` ou `stale_task`;
  - o scheduler existente atendia apenas lembretes pessoais, sem flags dedicadas para automacoes de tarefa;
  - nao havia persistencia de logs de automacao nem chave de deduplicacao para evitar repeticao de alertas operacionais;
  - a observabilidade administrativa dessa futura automacao tambem nao existia em rotas de `tasks`.
- Impacto observado:
  - a Etapa 4 do roadmap permanecia sem implementacao real;
  - o sistema ainda dependia de acoes manuais para sinalizar proximidade de prazo, atraso e envelhecimento de tarefa;
  - qualquer tentativa futura de ligar o scheduler sem logs e idempotencia aumentaria o risco de ruido e duplicidade.
- Acao executada nesta rodada:
  - migration nova criou `task_automation_logs` com unicidade por `task`, tipo e `dedupe_key`
  - modulo `tasks/automation.ts` passou a emitir `due_soon`, `overdue` e `stale_task` com notificacao vinculada, `task_events` dedicados e deduplicacao
  - o tick do scheduler foi reaproveitado com flags separadas para lembretes e automacoes de tarefa
  - rotas administrativas de tarefas ganharam `health` e `automation-logs` para observabilidade inicial

## Atualizacao 2026-03-21 - recorrencia de tarefa

## Achado 9

- ID: `MEL-006`
- Tipo: `melhoria`
- Severidade preliminar: alta
- Componente: recorrencia de tarefa e fechamento da Etapa 4
- Arquivos:
  - `apps/api/migrations/015_task_recurrence.sql`
  - `apps/api/src/tasks/service.ts`
  - `apps/api/src/tasks/automation.ts`
  - `apps/api/src/routes/tasks-me.ts`
  - `apps/api/src/routes/tasks-admin.ts`
  - `apps/web/src/components/TaskUserPanel.tsx`
  - `apps/web/src/components/admin/AdminTasksPanel.tsx`
- Evidencia:
  - apos `MEL-005`, a Etapa 4 ainda nao cobria `tarefa recorrente`;
  - o schema de `tasks` ainda nao armazenava `repeat_type`, `weekdays` ou relacao com a tarefa recorrente anterior;
  - o scheduler de tarefas nao criava a proxima tarefa apos conclusao;
  - a UI minima existente nao expunha qualquer configuracao de recorrencia.
- Impacto observado:
  - a Etapa 4 do roadmap permanecia tecnicamente incompleta;
  - tarefas recorrentes ainda dependeriam de recriacao manual;
  - o rollout operacional ficava sem a automacao recorrente prevista como criterio de completude.
- Acao executada nesta rodada:
  - migration nova adicionou configuracao de recorrencia em `tasks` e ampliou `task_automation_logs` para `recurring_task`
  - CRUD `me/admin` passou a aceitar `repeat_type` e `weekdays`
  - o scheduler passou a criar a proxima tarefa recorrente apos conclusao com log deduplicado e notificacao vinculada
  - os paineis web de tarefa passaram a configurar e exibir recorrencia

## Atualizacao 2026-03-21 - hardening e rollout operacional

## Achado 10

- ID: `MEL-007`
- Tipo: `melhoria`
- Severidade preliminar: media
- Componente: hardening operacional da automacao de tarefas
- Arquivos:
  - `apps/api/src/app.ts`
  - `apps/api/src/test/health-routes.test.ts`
  - `ops/systemd/api.env.example`
  - `ops/scripts/validate-debian-login.sh`
  - `docs/task-automation-rollout.md`
- Evidencia:
  - apos `MEL-006`, o rollout de `ENABLE_TASK_AUTOMATION_SCHEDULER` ainda dependia de leitura implícita do codigo;
  - o health publico nao expunha o estado dos schedulers nem as janelas configuradas;
  - o env example da API nao documentava as flags de automacao de tarefa;
  - nao existia documento versionado de checklist/rollback especifico para automacao de tarefas.
- Impacto observado:
  - a Fase 8 do roadmap permanecia sem artefatos operacionais minimos;
  - a validacao de rollout em VM ficava mais fraca e sujeita a interpretacao manual;
  - o risco operacional de habilitacao ampla da flag permanecia desnecessariamente alto.
- Acao executada nesta rodada:
  - `/api/v1/health` passou a expor estado dos schedulers e janelas da automacao
  - teste dedicado passou a cobrir esse contrato
  - `api.env.example` passou a documentar as flags relevantes
  - documento de rollout/rollback e script de validacao Debian foram atualizados

## Atualizacao 2026-03-22 - comentarios por tarefa

## Achado 11

- ID: `MEL-008`
- Tipo: `melhoria`
- Severidade preliminar: media
- Componente: comentarios por tarefa no detalhe `me/admin`
- Arquivos:
  - `apps/api/migrations/016_task_comments.sql`
  - `apps/api/src/tasks/service.ts`
  - `apps/api/src/routes/tasks-me.ts`
  - `apps/api/src/routes/tasks-admin.ts`
  - `apps/web/src/lib/api.ts`
  - `apps/web/src/types.ts`
  - `apps/web/src/components/TaskUserPanel.tsx`
  - `apps/web/src/components/admin/AdminTasksPanel.tsx`
- Evidencia:
  - a busca estrutural nao encontrou `task_comments` implementado no schema ou nas rotas;
  - o detalhe de tarefa retornava apenas `task` e `events`, sem trilha de comentario humano;
  - o frontend ja tinha detalhe e timeline, mas nenhum mecanismo para registrar contexto adicional na tarefa.
- Impacto observado:
  - a operacao da tarefa ainda dependia de reescrever descricao ou usar canais externos para contexto;
  - a proxima fase funcional do roadmap seguia pendente mesmo com board e automacoes ja entregues.
- Acao executada nesta rodada:
  - migration nova criou `task_comments` com indice por tarefa/data
  - o backend passou a expor `comments` no detalhe e `POST /tasks/:id/comments` em `me/admin`
  - o frontend ganhou bloco de comentarios no detalhe da tarefa para user/admin
  - testes focados passaram a cobrir schema, rotas e UI de comentarios

## Achado 12

- ID: `MEL-009`
- Tipo: `melhoria`
- Severidade preliminar: media
- Componente: timeline unificada da tarefa
- Arquivos:
  - `apps/api/src/tasks/service.ts`
  - `apps/api/src/routes/tasks-me.ts`
  - `apps/api/src/routes/tasks-admin.ts`
  - `apps/web/src/components/tasks/taskUi.ts`
  - `apps/web/src/components/TaskUserPanel.tsx`
  - `apps/web/src/components/admin/AdminTasksPanel.tsx`
- Evidencia:
  - apos `MEL-008`, o detalhe da tarefa ainda exibia comentarios e eventos em blocos separados;
  - a ordem real do historico ficava distribuida entre duas listas;
  - a leitura operacional exigia correlacao manual entre comentario humano e automacao/status.
- Impacto observado:
  - piora de leitura do contexto da tarefa;
  - custo maior para entender o que aconteceu por ultimo e quem agiu.
- Acao executada nesta rodada:
  - backend passou a retornar `timeline` unificada e ordenada no detalhe
  - frontend migrou para um unico feed de historico
  - o contrato antigo com `events/comments` foi preservado por compatibilidade

## Achado 13

- ID: `MEL-010`
- Tipo: `melhoria`
- Severidade preliminar: baixa
- Componente: limpeza do contrato de detalhe de tarefa
- Arquivos:
  - `apps/api/src/routes/tasks-me.ts`
  - `apps/api/src/routes/tasks-admin.ts`
  - `apps/web/src/lib/api.ts`
- Evidencia:
  - apos `MEL-009`, a UI ja consumia apenas `timeline`;
  - o payload ainda retornava `events` e `comments`, mantendo duplicacao sem uso.
- Impacto observado:
  - payload e tipos mais verbosos do que o necessario;
  - maior risco de divergencia futura entre campos redundantes.
- Acao executada nesta rodada:
  - as rotas de detalhe passaram a expor apenas `task` e `timeline`
  - o cliente do frontend e os testes foram ajustados para o contrato final
