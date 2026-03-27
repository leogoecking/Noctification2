## Resumo do diff

### `apps/api/src/config.ts`

- Motivo da mudanca: adicionar `ENABLE_APR_MODULE`
- Risco: baixo
- Validacao associada: `npm run typecheck`, `npm run test`

### `apps/api/src/app.ts`

- Motivo da mudanca: montar o router APR somente quando a flag estiver ativa
- Risco: baixo
- Validacao associada: `npm run build`, `npm run test`

### `apps/api/src/modules/apr/route.ts`

- Motivo da mudanca: criar health route isolada do modulo APR
- Risco: baixo
- Validacao associada: `npm run test`

### `apps/api/src/test/health-routes.test.ts`

- Motivo da mudanca: validar montagem condicional da rota APR
- Risco: baixo
- Validacao associada: `npm run test`

### `apps/web/src/components/app/appShell.tsx`

- Motivo da mudanca: permitir `/apr` somente sob flag no frontend
- Risco: baixo
- Validacao associada: `npm run build`, `npm run test`, `npm run typecheck`

### `apps/web/src/features/apr/AprPage.tsx`

- Motivo da mudanca: criar placeholder visual do APR
- Risco: baixo
- Validacao associada: `npm run build`, `npm run test`

### `apps/web/src/features/apr/api.ts`

- Motivo da mudanca: criar camada dedicada de acesso a API do modulo APR
- Risco: baixo
- Validacao associada: `npm run typecheck --workspace @noctification/web`, `npm run test --workspace @noctification/web -- src/features/apr/AprPage.test.tsx src/App.test.tsx`

### `apps/web/src/features/apr/types.ts`

- Motivo da mudanca: tipar o contrato consumido pela feature APR sem refatorar tipos globais
- Risco: baixo
- Validacao associada: `npm run typecheck --workspace @noctification/web`

### `apps/web/src/features/apr/AprPage.tsx`

- Motivo da mudanca: substituir o placeholder por tela funcional isolada com meses, resumo, CRUD manual, audit, history e importacao
- Risco: baixo
- Validacao associada: `npm run build --workspace @noctification/web`, `npm run test --workspace @noctification/web -- src/features/apr/AprPage.test.tsx src/App.test.tsx`

### `apps/web/src/features/apr/AprPage.test.tsx`

- Motivo da mudanca: validar o fluxo principal da feature APR no frontend
- Risco: baixo
- Validacao associada: `npm run test --workspace @noctification/web -- src/features/apr/AprPage.test.tsx src/App.test.tsx`

### `packages/apr-core/package.json`

- Motivo da mudanca: registrar workspace compartilhado inicial
- Risco: baixo
- Validacao associada: `npm run typecheck`

### `packages/apr-core/src/index.ts`

- Motivo da mudanca: reservar contrato inicial do APR
- Risco: baixo
- Validacao associada: revisao estatica

### `package.json`

- Motivo da mudanca: incluir `packages/apr-core` nos workspaces
- Risco: baixo
- Validacao associada: `npm run build`, `npm run test`, `npm run typecheck`

### Arquivos de env e docs

- Motivo da mudanca: documentar ativacao e estrutura da fase 1
- Risco: baixo
- Validacao associada: revisao estatica

### `apps/api/migrations/019_apr_advanced_ops.sql`

- Motivo da mudanca: adicionar tabela isolada de catalogo APR para suportar operacoes avancadas
- Risco: baixo
- Validacao associada: `npm run test --workspace @noctification/api -- src/test/apr-migrations.test.ts`

### `apps/api/src/modules/apr/repository.ts`

- Motivo da mudanca: acrescentar catalogo de colaboradores, snapshots, limpeza por mes e limpeza global no namespace APR
- Risco: baixo
- Validacao associada: `npm run test --workspace @noctification/api -- src/test/apr-service.test.ts src/test/apr-migrations.test.ts`

### `apps/api/src/modules/apr/service.ts`

- Motivo da mudanca: implementar snapshot, restore do ultimo snapshot, clear-month e clear-all com salvaguarda por snapshot
- Risco: medio dentro do modulo APR, baixo fora dele
- Validacao associada: `npm run test --workspace @noctification/api -- src/test/apr-service.test.ts src/test/apr-destructive.test.ts src/test/apr-routes.test.ts`

### `apps/api/src/modules/apr/validators.ts`

- Motivo da mudanca: exigir `reason` e `confirm_text` exatos em operacoes destrutivas
- Risco: baixo
- Validacao associada: `npm run test --workspace @noctification/api -- src/test/apr-routes.test.ts src/test/apr-destructive.test.ts`

### `apps/api/src/modules/apr/controller.ts`

- Motivo da mudanca: expor endpoints avancados APR mantendo o padrao atual da API
- Risco: baixo
- Validacao associada: `npm run test --workspace @noctification/api -- src/test/apr-routes.test.ts`

### `apps/api/src/modules/apr/routes.ts`

- Motivo da mudanca: registrar rotas de catalogo, snapshots, restore e limpeza apenas no namespace `/api/v1/apr`
- Risco: baixo
- Validacao associada: `npm run test --workspace @noctification/api -- src/test/apr-routes.test.ts`

### `apps/api/src/test/apr-destructive.test.ts`

- Motivo da mudanca: validar especificamente confirmacao explicita e ausencia de restore sem snapshot
- Risco: baixo
- Validacao associada: `npm run test --workspace @noctification/api -- src/test/apr-destructive.test.ts`

### `docs/apr-advanced-operations.md`

- Motivo da mudanca: documentar riscos, rollback e limitacoes das operacoes avancadas APR
- Risco: baixo
- Validacao associada: revisao estatica
