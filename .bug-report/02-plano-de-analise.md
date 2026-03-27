## Ordem de execução

1. Registrar o estado do repositório e as premissas operacionais.
2. Inserir a feature flag `ENABLE_APR_MODULE` no backend e no frontend com default desligado.
3. Criar o módulo APR no backend e o placeholder APR no frontend, ambos isolados.
4. Criar `packages/apr-core` como esqueleto compartilhado sem acoplar aos fluxos atuais.
5. Validar com `npm run build`, `npm run test` e `npm run typecheck`.

## Ferramentas escolhidas

- `find`: mapear estrutura do monorepo.
  - Escopo: diretórios, configs e entrypoints.
  - Confiabilidade esperada: alta.
  - Tipo de achado esperado: estrutura real.
- `sed`: leitura direta dos arquivos críticos.
  - Escopo: `package.json`, `config.ts`, `app.ts`, `App.tsx`, `appShell.tsx`, `.env.example`.
  - Confiabilidade esperada: alta.
  - Tipo de achado esperado: contratos locais e pontos de extensão.
- `grep`: localizar flags e referências existentes.
  - Escopo: env vars, rotas e uso de runtime config.
  - Confiabilidade esperada: média-alta.
  - Tipo de achado esperado: integração e impacto lateral.
- `npm run build|test|typecheck`: validação objetiva.
  - Escopo: apps existentes e compatibilidade do monorepo.
  - Confiabilidade esperada: alta.
  - Tipo de achado esperado: regressões de compilação, testes e tipagem.

## Módulos prioritários

- `apps/api/src/config.ts`
- `apps/api/src/app.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/components/app/appShell.tsx`

## Risco previsto

- Baixo, desde que o APR permaneça desligado por padrão e sem dependências novas.

## Limitações

- Não haverá validação e2e com navegador.
- Não haverá deploy nem rollout operacional nesta fase.
