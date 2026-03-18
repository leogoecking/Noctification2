# Preparacao local para deploy Debian

## Objetivo

Deixar o repositório pronto para a instalacao final em `systemd + nginx` com o menor risco possivel, mantendo os artefatos de deploy dentro do projeto e reduzindo os passos privilegiados.

## Evidencias coletadas

- `sudo -n true`
  - resultado: `sudo: a password is required`
- `systemctl status nginx --no-pager`
  - resultado: `nginx.service` ativo e em execucao
- `ss -ltnp`
  - resultado: apenas `:80`, `:22` e `:631` em escuta; sem listeners em `:4000` ou `:5173`
- `ls -ld apps/web/dist apps/api/dist apps/api/data`
  - resultado: artefatos de build existem localmente
- `bash -n .deploy/install-system.sh`
  - resultado: script valido sintaticamente

## Arquivos locais criados ou ajustados

- `/home/leo/Noctification2/.deploy/README.md`
- `/home/leo/Noctification2/.deploy/shared/api.env`
- `/home/leo/Noctification2/.deploy/systemd/noctification-api.service`
- `/home/leo/Noctification2/.deploy/nginx/noctification.conf`
- `/home/leo/Noctification2/.deploy/cron/noctification-db-backup.cron`
- `/home/leo/Noctification2/.deploy/install-system.sh`
- `/home/leo/Noctification2/.gitignore`

## Medidas de reducao de risco aplicadas

- `api.env` local protegido com permissao `600`
- `.gitignore` atualizado para evitar commit acidental de `/.deploy/shared/api.env`
- logs e backups locais em `/.deploy/shared/`
- instalador local agora:
  - falha se `api.env` ainda contem placeholders
  - cria backups locais antes de sobrescrever arquivos em `/etc`
  - valida a configuracao do `nginx` antes de recarregar

## Status atual

- preparacao local: concluida
- ativacao em producao: pendente de root/sudo funcional no contexto da instalacao
- validacao final de health/login/proxy: pendente da instalacao do service e do site do `nginx`

## Rollback previsto

Se a instalacao em `/etc` falhar ou introduzir regressao:

1. desabilitar/parar `noctification-api.service`
2. restaurar os arquivos salvos em `/.deploy/shared/backups/<timestamp>/`
3. recarregar `systemd` e `nginx`
4. reexecutar a validacao de health e acesso HTTP local
