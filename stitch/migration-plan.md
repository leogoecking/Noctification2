# Plano de migracao incremental e seguro

## Fase 1 - Isolamento da referencia

Objetivo:
- manter o Stitch fora do app principal
- adaptar o export para componentes React de referencia

Entregas:
- `stitch/react/`
- mapeamento de componentes
- analise de conflitos

Status:
- concluido nesta etapa

## Fase 2 - Tokens e shell compartilhado

Objetivo:
- mover apenas a linguagem visual do Stitch para o frontend principal

Entradas:
- tipografia
- cores
- espacamento
- cards tonais
- sidebar e topbar

Arquivos candidatos:
- `apps/web/tailwind.config.ts`
- `apps/web/src/styles/index.css`
- `apps/web/src/components/app/appShell.tsx`
- `apps/web/src/components/admin/AdminSidebar.tsx`

Risco:
- medio

Validacao:
- `typecheck`
- testes de `App`, `AdminDashboard` e `UserDashboard`

Status:
- concluido nesta etapa

Absorvido nesta fase:
- tokens visuais base
- tipografia `Inter`
- fundo e superficies claras
- topbar principal do app
- sidebar do usuario
- sidebar do admin
- largura principal mais proxima do Stitch

Pendente nesta fase:
- ajustes pontuais de acabamento em componentes secundarios

## Fase 3 - Dashboard principal

Objetivo:
- aproximar o dashboard do Stitch sem mexer na logica de notificacoes

Arquivos candidatos:
- `apps/web/src/components/UserDashboard.tsx`

Regras:
- preservar widgets reais
- nao reescrever a logica de notificacoes

Status:
- concluido nesta etapa

Absorvido nesta fase:
- topbar contextual inspirada no Stitch
- hero e cabecalho inspirados no Stitch
- cards de resumo para notificacoes
- composicao estrutural em `8/4` com rail lateral
- acoes rapidas mantendo os mesmos handlers

Preservado:
- `UserNotificationBell`
- `UserNotificationSummary`
- `UserNotificationCenter`
- modal critico e fluxo de resposta

## Fase 4 - Painel admin

Objetivo:
- reorganizar a composicao visual do admin com o shell novo

Arquivos candidatos:
- `apps/web/src/components/AdminDashboard.tsx`
- `apps/web/src/components/admin/AdminOverviewPanel.tsx`

Regra:
- manter menus e paineis existentes

Status:
- concluido nesta etapa

Absorvido nesta fase:
- topbar contextual aproximada do export admin
- cards de metricas em formato mais proximo do Stitch
- corpo estrutural em `fila principal + trilho lateral`
- secoes de usuarios online, auditoria, fila e concluidas reorganizadas

Preservado:
- `AdminSidebar`
- `AdminOverviewPanel`
- `AdminOverviewQueue`
- `AdminOverviewAudit`
- filtros, paginacao, socket e fluxos reais

## Fase 5 - Kanban de tarefas

Objetivo:
- aplicar a linguagem do Stitch ao board sem perder funcionalidade

Arquivos candidatos:
- `apps/web/src/components/tasks/TaskBoard.tsx`
- `apps/web/src/features/tasks/components/TaskUserPanel.tsx`
- `apps/web/src/features/tasks/admin/AdminTasksPanel.tsx`

Regra:
- manter drag and drop
- manter SLA
- manter filtros e modais

Status:
- concluido nesta etapa

Absorvido nesta fase:
- topbar e cabecalho estrutural dos paineis de tarefas
- filter bar separada do board
- visual do `TaskBoard` aproximado do Stitch
- headers e cards-resumo dos paineis de tarefas
- `Quick Task` contextual
- modais de criacao/edicao alinhados ao shell visual novo

Preservado:
- drag and drop
- SLA
- filtros persistidos
- bulk actions
- modais e detalhe da tarefa

## Fase 6 - APR

Objetivo:
- aproximar o modulo APR do Stitch sem perder tabelas, importacao e auditoria

Arquivos candidatos:
- `apps/web/src/features/apr/AprPage.tsx`
- `apps/web/src/features/apr/AprPageSections.tsx`

Regra:
- dados reais primeiro
- decoracao depois

Status:
- concluido nesta etapa

Absorvido nesta fase:
- topbar do modulo aproximada do export
- hero principal do APR aproximado do Stitch
- bloco visual estrutural inspirado na matriz de risco
- cards de resumo mensal
- superfícies e containers das seções em linguagem visual consistente
- grid principal mais próximo do módulo exportado

Preservado:
- tabelas
- importação
- auditoria
- histórico
- controller e fluxos reais

## Ordem recomendada

1. tokens e shell
2. dashboard principal
3. admin
4. tarefas
5. APR

## Regra de seguranca

Cada fase deve:

- mudar so uma superficie principal
- preservar os testes existentes
- evitar trocar layout e regra de negocio no mesmo passo
- registrar o que foi absorvido do Stitch e o que ficou pendente
