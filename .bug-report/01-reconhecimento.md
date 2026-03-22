# Reconhecimento do repositorio

## Visao estrutural

- Tipo: monorepo npm workspaces.
- Workspaces:
  - `apps/api`: API Express + Socket.IO + SQLite.
  - `apps/web`: frontend React + Vite.
- Pastas de suporte:
  - `apps/api/migrations`: migracoes SQL.
  - `ops/`: scripts de deploy, nginx, systemd e cron.
  - `.github/workflows/main.yml`: CI de seguranca, lint, typecheck, audit e testes.

## Stack detectada

- Runtime principal: Node.js.
- Linguagens: TypeScript no backend e frontend.
- Backend:
  - Express
  - Socket.IO
  - better-sqlite3
  - bcryptjs
  - jsonwebtoken
- Frontend:
  - React 18
  - Vite
  - Tailwind CSS
  - socket.io-client
- Qualidade:
  - ESLint
  - TypeScript (`tsc`)
  - Vitest
  - React Testing Library

## Ferramentas disponiveis

- Confirmadas no ambiente: `node`, `npm`, `npx`, `git`, `find`, `sed`.
- Disponiveis via dependencias locais/scripts: `tsc`, `eslint`, `vite`, `vitest`.
- Indisponivel: `rg`.
- Restricao relevante: sem necessidade de rede para a analise executada.

## Entrypoints

- API:
  - `apps/api/src/index.ts`
  - `apps/api/src/app.ts`
  - routers principais:
    - `apps/api/src/routes/auth.ts`
    - `apps/api/src/routes/admin.ts`
    - `apps/api/src/routes/me.ts`
    - `apps/api/src/routes/reminders-admin.ts`
    - `apps/api/src/routes/reminders-me.ts`
- Realtime:
  - `apps/api/src/socket.ts`
- Scheduler:
  - `apps/api/src/reminders/scheduler.ts`
- Frontend:
  - `apps/web/src/main.tsx`
  - `apps/web/src/App.tsx`

## Modulos criticos

- Autenticacao e sessao por cookie.
- Entrega e leitura de notificacoes.
- Compatibilidade entre `response_status` legado e `operational_status`.
- Scheduler e recorrencia de lembretes.
- Integracao frontend/socket para eventos em tempo real.

## Areas de maior risco

- Compatibilidade de dados legados em `notification_recipients`.
- Regras de agendamento baseadas em `last_scheduled_for`.
- Fluxos de mutacao com efeitos colaterais em realtime e auditoria.

## Estrategia proposta para analise

1. Validar lint, typecheck, testes e build para detectar regressao objetiva.
2. Revisar manualmente modulos criticos com foco em estado legado, scheduler e integracao.
3. Reproduzir cenarios minimos quando houver suspeita concreta de bug.

## Atualizacao 2026-03-21 - frente de tarefas

### Visao estrutural desta rodada

- Tipo mantido: monorepo npm workspaces com `apps/api` e `apps/web`.
- O `ROADMAP.md` atual ja posiciona `task` como entidade central futura, mas o codigo atual continua centrado em notificacoes e lembretes.
- Nao ha workspace compartilhado de tipos; contratos vivem separadamente em:
  - `apps/api/src/types.ts`
  - `apps/web/src/types.ts`

### Ferramentas disponiveis e indisponiveis

- Disponiveis com evidencia nesta rodada: `git`, `node`, `npm`, `sqlite3`, `python3`, `find`, `sed`.
- Dependencias locais disponiveis por script npm: `vitest`, `tsx`, `typescript`, `vite`.
- Indisponiveis no PATH: `rg`, `docker`, `docker-compose`, `pnpm`, `yarn`, `bun`, `tsc`, `vite`.

### Entrypoints e modulos relevantes para a evolucao

- Backend HTTP:
  - `apps/api/src/app.ts`
  - `apps/api/src/routes/admin.ts`
  - `apps/api/src/routes/me.ts`
- Persistencia e migracoes:
  - `apps/api/src/db.ts`
  - `apps/api/src/scripts/migrate.ts`
  - `apps/api/migrations/*.sql`
- Dominio de lembretes reaproveitavel futuramente:
  - `apps/api/src/reminders/scheduler.ts`
  - `apps/api/src/reminders/service.ts`
- Frontend e contratos atuais:
  - `apps/web/src/lib/api.ts`
  - `apps/web/src/types.ts`

### Modulos criticos

- `notifications` e `notification_recipients`: fluxo principal em producao e base de compatibilidade.
- `reminders`, `reminder_occurrences` e `reminder_logs`: feature entregue parcialmente e com scheduler ativo por flag.
- `audit_log`: mecanismo que pode ser reaproveitado para rastrear eventos de tarefa sem criar trilha paralela.

### Areas de maior risco para a frente de tarefas

- Alterar `notifications` agora para impor vinculacao obrigatoria quebraria fluxo legado.
- Reutilizar o scheduler sem separar identidade funcional de lembrete pessoal e automacao de tarefa pode confundir regras.
- Duplicar contratos entre backend e frontend sem coordenacao pode introduzir divergencia de enums e estados.

### Estrategia proposta para esta rodada

1. Atualizar o roadmap com uma frente incremental explicita de coexistencia segura.
2. Executar apenas a etapa 1 de baixo risco:
   - schema novo e passivo para tarefas
   - enums/tipos passivos em backend e frontend
   - teste de migracao garantindo que notificacoes e lembretes permanecem intactos
3. Validar apenas no escopo afetado, sem alterar rotas, UI ou scheduler existentes.

## Atualizacao 2026-03-21 - UI minima de tarefas

### Visao estrutural desta rodada

- O backend de tarefas ja existe em `apps/api`, entao o ponto de entrada desta rodada migrou para o frontend:
  - `apps/web/src/App.tsx`
  - `apps/web/src/components/TaskUserPanel.tsx`
  - `apps/web/src/components/admin/AdminTasksPanel.tsx`
  - `apps/web/src/components/tasks/taskUi.ts`
- A navegacao atual tinha abas para painel, notificacoes e lembretes, mas ainda nao expunha a entidade `task` ao usuario final.

### Modulos criticos

- Roteamento do usuario em `apps/web/src/App.tsx`.
- Navegacao administrativa em `apps/web/src/components/admin/AdminSidebar.tsx`.
- Contratos visuais de status/prioridade em `apps/web/src/components/tasks/taskUi.ts`.

### Areas de maior risco

- Ambiguidade entre headings e labels repetidos pode fragilizar testes do frontend.
- Divergencia entre payloads enriquecidos de `task` e os tipos do frontend pode quebrar renderizacao.
- Entrar em board ou realtime agora aumentaria o risco sem necessidade para a etapa.

### Estrategia proposta para esta rodada

1. Adicionar rota/aba de tarefas no fluxo do usuario e menu administrativo.
2. Implementar paineis minimos de lista/detalhe e criacao para user/admin consumindo o CRUD existente.
3. Validar no escopo web com testes focados e `typecheck`.

## Atualizacao 2026-03-21 - notificacoes vinculadas a tarefa

### Visao estrutural desta rodada

- A etapa passa a cruzar os dominios de `tasks` e `notifications` em:
  - `apps/api/src/routes/tasks-*.ts`
  - `apps/api/src/routes/admin.ts`
  - `apps/api/src/routes/me.ts`
  - `apps/api/src/socket.ts`
  - `apps/web/src/components/UserDashboard.tsx`
  - `apps/web/src/components/admin/AdminHistoryPanel.tsx`
- O acoplamento atual entre tarefas e notificacoes ainda era unilateral: `tasks.source_notification_id`, sem referencia opcional inversa em `notifications`.

### Modulos criticos

- Insercao manual de notificacoes administrativas em `apps/api/src/routes/admin.ts`.
- Mutacoes de tarefa que alteram atribuicao ou status.
- Payloads de realtime e a central de notificacoes do usuario.

### Areas de maior risco

- Quebrar o historico legado de notificacoes ao exigir `task` em registros antigos.
- Divergir o payload de notificacao entre API, socket e frontend.
- Disparar notificacoes em excesso ou para o proprio ator em fluxos de tarefa.

### Estrategia proposta para esta rodada

1. Adicionar `source_task_id` opcional em `notifications`.
2. Emitir notificacoes vinculadas a tarefa apenas em acoes manuais:
   - atribuicao
   - mudanca relevante de status
3. Expor o vinculo na UI atual sem criar navegacao ou automacao nova.

## Atualizacao 2026-03-21 - automacoes operacionais de tarefa

### Visao estrutural desta rodada

- A etapa cruza scheduler, dominio de tarefa e observabilidade administrativa em:
  - `apps/api/src/reminders/scheduler.ts`
  - `apps/api/src/tasks/automation.ts`
  - `apps/api/src/routes/tasks-admin.ts`
  - `apps/api/src/index.ts`
  - `apps/api/src/config.ts`
- A base de tarefas ja possuia CRUD, UI minima e notificacoes vinculadas, mas ainda nao existia camada automatica de prazo/atraso com logs proprios e deduplicacao.

### Modulos criticos

- Scheduler compartilhado em `apps/api/src/reminders/scheduler.ts`.
- Emissao de notificacoes vinculadas em `apps/api/src/tasks/notifications.ts`.
- Migrations e persistencia de logs em `apps/api/migrations/014_task_automation_logs.sql`.
- Painel administrativo de observabilidade em `apps/api/src/routes/tasks-admin.ts`.

### Areas de maior risco

- Duplicar disparos automaticos para a mesma tarefa sem uma chave explicita de idempotencia.
- Degradar lembretes pessoais ao misturar a execucao das duas frentes no mesmo tick sem flags separadas.
- Introduzir ruido operacional com `stale_task` em tarefas que ja estao simultaneamente no fluxo de `due_soon` ou `overdue`.

### Estrategia proposta para esta rodada

1. Criar persistencia dedicada de logs de automacao com unicidade por `task`, tipo e `dedupe_key`.
2. Reaproveitar o scheduler atual com flags separadas para lembretes e automacoes de tarefa.
3. Entregar apenas a primeira fatia de regras automaticas:
   - `due_soon`
   - `overdue`
   - `stale_task`
4. Expor observabilidade minima por rotas administrativas antes de ampliar a cobertura para recorrencia de tarefa.

## Atualizacao 2026-03-21 - recorrencia de tarefa

### Visao estrutural desta rodada

- A conclusao da Etapa 4 cruza schema, CRUD, scheduler e UI minima em:
  - `apps/api/migrations/015_task_recurrence.sql`
  - `apps/api/src/tasks/service.ts`
  - `apps/api/src/tasks/automation.ts`
  - `apps/api/src/routes/tasks-me.ts`
  - `apps/api/src/routes/tasks-admin.ts`
  - `apps/web/src/components/TaskUserPanel.tsx`
  - `apps/web/src/components/admin/AdminTasksPanel.tsx`
- O dominio de tarefas ja possuia automacoes de prazo/atraso, mas ainda nao conseguia gerar a proxima tarefa recorrente com rastreabilidade.

### Modulos criticos

- Persistencia de recorrencia em `tasks`.
- Conclusao de tarefa nas rotas `me/admin`.
- Automacao de recorrencia no scheduler compartilhado.
- Formularios minimos de tarefa para expor `repeat_type` e `weekdays`.

### Areas de maior risco

- Duplicar a criacao da proxima tarefa recorrente sem deduplicacao por conclusao.
- Reabrir tarefa concluida em vez de preservar historico e criar nova ocorrencia.
- Introduzir configuracao de recorrencia na UI sem refletir o contrato do backend.

### Estrategia proposta para esta rodada

1. Adicionar campos de recorrencia ao schema de `tasks`.
2. Permitir configurar recorrencia no CRUD `me/admin` e na UI minima ja existente.
3. Gerar a proxima tarefa apenas quando a atual estiver `done`, com log deduplicado e notificacao vinculada para a tarefa nova.
4. Marcar a Etapa 4 como concluida apenas se os testes de tarefas e lembretes passarem juntos.

## Atualizacao 2026-03-21 - hardening e documentacao operacional

### Visao estrutural desta rodada

- A Fase 8 se concentrou nos artefatos operacionais do repositorio:
  - `apps/api/src/app.ts`
  - `apps/api/src/test/health-routes.test.ts`
  - `ops/systemd/api.env.example`
  - `ops/scripts/validate-debian-login.sh`
  - `docs/task-automation-rollout.md`
- As regras de negocio das automacoes de tarefa ja estavam prontas; faltava tornar rollout e rollback verificaveis com evidencia.

### Modulos criticos

- `GET /api/v1/health` como contrato minimo de validacao externa.
- Env file da API em `ops/systemd/api.env.example`.
- Script de validacao Debian ja usado pela operacao.
- Documentacao de rollout e rollback para `ENABLE_TASK_AUTOMATION_SCHEDULER`.

### Areas de maior risco

- Fazer rollout de scheduler sem um health que explicite o estado das flags.
- Documentar flags de automacao apenas no codigo e nao no env file de producao.
- Manter checklist de ativacao apenas implícito, sem uma referencia versionada para operacao.

### Estrategia proposta para esta rodada

1. Expor estado de schedulers e janelas de automacao no health publico.
2. Cobrir esse contrato com teste dedicado.
3. Documentar env vars, rollout e rollback no repositório.
4. Endurecer o script de validacao Debian para verificar a coerencia das flags expostas.

## Atualizacao 2026-03-22 - comentarios por tarefa

### Visao estrutural desta rodada

- O modulo de `tasks` ja possui CRUD, board, automacoes e observabilidade minima; a lacuna funcional imediata passou a ser contexto colaborativo no detalhe da tarefa.
- Os pontos de extensao de menor risco ficaram concentrados em:
  - `apps/api/migrations`
  - `apps/api/src/tasks/service.ts`
  - `apps/api/src/routes/tasks-me.ts`
  - `apps/api/src/routes/tasks-admin.ts`
  - `apps/web/src/lib/api.ts`
  - `apps/web/src/components/TaskUserPanel.tsx`
  - `apps/web/src/components/admin/AdminTasksPanel.tsx`

### Modulos criticos

- Detalhe de tarefa em `me/admin`, porque ja agrega `task` e `task_events`.
- Contratos de tipos entre backend e frontend, que continuam duplicados por workspace.
- Persistencia SQLite, porque a nova tabela precisa conviver com `tasks`, `task_events` e as automacoes ja entregues.

### Areas de maior risco

- Misturar comentarios diretamente em `task_events` ampliaria enums e semantica da timeline sem necessidade.
- Alterar os endpoints de detalhe sem manter compatibilidade com o contrato atual do frontend poderia quebrar a selecao inicial de tarefa.
- Tentar incluir realtime agora aumentaria superficie de regressao em uma rodada que pode permanecer HTTP-only.

### Estrategia proposta para esta rodada

1. Adicionar `task_comments` como tabela dedicada e passiva.
2. Expor `comments` no detalhe de tarefa e `POST /tasks/:id/comments` em `me/admin`.
3. Implementar bloco de comentarios no detalhe da tarefa no frontend.
4. Validar com migrations, rotas, testes de componente e `typecheck` dos workspaces afetados.
