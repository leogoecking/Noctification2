# Monitoramento

## Sinais prioritarios para producao

- Tempo de carregamento e quantidade de requisições disparadas pela tela APR.
- Taxa de erro por endpoint APR e tasks.
- Frequência de reconexão e falhas de socket no admin.
- Tempo de resposta das rotas de tarefas com métricas e filtros.

## Logs uteis

- Logs estruturados por fluxo APR:
  - `selectedMonth`
  - origem do refresh
  - duração das chamadas
- Logs por mutação de tarefas:
  - ação
  - ator
  - taskId
  - duração
- Logs nas rotas legacy quando forem modularizadas para comparar antes/depois.

## Alertas recomendados

- Aumento anormal de falhas em endpoints APR.
- Crescimento de latência nas rotas de tarefas.
- Frequência alta de `connect_error` no admin realtime.
- Duplicidade anormal de chamadas APR por navegação.

## Health checks uteis

- Endpoint de health já existe na API; complementar com:
  - status do scheduler relevante;
  - contagem resumida de falhas de automação;
  - disponibilidade dos módulos opcionais APR/KML.

## Tracing e metricas

- Contador de chamadas por tela APR.
- Duração de queries mais caras do módulo tasks.
- Duração das rotas `reminders-me` e `operations-board-me`.
- Taxa de render/reload inicial das telas administrativas maiores.
