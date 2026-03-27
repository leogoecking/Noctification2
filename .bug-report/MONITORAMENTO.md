# Monitoramento

## Sinais uteis

- Medir quantidade de registros manuais por mes APR para identificar meses com listas grandes.
- Registrar erros de carregamento do modulo APR no frontend.
- Observar falhas de importacao e de operacoes CRUD manuais.

## Health checks e observabilidade

- Manter health check da API ja existente para cobertura backend.
- Se houver telemetria frontend no futuro, registrar tempo de renderizacao de listas APR maiores.

## Alertas recomendados

- Alerta para falhas recorrentes de `getRows`, `createManual`, `updateManual` e `deleteManual`.
- Alerta para crescimento atipico de registros manuais por referencia mensal, caso impacte UX.
