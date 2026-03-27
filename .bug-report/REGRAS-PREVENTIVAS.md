# Regras Preventivas

## Sugestoes

- Criar convencao de UX para tabelas locais com limite padrao quando a lista puder crescer.
- Priorizar componentes menores para grids complexos, reduzindo acoplamento de estado.
- Adicionar testes de interface para listas paginadas e mudancas de pagina.
- Incluir em revisao tecnica a pergunta: "esta lista deveria renderizar tudo ou ser paginada?"

## CI recomendado

- Manter `typecheck` e testes focalizados do workspace web no pipeline.
- Considerar uma etapa de smoke visual/E2E para fluxos APR principais quando a area crescer.
