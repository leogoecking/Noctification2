## Sinais recomendados para fases futuras do APR

- Health check dedicado do modulo APR
- Logs de ativacao da flag `ENABLE_APR_MODULE`
- Logs de acesso a `/api/v1/apr/health`
- Contador de requests 2xx/4xx/5xx do namespace `/api/v1/apr`
- Smoke monitor para o path `/apr` quando a flag estiver ativa

## Alertas uteis

- APR habilitado no backend e desabilitado no frontend
- APR habilitado no frontend e desabilitado no backend
- Crescimento de respostas 404 no namespace `/api/v1/apr`
