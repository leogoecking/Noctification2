# Mapeamento entre Stitch e o frontend atual

## Dashboard principal

Stitch:
- `stitch/dashboard_principal/code.html`

Frontend atual:
- `apps/web/src/components/UserDashboard.tsx`
- `apps/web/src/components/app/appShell.tsx`

Reaproveitamento recomendado:
- central de notificacoes
- widget de lembretes
- shell de navegacao

## Kanban de tarefas

Stitch:
- `stitch/kanban_de_tarefas/code.html`

Frontend atual:
- `apps/web/src/features/tasks/components/TaskUserPanel.tsx`
- `apps/web/src/features/tasks/admin/AdminTasksPanel.tsx`
- `apps/web/src/components/tasks/TaskBoard.tsx`
- `apps/web/src/components/tasks/TaskDetailSheet.tsx`

Reaproveitamento recomendado:
- `TaskBoard`
- filtros atuais
- modais de criacao, edicao e detalhe
- logica de SLA, filas e drag and drop

## Painel administrativo

Stitch:
- `stitch/painel_administrativo/code.html`

Frontend atual:
- `apps/web/src/components/AdminDashboard.tsx`
- `apps/web/src/components/admin/AdminSidebar.tsx`
- `apps/web/src/components/admin/AdminOverviewPanel.tsx`
- `apps/web/src/components/admin/AdminUsersPanel.tsx`
- `apps/web/src/features/tasks/admin/AdminTasksPanel.tsx`

Reaproveitamento recomendado:
- estrutura por menus atual
- paineis administrativos existentes
- sidebar administrativa

## Modulo APR

Stitch:
- `stitch/m_dulo_apr/code.html`

Frontend atual:
- `apps/web/src/features/apr/AprPage.tsx`
- `apps/web/src/features/apr/AprPageSections.tsx`
- `apps/web/src/features/apr/useAprPageController.ts`

Reaproveitamento recomendado:
- controller atual
- secoes de tabela manual, auditoria e historico
- fluxo de importacao

## Shell compartilhado

Stitch pede:
- sidebar fixa
- topbar editorial
- cards tonais
- menos bordas

Frontend atual ja possui base para isso em:
- `apps/web/src/components/app/appShell.tsx`
- `apps/web/src/components/admin/AdminSidebar.tsx`
- `apps/web/src/styles/index.css`
- `apps/web/tailwind.config.ts`
