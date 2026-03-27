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

## [package-lock.json](/home/leo/Noctification2/package-lock.json)

- Motivo: remover as resolucoes vulneraveis `flatted@3.4.0`, `picomatch@2.3.1/4.0.3` e `socket.io-parser@4.2.5` apontadas pelo `npm audit`.
- Risco: baixo, alteracao restrita ao lockfile com bumps transitivos de patch.
- Validacao associada:
  - `npm audit --audit-level=high`
  - `npm run test:api`
  - `npm run test:web`
  - `npm run build`
