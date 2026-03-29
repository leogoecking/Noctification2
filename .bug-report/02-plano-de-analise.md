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
## Analise incremental 2026-03-28

### Ordem de execucao

1. Reconhecimento de stack, workspaces, entrypoints e automacao.
2. Confirmacao de ferramentas disponiveis no ambiente.
3. Execucao de `npm run lint`.
4. Execucao de `npm run typecheck`.
5. Inspecao manual de arquivos centrais, workflow CI, `.gitignore` e distribuicao de responsabilidades.
6. Consolidacao de melhorias recomendadas com foco em produtividade e organizacao.

### Ferramentas escolhidas

- `find`/`sed`/`tail`/`wc`: mapeamento estrutural e medicao de complexidade por arquivo.
- `npm run lint`: validar padrao minimo de qualidade e identificar ruido operacional.
- `npm run typecheck`: confirmar coerencia basica de contratos TypeScript.
- `git status --short`: registrar estado local antes da analise.

### Modulos prioritarios nesta rodada

- Shell do frontend e fluxos de sessao: [`apps/web/src/App.tsx`](/home/leo/Noctification2/apps/web/src/App.tsx)
- Orquestracao raiz e workspaces: [`package.json`](/home/leo/Noctification2/package.json)
- Pipeline de CI: [`.github/workflows/main.yml`](/home/leo/Noctification2/.github/workflows/main.yml)
- Regras de lint/ignore: [`.eslintrc.cjs`](/home/leo/Noctification2/.eslintrc.cjs), [`.gitignore`](/home/leo/Noctification2/.gitignore)
- Pastas com maior densidade: `apps/api/src/routes`, `apps/api/src/tasks`, `apps/web/src/components`, `apps/web/src/lib`

### Risco previsto e limitacoes

- Baixo risco, pois a rodada e apenas diagnostica.
- Sem execucao de browser real, sem deploy, sem smoke HTTP e sem testes completos por workspace.
- As recomendacoes abaixo sao classificadas como `melhoria` ou `problema_de_qualidade`, nao como bug confirmado, salvo quando existe evidencia operacional objetiva.
