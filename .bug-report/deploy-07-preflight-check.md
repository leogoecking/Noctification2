# Preflight check de deploy

Data: 2026-03-17

## Objetivo

Adicionar um comando unico para validar o preflight de deploy sem `sudo`, antes de instalar arquivos em `/etc`.

## Mudancas aplicadas

- novo script: `scripts/check-deploy.cjs`
- novo script npm: `npm run check:deploy`
- `.deploy/install-system.sh` continua sendo o passo privilegiado, mas agora o preflight pode ser executado separadamente
- `.deploy/README.md` atualizado com o comando novo

## O que `npm run check:deploy` valida

1. renderizacao do `.deploy` a partir do clone atual
2. validacao do env local com `--require-real-env`
3. sintaxe de:
   - `.deploy/install-system.sh`
   - `ops/scripts/deploy-debian.sh`
   - `ops/scripts/backup-db.sh`
   - `ops/scripts/validate-debian-login.sh`
4. `npm run build`
5. existencia dos artefatos:
   - `apps/api/dist/index.js`
   - `apps/web/dist/index.html`

## Evidencias executadas

### Falha esperada com env placeholder

- comando: `npm run check:deploy`
- resultado:
  - falha em `prepare-deploy`
  - mensagem: `JWT_SECRET still uses a template placeholder`

Conclusao:
- o gate bloqueia instalacao com env inseguro/incompleto

### Sucesso com env temporario valido

- comando:
  - `node scripts/check-deploy.cjs --app-root /home/leo/Noctification2 --local-env-file /tmp/noctification-check.env --system-env-file /tmp/noctification-check.env --system-user leo --system-group leo`
- resultado:
  - `PASS: env, templates, scripts and build are ready for sudo install`

## Resultado

Agora existe um gate claro de preflight:

1. `npm run prepare:deploy`
2. `npm run check:deploy`
3. `sudo ./.deploy/install-system.sh`

Isso reduz risco operacional e deixa mais claro quando o problema ainda esta no env local, e nao na instalacao privilegiada.
