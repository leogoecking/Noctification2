# Triage de Features do Frontend

Objetivo: separar o que ainda vale implementar no frontend do que hoje seria duplicado ou de baixo valor, considerando o estado atual do sistema e a adaptação visual ao Stitch.

## Vale Implementar Agora

| Item | Motivo | Onde encaixa | Arquivos base |
| --- | --- | --- | --- |
| Rail de reminders real | Ainda falta um bloco operacional de agenda, próximos horários, vencimentos e lembretes pendentes. Isso complementa notificações sem duplicar. | Dashboard do usuário, rail lateral | [UserDashboard.tsx](/home/leo/Noctification2/apps/web/src/components/UserDashboard.tsx), [ReminderUserPanel.tsx](/home/leo/Noctification2/apps/web/src/components/ReminderUserPanel.tsx), [apiReminders.ts](/home/leo/Noctification2/apps/web/src/lib/apiReminders.ts) |
| Quick actions do usuário | Atalhos para ações frequentes reduzem navegação e não competem com os módulos principais. | Dashboard do usuário | [UserDashboard.tsx](/home/leo/Noctification2/apps/web/src/components/UserDashboard.tsx), [appShell.tsx](/home/leo/Noctification2/apps/web/src/components/app/appShell.tsx) |
| System health real no admin | O Stitch sugere esse bloco e ele ainda pode virar leitura executiva útil com dados reais. | Overview admin | [AdminDashboard.tsx](/home/leo/Noctification2/apps/web/src/components/AdminDashboard.tsx), [AdminOverviewPanel.tsx](/home/leo/Noctification2/apps/web/src/components/admin/AdminOverviewPanel.tsx) |
| Matriz de risco APR real | Hoje a matriz é mais visual do que operacional. Há espaço real para virar feature útil. | APR | [AprPage.tsx](/home/leo/Noctification2/apps/web/src/features/apr/AprPage.tsx), [AprPageSections.tsx](/home/leo/Noctification2/apps/web/src/features/apr/AprPageSections.tsx) |
| Approvals/registry do APR | O Stitch sugere fluxo mais operacional nessa área e isso ainda não está totalmente materializado no produto real. | APR | [AprPage.tsx](/home/leo/Noctification2/apps/web/src/features/apr/AprPage.tsx), [useAprPageController.ts](/home/leo/Noctification2/apps/web/src/features/apr/useAprPageController.ts) |

## Evitar Agora

| Item | Por que evitar | O que já cobre isso | Arquivos envolvidos |
| --- | --- | --- | --- |
| Busca global do usuário | Alto risco de virar recurso pouco usado. O usuário já navega por notificações, tarefas e lembretes de forma separada. | Central de notificações, módulo de tarefas, módulo de lembretes | [UserDashboard.tsx](/home/leo/Noctification2/apps/web/src/components/UserDashboard.tsx), [TaskUserPanel.tsx](/home/leo/Noctification2/apps/web/src/features/tasks/components/TaskUserPanel.tsx), [ReminderUserPanel.tsx](/home/leo/Noctification2/apps/web/src/components/ReminderUserPanel.tsx) |
| Mais cards de métricas no dashboard do usuário | Tende a repetir total, pendente, em andamento e crítico, já visíveis hoje. | Cards atuais do dashboard | [UserDashboard.tsx](/home/leo/Noctification2/apps/web/src/components/UserDashboard.tsx) |
| Preview de tarefas no dashboard do usuário | Duplicaria o papel do kanban e dividiria foco operacional. | Kanban e filtros de tarefas | [TaskUserPanel.tsx](/home/leo/Noctification2/apps/web/src/features/tasks/components/TaskUserPanel.tsx), [TaskBoard.tsx](/home/leo/Noctification2/apps/web/src/components/tasks/TaskBoard.tsx) |
| Mais listas curtas no admin para usuários/notificações/auditoria | O admin já tem busca global e módulos dedicados. Repetir isso aumenta poluição. | Busca global do admin e menus | [AdminDashboard.tsx](/home/leo/Noctification2/apps/web/src/components/AdminDashboard.tsx), [AdminGlobalSearchPanel.tsx](/home/leo/Noctification2/apps/web/src/components/admin/AdminGlobalSearchPanel.tsx) |
| Segundo bloco de avisos além do mural | Já existe um ponto de contexto compartilhado para recados. Criar outro bloco teria papel redundante. | Mural operacional | [OperationsBoardRail.tsx](/home/leo/Noctification2/apps/web/src/components/OperationsBoardRail.tsx) |

## Revisar Depois

| Item | Motivo da revisão posterior | Dependência atual | Arquivos base |
| --- | --- | --- | --- |
| Quick task com presets | Pode ser muito útil, mas vale desenhar depois da consolidação dos quick actions gerais. | Melhor definição de presets e fluxo de criação | [TaskUserPanel.tsx](/home/leo/Noctification2/apps/web/src/features/tasks/components/TaskUserPanel.tsx), [AdminTasksPanel.tsx](/home/leo/Noctification2/apps/web/src/features/tasks/admin/AdminTasksPanel.tsx) |
| Cards de tarefas mais ricos | Pode agregar contexto, mas hoje o board já cobre o essencial. | Decidir quais metadados realmente ajudam operação | [TaskBoard.tsx](/home/leo/Noctification2/apps/web/src/components/tasks/TaskBoard.tsx), [taskUi.ts](/home/leo/Noctification2/apps/web/src/components/tasks/taskUi.ts) |
| apr-core compartilhado como produto | Tem potencial, mas exige decisão mais ampla de domínio e backend, não só frontend. | Definição funcional do módulo APR | [AprPage.tsx](/home/leo/Noctification2/apps/web/src/features/apr/AprPage.tsx), [stitch/data-needed-items.md](/home/leo/Noctification2/stitch/data-needed-items.md) |

## Ordem Recomendada

1. Rail de reminders real no dashboard do usuário.
2. Quick actions do usuário.
3. System health real no admin.
4. Matriz de risco APR real.
5. Approvals/registry do APR.

## Regra Prática

Antes de adicionar qualquer bloco novo ao frontend:

1. verificar se ele traz dado novo ou só repete um dado já visível;
2. verificar se ele é ponto de ação ou só resumo decorativo;
3. evitar competir com um módulo já existente (`tasks`, `notifications`, `reminders`, `apr`);
4. preferir blocos que reduzam navegação ou melhorem decisão operacional.
