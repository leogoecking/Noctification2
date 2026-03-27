# Guia Operacional Geral - Ambiente Local/LAN

## Objetivo

Este guia existe para que o projeto possa ser copiado para qualquer pasta a partir do GitHub e ainda assim reconhecer o caminho real do clone e gerar as configuracoes corretas sem hardcode manual de diretórios.

O repositório ja suporta isso por padrao:

- `scripts/setup.cjs` usa a raiz atual do clone
- `scripts/prepare-deploy.cjs` detecta `APP_ROOT` a partir da pasta atual
- `ops/scripts/deploy-debian.sh` aceita `APP_ROOT` dinamico
- `ops/scripts/update-vm-safe.sh` usa o diretório atual do projeto

## Quando usar este guia

- ambiente local para poucos usuarios
- rede interna/LAN
- uma maquina servindo a aplicacao
- acesso por navegadores e PWA

## Modelo recomendado

- 1 maquina Linux/Debian na rede local
- API Node rodando como servico
- frontend buildado e servido pelo `nginx`
- banco SQLite local
- acesso por `https://noctification.lan`

## O que o projeto reconhece automaticamente

Ao rodar os scripts a partir da raiz do clone:

- a pasta atual vira o `APP_ROOT`
- os artefatos em `.deploy/` sao renderizados com esse caminho real
- os templates de `nginx`, `systemd` e `cron` recebem o path correto do clone

Isso significa que o projeto pode ser clonado em qualquer caminho, por exemplo:

- `/opt/noctification`
- `/srv/apps/noctification`
- `/home/usuario/Noctification2`

sem editar manualmente os templates para refletir o caminho.

## Fluxo geral

### 1. Copiar o projeto

```bash
git clone <URL_DO_REPOSITORIO> Noctification2
cd Noctification2
```

### 2. Preparar o ambiente local de desenvolvimento

```bash
npm run setup
```

Esse comando:

- instala dependencias
- cria `apps/api/.env` e `apps/web/.env` se ainda nao existirem
- aplica migracoes
- prepara o admin fixo local

### 3. Preparar artefatos de deploy LAN com o caminho atual do clone

```bash
npm run prepare:local-lan
```

Esse comando:

- detecta a pasta atual como `APP_ROOT`
- renderiza os artefatos em `.deploy/`
- atualiza `.deploy/shared/api.env` com o caminho real do clone

### 4. Revisar o arquivo de ambiente local de deploy

Arquivo:

- [`.deploy/shared/api.env`](/home/leo/Noctification2/.deploy/shared/api.env)

Ajustes minimos:

- `JWT_SECRET`
- `ADMIN_LOGIN`
- `ADMIN_PASSWORD`
- `CORS_ORIGIN=https://noctification.lan`
- `WEB_PUSH_*` quando for habilitar push na LAN

### 5. Gerar certificados locais

```bash
bash ops/scripts/generate-local-certs.sh
```

Arquivos gerados em:

- `.deploy/certs/local-root-ca.pem`
- `.deploy/certs/noctification.lan.pem`
- `.deploy/certs/noctification.lan-key.pem`

Esses arquivos devem permanecer apenas na maquina local e fora do Git.
Se a chave privada da CA ou do servidor tiver sido exposta, descarte toda a cadeia local, gere outra com o script e reinstale a nova CA raiz nos clientes antes de voltar a confiar no HTTPS local.

### 6. Configurar resolucao do hostname

Voce precisa fazer `noctification.lan` apontar para o IP da maquina servidora.

Opcoes:

- DNS local do roteador
- arquivo `hosts` nos clientes

Exemplo de entrada:

```text
192.168.0.50 noctification.lan
```

### 7. Instalar a CA raiz nos clientes

Os clientes da rede precisam confiar:

- `.deploy/certs/local-root-ca.pem`

Sem isso, o navegador vai rejeitar ou alertar sobre o certificado HTTPS.

### 8. Instalar os arquivos do sistema

Os artefatos renderizados ficam em:

- `.deploy/nginx/noctification.conf`
- `.deploy/systemd/noctification-api.service`
- `.deploy/cron/noctification-db-backup.cron`

Os certificados devem ir para:

- `/etc/noctification/certs/noctification.lan.pem`
- `/etc/noctification/certs/noctification.lan-key.pem`

### 9. Validar antes do `sudo`

```bash
npm run check:deploy
```

Esse comando:

- re-renderiza `.deploy/`
- valida o env
- valida scripts
- valida build de API e web

### 10. Instalar no sistema

```bash
sudo APP_ROOT="$(pwd)" bash ops/scripts/deploy-debian.sh
```

Esse comando usa o caminho real do clone no momento da execucao.

## Atualizacao quando o projeto for movido para outra pasta

Se o repositório for copiado novamente para outro lugar, nao reaproveite `APP_ROOT` antigo.

Basta entrar na nova pasta e rodar de novo:

```bash
npm run prepare:local-lan
```

Ou, para deploy:

```bash
sudo APP_ROOT="$(pwd)" bash ops/scripts/deploy-debian.sh
```

Os templates serao renderizados com o novo caminho automaticamente.

## Comandos principais

### Setup inicial

```bash
npm run setup
```

### Preparar artefatos LAN

```bash
npm run prepare:local-lan
```

### Gerar certificados

```bash
bash ops/scripts/generate-local-certs.sh
```

### Validar preflight

```bash
npm run check:deploy
```

### Instalar no sistema

```bash
sudo APP_ROOT="$(pwd)" bash ops/scripts/deploy-debian.sh
```

### Atualizar uma instalacao ja existente

```bash
bash ops/scripts/update-vm-safe.sh
```

## Regras praticas

- Sempre execute os scripts a partir da raiz do clone atual.
- Sempre gere `.deploy/` novamente se o projeto foi movido de pasta.
- Nao use `http://IP_DA_VM` se quiser notificacoes nativas do navegador.
- Use hostname fixo em HTTPS para os clientes da rede.

## Resumo operacional

O projeto ja consegue se adaptar ao caminho real do clone. O fluxo correto para qualquer pasta copiada do GitHub e:

1. `cd` para a raiz do clone
2. `npm run setup`
3. `npm run prepare:local-lan`
4. gerar certificados
5. revisar `.deploy/shared/api.env`
6. instalar no sistema com `APP_ROOT="$(pwd)"`

Esse e o caminho mais simples e menos frágil para operar o projeto localmente para poucos usuarios.
