# Priorizacao

## Ordem recomendada

1. `BUG-001` - compatibilidade de notificacoes legadas
   - Severidade real: alta
   - Confianca: alta
   - Risco de regressao: baixo
   - Justificativa:
     - ja existe evidencia objetiva de retorno incorreto;
     - afeta UI do usuario, filtros e lembretes de progresso;
     - a correcao e localizada em mapeamentos de compatibilidade.

2. `BUG-002` - edicao de lembretes com agendamento antigo
   - Severidade real: alta
   - Confianca: alta
   - Risco de regressao: baixo
   - Justificativa:
     - dispara lembretes em horario incorreto apos uma edicao valida;
     - a causa raiz esta isolada entre a rota de atualizacao e o ponteiro do scheduler.

3. `RISK-001` - sessao mantida apos login com papel divergente no frontend
   - Severidade real: media
   - Confianca: alta
   - Risco de regressao: baixo
   - Justificativa:
     - o fluxo foi confirmado em teste dedicado;
     - a sessao persiste apesar da UI sinalizar erro;
     - o impacto e menor que os dois bugs ja corrigidos, mas agora e objetivo.

## Itens que nao devem ser corrigidos automaticamente agora

- Nenhum item exige refatoracao ampla.

## Atualizacao 2026-03-21 - melhoria estrutural executada

1. `MEL-001` - fundacao passiva para tarefas
   - Severidade real: media
   - Confianca: alta
   - Risco de regressao: baixo
   - Justificativa:
     - o roadmap atual ja exige tarefas como proximo nucleo do produto;
     - a ausencia completa de schema e contratos aumentava o risco das proximas etapas;
     - a solucao escolhida foi passiva, sem alterar rotas, UI, notificacoes ou scheduler.

## Itens que nao devem ser corrigidos automaticamente agora nesta frente

- CRUD de tarefas, UI, board, vinculacao de notificacoes e automacoes reais devem ficar para etapas seguintes.
- Nenhuma alteracao em `notifications` foi priorizada nesta rodada para evitar regressao do fluxo legado.

## Atualizacao 2026-03-21 - implementacao do CRUD inicial

2. `MEL-002` - CRUD inicial e lista HTTP de tarefas
   - Severidade real: alta
   - Confianca: alta
   - Risco de regressao: baixo
   - Justificativa:
     - sem superficie HTTP, a fundacao passiva de tarefas nao podia ser exercitada em fluxo real;
     - o modulo foi mantido isolado, sem Socket.IO, sem UI e sem alteracao em notificacoes/reminders;
     - a validacao por testes e typecheck foi direta no escopo afetado.

## Itens que nao devem ser corrigidos automaticamente agora apos MEL-002

- A proxima etapa nao deve pular direto para automacoes.
- O passo natural agora e UI minima de lista/detalhe consumindo o CRUD ja validado.

## Atualizacao 2026-03-21 - implementacao da UI minima

3. `MEL-003` - UI minima de tarefas para user/admin
   - Severidade real: alta
   - Confianca: alta
   - Risco de regressao: baixo
   - Justificativa:
     - apos `MEL-002`, o dominio de tarefas ainda exigia consumo manual de API;
     - a UI foi mantida em lista/detalhe simples, sem realtime e sem alterar contratos legados;
     - a validacao ficou concentrada em componentes e roteamento do workspace web.

## Itens que nao devem ser corrigidos automaticamente agora apos MEL-003

- O proximo passo nao deve introduzir automacoes antes da vinculacao opcional de notificacoes.
- Board, comentarios e realtime de tarefas continuam fora do menor caminho de risco.

## Atualizacao 2026-03-21 - implementacao das notificacoes vinculadas

4. `MEL-004` - notificacoes vinculadas opcionalmente a tarefas
   - Severidade real: alta
   - Confianca: alta
   - Risco de regressao: baixo
   - Justificativa:
     - a tarefa ja estava pronta em backend e frontend, mas as notificacoes continuavam sem referencia opcional ao dominio novo;
     - a solucao foi incremental, restrita a acoes manuais de atribuicao e mudanca relevante de status;
     - a validacao cobriu migration, rotas, socket payload e UI atual, sem introduzir automacoes.

## Itens que nao devem ser corrigidos automaticamente agora apos MEL-004

- A proxima etapa nao deve ampliar disparos sem observabilidade no scheduler.
- `due_soon`, `overdue` e `stale_task` continuam para a etapa de automacoes.

## Atualizacao 2026-03-21 - implementacao da primeira fatia da Etapa 4

5. `MEL-005` - automacoes operacionais iniciais de tarefa
   - Severidade real: alta
   - Confianca: alta
   - Risco de regressao: baixo
   - Justificativa:
     - a Etapa 4 ja era o proximo passo recomendado e dependia de instrumentacao minima antes de ampliar cobertura;
     - a solucao foi entregue em corte seguro, com flags separadas, logs dedicados e deduplicacao;
     - a validacao cobriu migration, automacoes, rotas administrativas e regressao do scheduler existente.

## Itens que nao devem ser corrigidos automaticamente agora apos MEL-005

- A Etapa 4 nao deve ser considerada concluida antes da recorrencia de tarefa e da politica final de rollout.
- Nao e recomendado ligar a automacao por padrao sem monitorar o comportamento inicial em producao.

## Atualizacao 2026-03-21 - conclusao segura da Etapa 4

6. `MEL-006` - recorrencia de tarefa com geracao automatica da proxima ocorrencia
   - Severidade real: alta
   - Confianca: alta
   - Risco de regressao: baixo
   - Justificativa:
     - a Etapa 4 ainda estava incompleta sem `tarefa recorrente`;
     - a solucao preserva historico ao criar uma nova tarefa filha em vez de reabrir a concluida;
     - a validacao cobriu schema, CRUD, automacao recorrente, regressao do scheduler legado e UI minima existente.

## Itens que nao devem ser corrigidos automaticamente agora apos MEL-006

- O proximo passo mais seguro nao e ampliar a UX de tarefas, e sim endurecer rollout, checklist e documentacao operacional.
- `ENABLE_TASK_AUTOMATION_SCHEDULER` deve permanecer em ativacao controlada ate observacao inicial em ambiente real.

## Atualizacao 2026-03-21 - hardening e documentacao operacional

7. `MEL-007` - hardening operacional para rollout das automacoes de tarefa
   - Severidade real: media
   - Confianca: alta
   - Risco de regressao: baixo
   - Justificativa:
     - a Fase 8 dependia mais de artefatos operacionais do que de novas regras de negocio;
     - a solucao manteve risco baixo ao atuar em health, env example, docs e script operacional;
     - a validacao foi objetiva com teste dedicado, typecheck e sintaxe do script.

## Itens que nao devem ser corrigidos automaticamente agora apos MEL-007

- O proximo passo mais seguro e usar esse checklist em ambiente real controlado, nao ampliar o dominio funcional.
- Board, comentarios e checklist/subtarefas devem continuar para uma rodada posterior.

## Atualizacao 2026-03-22 - implementacao de comentarios por tarefa

8. `MEL-008` - comentarios por tarefa no detalhe `me/admin`
   - Severidade real: media
   - Confianca: alta
   - Risco de regressao: baixo
   - Justificativa:
     - o modulo de tarefas ja estava operacional, mas ainda sem um canal proprio para contexto colaborativo;
     - a solucao foi mantida separada de `task_events`, reduzindo risco de contrato e de semantica;
     - a validacao ficou concentrada em migration, rotas de detalhe/publicacao, componentes e typecheck.

## Itens que nao devem ser corrigidos automaticamente agora apos MEL-008

- A proxima etapa nao deve tentar unificar comentarios e timeline sem necessidade funcional clara.
- Checklist/subtarefas continuam sendo uma ampliacao maior de modelo e regras de negocio.

## Atualizacao 2026-03-22 - timeline unificada

9. `MEL-009` - historico unico no detalhe da tarefa
   - Severidade real: media
   - Confianca: alta
   - Risco de regressao: baixo
   - Justificativa:
     - comentarios e eventos ja existiam, mas a leitura operacional ainda era fragmentada;
     - a solucao manteve schema e payload legado, adicionando apenas uma visao unificada;
     - a validacao ficou focada em contrato de detalhe, componentes de tarefa e typecheck.

10. `MEL-010` - limpeza do contrato redundante do detalhe de tarefa
   - Severidade real: baixa
   - Confianca: alta
   - Risco de regressao: baixo
   - Justificativa:
     - a UI ja estava migrada para `timeline`;
     - a remocao de `events/comments` simplifica o contrato sem alterar regra de negocio.
