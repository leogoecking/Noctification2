# Itens do Stitch que dependem de dados reais

Este arquivo separa os elementos visuais do Stitch que so ficam uteis quando alimentados por dados reais do sistema principal.

## Dashboard do usuario

### 1. Reminders rail

Uso no Stitch:
- trilho lateral com lembretes priorizados
- agenda curta de tarefas/compromissos do operador

Dados reais necessarios:
- lembretes por usuario
- horario agendado
- prioridade do lembrete
- origem do lembrete
- estado atual (`pendente`, `adiado`, `cancelado`, `concluido`)

Possivel serventia:
- transformar o rail lateral em agenda operacional pessoal
- destacar compromissos do turno

### 2. System health do usuario

Uso no Stitch:
- bloco lateral com saude do sistema e pequenos indicadores

Dados reais necessarios:
- status de conectividade do usuario
- fila pessoal de notificacoes
- alertas criticos recentes
- lembretes pendentes

Possivel serventia:
- virar um resumo rapido de contexto do operador
- reduzir troca de tela para saber o que esta urgente

## Dashboard admin

### 3. Search operational logs

Uso no Stitch:
- busca global no topo do admin

Dados reais necessarios:
- auditoria indexada
- historico de notificacoes
- usuarios
- possivelmente tarefas e reminders

Possivel serventia:
- busca operacional unica para admins
- localizar usuario, notificacao, evento ou tarefa sem navegar por varias abas

### 4. Active administrators

Uso no Stitch:
- coluna lateral com admins online e papel de cada um

Dados reais necessarios:
- presenca online por admin
- cargo/funcao
- ultima atividade
- opcionalmente permissao ou escopo administrativo

Possivel serventia:
- visibilidade rapida de quem esta de plantao
- apoio a escalonamento interno

### 5. SLA performance card

Uso no Stitch:
- bloco visual de tendencia de SLA

Dados reais necessarios:
- historico por janela de tempo
- tempo medio de resposta
- violacoes de SLA
- throughput por periodo

Possivel serventia:
- painel gerencial real de desempenho
- leitura rapida de degradacao operacional

## Kanban de tarefas

### 6. Search tasks

Uso no Stitch:
- busca de tarefas no topo do kanban

Dados reais necessarios:
- busca por titulo
- descricao
- responsavel
- etiqueta/categoria
- possivelmente comentarios

Possivel serventia:
- localizar tarefa sem depender so de filtros por status e fila

### 7. Quick task contextual

Uso no Stitch:
- CTA flutuante para criacao rapida

Dados reais necessarios:
- presets de criacao
- categoria padrao
- responsavel sugerido
- prioridade sugerida

Possivel serventia:
- criar tarefa em poucos cliques durante operacao
- acelerar registro de demanda ad hoc

### 8. Cards com metadados ricos

Uso no Stitch:
- cards mostram mais contexto visual por item

Dados reais necessarios:
- categoria/tag
- anexos
- progresso
- departamento/equipe
- observador ou corresponsavel

Possivel serventia:
- cards mais densos sem abrir detalhe
- melhor priorizacao dentro do board

## APR

### 9. Dynamic risk matrix

Uso no Stitch:
- matriz de risco com leitura visual ativa

Dados reais necessarios:
- probabilidade
- impacto
- classificacao de risco
- regra de mitigacao
- status do item APR

Possivel serventia:
- sair de um APR so tabelado para um APR com leitura executiva
- facilitar aprovacao e triagem

### 10. Active registry and approvals

Uso no Stitch:
- tabela principal de registros e aprovacoes

Dados reais necessarios:
- workflow de aprovacao
- responsavel
- status (`draft`, `pending_approval`, `active`, etc.)
- nivel de risco
- trilha de aprovacao

Possivel serventia:
- transformar APR em modulo de governanca, nao so conferencia

### 11. apr-core / shared rules

Uso no Stitch:
- bloco de regras compartilhadas e sincronizadas

Dados reais necessarios:
- origem comum de regras
- versao das regras
- itens herdados
- itens sobrescritos
- estado de sincronizacao

Possivel serventia:
- padronizacao entre unidades ou operacoes
- auditoria de regras reaproveitadas

## Itens transversais

### 12. Avatares e identidade de usuario

Uso no Stitch:
- avatares em varias areas

Dados reais necessarios:
- foto de perfil ou iniciais
- nome curto
- cargo
- equipe

Possivel serventia:
- reforco visual de atribuicao e presenca

### 13. Iconografia contextual mais rica

Uso no Stitch:
- cada card ou bloco tem um simbolo funcional

Dados reais necessarios:
- mapeamento de tipo de evento
- tipo de tarefa
- tipo de risco APR
- status operacional

Possivel serventia:
- leitura mais rapida sem depender tanto de texto

## Priorizacao recomendada

Implementar primeiro:

1. busca global do admin
2. busca de tarefas
3. rail de reminders real no dashboard do usuario
4. card de SLA performance real
5. matriz de risco APR com dados reais

Depois:

6. active administrators enriquecido
7. quick task com presets
8. cards de tarefas com metadados adicionais
9. registry and approvals do APR
10. apr-core compartilhado
