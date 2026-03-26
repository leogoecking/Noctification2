# Plano Minimo de Implementacao - HTTPS Local + PWA + Web Push

## Objetivo

Evoluir o projeto atual, que hoje entrega notificacoes por `Socket.IO + Notification API` enquanto a aba esta aberta, para uma solucao mais confiavel em:

- navegadores desktop
- notificacoes do Windows
- celulares e outros dispositivos da mesma rede local

sem expor o sistema para a internet.

## Diagnostico de partida

### O que existe hoje

- Realtime por Socket.IO
- notificacao nativa criada diretamente na pagina
- proxy reverso nginx para `/api` e `/socket.io`
- deploy/de configuracao ja organizado em `ops/` e `.deploy/`

### O que falta hoje

- HTTPS local por hostname estavel
- manifest PWA
- service worker
- Web Push
- tabela de subscriptions
- rotas de subscribe/unsubscribe
- VAPID keys

## Decisao arquitetural

### Arquitetura recomendada

- `HTTPS local + hostname fixo`
- `nginx` como reverse proxy/TLS terminator
- frontend PWA com `service worker`
- backend com Web Push
- `Socket.IO` mantido para sincronizacao da UI aberta

### Por que manter Socket.IO

- Atualiza badges/listas em tempo real quando a tela esta aberta.
- Evita polling.
- Continua util mesmo apos Web Push.

### Por que adicionar Web Push

- Permite notificacao mais confiavel fora da aba.
- Em Windows, browsers/PWA podem integrar com o sistema de notificacoes.
- Melhora muito o caso de notebook/celular na LAN.

## Fase 1 - HTTPS local e hostname estavel

### Objetivo

Trocar o acesso por IP puro para um hostname local servido em HTTPS.

### Recomendacao

- Hostname exemplo: `noctification.lan`
- Certificado local confiavel via CA interna (`mkcert` ou CA da rede)
- nginx terminando TLS

### Arquivos a ajustar

- `ops/nginx/noctification.conf`
- `ops/systemd/api.env.example`
- `.deploy/shared/api.env`
- `README.md`
- possivelmente scripts de deploy/prepare, se quiser renderizar versao TLS automaticamente

### Mudancas concretas

- adicionar bloco `server` com `listen 443 ssl http2`
- redirecionar `80 -> 443`
- trocar `CORS_ORIGIN=http://IP_DA_VM` por `https://noctification.lan`
- manter `COOKIE_SECURE=true`
- parar de orientar acesso por `http://IP_DA_VM`

### Validacao

1. abrir `https://noctification.lan`
2. validar login
3. validar `/api/v1/health`
4. validar Socket.IO via interface
5. validar ausencia de erro de certificado nos dispositivos que vao usar o sistema

## Fase 2 - Base PWA

### Objetivo

Permitir instalacao do app e habilitar service worker.

### Arquivos novos esperados

- `apps/web/public/manifest.webmanifest`
- `apps/web/public/icons/...`
- `apps/web/public/sw.js` ou `apps/web/src/sw.ts`

### Arquivos existentes a ajustar

- `apps/web/index.html`
- `apps/web/src/main.tsx`
- `apps/web/vite.config.ts`
- `apps/web/package.json`

### Mudancas concretas

- registrar `navigator.serviceWorker.register(...)` no bootstrap
- incluir link para `manifest.webmanifest`
- definir `name`, `short_name`, `display`, `start_url`, `theme_color`
- gerar/adicionar icones de instalacao
- decidir se o service worker sera estatico em `public/` ou compilado pelo Vite

### Validacao

1. conferir registro do service worker no navegador
2. conferir disponibilidade de instalacao PWA
3. validar que a app abre instalada no Windows

## Fase 3 - Subscription management no frontend

### Objetivo

Registrar o dispositivo/browser para receber push.

### Arquivos provaveis

- novo hook, por exemplo `apps/web/src/hooks/usePushSubscription.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/components/NotificationAlertCenter.tsx`

### Mudancas concretas

- pedir permissao no momento certo
- obter `serviceWorkerRegistration`
- chamar `pushManager.subscribe(...)`
- enviar `endpoint`, `p256dh` e `auth` para a API
- tratar unsubscribe e renovacao

### Validacao

1. subscription criada apos login/permissao
2. subscription salva no backend
3. nao duplicar subscription para o mesmo endpoint

## Fase 4 - Persistencia e API no backend

### Objetivo

Criar suporte real a subscriptions por usuario/dispositivo.

### Novos elementos

- migration para tabela `web_push_subscriptions`
- modulo/service para subscriptions
- rotas autenticadas para subscribe/unsubscribe/list

### Arquivos provaveis

- `apps/api/migrations/017_web_push_subscriptions.sql`
- `apps/api/src/routes/me.ts` ou rota nova dedicada
- `apps/api/src/types.ts`
- modulo novo, por exemplo:
  - `apps/api/src/push/service.ts`
  - `apps/api/src/push/types.ts`

### Estrutura minima da tabela

- `id`
- `user_id`
- `endpoint`
- `p256dh`
- `auth`
- `user_agent`
- `device_label` opcional
- `created_at`
- `updated_at`
- `last_success_at`
- `last_failure_at`

### Validacao

1. migration aplica em banco novo e existente
2. subscribe cria/atualiza registro
3. unsubscribe remove registro do dispositivo

## Fase 5 - Entrega Web Push no backend

### Objetivo

Enviar notificacoes push reais para os dispositivos registrados.

### Dependencias novas

- biblioteca `web-push`

### Config nova

- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT`

### Arquivos provaveis

- `apps/api/src/config.ts`
- `apps/api/src/push/service.ts`
- `apps/api/package.json`
- possivelmente testes em `apps/api/src/test/`

### Mudancas concretas

- configurar VAPID no boot da API
- ao criar notificacao:
  - manter `emitNotificationToUser(...)`
  - tambem enviar Web Push para subscriptions ativas do usuario
- ao receber erro `410`/subscription invalida:
  - remover subscription automaticamente

### Validacao

1. criar notificacao administrativa
2. backend emite socket e push
3. dispositivo recebe push mesmo sem aba em foco
4. subscription invalida e removida automaticamente

## Fase 6 - Service worker de notificacao

### Objetivo

Exibir notificacoes via worker e permitir clique/abertura da app.

### Requisitos

- listener de `push`
- `self.registration.showNotification(...)`
- listener de `notificationclick`
- logica para focar cliente existente ou abrir nova janela

### Payload recomendado

- `title`
- `body`
- `tag`
- `notificationId`
- `url`
- `priority`
- `kind`

### Validacao

1. push recebido com app em background
2. clique abre/foca `https://noctification.lan/notifications`
3. notificacoes repetidas usam `tag` para evitar spam visual

## Fase 7 - Integracao com o fluxo atual

### Objetivo

Evitar duplicidade e preservar a UX ja existente.

### Regras recomendadas

- `Socket.IO` continua atualizando a UI aberta
- `Web Push` cobre background/fechada
- ao detectar app visivel, priorizar atualizacao da UI
- usar `tag`/`notificationId` para deduplicacao entre browser page e service worker

### Ajustes provaveis

- revisar `apps/web/src/hooks/useBrowserNotifications.ts`
- revisar `apps/web/src/components/NotificationAlertCenter.tsx`
- revisar centro de lembretes de forma equivalente

## Fase 8 - Lembretes e expansao

### Objetivo

Levar o mesmo modelo para lembretes e retries.

### Escopo

- `notification:reminder`
- `reminder:due`
- `reminder:updated`

### Regra

- implementar primeiro notificacoes comuns
- depois portar lembretes, para reduzir risco

## Ordem minima recomendada de execucao

1. HTTPS local com hostname fixo
2. manifest + service worker base
3. tabela + rotas de subscription
4. VAPID + envio Web Push para notificacoes novas
5. integracao com a UI atual e deduplicacao
6. extender para lembretes

## Menor fatia util de entrega

Se quiser a menor entrega com ganho real, faca exatamente isto:

1. configurar `https://noctification.lan`
2. adicionar manifest e service worker
3. salvar subscriptions por usuario
4. enviar Web Push apenas para `notification:new`

Com isso voce ja ganha:

- notificacao no navegador fora da aba
- melhor integracao com Windows
- base correta para evoluir o restante

## Riscos principais

- certificados locais nao confiados em celulares/notebooks
- duplicidade de alerta entre socket e push
- subscriptions obsoletas sem limpeza automatica
- service worker mal versionado causando cache/staleness

## Recomendacoes de validacao

### Testes tecnicos

- migration test para tabela de subscriptions
- teste de rotas subscribe/unsubscribe
- teste unitario do payload do service worker
- teste do backend removendo endpoint invalido

### Smoke tests manuais

1. Windows com app instalada como PWA
2. Chrome/Edge desktop em segundo plano
3. Android na mesma rede
4. iPhone, se fizer parte do escopo real

## Proximos arquivos que eu mexeria primeiro

- `ops/nginx/noctification.conf`
- `ops/systemd/api.env.example`
- `README.md`
- `apps/web/src/main.tsx`
- `apps/web/index.html`
- `apps/web/vite.config.ts`
- `apps/api/src/config.ts`
- `apps/api/src/routes/me.ts`
- `apps/api/src/socket.ts`
- `apps/api/migrations/017_web_push_subscriptions.sql`

## Recomendacao final

Para este repositorio, a melhor estrategia nao e substituir o modelo atual, e sim compor:

- `Socket.IO` para UI viva
- `Web Push` para entrega confiavel
- `PWA` para integracao melhor com Windows e uso recorrente na rede local

Esse e o menor caminho que resolve o problema real sem criar uma stack paralela so para desktop.
