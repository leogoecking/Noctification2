# Pos-correcao

## Comparativo antes vs depois

- `BUG-001`
  - Antes: registros legados `assumida` podiam aparecer como `recebida` ou `visualizada`.
  - Depois: runtime e migration convergem para `assumida`.

- `BUG-002`
  - Antes: mudar a agenda nao alterava o proximo disparo quando `last_scheduled_for` existia.
  - Depois: a ancora do scheduler e recalculada quando a agenda muda.

## Problemas resolvidos

- `BUG-001`: resolvido.
- `BUG-002`: resolvido.
- `RISK-001`: resolvido.

## Problemas persistentes

- Nenhum bug confirmado pendente.

## Novos riscos detectados

- Nenhum novo risco relevante foi detectado na validacao executada.

## Pendencias para revisao humana

- Nenhuma pendencia critica aberta a partir dos bugs confirmados nesta rodada.

## Atualizacao 2026-03-21 - pos-implementacao da etapa 1 de tarefas

## Comparativo antes vs depois

- `MEL-001`
  - Antes: o roadmap posicionava `task` como proximo nucleo do produto, mas o runtime nao tinha schema nem contratos minimos para isso.
  - Depois: o banco passou a aceitar `tasks` e `task_events`, e backend/frontend ganharam tipos passivos correspondentes.

## Problemas resolvidos

- `MEL-001`: fundacao passiva de tarefas criada sem alterar o comportamento atual.

## Problemas persistentes

- Tarefas ainda nao possuem CRUD, UI, vinculacao de notificacoes ou automacoes reais.

## Novos riscos detectados

- Nenhum novo risco funcional foi detectado no escopo validado.

## Pendencias para revisao humana

- Definir o contrato exato da futura vinculacao opcional entre notificacao nova e `task`.
- Definir a politica de automacoes de tarefa sobre o scheduler reaproveitado antes da implementacao da Etapa 4 da frente.

## Atualizacao 2026-03-21 - pos-implementacao do CRUD inicial

## Comparativo antes vs depois

- `MEL-002`
  - Antes: `task` existia apenas como schema/tipos passivos.
  - Depois: `task` passou a ter CRUD/lista/detail HTTP em `me` e `admin`, com auditoria e `task_events`.

## Problemas resolvidos

- `MEL-002`: superficie inicial de tarefas disponivel e validada no backend.

## Problemas persistentes

- Ainda nao existe UI de tarefas.
- Ainda nao existe vinculacao opcional de notificacao nova a tarefa.
- Ainda nao existem automacoes operacionais de tarefa.

## Novos riscos detectados

- Nenhum novo risco funcional foi detectado no escopo validado.

## Pendencias para revisao humana

- Definir a primeira tela de tarefas: lista unica com detalhe lateral ou lista + detalhe separados.
- Definir se usuario comum podera futuramente atribuir tarefa a outros usuarios ou se isso continuara restrito ao admin.

## Atualizacao 2026-03-21 - pos-implementacao da UI minima

## Comparativo antes vs depois

- `MEL-003`
  - Antes: `task` existia no schema, no backend HTTP e no cliente API, mas ainda nao tinha superficie de uso no frontend.
  - Depois: usuario e admin passaram a ter paines minimos de lista/detalhe e criacao inicial de tarefas.

## Problemas resolvidos

- `MEL-003`: tarefas agora podem ser operadas no frontend sem depender de chamadas manuais de API.

## Problemas persistentes

- Ainda nao existe vinculacao opcional de notificacao nova a tarefa.
- Ainda nao existem automacoes operacionais de tarefa.
- Ainda nao existe board nem realtime dedicado para tarefas.

## Novos riscos detectados

- Nenhum novo risco funcional relevante foi detectado no escopo validado.

## Pendencias para revisao humana

- Confirmar se a proxima etapa de notificacoes vinculadas deve abrir deep link para `/tasks` ou para detalhe futuro dedicado.
- Confirmar se a lista atual continuara unica ou se o board sera uma segunda visualizacao posterior.

## Atualizacao 2026-03-21 - pos-implementacao das notificacoes vinculadas

## Comparativo antes vs depois

- `MEL-004`
  - Antes: notificacoes novas nao tinham referencia opcional para `task`, e mutacoes de tarefa nao geravam alertas vinculados.
  - Depois: notificacoes novas podem carregar `source_task_id`, e atribuicao/mudanca relevante de status passaram a emitir alertas vinculados sem alterar o legado.

## Problemas resolvidos

- `MEL-004`: novas notificacoes operacionais agora apontam para a tarefa correta no payload e na UI atual.

## Problemas persistentes

- Ainda nao existem automacoes de `due_soon`, `overdue` ou `stale_task`.
- Ainda nao existe navegacao dedicada para abrir a tarefa a partir da notificacao.

## Novos riscos detectados

- Nenhum novo risco funcional relevante foi detectado no escopo validado.

## Pendencias para revisao humana

- Definir se a futura navegacao de notificacao para tarefa usara querystring, rota dedicada ou estado local.
- Definir limites operacionais para disparos automaticos antes de ligar o scheduler de tarefas.

## Atualizacao 2026-03-21 - pos-implementacao das automacoes operacionais iniciais

## Comparativo antes vs depois

- `MEL-005`
  - Antes: tarefas nao tinham automacoes operacionais de prazo/atraso, nem logs dedicados, nem observabilidade administrativa minima.
  - Depois: o backend passou a suportar `due_soon`, `overdue` e `stale_task` com notificacoes vinculadas, `task_events`, logs deduplicados e rotas administrativas de saude.

## Problemas resolvidos

- `MEL-005`: primeira fatia da Etapa 4 entregue com flags, idempotencia e observabilidade inicial.

## Problemas persistentes

- A recorrencia de tarefa ainda nao foi implementada.
- A Etapa 4 do roadmap permanece em andamento, nao concluida.
- Ainda nao existe monitoramento de producao para volume real de automacoes apos habilitacao da flag.

## Novos riscos detectados

- Nenhum novo risco funcional relevante foi detectado no escopo validado.

## Pendencias para revisao humana

- Definir a politica de habilitacao inicial da flag `ENABLE_TASK_AUTOMATION_SCHEDULER` por ambiente.
- Definir o contrato da futura recorrencia de tarefa antes de concluir a Etapa 4.

## Atualizacao 2026-03-21 - pos-implementacao da recorrencia de tarefa

## Comparativo antes vs depois

- `MEL-006`
  - Antes: tarefas nao tinham configuracao de recorrencia nem geracao automatica da proxima ocorrencia.
  - Depois: tarefas podem carregar `repeat_type` e `weekdays`, e o scheduler passa a gerar a proxima tarefa apos conclusao com deduplicacao e notificacao vinculada.

## Problemas resolvidos

- `MEL-006`: a Etapa 4 foi concluida no recorte seguro previsto pelo roadmap.

## Problemas persistentes

- A frente agora depende de hardening operacional e rollout controlado por flag.
- Ainda nao ha board, comentarios ou checklist/subtarefas.

## Novos riscos detectados

- Nenhum novo risco funcional relevante foi detectado no escopo validado.

## Pendencias para revisao humana

- Definir a estrategia de ativacao progressiva de `ENABLE_TASK_AUTOMATION_SCHEDULER` por ambiente.
- Definir quais sinais de producao passarao a ser obrigatorios para considerar a automacao de tarefa estabilizada.

## Atualizacao 2026-03-21 - pos-implementacao do hardening operacional

## Comparativo antes vs depois

- `MEL-007`
  - Antes: o rollout da automacao de tarefas dependia de leitura manual do codigo e o health publico nao refletia o estado das flags.
  - Depois: o repositorio passou a ter health enriquecido, env example atualizado, checklist/rollback versionados e script Debian endurecido.

## Problemas resolvidos

- `MEL-007`: a Fase 8 entrou em andamento com artefatos operacionais concretos e verificaveis.

## Problemas persistentes

- Ainda nao houve uso do checklist em ambiente real.
- A ativacao ampla da flag continua pendente de observacao controlada.

## Novos riscos detectados

- Nenhum novo risco funcional relevante foi detectado no escopo validado.

## Pendencias para revisao humana

- Executar o checklist de rollout em VM real antes de considerar a Fase 8 concluida.
- Definir o ponto de corte para promover `ENABLE_TASK_AUTOMATION_SCHEDULER` de rollout controlado para uso amplo.

## Atualizacao 2026-03-22 - pos-implementacao dos comentarios por tarefa

## Comparativo antes vs depois

- `MEL-008`
  - Antes: o detalhe da tarefa nao tinha comentarios; o contexto operacional ficava restrito a descricao e `task_events`.
  - Depois: o detalhe passou a expor comentarios persistidos e permitir publicacao em `me/admin` com contrato dedicado.

## Problemas resolvidos

- `MEL-008`: o modulo de tarefas agora tem trilha basica de contexto colaborativo sem depender de canais externos.

## Problemas persistentes

- Comentarios ainda nao aparecem integrados a timeline de eventos.
- Ainda nao existe checklist/subtarefas.
- Nao ha realtime para comentario novo.

## Novos riscos detectados

- Nenhum novo risco funcional relevante foi detectado no escopo validado.

## Pendencias para revisao humana

- Definir se comentarios devem permanecer bloco separado ou entrar numa timeline unificada futura.
- Definir se a proxima etapa sera checklist/subtarefas ou enriquecimento da timeline.

## Atualizacao 2026-03-22 - pos-implementacao da timeline unificada

## Comparativo antes vs depois

- `MEL-009`
  - Antes: comentarios e eventos eram exibidos em blocos separados.
  - Depois: o detalhe da tarefa passou a exibir um historico unico, cronologico e tipado.

## Problemas resolvidos

- `MEL-009`: a leitura operacional do historico da tarefa deixou de depender de correlacao manual entre duas listas.

## Problemas persistentes

- O payload ainda carrega `events` e `comments` por compatibilidade.
- Ainda nao ha realtime do historico.

## Novos riscos detectados

- Nenhum novo risco funcional relevante foi detectado no escopo validado.

## Atualizacao 2026-03-22 - pos-limpeza do contrato

## Comparativo antes vs depois

- `MEL-010`
  - Antes: o detalhe expunha `task`, `events`, `comments` e `timeline`.
  - Depois: o detalhe expoe apenas `task` e `timeline`.

## Problemas resolvidos

- `MEL-010`: a redundancia do contrato HTTP do detalhe de tarefa foi removida.

## Problemas persistentes

- Ainda nao ha realtime do historico.

## Novos riscos detectados

- Nenhum novo risco funcional relevante foi detectado no escopo validado.
