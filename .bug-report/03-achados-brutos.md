# 03 - Achados Brutos

## ACH-001

- Tipo: `bug_reproduzivel`
- Local: `apps/web/src/features/apr/AprPage.tsx`
- Evidencia:
  - A tabela manual renderizava `manualRows.map(...)` sem qualquer recorte por pagina.
  - Nao havia estado de pagina, limite por pagina ou controles de navegacao no bloco "Tabela manual".
  - Pedido do usuario especificou necessidade de "deixando apenas 5 por pagina", o que conflita com o comportamento observado.
- Impacto observado:
  - Toda a base manual do mes era exibida de uma vez.
  - Em meses com muitos registros, a visualizacao e a edicao local ficam menos controladas.
- Classificacao: bug confirmado por inspecao de codigo.

## ACH-002

- Tipo: `bug_reproduzivel`
- Local: `apps/web/src/features/apr/AprPage.tsx`
- Evidencia:
  - A listagem de divergencias em tela mostrava comparacao entre sistema/manual e campos alterados.
  - O PDF exportado de divergencias incluia colunas extras: assunto/colaborador de sistema e manual, alem de campos alterados.
  - A solicitacao atual exigiu restringir a saida a `ID`, `Status`, `Assunto` e `Nome do colaborador`.
- Impacto observado:
  - Excesso de informacao na listagem de divergencias.
  - Saida exportada menos objetiva do que o necessario para o fluxo pedido.
- Classificacao: bug confirmado por inspecao de codigo.

## ACH-003

- Tipo: `problema_de_qualidade`
- Local: ambiente de execucao
- Evidencia:
  - `rg` nao esta instalado.
- Impacto:
  - Apenas operacional para analise, sem impacto direto no produto.
