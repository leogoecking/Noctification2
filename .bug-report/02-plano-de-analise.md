# 02 - Plano de Análise

## Ordem de execução

1. Reconhecimento de stack, scripts, entrypoints e CI.
2. Validação global:
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - `npm run test:web`
3. Triagem dirigida em áreas sensíveis:
   - scripts raiz
   - runtime URL/frontend bootstrap
   - web push
4. Reproduções pontuais via `node --import tsx` quando houver hipótese objetiva.

## Ferramentas escolhidas

### `find`, `sed`, `nl`, `grep`

- Motivo: inspeção estrutural e leitura de arquivos.
- Escopo: reconhecimento e referências de linha.
- Confiabilidade esperada: alta.
- Tipo de achado esperado: configuração, contratos, inconsistências de código.

### `npm run lint`

- Motivo: detectar erros estáticos relevantes.
- Escopo: monorepo inteiro.
- Confiabilidade esperada: média.
- Tipo de achado esperado: problemas de qualidade e alguns bugs óbvios.

### `npm run typecheck`

- Motivo: detectar incompatibilidades de tipo.
- Escopo: monorepo inteiro.
- Confiabilidade esperada: alta para regressões de contrato internas.
- Tipo de achado esperado: integração quebrada, erro de configuração, bug de contrato.

### `npm test` e `npm run test:web`

- Motivo: validar comportamento com evidência executável.
- Escopo: API e Web.
- Confiabilidade esperada: alta nos fluxos cobertos.
- Tipo de achado esperado: bug reproduzível, integração quebrada.

### `node --import tsx -e ...`

- Motivo: reproduções pequenas e objetivas em módulos TS.
- Escopo: funções puras e utilitários.
- Confiabilidade esperada: alta.
- Tipo de achado esperado: bug reproduzível.

## Módulos prioritários

1. `apps/web/src/lib/runtimeUrls.ts`
2. `package.json`
3. `apps/api/src/routes/me.ts`
4. `apps/web/src/lib/api.ts`
5. `apps/web/src/main.tsx`

## Limitações

- Sem rede externa.
- Sem `docker`.
- Sem `rg`.
- Não houve execução de smoke E2E em navegador real.
