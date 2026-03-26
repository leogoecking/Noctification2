# Regras Preventivas

## Lint e type rules

- Adicionar teste obrigatório para utilitários que normalizam hosts/URLs.
- Criar regra de revisão para scripts raiz de monorepo quando houver novos workspaces.

## Testes ausentes prioritários

- Caso `[::1]` em `apps/web/src/lib/runtimeUrls.test.ts`
- Teste de contrato para unsubscribe Web Push sem body em DELETE, ou com query/path alternativo

## CI recomendada

- Garantir que o script raiz `test` reflita o conjunto de suítes esperado pela equipe
- Manter `test:web` separado, mas evitar que `npm test` passe ideia de cobertura total se não for o caso

## Políticas de revisão

- Toda lógica de detecção de localhost deve cobrir IPv4 e IPv6
- Contratos HTTP fora do padrão comum devem vir acompanhados de justificativa e teste
