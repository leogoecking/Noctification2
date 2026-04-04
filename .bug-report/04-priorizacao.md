# 04 - Priorizacao

## Criterio aplicado

- impacto real no estado atual do workspace
- confianca diagnostica
- risco de regressao
- facilidade de validacao
- probabilidade de conflito com alteracoes locais ja existentes

## Itens relevantes

### 1. ERR-001

- tipo: `erro_de_configuracao`
- severidade: media
- confianca diagnostica: alta
- risco de regressao: baixo
- prioridade: `1`
- corrigido: `sim`
- motivo:
  - bloqueava a validacao da suite de API na sandbox
  - tinha causa raiz objetiva e correcao localizada em teste

### 2. QUAL-001

- tipo: `problema_de_qualidade`
- severidade: baixa
- confianca diagnostica: alta
- risco de regressao: baixo
- prioridade: `2`
- corrigido: `sim`
- motivo:
  - warning era reproduzivel
  - ajuste foi pequeno, local e validavel

## Decisao da rodada

- ambos os itens confirmados foram corrigidos
- nao houve necessidade de alteracao em codigo de producao
- o estado final do repositorio ficou consistente em `lint`, `typecheck`, `test:api` e `test:web`
