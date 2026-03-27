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

## Adendo 2026-03-26 - plano de auditoria de dependencias

## Ordem de execucao complementar

1. Confirmar a arvore local com `npm ls flatted picomatch socket.io-parser --all`.
2. Confirmar as versoes no `package-lock.json`.
3. Executar `npm audit fix` apenas se a atualizacao puder ficar restrita ao lockfile.
4. Revalidar com `npm audit --audit-level=high`.
5. Executar testes e build do monorepo para validar ausencia de regressao.

## Ferramentas escolhidas

### `npm ls`

- Motivo: mapear origem real das dependencias vulneraveis.
- Escopo: monorepo inteiro.
- Confiabilidade esperada: alta.
- Tipo de achado esperado: vulnerabilidade confirmada e superficie afetada.

### `npm audit` / `npm audit fix`

- Motivo: reproduzir o advisory reportado e aplicar a menor correcao viavel.
- Escopo: lockfile raiz.
- Confiabilidade esperada: alta, dependente do registro npm.
- Tipo de achado esperado: vulnerabilidade confirmada.

### `npm run test:api`, `npm run test:web`, `npm run build`

- Motivo: validar que a atualizacao transitiva nao quebrou runtime, testes ou bundling.
- Escopo: workspaces `apps/api` e `apps/web`.
- Confiabilidade esperada: alta no escopo coberto.
- Tipo de achado esperado: regressao funcional ou integracao quebrada.

## Limitacoes complementares

- A verificacao via `npm audit` depende de acesso ao registro npm.
- Os achados `moderate` residuais exigem upgrade major fora do escopo de baixo risco.
