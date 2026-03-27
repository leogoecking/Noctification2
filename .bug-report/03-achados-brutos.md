## Achados brutos

### APR-001

- Categoria: `melhoria`
- Evidencia:
  - O monorepo nao tinha estrutura dedicada para APR em backend, frontend ou pacote compartilhado.
  - O backend ja usa composicao central de rotas em `apps/api/src/app.ts`.
  - O frontend ja usa roteamento manual em `apps/web/src/App.tsx` e `apps/web/src/components/app/appShell.tsx`.
- Interpretacao:
  - A solicitacao pode ser atendida com extensao incremental de baixo risco, sem alterar autenticacao, notificacoes, Socket.IO ou rotas existentes.

## Sem achados de bug confirmados

- Nenhum bug funcional existente foi alvo desta fase.
- Nenhuma vulnerabilidade confirmada foi identificada no escopo executado.

### BUG-003

- Categoria: `bug_reproduzivel`
- Evidencia:
  - O pacote `packages/apr-core/src/import.ts` ja remove o wrapper Excel `="..."` via `unwrapSpreadsheetFormulaText`.
  - O backend APR em `apps/api/src/modules/apr/service.ts` e `apps/api/src/modules/apr/validators.ts` nao reaplicava a mesma sanitizacao ao validar payload manual, ler registros persistidos e comparar auditoria.
  - O valor reportado pelo usuario, `="235269"`, e compativel com esse formato bruto de planilha e explica o ID incorreto exibido em `auditoria/divergencia`.
- Interpretacao:
  - O modulo APR aceitava/exibia `external_id` cru em alguns fluxos, causando divergencia visual e comparacoes incorretas quando o dado vinha encapsulado como texto-formula do Excel.
