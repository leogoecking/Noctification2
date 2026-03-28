# Monitoramento

## Metricas uteis

- Taxa de falha de suites por workspace (`api`, `web`, `apr-core`).
- Tempo medio de execucao de `lint`, `typecheck` e testes por workspace.
- Numero de flags ativas por ambiente e mudancas recentes em configuracao.

## Logs e sinais

- Registrar no pipeline qual conjunto de variaveis relevantes de feature flag foi aplicado ao job, sem expor segredos.
- Destacar falhas recorrentes de roteamento frontend e inconsistencias entre ambiente e expectativa de teste.

## Alertas

- Alertar quando testes comecarem a falhar apenas em certos ambientes/branches.
- Alertar quando `lint` falhar por residuos simples apos merge, pois isso costuma indicar falta de validacao local minima.

## Tracing e health checks

- No frontend, manter rastreabilidade de flags criticas em logs de bootstrap em ambiente de desenvolvimento quando isso nao expuser dados sensiveis.
- Na API, continuar usando o healthcheck existente e incluir no processo de release a validacao de rotas mais sensiveis quando houver mudancas de auth/scheduler.

## Sinais para producao

- Divergencia entre flags esperadas e comportamento observado da UI.
- Aumento de erros de navegacao/rotas bloqueadas apos alteracoes em toggles.
- Regressao de pipelines por falhas localizadas em um workspace especifico.
