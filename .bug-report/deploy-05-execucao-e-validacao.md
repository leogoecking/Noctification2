# Execucao e validacao do deploy Debian

Data: 2026-03-17

## Referencias usadas

- `AGENTS.md`
- `docs/debian-vm-deploy.md`
- divergencia registrada: `docs/operations/deploy-vm-debian.md` nao existe neste checkout

## Diagnostico consolidado da VM

- Sistema operacional: Debian 13 (trixie)
- Usuario atual: `leo`
- `sudo -n true`: falhou com `sudo: a password is required`
- Ferramentas confirmadas: `node`, `npm`, `git`, `curl`, `sqlite3`, `systemctl`, `wget`
- Ferramenta ausente: `rg`
- Servicos ativos no momento da validacao:
  - `nginx.service`: `active (running)`
  - `noctification-api.service`: `active (running)`
- Portas em escuta com evidencia:
  - `0.0.0.0:80` -> `nginx`
  - `*:4000` -> `node`

## Arquivos de sistema validados

- `/etc/systemd/system/noctification-api.service`
- `/etc/noctification/api.env`
- `/etc/nginx/sites-available/noctification`
- `/etc/nginx/sites-enabled/noctification`

## Ajustes confirmados no runtime

- API rodando a partir de `/home/leo/Noctification2`
- `nginx` servindo `apps/web/dist` pela porta `80`
- admin de producao reconciliado com o env file via bootstrap:
  - antes: env apontava para `ADMIN_LOGIN=debian`, mas o banco ainda tinha apenas `admin`
  - depois: `npm run bootstrap-admin --workspace @noctification/api` criou o admin `debian`

## Comandos executados com evidencia

1. Diagnostico da VM e dos servicos:
   - `cat /etc/os-release`
   - `whoami`
   - `id`
   - `free -h`
   - `df -h / /home /tmp`
   - `ss -ltnp`
   - `systemctl status nginx --no-pager`
   - `systemctl list-units --type=service --all | grep -Ei 'noctification|nginx'`
2. Validacao do deploy ativo:
   - `wget -S -O - http://127.0.0.1:4000/api/v1/health`
   - `wget -S -O - http://127.0.0.1/`
   - `bash ops/scripts/validate-debian-login.sh --env-file /etc/noctification/api.env --origin http://192.168.0.123`
3. Diagnostico da divergencia de credencial:
   - `sqlite3 /home/leo/Noctification2/apps/api/data/noctification.db "select id, login, name, role, is_active from users order by id;"`
   - `bash -lc 'cd /home/leo/Noctification2/apps/api && set -a && source /etc/noctification/api.env && exec npm run bootstrap-admin --workspace @noctification/api'`
4. Validacao funcional do fluxo reportado:
   - login via `curl` em `/api/v1/auth/login`
   - criacao de lembrete via `POST /api/v1/me/reminders`
   - limpeza do registro via `DELETE /api/v1/me/reminders/:id`

## Evidencias finais de sucesso

- API health:
  - `HTTP/1.1 200 OK` em `http://127.0.0.1:4000/api/v1/health`
- Frontend via nginx:
  - `HTTP/1.1 200 OK` em `http://127.0.0.1/`
- Validacao de autenticacao:
  - `PASS: health, CORS, login, cookie and /auth/me are OK`
- Fluxo de lembrete:
  - login: `200`
  - criacao de lembrete: `201`
  - remocao do lembrete temporario: `204`

## Arquivos alterados no repositorio nesta rodada

- `apps/api/src/config.ts`
- `apps/api/src/routes/auth.ts`
- `apps/api/.env.example`
- `ops/systemd/api.env.example`
- `README.md`
- `apps/api/src/test/auth-routes.test.ts`
- `apps/api/src/test/reminder-routes.test.ts`
- `apps/api/src/test/admin-user-routes.test.ts`
- `apps/api/src/test/api.test.ts`
- `apps/api/src/test/notification-routes.test.ts`
- `.bug-report/premissas.md`
- `.bug-report/deploy-05-execucao-e-validacao.md`

## Status final

- Deploy funcional na VM Debian: confirmado com evidencias reais
- API: operacional
- `nginx`: operacional
- login e sessao: operacionais
- criacao de lembrete: operacional

## Pendencias restantes

- O arquivo versionado `ops/nginx/noctification.conf` continua desatualizado e ainda aponta para `/home/noctification/noctification`. O arquivo instalado em `/etc/nginx/sites-available/noctification` esta correto.
- O hotfix de `COOKIE_SECURE` foi implementado no codigo e validado por build/teste, mas nao foi necessario para concluir a validacao atual com `curl`. Se o navegador continuar sem persistir sessao em HTTP, aplicar `COOKIE_SECURE=false` no env e reiniciar a API deve ser o proximo ajuste operacional.

## Rollback

1. Restaurar `ADMIN_LOGIN`, `ADMIN_PASSWORD` e demais valores desejados em `/etc/noctification/api.env`.
2. Reexecutar `npm run bootstrap-admin --workspace @noctification/api` com o env desejado para reconciliar o admin persistido.
3. Se necessario, restaurar os arquivos instalados em `/etc/systemd/system/noctification-api.service` e `/etc/nginx/sites-available/noctification` a partir de backup operacional local.
4. Recarregar servicos:
   - `sudo systemctl daemon-reload`
   - `sudo systemctl restart noctification-api`
   - `sudo systemctl reload nginx`
5. Revalidar:
   - `wget -S -O - http://127.0.0.1:4000/api/v1/health`
   - `bash ops/scripts/validate-debian-login.sh --env-file /etc/noctification/api.env --origin <origem-final>`
