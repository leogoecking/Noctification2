# Conflitos, riscos e pontos de compatibilidade

## Dependencias

### Material Symbols

O export do Stitch usa `Material Symbols Outlined` via CDN.

Conflito:
- o app atual usa SVGs locais e nao depende dessa fonte

Recomendacao:
- nao instalar dependencia nova agora
- substituir por icones locais ou por um pacote unico em fase posterior

### Imagens externas

O Stitch usa avatares e imagens remotas.

Conflito:
- dependencia externa desnecessaria
- risco de latencia e quebra visual

Recomendacao:
- trocar por iniciais, avatars internos ou dados reais do sistema

## Rotas

O app atual usa navegacao simples por `window.history` no frontend.

Conflito:
- os HTMLs do Stitch presumem telas independentes com shell proprio

Risco:
- duplicar sidebars e topbars se o HTML for injetado literalmente

Recomendacao:
- integrar por secao e por componente, nao por pagina HTML inteira

## Estilos

### Tokens diferentes

O Stitch usa:
- `Inter`
- superficies claras
- hierarquia tonal
- regra de quase nenhuma borda

O app atual ja possui tema e utilitarios proprios.

Conflito:
- classes atuais podem bater com a nova linguagem se a migracao for direta demais

Recomendacao:
- criar tokens visuais dedicados antes de trocar telas inteiras
- preservar nomes acessiveis antigos em botoes e navegacao para nao quebrar testes e automacao ja existentes

### Layout fixo

Os HTMLs assumem:
- sidebar fixa de `w-64`
- topbar fixa
- grandes areas horizontais

Conflito:
- telas reais tem modais, filtros e componentes de dados que podem quebrar em alturas e larguras fixas

## Estrutura dos componentes

### Dashboard

O Stitch mistura:
- notificacoes
- lembretes
- saude operacional
- throughput

No app atual essas responsabilidades estao divididas.

Recomendacao:
- manter a divisao atual e migrar a composicao visual

### Tarefas

O kanban do Stitch e demonstrativo.

Conflito:
- nao contempla toda a logica real atual: SLA, filtros persistidos, drag and drop, bulk, modais, comentarios

Recomendacao:
- usar apenas a linguagem visual do board
- manter o `TaskBoard` como base funcional

### APR

O Stitch traz blocos de matriz de risco e cards decorativos.

Conflito:
- o modulo APR atual e guiado por dados reais e tabelas auditaveis

Recomendacao:
- incorporar o shell e a hierarquia visual, nao os dados mockados

## Risco de migracao

Maior risco:
- tentar copiar os HTMLs literalmente dentro do app atual

Menor risco:
- extrair shell, cards, tabelas e secoes visuais como componentes reutilizaveis

## Ajustes aplicados na integracao inicial

- shell do usuario migrado para uma composicao mais proxima do Stitch, mas com a mesma navegacao existente
- sidebar admin reestilizada sem mudar o modelo de menus
- nomes acessiveis dos menus preservados via `aria-label` para manter compatibilidade com testes
- container principal ampliado para suportar melhor sidebar + conteudo sem quebrar paineis atuais
