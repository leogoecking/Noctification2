# Verificacao atual das pendencias de deploy

Data: 2026-03-17

## Escopo

- Validar com evidencia o que ainda falta para concluir o deploy.
- Corrigir apenas lacunas objetivas do fluxo automatizado de deploy encontradas no repositorio.

## Evidencias executadas

- `npm run test:web`
  - resultado: `12` arquivos de teste aprovados, `60` testes aprovados.
- `npm run typecheck`
  - resultado: API e web aprovados.
- `npm run build`
  - resultado: build da API aprovado; build do frontend aprovado com artefato em `apps/web/dist`.
- `bash -n ops/scripts/deploy-debian.sh && bash -n ops/scripts/validate-debian-login.sh`
  - resultado: scripts validos sintaticamente.
- leitura dos arquivos:
  - `ops/scripts/deploy-debian.sh`
  - `ops/scripts/validate-debian-login.sh`
  - `apps/web/src/lib/api.ts`
  - `apps/web/src/lib/socket.ts`
  - `.deploy/shared/api.env`

## Lacunas reais encontradas e tratadas

### DEPLOY-001 - dependencia faltante no fluxo automatizado

- Tipo: `erro_de_configuracao`
- Evidencia:
  - `ops/scripts/validate-debian-login.sh` depende de `curl`
  - o ambiente local nao possui `curl`
  - `ops/scripts/deploy-debian.sh` instalava apenas `nginx` e `sqlite3`
- Impacto:
  - o deploy automatizado podia falhar na etapa de validacao mesmo com a aplicacao correta
- Acao aplicada:
  - `ops/scripts/deploy-debian.sh` agora instala `curl`

### DEPLOY-002 - validacao pos-deploy usava credenciais erradas por padrao

- Tipo: `bug_reproduzivel`
- Evidencia:
  - `validate-debian-login.sh` fazia login com `admin/admin` por padrao
  - o fluxo de producao exige trocar `ADMIN_LOGIN` e `ADMIN_PASSWORD`
  - `deploy-debian.sh` nao repassava credenciais explicitas para a validacao
- Impacto:
  - o deploy podia falhar na validacao final em qualquer ambiente com credenciais de admin corretas e nao padrao
- Acao aplicada:
  - `validate-debian-login.sh` agora le `ADMIN_LOGIN` e `ADMIN_PASSWORD` do env file quando os argumentos nao sao informados

### DEPLOY-003 - frontend ignorava o proxy do nginx em producao

- Tipo: `integracao_quebrada`
- Evidencia:
  - `apps/web/src/lib/api.ts` resolvia a API para `http(s)://HOST:4000/api/v1`
  - `apps/web/src/lib/socket.ts` resolvia o Socket.IO para `http(s)://HOST:4000`
  - `ops/nginx/noctification.conf` proxyava `/api/` e `/socket.io/` no mesmo origin da pagina
- Impacto:
  - o frontend em producao dependia da porta `4000` exposta externamente
  - o proxy reverso configurado no `nginx` ficava bypassado
- Acao aplicada:
  - o frontend continua usando `:4000` quando aberto pelo Vite dev server em `:5173`
  - quando servido por `nginx`, passa a usar o mesmo origin da pagina por padrao
  - testes adicionados em `apps/web/src/lib/runtimeUrls.test.ts`

## Pendencias operacionais que ainda faltam

Estas pendencias nao puderam ser concluidas no ambiente atual porque dependem da VM alvo ou de root:

1. Preencher segredos reais em `.deploy/shared/api.env` ou no env file final de producao.
   - evidência: o arquivo ainda contem placeholders para `JWT_SECRET`, `ADMIN_LOGIN`, `ADMIN_PASSWORD` e `CORS_ORIGIN`
2. Executar a instalacao privilegiada com root.
   - caminho local preparado: `.deploy/install-system.sh`
   - caminho completo do repositorio: `sudo APP_ROOT=<caminho-do-projeto> bash ops/scripts/deploy-debian.sh`
3. Garantir que a VM tenha `nginx` e `curl` disponiveis.
   - evidência local: `nginx` e `curl` nao estao disponiveis neste ambiente
4. Validar o deploy na VM com o servico e o proxy ativos.
   - health: `/api/v1/health`
   - login: `ops/scripts/validate-debian-login.sh --env-file <env> --origin <url-final>`
5. Se houver processo dev em `:4000` ou `:5173`, parar antes da ativacao do service de producao para evitar conflito de porta.

## Sequencia objetiva que falta executar na VM

1. Ajustar `JWT_SECRET`, `ADMIN_LOGIN`, `ADMIN_PASSWORD`, `ADMIN_NAME` e `CORS_ORIGIN`.
2. Rodar `sudo APP_ROOT=/caminho/do/projeto bash ops/scripts/deploy-debian.sh`.
3. Confirmar `systemctl status noctification-api --no-pager`.
4. Confirmar `nginx -t` e acesso HTTP ao frontend final.
5. Rodar `bash ops/scripts/validate-debian-login.sh --env-file <env-final> --origin <url-final>`.

## Estado final desta verificacao

- Repositorio: mais pronto para deploy do que no inicio desta rodada.
- Bloqueios restantes: operacionais, nao de build.
- Validacao final em producao: pendente de VM alvo com root e segredos reais.
