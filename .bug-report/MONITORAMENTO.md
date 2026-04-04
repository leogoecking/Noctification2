# Monitoramento

## Sinais uteis para o tipo de falha encontrado

- contagem de suites que dependem de bind local
- taxa de sucesso por ambiente de execucao: local, CI, sandbox restrita
- volume de warnings React em stderr por suite web

## Logs e alertas

- registrar claramente quando uma suite falha por restricao ambiental e nao por assercao
- destacar em CI a diferenca entre `test failed` por assertiva e `test infrastructure failed`
- alertar quando warnings React reaparecem em testes antes limpos

## Tracing e health checks

- para testes HTTP, registrar se o harness usado e in-process ou depende de `listen()`
- para componentes com observers globais, validar teardown em testes dedicados

## Acoes recomendadas

- padronizar metadados de ambiente na pipeline de testes
- tornar warnings de cleanup e `act(...)` visiveis em dashboards de qualidade
