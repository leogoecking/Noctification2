# RISK-001

## Resumo do problema

O fluxo de login por rota (`/login` vs `/admin/login`) podia aceitar a autenticacao no backend e so depois rejeitar no frontend, deixando a sessao ativa.

## Causa raiz

- A validacao de papel acontecia apenas no cliente.
- O backend emitia cookie de sessao antes de qualquer restricao de contexto da rota.
- O frontend nao fazia logout compensatorio ao detectar papel divergente.

## Arquivos alterados

- `apps/api/src/routes/auth.ts`
- `apps/api/src/test/auth-routes.test.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/App.test.tsx`

## Estrategia da correcao

- Adicionar `expected_role` opcional ao login no backend e negar o acesso antes de criar cookie quando houver divergencia.
- Fazer o frontend enviar `expected_role`.
- Manter logout compensatorio no frontend caso uma API antiga ou inconsistente ainda retorne sessao com papel divergente.

## Riscos considerados

- Baixo: o contrato novo e aditivo, preservando chamadas antigas sem `expected_role`.
- A protecao em duas camadas reduz risco de regressao e de estados parcialmente autenticados.

## Validacao executada

- `npm run test --workspace @noctification/api -- src/test/auth-routes.test.ts`
- `npm run test --workspace @noctification/web -- src/App.test.tsx`
- `npm run lint`
- `npm run typecheck`
- `npm run test:api`
- `npm run test:web`
- `npm run build`
