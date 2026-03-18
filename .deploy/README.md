# Deploy Local Layout

Este diretório concentra os artefatos de deploy fora de `/etc` para reduzir a quantidade de passos privilegiados.

## Arquivos

- `shared/api.env`
  - arquivo de ambiente da API para produção
- `systemd/noctification-api.service`
  - unit file renderizado a partir de `ops/systemd` com o caminho real do clone
- `nginx/noctification.conf`
  - site do nginx renderizado a partir de `ops/nginx` com o caminho real do clone
- `cron/noctification-db-backup.cron`
  - cron de backup renderizado a partir de `ops/cron` com o caminho real do clone
- `install-system.sh`
  - script com os passos mínimos que ainda precisam de `sudo`
  - chama `npm run prepare:deploy` por baixo para validar `shared/api.env` e renderizar os artefatos locais
  - cria backup local dos arquivos de sistema antes de sobrescrever

## Comandos

Preparar o layout local sem `sudo`:

```bash
npm run prepare:deploy
```

Validar o preflight de deploy sem `sudo`:

```bash
npm run check:deploy
```

Instalar nos arquivos de sistema:

```bash
sudo ./.deploy/install-system.sh
```

## Observações

- Os segredos em `shared/api.env` ainda precisam ser preenchidos antes do deploy.
- Mesmo com os arquivos locais, ativar `systemd` e `nginx` continua exigindo root.
- O diretório do clone pode mudar; o `install-system.sh` recalcula o caminho local automaticamente.
- Este diretório nao deve ser versionado com segredos reais.
