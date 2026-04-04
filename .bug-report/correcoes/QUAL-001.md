# QUAL-001

## Resumo do problema

- `apps/web/src/components/OperationsBoardRail.test.tsx` emitia warnings React `act(...)` mesmo com testes aprovados.

## Causa raiz

- o teardown do teste removia a classe global `dark` enquanto o componente ainda podia reagir a mutacoes do DOM global.

## Arquivos alterados

- `apps/web/src/components/OperationsBoardRail.test.tsx`

## Estrategia da correcao

- executar `cleanup()` explicitamente no `afterEach`
- encapsular a remocao da classe `dark` em `act()`

## Riscos considerados

- risco baixo, porque a mudanca ficou isolada no teste e nao alterou o componente

## Validacao executada

- `npm run test --workspace=apps/web -- src/components/OperationsBoardRail.test.tsx`
- `npm run test:web`
- `npm run typecheck`
- `npm run lint`
