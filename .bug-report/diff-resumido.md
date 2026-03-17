# Diff resumido

## Arquivos alterados nesta rodada

- `.bug-report/premissas.md`
  - Motivo: registrar premissas e limites da analise.
  - Risco: nenhum para o produto.
  - Validacao associada: nao aplicavel.

- `.bug-report/01-reconhecimento.md`
  - Motivo: documentar estrutura, stack e estrategia.
  - Risco: nenhum para o produto.
  - Validacao associada: nao aplicavel.

- `.bug-report/02-plano-de-analise.md`
  - Motivo: registrar o plano adaptativo executado.
  - Risco: nenhum para o produto.
  - Validacao associada: nao aplicavel.

- `.bug-report/03-achados-brutos.md`
  - Motivo: registrar evidencias iniciais e reproducoes.
  - Risco: nenhum para o produto.
  - Validacao associada: checks e reproducoes locais.

- `.bug-report/achados.json`
  - Motivo: estruturar os achados em formato consumivel.
  - Risco: nenhum para o produto.
  - Validacao associada: coerencia com o relatorio.

- `.bug-report/04-priorizacao.md`
  - Motivo: ordenar os itens por impacto e confianca.
  - Risco: nenhum para o produto.
  - Validacao associada: coerencia com evidencias coletadas.

- `.bug-report/05-validacao.md`
  - Motivo: registrar o que foi efetivamente executado.
  - Risco: nenhum para o produto.
  - Validacao associada: saidas dos comandos e reproducoes.

- `.bug-report/06-pos-correcao.md`
  - Motivo: explicitar que nao houve etapa de correcao nesta rodada.
  - Risco: nenhum para o produto.
  - Validacao associada: nao aplicavel.

- `.bug-report/RELATORIO.md`
  - Motivo: consolidar o resultado final.
  - Risco: nenhum para o produto.
  - Validacao associada: coerencia com os arquivos anteriores.

- `.bug-report/bugs-final.json`
  - Motivo: consolidar o status final dos itens relevantes.
  - Risco: nenhum para o produto.
  - Validacao associada: coerencia com `achados.json`.

- `.bug-report/metricas.csv`
  - Motivo: fornecer visao tabular minima dos itens.
  - Risco: nenhum para o produto.
  - Validacao associada: coerencia com `bugs-final.json`.

- `apps/api/src/routes/admin.ts`
  - Motivo: corrigir derivacao de status operacional legado no historico admin.
  - Risco: baixo.
  - Validacao associada: `npm run test:api`.

- `apps/api/src/routes/me.ts`
  - Motivo: corrigir derivacao de status operacional legado para o usuario.
  - Risco: baixo.
  - Validacao associada: testes focados de notificacao + `npm run test:api`.

- `apps/api/src/socket.ts`
  - Motivo: corrigir compatibilidade legada usada pelo realtime de lembretes.
  - Risco: baixo.
  - Validacao associada: `npm run test:api`, `npm run build`.

- `apps/api/migrations/011_fix_assumida_operational_status.sql`
  - Motivo: reparar bases ja migradas com `operational_status` incorreto para `assumida`.
  - Risco: baixo.
  - Validacao associada: `npm run test:api`.

- `apps/api/src/routes/reminders-me.ts`
  - Motivo: recalcular a ancora do scheduler ao editar a agenda de um lembrete.
  - Risco: baixo.
  - Validacao associada: teste focado de lembrete + `npm run test:api`.

- `apps/api/src/test/notification-routes.test.ts`
  - Motivo: cobrir regressao de notificacao legada `assumida`.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/notification-routes.test.ts`.

- `apps/api/src/test/reminder-routes.test.ts`
  - Motivo: cobrir regressao de reprocessamento do scheduler apos edicao.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/reminder-routes.test.ts`.

- `.bug-report/correcoes/BUG-001.md`
  - Motivo: rastreabilidade da correcao do bug 001.
  - Risco: nenhum para o produto.
  - Validacao associada: documentacao.

- `.bug-report/correcoes/BUG-002.md`
  - Motivo: rastreabilidade da correcao do bug 002.
  - Risco: nenhum para o produto.
  - Validacao associada: documentacao.

- `apps/api/src/routes/auth.ts`
  - Motivo: rejeitar `expected_role` divergente antes de criar cookie de sessao.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/auth-routes.test.ts`.

- `apps/api/src/test/auth-routes.test.ts`
  - Motivo: cobrir a rejeicao de papel divergente sem cookie.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/api -- src/test/auth-routes.test.ts`.

- `apps/web/src/lib/api.ts`
  - Motivo: enviar `expected_role` no login do frontend.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/App.test.tsx`.

- `apps/web/src/App.tsx`
  - Motivo: adicionar logout compensatorio caso chegue papel divergente.
  - Risco: baixo.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/App.test.tsx`.

- `apps/web/src/App.test.tsx`
  - Motivo: cobrir envio de `expected_role` e logout compensatorio.
  - Risco: nenhum para o produto.
  - Validacao associada: `npm run test --workspace @noctification/web -- src/App.test.tsx`.

- `.bug-report/correcoes/RISK-001.md`
  - Motivo: rastreabilidade da correcao do bug RISK-001.
  - Risco: nenhum para o produto.
  - Validacao associada: documentacao.
