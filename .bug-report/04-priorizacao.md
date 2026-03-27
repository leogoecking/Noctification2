# 04 - Priorizacao

## Item priorizado para correcao imediata

### BUG-001

- Tipo: `bug_reproduzivel`
- Severidade: media
- Confianca diagnostica: alta
- Risco de regressao: baixo
- Escopo: `apps/web/src/features/apr`
- Motivo da prioridade:
  - comportamento divergente do desejado
  - correcao localizada
  - validacao objetiva simples via teste do componente

### BUG-002

- Tipo: `bug_reproduzivel`
- Severidade: baixa
- Confianca diagnostica: alta
- Risco de regressao: baixo
- Escopo: `apps/web/src/features/apr`
- Motivo da prioridade:
  - simplificacao direta de campos exibidos no bloco de divergencias e no PDF
  - sem alteracao de API
  - validacao objetiva por teste do componente e inspeção do HTML exportado

## Item nao tratado como correcao de produto

### ACH-003

- Tipo: `problema_de_qualidade`
- Acao: apenas documentado
- Justificativa: nao afeta o comportamento da aplicacao entregue ao usuario final.
