# 04 - Priorizacao

## Ordem de prioridade de refatoracao e correcoes

### Prioridade 1

#### BUG-005 - Inscricao perdida no socket de notificacoes

- Escopo:
  - `apps/web/src/hooks/useNotificationSocket.ts`
  - `apps/web/src/lib/socket.ts`
- Motivo:
  - Há evidência objetiva de bug funcional no frontend.
  - O hook montava sem emitir `notifications:subscribe` quando o socket compartilhado já estava conectado.
  - Isso afeta entrega de eventos em telas/hydrations montadas após a conexão base já existir.
- Menor correção viável:
  - emitir a inscrição imediatamente se `socket.connected` já for `true`;
  - manter o listener de `connect` para reconexões;
  - cobrir o cenário em teste do hook.

### Prioridade 2

#### BUG-004 - Validacao incorreta de horario em lembretes

- Escopo:
  - `apps/api/src/reminders/service.ts`
  - `apps/api/src/reminders/route-helpers.ts`
  - `apps/api/src/reminders/recurrence.ts`
- Motivo:
  - Há evidência objetiva de bug funcional.
  - A API aceita `timeOfDay` inválido como `24:00` e `99:99`.
  - O valor inválido segue para o scheduler e pode ser convertido em outro dia/horário, sem erro explícito.
- Menor correção viável:
  - restringir `isValidTimeOfDay` à faixa real `00:00` a `23:59`;
  - adicionar teste cobrindo rejeição de `24:00` e `99:99`;
  - validar o impacto no fluxo de criação/edição e no scheduler.

### Prioridade 3

#### REF-004 - APR frontend

- Escopo:
  - `apps/web/src/features/apr/useAprPageController.ts`
  - `apps/web/src/features/apr/AprPage.tsx`
  - `apps/web/src/features/apr/AprPageSections.tsx`
  - `apps/web/src/features/apr/AprPage.test.tsx`
- Motivo:
  - Existe evidência objetiva de quebra na suíte.
  - O módulo combina carregamento, paginação, filtros, importação e derivação visual em poucos blocos.
  - Há warnings de `act(...)`, sinalizando pouca previsibilidade do ciclo de atualização.
- Menor correção estrutural viável:
  - separar carregamento de catálogo (`subjects`, `collaborators`) do carregamento dependente do mês;
  - estabilizar efeitos e dependências do controller;
  - dividir `AprPageSections.tsx` por contexto funcional;
  - reduzir a suposição de contagem exata de chamadas nos testes.

### Prioridade 4

#### REF-002 + REF-003 - Admin frontend e tarefas administrativas

- Escopo:
  - `apps/web/src/components/AdminDashboard.tsx`
  - `apps/web/src/components/admin/*`
  - `apps/web/src/features/tasks/admin/AdminTasksPanel.tsx`
- Motivo:
  - É a maior concentração de fluxo administrativo no frontend.
  - O painel de tarefas já virou um mini-aplicativo dentro do dashboard.
  - A manutenção futura tende a gerar regressões por colisão entre filtros, realtime, bulk actions e detalhe.
- Menor correção estrutural viável:
  - extrair `view-models` por subpainel;
  - separar busca global, métricas, board e composer;
  - reduzir o payload retornado por `useAdminDashboardData`.

### Prioridade 5

#### REF-001 - Shell da aplicação web

- Escopo:
  - `apps/web/src/App.tsx`
  - `apps/web/src/components/app/appShell.tsx`
- Motivo:
  - A navegação manual já concentra autenticação, autorização, tema e composição de telas.
  - É um gargalo transversal: qualquer novo módulo tende a passar por esses arquivos.
- Menor correção estrutural viável:
  - introduzir camada de roteamento/app state mais explícita;
  - mover sessão, tema e toasts para hooks dedicados;
  - reduzir a lógica de autorização embutida no componente-raiz.

### Prioridade 6

#### REF-007 - Dominio de tarefas no backend

- Escopo:
  - `apps/api/src/modules/tasks/application/metrics.ts`
  - `apps/api/src/modules/tasks/application/service.ts`
  - `apps/api/src/modules/tasks/presentation/admin-routes.ts`
- Motivo:
  - Regras de SLA, agregações, normalização e acesso a dados estão misturados.
  - O domínio está importante demais para continuar dependendo de fronteiras implícitas.
- Menor correção estrutural viável:
  - extrair query services e policy functions;
  - separar read models de mutations;
  - isolar cálculos de SLA e métricas em domínio puro.

### Prioridade 7

#### REF-005 + REF-006 - Rotas antigas de reminders e operations board

- Escopo:
  - `apps/api/src/routes/reminders-me.ts`
  - `apps/api/src/routes/operations-board-me.ts`
- Motivo:
  - Esses arquivos ainda seguem padrão antigo com lógica de domínio exposta na camada HTTP.
  - O risco de regressão é baixo se a refatoração for incremental, por isso é um bom alvo depois dos pontos mais críticos.
- Menor correção estrutural viável:
  - extrair repository/query helpers;
  - extrair use cases;
  - deixar a rota limitada a autenticação, parsing e resposta HTTP.

### Prioridade 8

#### REF-008 - Dominio APR backend/frontend

- Escopo:
  - `apps/api/src/modules/apr/service.ts`
  - `apps/web/src/features/apr/AprPageSections.tsx`
### Prioridade 9

#### REF-009 - Suite de testes web

- Escopo:
  - arquivos `.test.tsx` muito extensos em admin/tasks/APR.
- Motivo:
  - Não é a causa raiz principal, mas amplifica custo de manutenção e dificulta evolução segura.

## Itens que nao devem ser prioridade imediata

- `packages/apr-core` e `packages/poste-kml-core`:
  - pequenos, coesos e com testes passando.
- `apps/api/src/app.ts` e `apps/api/src/index.ts`:
  - simples como composição/boot.

## Conclusao de triagem

- O repositório não mostra crise geral de qualidade.
- As maiores evidências funcionais desta rodada ficaram em lembretes (`timeOfDay`) e no subscribe de notificações do frontend.
- As falhas de `lint` observadas entram como qualidade, não como bug reproduzível.
