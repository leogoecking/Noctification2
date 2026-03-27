# Monitoramento

## Sinais úteis

- Erros de conexão do frontend para `::1` ou falhas de fetch/socket em ambiente LAN
- Falhas de unsubscribe Web Push com `400 endpoint obrigatorio`
- Divergência entre regressões percebidas no frontend e ausência de falha em `npm test`

## Logs e alertas recomendados

- Logar URL base resolvida em ambiente de debug para frontend local/LAN
- Medir taxa de erro em endpoints de Web Push:
  - `PUT /me/web-push/subscription`
  - `DELETE /me/web-push/subscription`
- Alertar quando o backend receber alto volume de `400 endpoint obrigatorio`

## Health checks

- Smoke test para `runtimeUrls` com `localhost`, `127.0.0.1` e `[::1]`
- Smoke test de unsubscribe Web Push em ambiente com proxy, se esse cenário fizer parte da operação
