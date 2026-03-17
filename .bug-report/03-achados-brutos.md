# Achados brutos

## Validacoes executadas

- `npm run lint`: aprovado.
- `npm run typecheck`: aprovado.
- `npm run test:api`: aprovado.
- `npm run test:web`: aprovado.
- `npm run build`: aprovado.

Observacao:
- `npm` emitiu warnings sobre `globalignorefile`, mas sem bloquear execucao.

## Achado 1

- ID: `BUG-001`
- Tipo: `bug_reproduzivel`
- Severidade preliminar: alta
- Componente: notificacoes de usuario / compatibilidade legado
- Arquivos:
  - `apps/api/migrations/005_notification_operational_status.sql`
  - `apps/api/src/routes/me.ts`
  - `apps/api/src/socket.ts`
- Evidencia:
  - A migracao de backfill nao trata `response_status = 'assumida'`.
  - A rota do usuario tambem nao mapeia `assumida` ao derivar `operationalStatus`.
  - O realtime de lembretes repete a mesma omissao.
  - Reproducao minima local:
    - inserido registro com `response_status = 'assumida'` e `operational_status = NULL`
    - `GET /me/notifications` retornou `operationalStatus = "recebida"` e `responseStatus = null`
    - resultado observado:

```json
{
  "notifications": [
    {
      "operationalStatus": "recebida",
      "responseStatus": null
    }
  ]
}
```

- Impacto observado:
  - estado operacional legado fica incorreto para o usuario;
  - filtros e UI podem exibir item como nao assumido;
  - lembretes de progresso podem nao ser enviados para esses casos.

## Achado 2

- ID: `BUG-002`
- Tipo: `bug_reproduzivel`
- Severidade preliminar: alta
- Componente: edicao de lembretes / scheduler
- Arquivos:
  - `apps/api/src/routes/reminders-me.ts`
  - `apps/api/src/reminders/scheduler.ts`
- Evidencia:
  - a rota de edicao atualiza `start_date`, `time_of_day`, `timezone` e `repeat_type`, mas preserva `last_scheduled_for`;
  - o scheduler calcula o proximo disparo a partir de `last_scheduled_for` quando esse campo existe.
  - Reproducao minima local:
    - lembrete diario com `last_scheduled_for = 2026-03-13T12:00:00.000Z` (09:00 local)
    - `PATCH /me/reminders/:id` alterando `timeOfDay` para `20:00`
    - scheduler executado em `2026-03-14T23:30:00.000Z`
    - resultado observado:

```json
{
  "patchStatus": 200,
  "updated": {
    "timeOfDay": "20:00",
    "lastScheduledFor": "2026-03-13T12:00:00.000Z"
  },
  "occurrence": {
    "scheduledFor": "2026-03-14T12:00:00.000Z"
  }
}
```

- Impacto observado:
  - o usuario altera o horario para `20:00`, mas o proximo disparo continua sendo calculado como `09:00`;
  - o problema tambem pode afetar mudancas de data inicial, timezone e recorrencia.

## Achado 3

- ID: `RISK-001`
- Tipo: `bug_reproduzivel`
- Severidade preliminar: media
- Componente: login web
- Arquivo: `apps/web/src/App.tsx`
- Evidencia:
  - o frontend chama `api.login()` antes de validar se o papel do usuario corresponde a rota;
  - em caso de papel divergente, o codigo mostra erro e nao limpa a sessao que acabou de ser criada pelo backend;
  - teste de verificacao em `apps/web/.bug-report/risk-001-verification.test.tsx` confirmou o fluxo:
    - login em `/login` com usuario admin retorna erro visual;
    - sem `logout`, um novo mount da aplicacao carrega a sessao via `api.me()`;
    - a aplicacao entra no console administrativo.

- Impacto observado:
  - a UI informa falha de acesso, mas a sessao permanece valida;
  - um refresh ou remount pode autenticar o usuario na area administrativa ou de usuario mesmo apos a mensagem de erro.
