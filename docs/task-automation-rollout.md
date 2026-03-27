# Rollout de Automacao de Tarefas

## Objetivo

Executar o rollout de `ENABLE_TASK_AUTOMATION_SCHEDULER` com o menor risco possivel, preservando lembretes pessoais e evitando duplicidade operacional.

## Variaveis relevantes

- `ENABLE_TASK_AUTOMATION_SCHEDULER`
- `TASK_AUTOMATION_DUE_SOON_MINUTES`
- `TASK_AUTOMATION_STALE_HOURS`
- `ENABLE_REMINDER_SCHEDULER`

## Estado recomendado inicial

- `ENABLE_REMINDER_SCHEDULER=false` ou conforme politica atual da operacao
- `ENABLE_TASK_AUTOMATION_SCHEDULER=false`
- `TASK_AUTOMATION_DUE_SOON_MINUTES=120`
- `TASK_AUTOMATION_STALE_HOURS=24`

## Checklist de pre-rollout

1. Confirmar build e migrations aplicadas.
2. Confirmar que `/api/v1/health` responde com:
   - `schedulers.remindersEnabled`
   - `schedulers.taskAutomationEnabled`
   - `taskAutomation.dueSoonWindowMinutes`
   - `taskAutomation.staleWindowHours`
3. Confirmar acesso admin a:
   - `GET /api/v1/admin/tasks/health`
   - `GET /api/v1/admin/tasks/automation-logs`
4. Confirmar base sem erro de migration para:
   - `014_task_automation_logs.sql`
   - `015_task_recurrence.sql`
5. Confirmar que a fila atual de tarefas nao possui volume inesperado de itens vencidos/parados.

## Sequencia recomendada de rollout

1. Manter `ENABLE_TASK_AUTOMATION_SCHEDULER=false` e validar health + login + leitura de env.
2. Habilitar a flag apenas em um ambiente controlado.
3. Reiniciar o servico.
4. Validar novamente `/api/v1/health`.
5. Observar `GET /api/v1/admin/tasks/health` e `GET /api/v1/admin/tasks/automation-logs`.
6. Confirmar se:
   - `dueSoonSentToday`
   - `overdueSentToday`
   - `staleSentToday`
   - `recurringCreatedToday`
   estao coerentes com a operacao real.
7. So depois repetir o processo em ambiente mais amplo.

## Sinais de aceite

- nenhuma explosao de logs de automacao
- nenhuma duplicidade de notificacao para a mesma tarefa e mesma regra
- recorrencias criando apenas uma nova tarefa por conclusao
- lembretes pessoais continuam com comportamento esperado

## Rollback

1. Voltar `ENABLE_TASK_AUTOMATION_SCHEDULER=false` no env file.
2. Reiniciar o servico da API.
3. Validar `/api/v1/health` e conferir `taskAutomationEnabled=false`.
4. Revisar `tasks/automation-logs` para medir o impacto do periodo habilitado.

## Observacoes

- A automacao recorrente cria uma nova tarefa; ela nao reabre a tarefa concluida.
- O rollout deve ficar parado se houver volume anormal de `overdue` ou `stale_task` logo apos a habilitacao.
