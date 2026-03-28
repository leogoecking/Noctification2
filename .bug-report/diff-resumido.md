# Diff resumido

## [`apps/web/src/lib/featureFlags.ts`](/home/leo/Noctification2/apps/web/src/lib/featureFlags.ts)

- Motivo da mudanca: centralizar leitura da flag APR.
- Risco: baixo.
- Validacao associada: `npm run typecheck --workspace @noctification/web`, `npm run test --workspace @noctification/web`.

## [`apps/web/src/App.tsx`](/home/leo/Noctification2/apps/web/src/App.tsx)

- Motivo da mudanca: remover acoplamento do roteamento APR a constante de modulo.
- Risco: baixo.
- Validacao associada: `npm run typecheck --workspace @noctification/web`, `npm run test --workspace @noctification/web`, `npm run test`.

## [`apps/web/src/components/app/appShell.tsx`](/home/leo/Noctification2/apps/web/src/components/app/appShell.tsx)

- Motivo da mudanca: alinhar navegacao e normalizacao de paths a leitura dinamica da flag APR.
- Risco: baixo.
- Validacao associada: `npm run typecheck --workspace @noctification/web`, `npm run test --workspace @noctification/web`.

## [`apps/web/src/App.test.tsx`](/home/leo/Noctification2/apps/web/src/App.test.tsx)

- Motivo da mudanca: tornar a suite deterministica e independente do `.env` local.
- Risco: baixo.
- Validacao associada: `npm run test --workspace @noctification/web`.

## [`apps/api/src/modules/apr/import.ts`](/home/leo/Noctification2/apps/api/src/modules/apr/import.ts)

- Motivo da mudanca: corrigir quebra de `lint` por import nao utilizado.
- Risco: muito baixo.
- Validacao associada: `npm run lint --workspace @noctification/api`, `npm run lint`.
