# Diff Resumido

## apps/web/src/features/apr/AprPage.tsx

- Motivo da mudanca: adicionar paginação local na tabela manual APR com limite de 5 itens por pagina.
- Motivo adicional: reduzir a listagem e a exportacao das divergencias APR para ID, Status, Assunto e Nome do colaborador.
- Motivo adicional: filtrar corretamente apenas divergencias reais no card Audit / divergencias e paginar 5 por pagina.
- Risco: baixo.
- Validacao associada:
  - `npm run test --workspace @noctification/web -- AprPage.test.tsx`
  - `npm run typecheck --workspace @noctification/web`

## apps/web/src/features/apr/AprPage.test.tsx

- Motivo da mudanca: cobrir a nova regra de paginação, a navegacao para a proxima pagina, a reducao dos campos nas divergencias/PDF e o filtro correto das divergencias reais.
- Risco: baixo.
- Validacao associada:
  - `npm run test --workspace @noctification/web -- AprPage.test.tsx`
