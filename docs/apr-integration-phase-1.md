# APR integration phase 1

## Objetivo

Preparar a estrutura inicial do modulo APR no monorepo `Noctification2` com diff minimo e sem alterar fluxos existentes.

## O que foi criado

- `apps/api/src/modules/apr`
  - rota isolada `GET /api/v1/apr/health`
- `apps/web/src/features/apr`
  - pagina `/apr` com placeholder visual simples
- `packages/apr-core`
  - pacote inicial para contratos compartilhados futuros

## Feature flags

### Backend

- Variavel: `ENABLE_APR_MODULE`
- Default: `false`
- Efeito: quando desligada, a API nao registra a rota `/api/v1/apr/health`

### Frontend

- Variavel: `VITE_ENABLE_APR_MODULE`
- Default: `false`
- Efeito: quando desligada, o path `/apr` nao entra no fluxo normal de navegacao e o app preserva o comportamento atual

## Contratos criados nesta fase

- `GET /api/v1/apr/health`
  - resposta quando habilitado:

```json
{
  "status": "ok",
  "module": "apr"
}
```

## Impacto esperado

- Nenhum impacto funcional em autenticacao
- Nenhum impacto funcional em notificacoes
- Nenhum impacto funcional em Socket.IO
- Nenhum impacto funcional em rotas existentes

## Validacao esperada

- `npm run build`
- `npm run test`
- `npm run typecheck`
