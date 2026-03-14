# Roadmap Noctification2

## Fase 1: Seguranca e Regras Basicas

Objetivo: reduzir risco operacional sem quebrar o fluxo atual de desenvolvimento.

- Concluido: remover dependencia implícita de `admin/admin` e deixar o uso inseguro explicito por ambiente.
- Concluido: impedir que envio para `all` alcance administradores.
- Endurecer validacoes de payload e limites de campos.
- Revisar cookies, CORS e segredos para subida fora de desenvolvimento.
- Ajustar bootstrap do admin para falhar cedo em configuracoes inseguras fora de dev.

## Fase 2: Escala e Observabilidade

Objetivo: fazer o sistema crescer sem degradar consulta, realtime e manutencao.

- Concluido: paginar historico administrativo.
- Concluido parcialmente: reduzir recargas integrais do dashboard admin a cada evento em tempo real.
- Concluido: corrigir o acoplamento atual entre filtros/paginacao e recargas integrais no hook de realtime.
- Concluido parcialmente: melhorar modelagem de consultas do historico para evitar custo por notificacao.
- Concluido parcialmente: fortalecer a suite de testes da API sem dependencia de porta real.
- Adicionar indicadores de saude operacional, logs estruturados e cobertura de fluxos criticos.
- Concluido: refatorar filtros e efeitos do admin para evitar recarga automatica e desnecessaria durante digitacao.
- Concluido: alinhar a persistencia principal com a nomenclatura de visualizacao e reduzir dependencia de `read_at`.

Entregue parcialmente nesta fase:
- payload de `online_users:update` passou a atualizar o dashboard sem recarga de auditoria/historico
- `notification:read_update` passou a atualizar historico e fila operacional localmente quando o payload do socket e suficiente
- `notification:created` passou a inserir a nova notificacao localmente na fila e no historico quando a pagina/filtro atual comportam o item
- historico admin de notificacoes deixou de carregar destinatarios com uma query por notificacao, usando lote por pagina
- fila operacional ganhou escopo dedicado no backend, com paginação e filtros proprios no admin
- criacao, edicao e ativacao/desativacao de usuarios no admin passaram a atualizar a lista localmente, sem recarga completa
- paineis de lembretes no usuario e no admin deixaram de depender de recarga total apos create/update/toggle/delete mais comuns
- eventos `reminder:due` e `reminder:updated` no admin passaram a refletir ocorrencias, logs e saude localmente quando o payload permite
- notificacoes gerais do usuario passaram a ser consumidas por um hook global, mantendo eventos tambem em `/reminders`
- frontend web passou a reutilizar uma conexao `Socket.IO` por aba com `acquire/release`, reduzindo conexoes paralelas desnecessarias
- telas filtradas do usuario e de lembretes passaram a ignorar respostas HTTP antigas, evitando sobrescrita por requests fora de ordem
- dashboard admin principal passou a ignorar respostas HTTP antigas em usuarios, online, auditoria, fila e historico
- alertas globais do usuario passaram a usar centros persistentes no frontend para notificacoes e lembretes, com `Notification API`, audio com fallback e deduplicacao entre abas
- dropdown do sino do usuario deixou de abrir automaticamente por eventos em tempo real, abrindo apenas por clique

## Fase 3: Produto Operacional

Objetivo: transformar o sistema em um painel operacional de fato.

- Concluido: exibir usuarios online e auditoria no frontend admin.
- Concluido: adicionar filtros e paginacao para auditoria e historico administrativo.
- Concluido: expandir filtros e paginacao para a fila operacional do admin.
- Concluido: explicitar no admin a diferenca entre visualizacao e andamento operacional.
- Concluido: tornar a superficie de API/frontend explicita com `isVisualized` e `visualizedAt`.
- Concluido: refatorar o `AdminDashboard` em componentes menores e hooks dedicados.
- Concluido: separar melhor `Painel` e `Notificacoes` na experiencia do usuario.
- Criar SLA por prioridade com destaque de atraso.
- Concluido: separar estados de notificacao em uma maquina de estado explicita, com impacto em modelo de dados, API e UI:
  - `recebida`
  - `visualizada`
  - `em_andamento`
  - `assumida`
  - `resolvida`
- Criar exportacao de historico/auditoria e notificacoes recorrentes.

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

1. Melhorar modelagem de consultas do historico para reduzir custo e permitir evolucao da fila operacional.
2. Reduzir ainda mais recargas do admin para outros eventos administrativos que ainda exigem refresh manual ou carga ampla.
3. Fortalecer a suite de testes da API sem dependencia de porta real para cobrir a nova maquina de estados.

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
- login normalizado para lowercase na borda do backend, com autenticação e checagem de duplicidade case-insensitive
- script operacional adicionado para auditar colisões legadas de login por `LOWER(login)` sem alterar dados automaticamente

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
