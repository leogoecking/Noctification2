# 04 - Priorizacao

## Item priorizado

- ID: `KML-001`
- Tipo: `melhoria`
- Status: `confirmado`
- Severidade: `alta`
- Confianca diagnostica: `alta`
- Risco de regressao: `medio`
- Escopo: `apps/api`, `apps/web`, `packages/poste-kml-core`
- Sintoma: feature solicitada estava ausente no monorepo.
- Causa raiz: inexistencia de modulo compartilhado, rota backend, integracao frontend e dependencias.
- Correcao recomendada: implementar o menor conjunto de mudancas integradas preservando o shell e as rotas existentes.
- Validacao: `npm install`, `npm run typecheck`, `npm run test`, `npm run build`.
- Prioridade: `1`
- Corrigir agora: `true`

## Itens secundarios tratados no mesmo fluxo

- `KML-002`: prevenir regressao de navegacao preservando `operations-board` e o dashboard admin atual.
- `KML-003`: corrigir mocks web para a nova flag.
- `KML-004`: normalizar prefixo com hifen final durante a geracao de nomes.
