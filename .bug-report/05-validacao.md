# 05 - Validação

## Validação executada nesta rodada

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:web`
- `node --import tsx -e "...resolveRuntimeApiBase/resolveRuntimeSocketUrl..."`
- `npm run test --workspace @noctification/web -- src/lib/runtimeUrls.test.ts`

## Resultado

- Lint: passou
- Typecheck: passou
- Testes API: passaram
- Testes Web: passaram
- Correcoes validadas:
  - `BUG-001` corrigido e coberto por teste dedicado
  - `CFG-001` corrigido com validacao do novo `npm test` raiz

## O que não foi validado

- Navegação manual em navegador real
- Ambiente com proxy/gateway intermediário para confirmar `RISK-001`
- SSR/pré-render do frontend
