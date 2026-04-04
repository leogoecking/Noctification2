# 03 - Achados Brutos

## Rodada 2026-04-04

## Validacoes executadas

- `npm run lint`
  - resultado final: sucesso
- `npm run typecheck`
  - resultado final: sucesso
- `npm run test:core`
  - resultado: sucesso
- `npm run test:web`
  - resultado final: sucesso
- `npm run test:api`
  - resultado final na sandbox: sucesso
- `npm run test --workspace=apps/api -- src/test/api.test.ts`
  - resultado final na sandbox: sucesso
- `npm run test --workspace=apps/web -- src/components/OperationsBoardRail.test.tsx`
  - resultado final: sucesso, sem warnings React `act(...)`

## Achados coletados e resolvidos

### ERR-001

- classificacao: `erro_de_configuracao`
- local principal: `apps/api/src/test/api.test.ts:63`, `apps/api/src/test/api.test.ts:82`
- sintoma inicial:
  - a suite `test:api` falhava dentro da sandbox com `Cannot read properties of null (reading 'port')`
  - a causa imediata registrada pelo Vitest era `listen EPERM: operation not permitted 0.0.0.0`
- causa raiz confirmada:
  - `api.test.ts` dependia de `supertest` com bind HTTP efemero, incompatível com a sandbox
- resolucao aplicada:
  - criacao de harness HTTP in-process em `apps/api/src/test/express-test-client.ts`
  - migracao de `apps/api/src/test/api.test.ts` para esse harness
- evidencias finais:
  - `npm run test --workspace=apps/api -- src/test/api.test.ts` passou na sandbox
  - `npm run test:api` passou na sandbox com `19` arquivos e `86` testes aprovados

### QUAL-001

- classificacao: `problema_de_qualidade`
- local principal: `apps/web/src/components/OperationsBoardRail.test.tsx:69`
- local relacionado: `apps/web/src/components/OperationsBoardRail.tsx:61`
- sintoma inicial:
  - o teste passava, mas emitia warnings React `act(...)` em 2 cenarios
- causa raiz confirmada:
  - cleanup do teste removia a classe global `dark` enquanto o componente ainda podia observar mutacoes
- resolucao aplicada:
  - cleanup explicito com `cleanup()` seguido de remocao da classe global dentro de `act(...)`
- evidencias finais:
  - `npm run test --workspace=apps/web -- src/components/OperationsBoardRail.test.tsx` passou sem warnings
  - `npm run test:web` passou com `24` arquivos e `134` testes aprovados

## Achados descartados como bug confirmado

- `npm warn Unknown builtin config "globalignorefile"`
  - tratado como ruido de ambiente do usuario (`../.npmrc`), fora do escopo do repositorio
