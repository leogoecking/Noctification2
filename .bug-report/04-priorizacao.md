# Priorizacao

## Ordem recomendada

1. `BUG-001` - compatibilidade de notificacoes legadas
   - Severidade real: alta
   - Confianca: alta
   - Risco de regressao: baixo
   - Justificativa:
     - ja existe evidencia objetiva de retorno incorreto;
     - afeta UI do usuario, filtros e lembretes de progresso;
     - a correcao e localizada em mapeamentos de compatibilidade.

2. `BUG-002` - edicao de lembretes com agendamento antigo
   - Severidade real: alta
   - Confianca: alta
   - Risco de regressao: baixo
   - Justificativa:
     - dispara lembretes em horario incorreto apos uma edicao valida;
     - a causa raiz esta isolada entre a rota de atualizacao e o ponteiro do scheduler.

3. `RISK-001` - sessao mantida apos login com papel divergente no frontend
   - Severidade real: media
   - Confianca: alta
   - Risco de regressao: baixo
   - Justificativa:
     - o fluxo foi confirmado em teste dedicado;
     - a sessao persiste apesar da UI sinalizar erro;
     - o impacto e menor que os dois bugs ja corrigidos, mas agora e objetivo.

## Itens que nao devem ser corrigidos automaticamente agora

- Nenhum item exige refatoracao ampla.
