# Plano curto de deploy seguro

## Modelo de deploy escolhido

- API Node.js via `systemd`
- frontend estatico servido por `nginx`
- SQLite persistente no caminho configurado pela API
- sem Docker

## Justificativa

- O repositório ja fornece:
  - script `ops/scripts/deploy-debian.sh`
  - template `ops/systemd/noctification-api.service`
  - template `ops/nginx/noctification.conf`
  - validacao `ops/scripts/validate-debian-login.sh`
- Essa e a rota mais simples e mais alinhada ao projeto e ao Debian.

## Arquivos/configuracoes que o deploy deve criar ou alterar

- `/etc/noctification/api.env`
- `/etc/systemd/system/noctification-api.service`
- `/etc/nginx/sites-available/noctification`
- `/etc/nginx/sites-enabled/noctification`
- `/etc/cron.d/noctification-db-backup`
- ownership do diretório da aplicacao

## Dependencias de sistema faltantes

- `nginx`
- `curl`

## Validacao planejada

1. verificar health da API
2. validar CORS, login, cookie e `/auth/me`
3. verificar service `systemd` ativo
4. verificar porta da API e, se configurado, `nginx`
5. confirmar que o frontend deixou de ser servido por Vite dev server

## Rollback planejado

1. parar e desabilitar `noctification-api.service`
2. remover link de site em `sites-enabled`
3. restaurar backups dos arquivos alterados em `/etc`
4. remover cron criado
5. voltar a rodar o ambiente dev atual se necessario

## Bloqueios atuais

- `sudo` requer senha e nao esta disponivel de forma nao interativa no contexto atual.
- O `api.env` local ainda esta com placeholders e precisa receber os segredos reais antes da ativacao.

## Proximo passo executavel

1. preencher `/home/leo/Noctification2/.deploy/shared/api.env`
2. executar `sudo /home/leo/Noctification2/.deploy/install-system.sh`
3. validar com `bash ops/scripts/validate-debian-login.sh --env-file /home/leo/Noctification2/.deploy/shared/api.env --origin http://IP_DA_VM`

## Estado mais recente validado

- `nginx` esta ativo na porta `80`
- nao ha processo escutando em `4000` nem `5173`
- o build local existe em `apps/web/dist` e `apps/api/dist`
