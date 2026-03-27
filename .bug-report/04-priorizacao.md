## Priorizacao

### APR-001

- Tipo: `melhoria`
- Status: confirmado
- Severidade: baixa
- Confianca diagnostica: alta
- Risco de regressao: baixo
- Prioridade: 1
- Corrigir agora: `true`

## Justificativa

- A mudanca era explicitamente solicitada.
- O impacto colateral esperado e baixo porque o modulo nasce atras de feature flag desligada por padrao.
- A validacao objetiva e simples via build, test e typecheck.

### BUG-003

- Tipo: `bug_reproduzivel`
- Status: confirmado
- Severidade: media
- Confianca diagnostica: alta
- Risco de regressao: baixo
- Prioridade: 1
- Corrigir agora: `true`

## Justificativa adicional

- O defeito afeta identificadores usados como chave de comparacao na auditoria APR.
- A causa raiz e localizada e a menor correcao viavel e sanitizar `externalId` sem alterar contrato HTTP ou schema.
- A validacao objetiva pode ser feita com teste focado do servico APR.
