# 03 - Achados brutos

## Evidencias de qualidade e estabilidade

- `npm run lint`:
  - falhou em `apps/api/src/routes/reminders-me.ts` por imports/tipos não usados;
  - falhou em `apps/web/src/features/tasks/admin/AdminTasksPanel.tsx` por tipo não usado;
  - gerou warnings de `react-hooks/exhaustive-deps` em `apps/web/src/App.tsx`.
- `npm run typecheck`: concluído com sucesso.
- `npm test`:
  - `packages/apr-core`: 3 arquivos / 9 testes passando.
  - `packages/poste-kml-core`: 1 arquivo / 2 testes passando.
  - `apps/api`: 17 arquivos passando, 69 testes passando, 14 pulados.
  - `apps/web`: 17 arquivos / 117 testes passando.

## Achados estruturais

### REF-001

- Categoria: `divida_tecnica`
- Escopo: `apps/web/src/App.tsx`, `apps/web/src/components/app/appShell.tsx`
- Evidencia:
  - `App.tsx` concentra autenticação, roteamento manual, toasts, tema, bootstrap de sessão e side effects globais.
  - `appShell.tsx` acumula navegação, header, composição de workspace e regras de path.
- Sinal: alto acoplamento de estado de aplicação e navegação sem roteador dedicado.

### REF-002

- Categoria: `divida_tecnica`
- Escopo: `apps/web/src/components/AdminDashboard.tsx`, `apps/web/src/components/admin/*`
- Evidencia:
  - `AdminDashboard.tsx` integra busca global, dados realtime, métricas, notificações, APR, tarefas e KML.
  - O componente depende de um retorno muito largo de `useAdminDashboardData`.
- Sinal: componente orquestrador excessivo e fronteiras fracas entre subdomínios administrativos.

### REF-003

- Categoria: `divida_tecnica`
- Escopo: `apps/web/src/features/tasks/admin/AdminTasksPanel.tsx`
- Evidencia:
  - 824 linhas.
  - Estado local abundante, múltiplas ações em lote, composição de queries, abertura de detalhes e formulário no mesmo componente.
  - Forte dependência de `useTaskPanelData`, `useTaskPanelActions`, `taskUi` e `api`.
- Sinal: feature madura, mas com custo alto de alteração e teste.

### REF-004

- Categoria: `integracao_quebrada`
- Escopo: `apps/web/src/features/apr/useAprPageController.ts`, `apps/web/src/features/apr/AprPage.tsx`, `apps/web/src/features/apr/AprPage.test.tsx`
- Evidencia:
  - Falha de teste: `expected "spy" to be called 1 times, but got 2 times`.
  - Warnings repetidos de `act(...)`.
  - `useAprPageController.ts` faz `Promise.all` com `listSubjects` e `listCollaborators` dentro de `loadSelectedMonth`, disparado por `useEffect`.
- Sinal: o módulo APR frontend já está sofrendo com orquestração de carregamento e testabilidade.

### REF-005

- Categoria: `problema_de_qualidade`
- Escopo: `apps/api/src/routes/reminders-me.ts`
- Evidencia:
  - Mistura, na mesma rota, de autenticação, parsing, validação, SQL, log de auditoria e modelagem de resposta.
  - Arquivo grande e com alto número de responsabilidades por endpoint.
- Sinal: camada HTTP antiga sem isolamento suficiente de domínio/infra.

### REF-006

- Categoria: `problema_de_qualidade`
- Escopo: `apps/api/src/routes/operations-board-me.ts`
- Evidencia:
  - Contém SQL bruto, parsing, normalização, auditoria e regras de estado no mesmo arquivo.
  - Padrão semelhante ao de `reminders-me.ts`.
- Sinal: módulo funcional, mas difícil de manter e estender com segurança.

### REF-007

- Categoria: `divida_tecnica`
- Escopo: `apps/api/src/modules/tasks/application/metrics.ts`, `apps/api/src/modules/tasks/application/service.ts`, `apps/api/src/modules/tasks/presentation/admin-routes.ts`
- Evidencia:
  - Regras de SLA, métricas, normalização e acesso a dados fortemente acoplados ao SQLite e à montagem de respostas HTTP.
  - Grande superfície de regras derivadas sobre estados de tarefa.
- Sinal: domínio de tarefas evoluiu, mas as fronteiras internas ainda estão heterogêneas.

### REF-008

- Categoria: `divida_tecnica`
- Escopo: `apps/api/src/modules/apr/service.ts`, `apps/web/src/features/apr/AprPageSections.tsx`
- Evidencia:
  - Backend APR com service grande e múltiplas responsabilidades de consulta, auditoria, história e mutação.
  - Frontend APR com seção visual muito extensa e hook controlador volumoso.
- Sinal: domínio APR está funcional, porém espalhado entre grandes blocos de orquestração.

### REF-009

- Categoria: `problema_de_qualidade`
- Escopo: suíte de testes web
- Evidencia:
  - Arquivos de teste muito grandes:
    - `apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx` com 1358 linhas.
    - `apps/web/src/components/AdminDashboard.test.tsx` com 985 linhas.
    - `apps/web/src/features/tasks/test/TaskUserPanel.test.tsx` com 824 linhas.
    - `apps/web/src/features/apr/AprPage.test.tsx` com 590 linhas.
- Sinal: dificuldade crescente de manutenção do harness de testes e menor legibilidade de cenários.

### BUG-004

- Categoria: `bug_reproduzivel`
- Escopo: `apps/api/src/reminders/service.ts`, `apps/api/src/reminders/route-helpers.ts`, `apps/api/src/reminders/recurrence.ts`
- Evidencia:
  - `validateReminderFields` promete formato `HH:MM`, mas depende de `isValidTimeOfDay`, implementado como regex `^\d{2}:\d{2}$`.
  - Reproduzido localmente em `node`: `24:00` e `99:99` retornam `true` na mesma regra usada pelo backend.
  - `parseTimeOfDay` apenas faz `split(":")` e `parseInt`, sem validar faixa.
  - Reproduzido localmente em `node`: `Date.UTC(2026, 2, 13, 99, 99, 0, 0)` produz `2026-03-17T04:39:00.000Z`, mostrando que um horário inválido é normalizado para outro instante.
  - `computeNextScheduledFor` usa `parseTimeOfDay(reminder.timeOfDay)` para alimentar o scheduler.
- Sinal: a API pode aceitar horário inválido e gerar ocorrências em data/hora diferente da pretendida, sem erro para o usuário.

### BUG-005

- Categoria: `bug_reproduzivel`
- Escopo: `apps/web/src/hooks/useNotificationSocket.ts`, `apps/web/src/lib/socket.ts`
- Evidencia:
  - O hook só emitia `notifications:subscribe` no evento `connect`.
  - O socket do frontend é compartilhado globalmente por `acquireSocket`.
  - Reproduzido por teste: quando o hook monta com o socket já conectado, a inscrição não era emitida.
  - Evidência objetiva: `npm run test --workspace=apps/web -- useNotificationSocket` falhou antes da correção com `expected "spy" to be called ... Number of calls: 0`.
- Sinal: o usuário pode deixar de se inscrever nos eventos de notificação em telas montadas após a conexão já existir.
