## Validacao executada

- Data: 2026-03-27
- Escopo: monorepo raiz

### Comandos

- `npm run build`
- `npm run test`
- `npm run typecheck`

### Resultado

- `build`: aprovado
- `test`: aprovado
- `typecheck`: aprovado

### Observacoes

- O ambiente emite warnings de npm sobre `globalignorefile`, mas a execucao concluiu com sucesso.
- Os testes do backend para APR foram adaptados para inspecao do router do Express, evitando dependencia de abertura de porta no sandbox.

## Validacao adicional do frontend APR

- Escopo: `apps/web/src/features/apr`
- Comandos:
  - `npm run test --workspace @noctification/web -- src/features/apr/AprPage.test.tsx src/App.test.tsx`
  - `npm run typecheck --workspace @noctification/web`
  - `npm run build --workspace @noctification/web`
  - `npm run build`
  - `npm run test`
  - `npm run typecheck`
- Resultado:
  - todos os comandos aprovados
- Observacoes:
  - o build global continuou atualizando o artefato gerado `apps/web/tsconfig.tsbuildinfo`
  - o ambiente manteve warnings de npm sobre `globalignorefile`, sem impacto funcional

## Validacao adicional das operacoes avancadas APR

- Escopo: `apps/api/src/modules/apr`
- Comandos:
  - `npm run test --workspace @noctification/api -- src/test/apr-migrations.test.ts src/test/apr-service.test.ts src/test/apr-routes.test.ts src/test/apr-destructive.test.ts src/test/apr-import-integration.test.ts`
  - `npm run build --workspace @noctification/api`
  - `npm run typecheck --workspace @noctification/api`
  - `npm run build`
  - `npm run test`
  - `npm run typecheck`
- Resultado:
  - todos os comandos aprovados
- Observacoes:
  - as protecoes destrutivas ficaram cobertas por testes especificos em `apr-destructive.test.ts`
