# Stitch Integration Workspace

Esta pasta concentra o export do Google Stitch e a adaptacao inicial para React, sem acoplar direto no sistema principal.

## Conteudo

- `dashboard_principal/`: HTML exportado do dashboard principal
- `kanban_de_tarefas/`: HTML exportado do kanban
- `m_dulo_apr/`: HTML exportado do modulo APR
- `painel_administrativo/`: HTML exportado do painel admin
- `midnight_logic/DESIGN.md`: guia visual do Stitch
- `react/`: adaptacao inicial em componentes React reutilizaveis

## Objetivo desta pasta

- preservar a referencia original
- criar uma base de migracao segura
- isolar o impacto visual antes de tocar no app principal
- mapear o que pode ser reaproveitado do sistema atual

## O que foi criado em `react/`

- `stitch-tokens.ts`
- `StitchShell.tsx`
- `StitchPrimitives.tsx`
- `StitchDashboardMain.tsx`
- `StitchTaskKanban.tsx`
- `StitchAdminDashboard.tsx`
- `StitchAprModule.tsx`

Esses arquivos sao referencias React do layout exportado. Eles nao estao plugados nas rotas do sistema principal ainda.

## Documentacao complementar

- [`component-mapping.md`](./component-mapping.md)
- [`conflicts-and-risks.md`](./conflicts-and-risks.md)
- [`migration-plan.md`](./migration-plan.md)

## Integracao no app principal

Fase 2 foi iniciada no frontend principal com mudancas controladas de shell e tokens:

- `apps/web/tailwind.config.ts`
- `apps/web/src/styles/index.css`
- `apps/web/src/components/app/appShell.tsx`
- `apps/web/src/components/admin/AdminSidebar.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/components/AdminDashboard.tsx`

Escopo desta fase:

- adotar tipografia e paleta base do Stitch
- aproximar topbar e sidebar do visual exportado
- manter rotas, dados e logica existentes
- evitar migracao literal dos HTMLs

Fora do escopo desta fase:

- reescrever telas de dashboard, tarefas, admin ou APR
- trocar componentes funcionais por mocks visuais
- adicionar dependencias novas de icones, imagens ou roteamento

## Progresso atual da migracao

- Fase 1: concluida
- Fase 2: concluida
- Fase 3: concluida no `UserDashboard`
- Fase 4: concluida no dashboard admin
- Fase 5: concluida no kanban de tarefas
- Fase 6: concluida no modulo APR

O dashboard principal do usuario ja foi aproximado do Stitch no app real, mas os widgets de notificacao continuam sendo os componentes funcionais existentes.
