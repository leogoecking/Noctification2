# Roadmap do Modulo de Tarefas

## Objetivo

Evoluir o modulo de `tasks` para suportar:

- organizacao de tarefas pessoais e operacionais no mesmo sistema
- controle de execucao de demandas da equipe
- visualizacao clara de prioridades, prazos e status
- acompanhamento de produtividade individual e do time
- reducao de esquecimento, atraso e falta de acompanhamento

## Regras para evitar alucinacao e perda de contexto

1. Este documento e a fonte principal de verdade do roadmap.
2. Nenhuma feature nova entra no escopo sem estar escrita aqui ou em um documento de decisao vinculado.
3. Cada fase so comeca depois da fase anterior ter criterio de aceite objetivo.
4. Cada PR deve atacar apenas uma categoria:
   - dominio
   - backend
   - board UX
   - alertas
   - metricas
5. Nao misturar refactor estrutural com mudanca de regra de negocio.
6. Nao misturar metrica de produtividade com alteracao de workflow.

## Artefatos obrigatorios de contexto

Sempre manter estes arquivos atualizados:

- `docs/tasks-roadmap.md`
  Roadmap e fases.
- `docs/tasks-spec.md`
  Regras de negocio e escopo funcional.
- `docs/tasks-status-model.md`
  Estados, transicoes e permissoes.
- `docs/tasks-metrics.md`
  Definicoes de produtividade e indicadores.
- `docs/tasks-decisions.md`
  Decisoes, tradeoffs e exclusoes de escopo.

Se algum desses arquivos ainda nao existir, ele deve ser criado antes da fase correspondente crescer de forma relevante.

## Escopo funcional alvo

O modulo deve cobrir:

- tarefas `pessoais`
- tarefas `operacionais`
- fluxo diario do usuario
- acompanhamento do lider/admin
- priorizacao por risco e prazo
- historico de execucao
- indicadores de produtividade
- mecanismos de acompanhamento ativo

## Fase 0 - Definicao e congelamento do escopo

### Objetivo

Definir linguagem comum e evitar crescimento organico confuso.

### Entregaveis

- tipologia de tarefa: `pessoal` e `operacional`
- definicao oficial de status
- mapa de permissoes
- definicao de produtividade individual
- definicao de produtividade do time
- definicao do que e atraso
- definicao do que e tarefa parada

### Criterio de aceite

- todas as regras basicas estao escritas em documento
- novas features so entram por mudanca deliberada no documento

## Fase 1 - Fundamentos de dominio

### Objetivo

Estabilizar o modelo antes de evoluir UX e automacao.

### Implementar

- tipo de tarefa:
  - `pessoal`
  - `operacional`
- estados operacionais:
  - `new`
  - `assumed`
  - `in_progress`
  - `blocked`
  - `waiting_external`
  - `done`
  - `cancelled`
- campos de operacao:
  - `priority`
  - `due_at`
  - `assignee`
  - `requester`
  - `category`
  - `blocked_reason`
- historico de transicoes

### Backend

- schema
- validacoes
- regras de transicao
- auditoria

### Criterio de aceite

- cada tarefa tem estado consistente
- transicoes invalidas sao barradas
- historico e criado nas mudancas relevantes
- testes de regra de negocio passam

## Fase 2 - Kanban funcional

### Objetivo

Transformar o board em ferramenta operacional de execucao, nao apenas visualizacao.

### Implementar

- acoes rapidas no card:
  - assumir
  - iniciar
  - bloquear
  - concluir
  - cancelar
- indicadores visuais:
  - vence hoje
  - atrasada
  - bloqueada
  - sem responsavel
- ordenacao por urgencia
- filtros rapidos:
  - minhas
  - atrasadas
  - vence hoje
  - bloqueadas
  - sem responsavel
- filtros salvos

### Frontend

- menos dependencia de abrir detalhe para fluxo basico
- board e detalhe sincronizados
- leitura rapida do risco operacional

### Criterio de aceite

- o operador consegue tocar o fluxo principal direto pelo kanban
- o gestor consegue identificar fila, gargalo e risco com leitura curta

## Fase 3 - Acompanhamento operacional

### Objetivo

Reduzir esquecimento, atraso e perda de follow-up.

### Implementar

- lembrete pre-vencimento
- alerta de tarefa parada
- alerta de tarefa bloqueada por muito tempo
- fila `precisa de atencao`
- resumo diario de pendencias
- visoes:
  - `vence hoje`
  - `atrasadas`
  - `sem responsavel`
  - `bloqueadas`

### Backend

- scheduler
- deduplicacao de alertas
- logs de disparo

### Criterio de aceite

- tarefas importantes deixam de depender so de memoria humana
- alertas nao duplicam de forma indevida

## Fase 4 - Produtividade individual e do time

### Objetivo

Dar visibilidade real de execucao e gargalos.

### Implementar metricas

- abertas por usuario
- concluidas por periodo
- concluidas no prazo
- atrasadas
- bloqueadas
- tempo medio ate assumir
- tempo medio ate concluir
- tempo por status
- carga atual por pessoa

### Visões

- `minhas tarefas`
- `tarefas da equipe`
- `painel gerencial`

### Criterio de aceite

- o lider consegue detectar sobrecarga, atraso estrutural e gargalo por pessoa ou por fila

## Fase 5 - Recursos avancados

### Objetivo

Ganhar escala sem poluir o nucleo.

### Implementar

- bulk actions
- checklist por tarefa
- templates de tarefa
- vinculo com notificacoes/incidentes
- swimlanes por responsavel ou equipe
- WIP limit por coluna
- recorrencia operacional mais rica

### Criterio de aceite

- cada item novo deve justificar ganho operacional claro
- nenhuma feature entra apenas por preferencia estetica

## Ordem recomendada

1. Fase 0
2. Fase 1
3. Fase 2
4. Fase 3
5. Fase 4
6. Fase 5

## Definicao de pronto por fase

Cada fase so fecha quando tiver:

- escopo escrito
- backend validado
- frontend validado
- testes minimos executados
- criterio de aceite explicitamente atendido
- riscos residuais documentados

## O que nao misturar

- refactor estrutural com regra nova
- mudanca visual com alteracao de status
- metricas com alteracao de workflow
- scheduler com refactor amplo de frontend

## Top 5 do MVP forte

Se precisar reduzir o escopo sem perder valor operacional, implementar primeiro:

1. status operacionais reais
2. historico de transicao
3. kanban com acoes rapidas
4. filtros rapidos e salvos
5. SLA visual e alertas de atraso

## Sinais de desvio de escopo

Parar e revisar o roadmap se ocorrer:

- pedido de feature sem criterio operacional claro
- mistura de backlog de UX com regra de negocio
- crescimento de statuses sem definicao precisa
- dashboards sem definicao previa de indicador
- automacao sem regra de deduplicacao

## Resultado esperado

Ao final das fases, o modulo deve:

- organizar tarefas pessoais e operacionais no mesmo sistema
- reduzir atraso e esquecimento
- tornar o kanban mais funcional para operacao
- dar visibilidade de produtividade individual e do time
- permitir acompanhamento continuo com baixa perda de contexto
