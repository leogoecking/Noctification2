# Plano de Refatoracao Priorizado

## Objetivo

Executar a refatoração por blocos pequenos, com validação contínua e sem reescrever o sistema de uma vez. O plano parte do diagnóstico atual e prioriza primeiro o que já tem sintoma objetivo de instabilidade, depois o que mais concentra risco de manutenção.

## Regras de execução

- Uma fase por vez, sem misturar frontend APR com backend tasks no mesmo ciclo.
- Sempre validar no menor escopo possível antes de passar para a próxima etapa.
- Preferir extração de responsabilidades e estabilização de efeitos antes de mudar contratos.
- Não alterar APIs públicas sem necessidade explícita.
- Cada etapa deve deixar o sistema em estado melhor ou igual ao anterior.

## Ordem macro

1. Estabilizar APR frontend.
2. Modularizar admin frontend e tasks administrativas.
3. Reduzir acoplamento do shell da aplicação web.
4. Separar domínio de tarefas no backend.
5. Migrar rotas legacy backend para padrão modular.
6. Consolidar suíte de testes web.

---

## Fase 1 - Estabilizacao do APR frontend

### Objetivo

Eliminar a falha atual da suíte e reduzir a fragilidade do fluxo de carregamento APR.

### Escopo

- `apps/web/src/features/apr/useAprPageController.ts`
- `apps/web/src/features/apr/AprPage.tsx`
- `apps/web/src/features/apr/AprPageSections.tsx`
- `apps/web/src/features/apr/AprPage.test.tsx`

### Problema atacado

- chamadas duplicadas;
- warnings de `act(...)`;
- um hook concentrando carregamento, paginação, filtros, importação e estado derivado.

### Etapas

1. Separar carregamento de catálogo do carregamento dependente do mês.
2. Criar funções ou hooks menores:
   - `useAprCatalogData`
   - `useAprMonthData`
   - `useAprFiltering` ou equivalente
3. Reduzir dependências reativas do controller principal.
4. Quebrar `AprPageSections.tsx` em seções menores:
   - sidebar/import
   - manual table/form
   - audit/history
   - collaborator view
5. Ajustar testes para comportamento observável, não contagem frágil de chamadas, exceto onde essa contagem for requisito real.

### Entregaveis

- fluxo inicial APR estável;
- `apps/web` voltando a passar;
- arquivos menores e com fronteiras mais claras.

### Risco

- médio, porque toca hook central e testes.

### Validacao minima

- `npm run test --workspace=apps/web -- AprPage`
- `npm run test --workspace=apps/web`
- `npm run typecheck --workspace @noctification/web`

### Criterio de saida

- sem warnings relevantes de `act(...)` na suíte APR;
- `AprPage.test.tsx` verde;
- controller principal menor e com menos responsabilidades diretas.

---

## Fase 2 - Admin frontend e tasks administrativas

### Objetivo

Reduzir o acoplamento do painel administrativo principal e do painel administrativo de tarefas.

### Escopo

- `apps/web/src/components/AdminDashboard.tsx`
- `apps/web/src/components/admin/useAdminDashboardData.ts`
- `apps/web/src/components/admin/useAdminActions.ts`
- `apps/web/src/components/admin/useAdminRealtimeData.ts`
- `apps/web/src/features/tasks/admin/AdminTasksPanel.tsx`

### Problema atacado

- dashboard como ponto de integração excessivo;
- painel de tarefas com múltiplos workflows no mesmo componente;
- retorno muito largo de hooks agregadores.

### Etapas

1. Dividir `AdminDashboard.tsx` por subdomínio:
   - visão geral
   - busca global
   - reminders
   - tasks
   - módulos APR/KML
2. Extrair view-models ou hooks específicos por bloco de dashboard.
3. Reduzir o contrato de `useAdminDashboardData` para apenas o que o container realmente precisa.
4. Em `AdminTasksPanel.tsx`, separar:
   - query/filter state
   - board state
   - composer state
   - bulk operations
   - analytics state
5. Migrar testes do painel para helpers/fixtures reutilizáveis.

### Entregaveis

- `AdminDashboard.tsx` menor;
- `AdminTasksPanel.tsx` com menos estado concentrado;
- melhor legibilidade do fluxo administrativo.

### Risco

- médio.

### Validacao minima

- `npm run test --workspace=apps/web -- AdminDashboard`
- `npm run test --workspace=apps/web -- AdminTasksPanel`
- `npm run typecheck --workspace @noctification/web`

### Criterio de saida

- redução perceptível de complexidade dos dois componentes centrais;
- sem regressão na suíte existente;
- contratos de hooks mais coesos.

---

## Fase 3 - Shell da aplicação web

### Objetivo

Tirar de `App.tsx` e `appShell.tsx` a responsabilidade de orquestrar tudo ao mesmo tempo.

### Escopo

- `apps/web/src/App.tsx`
- `apps/web/src/components/app/appShell.tsx`

### Problema atacado

- autenticação, sessão, navegação manual, tema e composição das áreas de trabalho acoplados.

### Etapas

1. Extrair hooks dedicados:
   - `useSessionBootstrap`
   - `useAppNavigation`
   - `useThemePreference`
   - `useToastQueue`
2. Mover regras de autorização/path para uma camada explícita de navegação.
3. Reduzir o papel de `App.tsx` para composição.
4. Manter `appShell.tsx` como camada de layout e navegação visual, não de regra de negócio.

### Entregaveis

- componente raiz menor;
- onboarding de novos módulos menos custoso;
- menos risco de regressões transversais.

### Risco

- médio.

### Validacao minima

- `npm run test --workspace=apps/web -- App`
- `npm run typecheck --workspace @noctification/web`

### Criterio de saida

- `App.tsx` deixa de ser o centro de side effects da aplicação.

---

## Fase 4 - Dominio de tarefas no backend

### Objetivo

Separar regras de domínio de tarefas, métricas e persistência.

### Escopo

- `apps/api/src/modules/tasks/application/metrics.ts`
- `apps/api/src/modules/tasks/application/service.ts`
- `apps/api/src/modules/tasks/presentation/admin-routes.ts`
- arquivos próximos do módulo `tasks`

### Problema atacado

- cálculo de SLA, agregação, normalização e acesso ao banco muito próximos;
- camada HTTP dependente demais de detalhes internos.

### Etapas

1. Extrair funções puras de SLA e classificação de filas.
2. Separar query services de métricas dos modelos de mutation.
3. Mover shape de response para presentation mappers.
4. Reduzir dependências diretas da rota em funções de baixo nível.
5. Consolidar contratos internos do módulo `tasks`.

### Entregaveis

- módulo `tasks` com fronteiras mais previsíveis;
- menor custo para evoluir métricas e automações.

### Risco

- médio para alto, então a execução deve ser incremental.

### Validacao minima

- `npm run test --workspace=apps/api -- task-routes`
- `npm run test --workspace=apps/api -- task-automation`
- `npm run typecheck --workspace @noctification/api`

### Criterio de saida

- regras de domínio principais executáveis fora da rota;
- presentation reduzida a parsing/autorização/resposta.

---

## Fase 5 - Rotas legacy backend

### Objetivo

Migrar as rotas antigas mais densas para o padrão modular mais seguro.

### Escopo

- `apps/api/src/routes/reminders-me.ts`
- `apps/api/src/routes/operations-board-me.ts`

### Problema atacado

- SQL, validação, regra de negócio e auditoria no mesmo arquivo.

### Etapas

1. Extrair queries e mutations para helpers ou repositories.
2. Extrair casos de uso por endpoint principal.
3. Padronizar normalização de respostas.
4. Manter contratos HTTP e payloads estáveis durante toda a migração.

### Entregaveis

- rotas mais finas;
- menor risco ao adicionar novos comportamentos.

### Risco

- baixo para médio.

### Validacao minima

- `npm run test --workspace=apps/api -- reminder-routes`
- `npm run test --workspace=apps/api -- operations-board-routes`
- `npm run typecheck --workspace @noctification/api`

### Criterio de saida

- rotas sem SQL bruto relevante no corpo principal.

---

## Fase 6 - Suite de testes web

### Objetivo

Diminuir o custo de manutenção da suíte e melhorar a velocidade de diagnóstico.

### Escopo

- `apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx`
- `apps/web/src/components/AdminDashboard.test.tsx`
- `apps/web/src/features/apr/AprPage.test.tsx`
- fixtures e helpers compartilhados

### Problema atacado

- testes extensos e pouco modulares;
- setup repetido;
- leitura difícil de cenários.

### Etapas

1. Extrair fixtures por subdomínio.
2. Criar builders/helpers de renderização.
3. Quebrar suites muito grandes por comportamento.
4. Padronizar mocks de API por feature.

### Entregaveis

- testes menores;
- menor atrito para refatorar UI;
- diagnóstico mais rápido de falhas.

### Risco

- baixo.

### Validacao minima

- `npm run test --workspace=apps/web`

### Criterio de saida

- suites críticas separadas por contexto, com setups reutilizáveis.

---

## Sequencia recomendada de execucao real

### Ciclo 1

- Fase 1 inteira.

### Ciclo 2

- Fase 2 parcialmente:
  - primeiro `AdminTasksPanel`;
  - depois `AdminDashboard`.

### Ciclo 3

- Fase 3.

### Ciclo 4

- Fase 4 em duas subrodadas:
  - métricas e SLA;
  - service/presentation.

### Ciclo 5

- Fase 5.

### Ciclo 6

- Fase 6 como consolidação.

---

## O que nao fazer

- Não atacar `AdminDashboard`, `App.tsx` e backend tasks todos no mesmo PR.
- Não começar pelo backend APR antes de estabilizar o frontend APR.
- Não mover contratos públicos junto com a refatoração estrutural, salvo necessidade comprovada.
- Não reescrever tudo para um framework novo de navegação ou estado nesta rodada.

## Melhor proxima acao

A melhor próxima ação é executar a Fase 1. Ela é a única que combina:

- prioridade máxima;
- falha objetiva atual;
- escopo relativamente contido;
- validação clara de sucesso.
