# Regras preventivas

## Sugestoes de lint e disciplina

- Manter `@typescript-eslint/no-unused-vars` como erro.
- Tratar qualquer teste dependente de `import.meta.env` como obrigacao de stub/mocking explicito.

## Type rules

- Preferir helpers dedicados para feature flags em vez de constantes espalhadas em componentes.
- Evitar leitura de flag de ambiente em escopo de modulo quando o comportamento precisar ser testavel/isolavel.

## Testes ausentes prioritarios

- Adicionar caso explicito cobrindo APR ativo e inativo via stub da flag no frontend.
- Considerar teste unitario do helper de feature flags se o numero de flags crescer.

## Validacoes de CI recomendadas

- Manter `npm run lint`, `npm run typecheck` e `npm run test` como gates minimos.
- Se o projeto passar a usar mais feature flags, incluir testes parametrizados por ambiente para caminhos criticos.

## Politicas de revisao uteis

- Em PRs que mudam flags/feature toggles, exigir evidencia de comportamento ligado e desligado.
- Em PRs de manutencao, separar correcoes funcionais de limpeza cosmética quando possivel.
