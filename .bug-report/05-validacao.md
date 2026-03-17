# Validacao executada

## Checks gerais apos a correcao

- `npm run lint`: sucesso.
- `npm run typecheck`: sucesso.
- `npm run test:api`: sucesso.
- `npm run test:web`: sucesso.
- `npm run build`: sucesso.

## Testes direcionados

- `npm run test --workspace @noctification/api -- src/test/notification-routes.test.ts`: sucesso.
- `npm run test --workspace @noctification/api -- src/test/reminder-routes.test.ts`: sucesso.

## Validacao por bug

### BUG-001

- As consultas do usuario, do admin e do realtime agora priorizam `response_status` legado antes de considerar `operational_status`.
- A migration `011_fix_assumida_operational_status.sql` corrige bases ja migradas.
- O teste novo cobre o cenario legado com `operational_status = 'recebida'` e exige retorno `assumida`.

### BUG-002

- A rota de edicao recalcula `last_scheduled_for` quando a agenda muda.
- O teste novo cobre a troca de `09:00` para `20:00` com `last_scheduled_for` existente e exige proxima ocorrencia em `2026-03-14T23:00:00.000Z`.

### RISK-001

- O backend agora rejeita `expected_role` divergente antes de emitir cookie.
- O frontend envia `expected_role` no login e faz logout compensatorio se receber papel divergente.
- A cobertura foi adicionada em `apps/api/src/test/auth-routes.test.ts` e `apps/web/src/App.test.tsx`.
