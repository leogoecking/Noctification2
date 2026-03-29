# Plano de Migracao do Modulo Tasks por Arquivo

Data: 2026-03-29

## Objetivo

Reorganizar o modulo `tasks` por dominio/coesão, sem alterar comportamento funcional, preservando rastreabilidade e validacao por fatias pequenas.

## Escopo desta proposta

- Backend API: arquivos de `tasks` hoje espalhados entre [`apps/api/src/tasks`](/home/leo/Noctification2/apps/api/src/tasks) e [`apps/api/src/routes`](/home/leo/Noctification2/apps/api/src/routes).
- Frontend web: arquivos de `tasks` hoje espalhados entre [`apps/web/src/components`](/home/leo/Noctification2/apps/web/src/components), [`apps/web/src/components/admin`](/home/leo/Noctification2/apps/web/src/components/admin) e [`apps/web/src/lib`](/home/leo/Noctification2/apps/web/src/lib).

## Regras da migracao

- Nao misturar reorganizacao com mudanca de regra de negocio.
- Nao renomear e mover tudo de uma vez.
- Em cada PR, mover uma fatia coerente e revalidar.
- Preferir criar barrels `index.ts` apenas quando ajudarem a reduzir imports quebrados.

## Estrutura alvo

```text
apps/api/src/modules/tasks/
  domain/
  application/
  infrastructure/
  presentation/
  index.ts

apps/web/src/features/tasks/
  components/
  admin/
  api/
  hooks/
  test/
  index.ts
```

## Backend - mapa de migracao

### Fase A1 - Presentation HTTP

Mover:

- [`apps/api/src/routes/tasks-admin.ts`](/home/leo/Noctification2/apps/api/src/routes/tasks-admin.ts)
  -> `apps/api/src/modules/tasks/presentation/admin-routes.ts`

- [`apps/api/src/routes/tasks-me.ts`](/home/leo/Noctification2/apps/api/src/routes/tasks-me.ts)
  -> `apps/api/src/modules/tasks/presentation/me-routes.ts`

- [`apps/api/src/tasks/route-helpers.ts`](/home/leo/Noctification2/apps/api/src/tasks/route-helpers.ts)
  -> `apps/api/src/modules/tasks/presentation/route-helpers.ts`

Objetivo:
- concentrar toda a borda HTTP de `tasks` em um lugar.

Validacao:
- `npm run lint --workspace @noctification/api`
- `npm run typecheck --workspace @noctification/api`
- `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts`

### Fase A2 - Application services

Mover:

- [`apps/api/src/tasks/service.ts`](/home/leo/Noctification2/apps/api/src/tasks/service.ts)
  -> `apps/api/src/modules/tasks/application/service.ts`

- [`apps/api/src/tasks/notifications.ts`](/home/leo/Noctification2/apps/api/src/tasks/notifications.ts)
  -> `apps/api/src/modules/tasks/application/notifications.ts`

- [`apps/api/src/tasks/automation.ts`](/home/leo/Noctification2/apps/api/src/tasks/automation.ts)
  -> `apps/api/src/modules/tasks/application/automation.ts`

- [`apps/api/src/tasks/automation-definitions.ts`](/home/leo/Noctification2/apps/api/src/tasks/automation-definitions.ts)
  -> `apps/api/src/modules/tasks/application/automation-definitions.ts`

- [`apps/api/src/tasks/automation-operations.ts`](/home/leo/Noctification2/apps/api/src/tasks/automation-operations.ts)
  -> `apps/api/src/modules/tasks/application/automation-operations.ts`

- [`apps/api/src/tasks/automation-queries.ts`](/home/leo/Noctification2/apps/api/src/tasks/automation-queries.ts)
  -> `apps/api/src/modules/tasks/application/automation-queries.ts`

- [`apps/api/src/tasks/automation-recurrence.ts`](/home/leo/Noctification2/apps/api/src/tasks/automation-recurrence.ts)
  -> `apps/api/src/modules/tasks/application/automation-recurrence.ts`

Objetivo:
- separar orquestracao e casos de uso da camada de persistencia e da camada HTTP.

Validacao:
- `npm run lint --workspace @noctification/api`
- `npm run typecheck --workspace @noctification/api`
- `npm run test --workspace @noctification/api -- src/test/task-automation.test.ts src/test/task-routes.test.ts`

### Fase A3 - Domain

Mover:

- [`apps/api/src/tasks/domain.ts`](/home/leo/Noctification2/apps/api/src/tasks/domain.ts)
  -> `apps/api/src/modules/tasks/domain/domain.ts`

- [`apps/api/src/tasks/automation-types.ts`](/home/leo/Noctification2/apps/api/src/tasks/automation-types.ts)
  -> `apps/api/src/modules/tasks/domain/automation-types.ts`

Objetivo:
- deixar regras e tipos centrais em uma camada estavel, independente de HTTP/SQL.

Validacao:
- `npm run typecheck --workspace @noctification/api`
- `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts src/test/task-automation.test.ts`

### Fase A4 - Infrastructure / persistence

Mover:

- [`apps/api/src/tasks/task-create-mutation.ts`](/home/leo/Noctification2/apps/api/src/tasks/task-create-mutation.ts)
  -> `apps/api/src/modules/tasks/infrastructure/task-create-mutation.ts`

- [`apps/api/src/tasks/task-update-mutation.ts`](/home/leo/Noctification2/apps/api/src/tasks/task-update-mutation.ts)
  -> `apps/api/src/modules/tasks/infrastructure/task-update-mutation.ts`

- [`apps/api/src/tasks/task-terminal-mutation.ts`](/home/leo/Noctification2/apps/api/src/tasks/task-terminal-mutation.ts)
  -> `apps/api/src/modules/tasks/infrastructure/task-terminal-mutation.ts`

- [`apps/api/src/tasks/task-mutations.ts`](/home/leo/Noctification2/apps/api/src/tasks/task-mutations.ts)
  -> `apps/api/src/modules/tasks/infrastructure/task-mutations.ts`

- [`apps/api/src/tasks/task-mutation-shared.ts`](/home/leo/Noctification2/apps/api/src/tasks/task-mutation-shared.ts)
  -> `apps/api/src/modules/tasks/infrastructure/task-mutation-shared.ts`

Objetivo:
- isolar codigo de banco/SQL e tornar mais explicita a dependencia da camada application em infrastructure.

Validacao:
- `npm run lint --workspace @noctification/api`
- `npm run typecheck --workspace @noctification/api`
- `npm run test --workspace @noctification/api -- src/test/task-routes.test.ts src/test/task-migrations.test.ts`

### Fase A5 - Cleanup e barrel

Criar:

- `apps/api/src/modules/tasks/index.ts`

Ajustar:

- imports em [`apps/api/src/app.ts`](/home/leo/Noctification2/apps/api/src/app.ts) e quaisquer arquivos consumidores.

Remover:

- pasta antiga `apps/api/src/tasks` apenas quando todos os imports estiverem migrados.

Validacao:
- `npm run check:api`

## Frontend - mapa de migracao

### Fase W1 - API da feature

Mover:

- [`apps/web/src/lib/apiTasks.ts`](/home/leo/Noctification2/apps/web/src/lib/apiTasks.ts)
  -> `apps/web/src/features/tasks/api/tasksApi.ts`

Objetivo:
- deixar a chamada HTTP da feature perto da propria feature.

Validacao:
- `npm run lint --workspace @noctification/web`
- `npm run typecheck --workspace @noctification/web`
- `npm run test --workspace @noctification/web -- src/components/TaskUserPanel.test.tsx src/components/admin/AdminTasksPanel.test.tsx`

### Fase W2 - User feature

Mover:

- [`apps/web/src/components/TaskUserPanel.tsx`](/home/leo/Noctification2/apps/web/src/components/TaskUserPanel.tsx)
  -> `apps/web/src/features/tasks/components/TaskUserPanel.tsx`

- [`apps/web/src/components/TaskUserPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/components/TaskUserPanel.test.tsx)
  -> `apps/web/src/features/tasks/test/TaskUserPanel.test.tsx`

Opcional durante a mesma fatia:

- extrair subcomponentes internos do painel se necessario, mas sem mudar comportamento.

Validacao:
- `npm run test --workspace @noctification/web -- src/features/tasks/test/TaskUserPanel.test.tsx`
- `npm run lint --workspace @noctification/web`
- `npm run typecheck --workspace @noctification/web`

### Fase W3 - Admin feature

Mover:

- [`apps/web/src/components/admin/AdminTasksPanel.tsx`](/home/leo/Noctification2/apps/web/src/components/admin/AdminTasksPanel.tsx)
  -> `apps/web/src/features/tasks/admin/AdminTasksPanel.tsx`

- [`apps/web/src/components/admin/AdminTasksPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/components/admin/AdminTasksPanel.test.tsx)
  -> `apps/web/src/features/tasks/test/AdminTasksPanel.test.tsx`

- [`apps/web/src/components/admin/adminTasksPanelModel.ts`](/home/leo/Noctification2/apps/web/src/components/admin/adminTasksPanelModel.ts)
  -> `apps/web/src/features/tasks/admin/adminTasksPanelModel.ts`

Objetivo:
- aproximar o admin de tarefas da propria feature de tarefas, em vez de manter tudo sob um guarda-chuva `admin`.

Validacao:
- `npm run test --workspace @noctification/web -- src/features/tasks/test/AdminTasksPanel.test.tsx`
- `npm run lint --workspace @noctification/web`
- `npm run typecheck --workspace @noctification/web`

### Fase W4 - Fixtures e test utilities

Mover ou duplicar com adaptacao minima:

- [`apps/web/src/test/fixtures.ts`](/home/leo/Noctification2/apps/web/src/test/fixtures.ts)
  -> manter como shared test util

Ou, se a feature crescer:

- criar `apps/web/src/features/tasks/test/tasks.fixtures.ts`

Objetivo:
- separar fixtures genericas de fixtures especificas da feature.

Validacao:
- testes focados de `tasks`

### Fase W5 - Cleanup e reexports

Criar:

- `apps/web/src/features/tasks/index.ts`

Ajustar consumidores:

- [`apps/web/src/components/UserDashboard.tsx`](/home/leo/Noctification2/apps/web/src/components/UserDashboard.tsx)
- [`apps/web/src/components/AdminDashboard.tsx`](/home/leo/Noctification2/apps/web/src/components/AdminDashboard.tsx)

Objetivo:
- reduzir imports cruzados antigos e deixar a feature exposta por uma superficie unica.

Validacao:
- `npm run check:web`

## Ordem recomendada dos PRs

1. PR 1: backend presentation (`tasks-admin.ts`, `tasks-me.ts`, `route-helpers.ts`)
2. PR 2: backend application
3. PR 3: backend domain + infrastructure
4. PR 4: frontend `apiTasks` + `TaskUserPanel`
5. PR 5: frontend `AdminTasksPanel` + model
6. PR 6: cleanup final + reexports

## Critérios para abortar ou pausar

- Se uma fatia passar a exigir mudanca funcional para continuar.
- Se surgirem imports ciclicos novos.
- Se os testes de `tasks` passarem a depender de rearranjos em outras features (`notifications`, `reminders`, `admin users`).

## Resultado esperado

- Menos arquivos espalhados por tipo tecnico.
- Melhor localizacao de codigo por feature.
- Menor risco de duplicacao futura em `tasks`.
- Base mais preparada para a Fase 3, especialmente simplificacao do shell do frontend.
