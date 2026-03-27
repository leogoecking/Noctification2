## Sugestoes preventivas

- Manter qualquer modulo novo atras de flag operacional ate a validacao funcional completa.
- Adicionar teste de montagem condicional para toda rota nova protegida por env flag.
- Adicionar teste de roteamento manual para cada novo path especial no frontend.
- Considerar regra de CI que valide `build`, `test` e `typecheck` em pull requests.
- Quando `packages/apr-core` passar a ser consumido, adicionar `typecheck` proprio ao workspace.
