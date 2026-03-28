# Fase 2 - Plano de analise adaptativo

## Ordem de execucao

1. `packages/apr-core`: testes e typecheck.
2. `apps/api`: typecheck, lint e testes.
3. `apps/web`: typecheck, lint e testes.
4. Se houver falhas: leitura dirigida apenas dos modulos relacionados.
5. Se tudo passar: revisao manual dos modulos de maior risco para buscar bugs nao cobertos.
6. Triagem, priorizacao, correcao minima e revalidacao apenas do escopo afetado.

## Ferramentas escolhidas

### `npm run test --workspace @noctification/apr-core`

- Por que usar: valida regras centrais APR compartilhadas.
- Escopo: `packages/apr-core/src`.
- Confiabilidade esperada: alta para regressao de logica de comparacao/importacao/normalizacao.
- Tipo de achado esperado: `bug_reproduzivel`, `problema_de_qualidade`, `integracao_quebrada`.

### `npm run typecheck --workspace @noctification/apr-core`

- Por que usar: garante consistencia estatica do pacote compartilhado.
- Escopo: `packages/apr-core`.
- Confiabilidade esperada: alta para quebras de contrato TypeScript.
- Tipo de achado esperado: `integracao_quebrada`, `problema_de_qualidade`.

### `npm run typecheck --workspace @noctification/api`

- Por que usar: alta cobertura estatica sobre rotas, services e integracao interna.
- Escopo: `apps/api/src`.
- Confiabilidade esperada: alta para incompatibilidades de tipos e APIs internas.
- Tipo de achado esperado: `integracao_quebrada`, `erro_de_configuracao`, `problema_de_qualidade`.

### `npm run lint --workspace @noctification/api`

- Por que usar: identificar erros reais de variaveis, fluxo e higiene minima.
- Escopo: `apps/api/**/*.ts`.
- Confiabilidade esperada: media; lint isolado nao sera tratado automaticamente como bug.
- Tipo de achado esperado: `problema_de_qualidade`, possivelmente apoio a `bug_reproduzivel`.

### `npm run test --workspace @noctification/api`

- Por que usar: melhor fonte automatizada para confirmar comportamento quebrado em autenticao, reminders, tasks, APR e web push.
- Escopo: `apps/api/src/test`.
- Confiabilidade esperada: alta quando falhar com reproducao consistente.
- Tipo de achado esperado: `bug_reproduzivel`, `integracao_quebrada`, `erro_de_configuracao`.

### `npm run typecheck --workspace @noctification/web`

- Por que usar: detecta divergencias entre componentes, hooks e tipos compartilhados com a API.
- Escopo: `apps/web/src`.
- Confiabilidade esperada: alta para contratos de props, hooks e APIs internas.
- Tipo de achado esperado: `integracao_quebrada`, `problema_de_qualidade`.

### `npm run lint --workspace @noctification/web`

- Por que usar: verifica erros estruturais simples em React/TypeScript.
- Escopo: `apps/web/**/*.{ts,tsx}`.
- Confiabilidade esperada: media.
- Tipo de achado esperado: `problema_de_qualidade`.

### `npm run test --workspace @noctification/web`

- Por que usar: confirma comportamento de navegação, hooks e telas criticas.
- Escopo: testes de interface em `apps/web/src`.
- Confiabilidade esperada: media/alta para regressao funcional em UI.
- Tipo de achado esperado: `bug_reproduzivel`, `integracao_quebrada`.

## Modulos prioritarios

- Autenticacao e sessao.
- Rotas `me` e `admin`.
- Schedulers e automacao (`reminders`, `tasks`).
- Web push e sockets.
- Integracao APR entre `apr-core`, API e frontend.

## Risco previsto

- Medio no backend por volume de regras de negocio e uso de SQLite + schedulers.
- Medio no frontend por acoplamento com ambiente (`window`, service worker, runtime URLs).
- Baixo no pacote compartilhado, mas com impacto transversal se houver erro.

## Limitacoes

- `rg` ausente; busca textual sera menos eficiente.
- Sem depender de internet ou de servicos externos.
- Validacoes end-to-end com navegador real nao estao confirmadas neste ambiente.
