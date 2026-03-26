# 03 - Achados Brutos

## Evidência executada

- `npm run lint` -> passou
- `npm run typecheck` -> passou
- `npm test` -> passou, mas executou apenas a API
- `npm run test:web` -> passou
- `node --import tsx -e ... resolveRuntimeApiBase/resolveRuntimeSocketUrl` -> reproduziu falha com `http://[::1]:4000`

## Achados

### BUG-001

- Tipo: `bug_reproduzivel`
- Arquivo: `apps/web/src/lib/runtimeUrls.ts`
- Sintoma: URLs configuradas com loopback IPv6 (`[::1]`) não são reescritas para o host atual, ao contrário do comportamento já implementado para `localhost` e `127.0.0.1`.
- Evidência:
  - `apps/web/src/lib/runtimeUrls.ts:10-12`
  - reprodução:
    - entrada: `resolveRuntimeApiBase("http://[::1]:4000/api/v1", { hostname: "10.0.0.20", ... })`
    - saída observada: `http://[::1]:4000/api/v1`
    - comportamento esperado por simetria com `localhost`/`127.0.0.1`: `http://10.0.0.20:4000/api/v1`

### CFG-001

- Tipo: `erro_de_configuracao`
- Arquivo: `package.json`
- Sintoma: `npm test` na raiz não valida o monorepo inteiro; só executa a suíte da API.
- Evidência:
  - `package.json:18`
  - `npm test` executou apenas `@noctification/api`
  - `npm run test:web` precisou ser executado separadamente

### RISK-001

- Tipo: `risco_potencial`
- Arquivos:
  - `apps/api/src/routes/me.ts`
  - `apps/web/src/lib/api.ts`
- Sintoma: a remoção de subscription Web Push depende de body JSON em `DELETE /me/web-push/subscription`.
- Evidência:
  - backend lê `req.body` em `apps/api/src/routes/me.ts:73-82`
  - frontend envia body em DELETE em `apps/web/src/lib/api.ts`
- Risco: alguns clientes, proxies e middlewares tratam body em DELETE de forma inconsistente, podendo impedir remoção de subscription em integrações futuras.
