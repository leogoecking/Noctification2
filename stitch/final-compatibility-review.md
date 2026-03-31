# Varredura final de consistencia visual

## Escopo analisado

- shell principal
- dashboard do usuario
- dashboard admin
- tarefas
- APR
- componentes filhos relacionados

## Estado geral

A migracao visual principal do Stitch foi concluida com sucesso no app real:

- shell e tokens base aplicados
- dashboard do usuario reestruturado
- dashboard admin reestruturado
- kanban de tarefas reestruturado
- APR reestruturado

As superficies principais agora compartilham a mesma linguagem e uma composicao mais proxima do export:

- `Inter`
- paleta clara
- superficies tonais
- cards mais limpos
- hierarquia tipografica mais forte
- hero sections
- trilhos laterais
- topbars contextuais
- boards e dashboards com composicao editorial

## Desvios restantes

### 1. Shell e sidebars ainda nao sao clones literais do Stitch

Arquivos:

- [appShell.tsx](/home/leo/Noctification2/apps/web/src/components/app/appShell.tsx)
- [AdminSidebar.tsx](/home/leo/Noctification2/apps/web/src/components/admin/AdminSidebar.tsx)

Diferencas deliberadas:

- nomes acessiveis preservados para nao quebrar testes
- icones do Stitch nao foram copiados literalmente
- navegacao continua baseada em `window.history`
- versao responsiva segue as regras do app real

Impacto:

- nenhum problema funcional
- diferenca visual controlada e aceitavel

Prioridade:

- baixa

### 2. Alguns componentes de conteudo ainda priorizam os widgets reais sobre a copia literal do HTML

Arquivos:

- [UserNotificationViews.tsx](/home/leo/Noctification2/apps/web/src/components/user-notifications/UserNotificationViews.tsx)
- [adminOverviewSections.tsx](/home/leo/Noctification2/apps/web/src/components/admin/adminOverviewSections.tsx)
- [AprPageSections.tsx](/home/leo/Noctification2/apps/web/src/features/apr/AprPageSections.tsx)

Motivo:

- esses componentes carregam dados reais, filtros, paginação e handlers existentes
- por isso a composicao agora segue o Stitch, mas a renderizacao interna nao replica o HTML literalmente linha a linha

Impacto:

- baixo
- o app ja conversa com o Stitch estruturalmente, mas ainda preserva widgets do sistema principal

Prioridade:

- baixa a media

## O que nao foi absorvido de proposito

- `Material Symbols` por CDN
- avatares e imagens externas do Stitch
- HTMLs de pagina inteira injetados diretamente
- dados mockados do Stitch
- layout fixo copiado literalmente

Motivo:

- manter compatibilidade
- evitar dependencia nova
- nao quebrar testes e fluxos reais

## Itens que dependem de dados reais

A lista separada dos elementos do Stitch que pedem alimentacao real do sistema ficou em:

- [data-needed-items.md](/home/leo/Noctification2/stitch/data-needed-items.md)

Esse arquivo cobre:

- busca global do admin
- busca de tarefas
- rail de reminders
- metricas historicas de SLA
- matriz de risco APR
- approvals e `apr-core`

## Recomendacao de fechamento final

### Etapa 1

Se a meta for copia ainda mais literal, o proximo passo e trocar os widgets internos restantes por primitivas visuais dedicadas:

- feed do dashboard do usuario
- cards de auditoria/admin
- blocos auxiliares do APR

### Etapa 2

So depois disso vale buscar fidelidade iconografica e microdetalhes:

- iconografia mais proxima do export original
- gradientes e rails mais cenograficos
- ajustes finos de espacamento e densidade

## Risco residual

Baixo.

O frontend principal ja esta integrado ao Stitch de forma segura. Nesta ultima rodada a estrutura principal das quatro superfícies foi remodelada para refletir o export. O que resta agora e fidelidade microvisual e substituicao opcional de widgets internos por versoes mais cenograficas.
