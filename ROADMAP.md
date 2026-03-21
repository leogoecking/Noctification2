# Roadmap Noctification2

## Diretriz de produto

Direcao estrategica a partir desta etapa:

- O produto evoluira de painel operacional centrado em notificacoes e lembretes para plataforma operacional centrada em tarefas.
- `task` passa a ser a entidade principal de trabalho.
- Notificacoes passam a ser canal de comunicacao, alerta e sinalizacao de eventos de tarefa.
- Lembretes passam a ter dois papeis:
  - lembrete pessoal do usuario
  - automacao operacional de tarefa quando houver vinculo com prazo, atraso, inatividade ou recorrencia
- Toda nova evolucao deve priorizar reutilizacao da infraestrutura ja entregue de autenticacao, `Socket.IO`, auditoria, historico, scheduler e paineis `user/admin`.
- A transicao deve ser incremental, compativel com o ambiente atual e sem quebrar os fluxos existentes de notificacoes e lembretes.

## Regra funcional de fronteira

Para manter o produto coerente durante a transicao:

- evento que exige acompanhamento, responsavel, prazo, status ou conclusao deve virar tarefa
- aviso simples, broadcast, informacao pontual ou comunicacao sem ciclo de trabalho pode continuar como notificacao simples
- lembrete pessoal continua existindo como utilidade individual do usuario
- automacao de tarefa pode reaproveitar o scheduler existente, mas nao deve depender semanticamente da feature de lembretes pessoais

## Fase 1: Seguranca e Regras Basicas

Objetivo: reduzir risco operacional sem quebrar o fluxo atual de desenvolvimento.

- Concluido: remover dependencia implicita de `admin/admin` e deixar o uso inseguro explicito por ambiente.
- Concluido: impedir que envio para `all` alcance administradores.
- Endurecer validacoes de payload e limites de campos.
- Revisar cookies, CORS e segredos para subida fora de desenvolvimento.
- Ajustar bootstrap do admin para falhar cedo em configuracoes inseguras fora de dev.

## Fase 2: Escala e Observabilidade

Objetivo: fazer o sistema crescer sem degradar consulta, realtime e manutencao.

- Adicionar indicadores de saude operacional, logs estruturados e cobertura de fluxos criticos.

## Fase 3: Produto Operacional

Objetivo: transformar o sistema em um painel operacional de fato.

- Criar SLA por prioridade com destaque de atraso.
- Concluido: separar estados de notificacao em uma maquina de estado explicita, com impacto em modelo de dados, API e UI:
  - `recebida`
  - `visualizada`
  - `em_andamento`
  - `assumida`
  - `resolvida`
- Criar exportacao de historico/auditoria e automacoes recorrentes ligadas a tarefas.
- Proximo passo natural desta fase: deixar de tratar notificacao como item principal de trabalho e introduzir tarefa como entidade central do produto.
- Ajustar SLA por prioridade para operar sobre tarefas e fila operacional derivada, e nao apenas sobre notificacoes isoladas.
- Evoluir a ideia de notificacoes recorrentes para automacoes recorrentes ligadas a tarefas.

## Fase 4: Tarefas como nucleo do produto

Objetivo: transformar o sistema em gestor operacional centrado em tarefas, usando notificacoes como canal e lembretes/scheduler como automacao.

- Criar entidade `tasks` como modelo central de trabalho.
- Criar fluxo de criacao, atribuicao, priorizacao, prazo, andamento e conclusao de tarefas.
- Criar visoes de Lista e Board para operacao diaria.
- Adicionar historico, comentarios e timeline por tarefa.
- Adicionar checklist/subtarefas para execucao operacional.
- Vincular notificacoes a tarefas por referencia de origem (`source_type` / `source_id` ou estrutura equivalente).
- Reutilizar o scheduler ja entregue para automacoes de tarefa:
  - `due_soon`
  - `overdue`
  - `stale_task`
  - tarefa recorrente
- Preservar compatibilidade com notificacoes e lembretes atuais durante o rollout.
- Evitar refatoracao ampla e priorizar mudancas incrementais e verificaveis.

## Inicio desta rodada

Mudancas entregues nesta rodada:

1. Tornar o uso do admin fixo inseguro explicito e controlado por ambiente.
2. Corrigir o envio para `all` para atingir apenas usuarios comuns ativos.
3. Exibir usuarios online e auditoria no admin.
4. Adicionar filtros e paginacao real em auditoria e historico administrativo.
5. Corrigir a leitura operacional para manter `em_andamento` fora de concluidas.
6. Tornar a API e o frontend mais explicitos com `isVisualized` e `visualizedAt`.
7. Refatorar o `AdminDashboard` em componentes menores.
8. Separar o fluxo do admin em hooks de realtime e de acoes.
9. Separar filtros em edicao de filtros aplicados e isolar recargas por area do admin.
10. Implementar `operational_status` no backend com migracao de dados e compatibilidade de resposta.
11. Atualizar frontend admin/usuario para exibir e consumir a nova maquina de estados operacional.
12. Introduzir `visualized_at` na persistencia e migrar o backend para esse campo como referencia principal.

## Proximos focos recomendados

1. Introduzir a entidade `task` no backend e no frontend como novo nucleo do produto, sem quebrar notificacoes e lembretes existentes.
2. Criar a superficie inicial de tarefas:
   - modelagem de banco
   - endpoints `user/admin`
   - tipos compartilhados
   - lista inicial com filtros por status, prioridade e responsavel
3. Evoluir a experiencia para visoes operacionais de tarefa:
   - Lista
   - Board
   - detalhe da tarefa
4. Vincular notificacoes a tarefas para que eventos operacionais deixem de existir como itens isolados.
5. Reutilizar o scheduler de lembretes para automacoes de tarefa, evitando criar um novo motor paralelo neste momento.
6. Fortalecer testes, validacoes e rollout seguro no escopo de tarefas, mantendo a estrategia incremental ja adotada no projeto.

## Feature: Aba de Lembretes

Status: em andamento  
Prioridade: alta  
Tipo: evolucao incremental compativel com producao

### Objetivo

Adicionar uma nova aba de Lembretes ao painel do usuario e ao painel administrativo, permitindo cadastro de lembretes pessoais com data, hora, recorrencia, dias da semana, confirmacao manual de conclusao, relembrar apos 10 minutos, alerta visual, som no frontend e historico por ocorrencia.

### Impacto esperado

- aumento de utilidade diaria do sistema
- expansao do uso do painel do usuario
- reutilizacao da infraestrutura existente de tempo real
- rastreabilidade operacional por ocorrencia
- baixo impacto sobre features ja existentes

### Escopo funcional

- cadastro de lembretes
- recorrencia: `none`, `daily`, `weekly`, `monthly`, `weekdays`
- geracao de ocorrencia por disparo
- conclusao manual por ocorrencia
- retry apos 10 minutos quando nao concluido
- historico de ocorrencia
- visualizacao no painel admin
- som de alerta no frontend com fallback visual

### Dependencias

- autenticacao ja existente
- infraestrutura `Socket.IO` ja existente
- padrao de rotas e middleware atual
- banco `SQLite` atual
- menu/paginas `user/admin` ja existentes

### Fases de entrega

#### Fase 1

- modelagem do banco
- migration de `reminders`
- migration de `reminder_occurrences`
- migration de `reminder_logs`
- repositories/services base
- endpoints user CRUD
- scheduler inicial
- conclusao manual de ocorrencia

Entregue parcialmente:
- migrations base criadas
- tipos e services base adicionados
- endpoints `user/admin` iniciais adicionados
- aba inicial de lembretes adicionada em `user/admin`
- scheduler inicial adicionado com `flag` de habilitacao segura por ambiente
- conclusao manual de ocorrencia conectada ao backend e ao fluxo realtime
- ciclo do scheduler extraido para validacao automatizada sem depender de porta real

#### Fase 2

- recorrencia completa
- retries a cada 10 minutos
- expiracao controlada
- historico do usuario
- logs de auditoria

Entregue parcialmente:
- recorrencia base validada para lembrete unico e semanal sem duplicidade
- expiracao no fim do dia local do sistema validada no scheduler
- cobertura inicial de teste backend para geracao, duplicidade e expiracao
- cobertura de rotas de lembretes adicionada sem dependencia de porta real

#### Fase 3

- frontend user: aba, formulario, lista, filtros, historico
- alerta visual em tempo real
- card/toast de ocorrencia pendente

Entregue parcialmente:
- aba inicial do usuario com formulario, lista e historico
- alerta visual realtime para ocorrencias pendentes
- atualizacao realtime ao concluir/expirar ocorrencia
- filtros de produto no painel do usuario para ativos, inativos, hoje, pendentes, concluidas e expiradas
- painel do usuario reorganizado com navegacao fixa, cards-resumo e separacao clara entre `Painel`, `Notificacoes` e `Lembretes`
- tela de lembretes reorganizada em blocos mais claros, com pendencias em destaque, formulario separado e historico mais legivel
- estados vazios e labels da interface do usuario padronizados para leitura operacional mais clara

#### Fase 4

- som de alerta no frontend
- fallback para autoplay bloqueado
- debounce de reproducao

Concluido:
- som de alerta no frontend implementado
- fallback visual explicito quando o navegador bloqueia autoplay
- acao de retentativa manual do som no painel do usuario
- protecao contra disparos sonoros em rajada por cooldown por ocorrencia e cooldown global curto
- cobertura automatizada do helper de audio e do fluxo de fallback
- notificacoes gerais do usuario alinhadas ao mesmo padrao dos lembretes, com pop-up persistente, som, `Notification API` em background e fallback visual
- toasts de chegada deixaram de competir com os pop-ups persistentes, ficando restritos a confirmacoes de acao, erro e retentativa manual

#### Fase 5

- painel admin de lembretes
- filtros por usuario
- visualizacao de ocorrencias
- ativar/desativar lembretes

Entregue parcialmente:
- aba inicial admin com listagem de lembretes e ocorrencias
- recarga realtime do painel admin ao disparar/concluir ocorrencias
- filtros administrativos por usuario, ativos/inativos e status das ocorrencias
- contexto administrativo de usuario melhorado com nome/login no painel de lembretes
- indicadores de saude operacional para lembretes no painel admin
- logs operacionais de lembretes com filtro por usuario e tipo de evento
- exclusao de lembrete trocada por arquivamento logico, preservando ocorrencias e logs historicos
- cancelamento realtime de ocorrencias pendentes quando o lembrete e arquivado

#### Fase 6

- hardening
- testes
- checklist final de rollout
- documentacao operacional

Entregue parcialmente:
- testes deterministas de scheduler e rotas de lembretes sem dependencia de `listen`
- testes de auth e notificacoes adicionados no mesmo modelo sem dependencia de `listen`
- suite HTTP de integracao mantida como opt-in para ambientes que suportem bind de porta
- observabilidade minima de lembretes exposta no admin para rollout mais seguro
- validacoes de payload endurecidas para titulo, descricao, data, hora, timezone e recorrencia
- documentacao de ativacao controlada do scheduler por ambiente
- cobertura do scheduler ativo por timer local, sem depender do servidor HTTP
- politica de timezone dos lembretes explicitada no backend com suporte operacional unico para `America/Bahia`
- login normalizado para lowercase na borda do backend, com autenticacao e checagem de duplicidade case-insensitive
- script operacional adicionado para auditar colisoes legadas de login por `LOWER(login)` sem alterar dados automaticamente

### Riscos

- duplicidade de ocorrencia por scheduler
- ruido excessivo por retries
- autoplay bloqueado no navegador
- inconsistencia entre tabs simultaneas
- regressao em fluxo de notificacoes existente se houver acoplamento excessivo

### Mitigacoes

- indice unico por `reminder_id + scheduled_for`
- scheduler com lock em memoria
- retries limitados
- expiracao no mesmo dia
- fallback visual sem depender de audio
- modulo isolado e rollout por etapas

### Checklist de rollout

- [ ] migrations validadas em ambiente de teste
- [ ] scheduler habilitado apenas apos CRUD basico validado
- [ ] criacao de lembrete unico validada
- [ ] recorrencia validada
- [ ] retry apos 10 minutos validado
- [ ] conclusao manual validada
- [ ] protecao contra duplicidade validada
- [ ] fallback sem audio validado
- [ ] painel admin validado
- [ ] logs minimos observaveis validados
- [ ] plano de rollback documentado

Status atual desta checklist:
- scheduler segue protegido por flag de ambiente
- fluxo de ativacao controlada do scheduler documentado
- criacao de lembrete unico validada
- recorrencia base validada
- conclusao manual validada
- protecao contra duplicidade validada
- testes de scheduler e rotas de lembretes validados sem dependencia de porta real
- painel admin com saude operacional e logs minimos observaveis validado
- fallback sem audio validado no frontend
- painel do usuario validado com fluxo de alertas persistentes para notificacoes gerais e lembretes

### Plano de rollback

- ocultar menus/rotas da feature
- desabilitar inicializacao do scheduler de reminders
- preservar tabelas sem impacto no restante do sistema

## Feature: Gestao de Tarefas

Status: planejado  
Prioridade: muito alta  
Tipo: evolucao estrutural incremental compativel com o projeto atual

### Objetivo

Transformar o sistema em uma plataforma operacional centrada em tarefas, mantendo notificacoes como canal de comunicacao e reaproveitando o scheduler ja existente como base para automacoes.

### Impacto esperado

- consolidacao do produto em torno de uma entidade principal de trabalho
- reducao do uso de notificacoes como pseudo-tarefas
- melhor visibilidade operacional para usuario e admin
- aproveitamento direto de auditoria, realtime e scheduler ja existentes
- base mais forte para SLA, board, checklist e automacoes futuras

### Escopo funcional

- cadastro de tarefas
- atribuicao de responsavel
- definicao de prioridade
- definicao de status
- definicao de prazo
- conclusao e cancelamento
- visualizacao em lista
- visualizacao em board
- comentarios por tarefa
- timeline/historico por tarefa
- checklist/subtarefas
- notificacoes vinculadas a tarefa
- automacoes de prazo, atraso, inatividade e recorrencia
- criterio funcional para diferenciar tarefa de notificacao simples
- logs de automacao por tarefa

### Dependencias

- autenticacao ja existente
- infraestrutura `Socket.IO` ja existente
- auditoria ja existente
- padrao de rotas e middleware atual
- banco `SQLite` atual
- paineis `user/admin` ja existentes
- scheduler de lembretes ja entregue e validado

### Principios de compatibilidade

- notificacoes existentes continuam funcionando durante a transicao
- lembretes pessoais continuam existindo como feature separada
- tarefas entram primeiro como novo modulo, sem substituir tudo de uma vez
- toda automacao de tarefa deve priorizar reutilizacao do scheduler atual antes de qualquer novo motor
- rollout deve ser incremental, com validacao por modulo
- lembretes pessoais nao devem se tornar dependencia semantica obrigatoria das tarefas
- automacoes de tarefa podem reutilizar o scheduler existente, mas devem manter identidade funcional propria
- novas notificacoes operacionais derivadas de tarefa devem nascer vinculadas a uma origem de tarefa
- notificacoes legadas podem continuar sem vinculacao durante a transicao

### Estrategia de transicao

- manter notificacoes legadas como fluxo existente durante o periodo de coexistencia
- novas notificacoes operacionais devem ser vinculadas a `task` quando o evento representar trabalho acompanhavel
- evitar migracao em massa das notificacoes antigas nesta etapa
- preservar lembretes pessoais como modulo separado
- introduzir task primeiro no backend e frontend antes de expandir automacoes

### Fases de entrega

#### Fase 1

- modelagem do banco para `tasks`
- migration inicial
- tipos compartilhados
- endpoints `user/admin` de CRUD
- filtros iniciais por status, prioridade e responsavel
- auditoria basica de create/update/status/change

Criterio de aceite:
- criar, editar, listar, concluir e cancelar tarefa sem impactar notificacoes e lembretes atuais

#### Fase 2

- frontend inicial de tarefas
- menu/aba de tarefas
- lista de tarefas no usuario e no admin
- filtros por status, prioridade, responsavel e vencimento
- cards/resumos basicos

Criterio de aceite:
- usuario e admin conseguem operar tarefas por lista sem depender de notificacao como item principal

#### Fase 3

- visao Board por colunas
- mudanca de status da tarefa pela interface
- reorganizacao da operacao diaria em cima de tarefas

Colunas iniciais sugeridas:
- `new`
- `in_progress`
- `waiting`
- `done`
- `cancelled`

Criterio de aceite:
- tarefa pode ser criada e movimentada entre estados operacionais com reflexo consistente no backend

#### Fase 4

- comentarios por tarefa
- timeline/historico por tarefa
- registro de criacao, atribuicao, mudanca de status, alteracao de prazo e conclusao

Criterio de aceite:
- cada tarefa possui contexto operacional verificavel sem depender apenas da auditoria global

#### Fase 5

- checklist/subtarefas
- progresso de execucao
- resumo de itens concluidos por tarefa

Criterio de aceite:
- tarefa pode representar execucao real com passos internos acompanhaveis

#### Fase 6

- notificacoes ligadas a tarefa
- criacao de notificacao por atribuicao
- criacao de notificacao por mudanca relevante de status
- criacao de notificacao por tarefa critica ou proxima do vencimento
- referencia de origem da notificacao para a tarefa

Criterio de aceite:
- notificacoes deixam de ser itens soltos e passam a apontar para a tarefa relacionada

#### Fase 7

- automacoes com reaproveitamento do scheduler atual
- `due_soon`
- `overdue`
- `stale_task`
- tarefa recorrente
- relembrar tarefa sem atualizacao
- logs e observabilidade de automacoes
- protecao contra duplicidade e reprocessamento

Criterio de aceite:
- sistema consegue alertar e acompanhar tarefas por regra de negocio sem criar infraestrutura paralela desnecessaria

#### Fase 8

- hardening
- testes
- checklist final de rollout
- documentacao operacional
- estrategia de rollback
- validacao de regressao em notificacoes e lembretes

### Ordem pratica de implementacao

1. `tasks` + CRUD + lista inicial
2. detalhe da tarefa + mudanca de status
3. board
4. comentarios + timeline
5. checklist/subtarefas
6. notificacoes vinculadas
7. automacoes

### Modelagem inicial sugerida

Entidade `tasks` com campos minimos:

- `id`
- `title`
- `description`
- `status`
- `priority`
- `creator_user_id`
- `assignee_user_id`
- `due_at`
- `started_at`
- `completed_at`
- `cancelled_at`
- `created_at`
- `updated_at`
- `archived_at`

Extensoes planejadas:

- `task_comments`
- `task_checklist_items`
- `task_events`
- referencia cruzada entre `notifications` e `tasks`

### Riscos

- tentar substituir notificacoes atuais de uma vez
- acoplamento excessivo entre task e reminder
- regressao no fluxo realtime atual
- crescimento desordenado do frontend sem modularizacao suficiente
- duplicar regras de negocio ja existentes no scheduler
- confusao de fronteira entre lembrete pessoal e automacao de tarefa
- manutencao de notificacoes standalone por tempo excessivo sem criterio claro
- disparos duplicados ou ruido operacional nas automacoes de tarefa

### Mitigacoes

- introduzir `task` como modulo novo e nao como substituicao imediata
- manter notificacoes atuais operando durante a transicao
- reutilizar auditoria e scheduler existentes
- validar por modulo afetado antes de validacao global
- evitar criar novo motor de automacao antes de provar limites do scheduler atual
- definir regra objetiva para quando um evento vira tarefa e quando permanece notificacao
- manter periodo de coexistencia com notificacoes legadas sem forcar migracao em massa
- aplicar idempotencia, logs e flags de ativacao nas automacoes de tarefa

### Checklist de rollout

- [ ] migration inicial de `tasks` validada
- [ ] CRUD basico validado
- [ ] filtros iniciais validados
- [ ] lista inicial validada
- [ ] board inicial validado
- [ ] comentarios e timeline validados
- [ ] checklist/subtarefas validados
- [ ] notificacoes vinculadas a task validadas
- [ ] notificacoes novas com origem de task validadas
- [ ] notificacoes legadas preservadas durante a transicao
- [ ] regra de fronteira entre tarefa e notificacao validada
- [ ] automacoes de prazo e atraso validadas
- [ ] protecao contra duplicidade nas automacoes validada
- [ ] logs e observabilidade de automacoes validados
- [ ] regressao em notificacoes validada
- [ ] regressao em lembretes validada
- [ ] rollback documentado

### Plano de rollback

- ocultar menus/rotas de tarefas
- desabilitar automacoes de tarefa sem afetar lembretes pessoais
- preservar tabelas novas sem interferir no restante do sistema
- manter notificacoes e lembretes atuais como fluxo principal enquanto a feature de tarefas estiver desligada
