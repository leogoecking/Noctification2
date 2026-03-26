# Analise de Gap - PWA / Push / Windows

## Escopo

Verificar o que falta no repositório para evoluir de notificacoes em tempo real baseadas em `Socket.IO + Notification API` para uma solucao mais confiavel em navegadores e no Windows, em rede local.

## Estado atual confirmado

### Frontend

- Existe apenas notificacao nativa local baseada na aba ativa:
  - `apps/web/src/hooks/useBrowserNotifications.ts`
  - `apps/web/src/hooks/useNotificationSocket.ts`
- O disparo nativo atual depende de:
  - permissao `Notification.permission === "granted"`
  - aba em background
  - pagina carregada
  - socket conectado
- Nao existe:
  - `service worker`
  - `navigator.serviceWorker.register(...)`
  - `PushManager`
  - `showNotification(...)` em worker
  - `manifest.webmanifest`
  - fluxo de instalacao PWA

### Backend

- A entrega atual e exclusivamente por Socket.IO:
  - `apps/api/src/socket.ts` emite `notification:new` para `user:<id>`
- Nao existe:
  - biblioteca de Web Push
  - chaves VAPID
  - rotas para registrar/remover subscriptions
  - persistencia de subscriptions por usuario/dispositivo
  - fila/retry de push

### Persistencia

- As migracoes atuais criam `users`, `notifications`, `notification_recipients`, lembretes e tarefas.
- Nao existe tabela para subscriptions push.

## Conclusao tecnica

Hoje o projeto e um sistema de notificacao de aba conectada, nao um sistema de push web instalavel.

Isso significa:

- funciona melhor com a aplicacao aberta
- depende do Socket.IO estar vivo
- nao ha entrega confiavel em segundo plano quando a aba fecha ou e suspensa
- nao ha integracao PWA para o Windows exibir a app/notificacao como app instalada

## O que falta para virar PWA com push confiavel

### 1. HTTPS local com hostname estavel

- Exemplo: `https://noctification.lan`
- Necessario para:
  - `service worker`
  - `PushManager`
  - notificacoes nativas confiaveis fora de `localhost`

### 2. Manifest PWA

- Criar `manifest.webmanifest` com:
  - `name`
  - `short_name`
  - `start_url`
  - `display`
  - `background_color`
  - `theme_color`
  - icones

### 3. Service worker

- Registrar no bootstrap do frontend
- Implementar:
  - evento `push`
  - `self.registration.showNotification(...)`
  - evento `notificationclick`

### 4. Subscription management no frontend

- Pedir permissao
- Obter `registration.pushManager.subscribe(...)`
- Enviar subscription ao backend
- Renovar/remover subscription quando necessario

### 5. Persistencia no backend

- Nova tabela, por exemplo `web_push_subscriptions`
- Campos minimos:
  - `id`
  - `user_id`
  - `endpoint`
  - `p256dh`
  - `auth`
  - `user_agent`
  - `created_at`
  - `updated_at`
  - `last_success_at`
  - `last_failure_at`

### 6. Entrega Web Push no backend

- Adicionar biblioteca de Web Push
- Gerar/configurar VAPID keys
- Criar servico de envio push por usuario
- Remover subscriptions invalidas quando o provedor retornar expiracao/invalidez

### 7. Integracao com o fluxo atual

- Manter Socket.IO para atualizar a UI em tempo real
- Usar Web Push para notificacao fora da aba
- Evitar duplicidade usando `tag`, `itemId` ou `notificationId`

## Sequencia minima recomendada

1. HTTPS local com hostname fixo
2. `manifest.webmanifest`
3. `service worker`
4. registro de subscriptions no backend
5. envio Web Push para novas notificacoes
6. depois adaptar lembretes e retries

## Decisao tecnica recomendada

Para o seu caso, a melhor arquitetura e:

- `HTTPS local + hostname fixo`
- `PWA + service worker`
- `Web Push` para entrega confiavel
- `Socket.IO` apenas como complemento para a interface aberta

Isso cobre melhor:

- navegadores desktop
- notificacoes do Windows
- notebooks e celulares na mesma rede

sem manter uma solucao separada so para Windows.
