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
  - `VULN-001` corrigido com revalidacao de `npm audit --audit-level=high`, testes e build

## Validacao executada na rodada de seguranca 2026-03-26

- `npm ls flatted picomatch socket.io-parser --all`
- `npm audit fix`
- `npm audit --audit-level=high`
- `npm run test:api`
- `npm run test:web`
- `npm run build`

## Resultado da rodada de seguranca 2026-03-26

- `npm audit --audit-level=high`: passou, sem achados `high`
- `npm run test:api`: passou
- `npm run test:web`: passou
- `npm run build`: passou

## O que não foi validado

- Navegação manual em navegador real
- Ambiente com proxy/gateway intermediário para confirmar `RISK-001`
- SSR/pré-render do frontend
- `npm audit fix --force` não foi executado; vulnerabilidades `moderate` na cadeia do `eslint` permaneceram pendentes por exigir upgrade major
