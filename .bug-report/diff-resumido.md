# Diff Resumido

## [apps/web/src/lib/runtimeUrls.ts](/home/leo/Noctification2/apps/web/src/lib/runtimeUrls.ts)

- Motivo: corrigir reescrita de loopback IPv6 (`[::1]`).
- Risco: baixo, utilitario puro.
- Validacao associada:
  - `npm run test --workspace @noctification/web -- src/lib/runtimeUrls.test.ts`
  - `npm test`

## [apps/web/src/lib/runtimeUrls.test.ts](/home/leo/Noctification2/apps/web/src/lib/runtimeUrls.test.ts)

- Motivo: cobrir o caso IPv6 que reproduzia o bug.
- Risco: baixo.
- Validacao associada:
  - `npm run test --workspace @noctification/web -- src/lib/runtimeUrls.test.ts`

## [package.json](/home/leo/Noctification2/package.json)

- Motivo: fazer `npm test` da raiz cobrir API e Web.
- Risco: baixo funcional, medio apenas em tempo de execucao.
- Validacao associada:
  - `npm test`
  - `npm run lint`
  - `npm run typecheck`
