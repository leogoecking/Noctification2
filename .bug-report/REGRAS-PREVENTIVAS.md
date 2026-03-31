# Regras Preventivas

## Sugestoes de lint / type rules

- Exigir que mocks Vitest de modulos utilitarios exportem todos os simbolos usados pelos componentes.
- Padronizar funcoes de feature flag em um modulo unico e cobrir seu uso com testes de navegacao.

## Testes ausentes prioritarios

- Teste HTTP real do endpoint multipart `POST /api/v1/kml-postes/standardize` em CI.
- Teste de UI da tela `KmlPostePage` cobrindo upload e exibicao do resumo.
- Teste com `.kmz` contendo `doc.kml` e com `.kmz` contendo outro `.kml` interno.

## Validacoes de CI recomendadas

- `npm run typecheck`
- `npm run test`
- `npm run build`

## Politicas de revisao uteis

- Ao integrar patches externos, comparar primeiro com a estrutura atual antes de substituir arquivos centrais.
- Nao aceitar feature nova sem validar impacto em mocks de testes existentes.
