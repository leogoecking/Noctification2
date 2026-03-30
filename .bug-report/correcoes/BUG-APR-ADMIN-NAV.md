# BUG-APR-ADMIN-NAV

- Problema: admin ficava preso na tela de APR ao clicar em outras abas da sidebar, o header mostrava titulo incorreto em /apr e o mural tinha updates assincronos sem guarda de montagem.
- Causa raiz: navegacao da sidebar mudava apenas o menu local fora do dashboard; getPageTitle priorizava role admin antes da rota /apr; OperationsBoardRail atualizava estado apos awaits sem verificar montagem.
- Arquivos alterados:
  - apps/web/src/components/AdminDashboard.tsx
  - apps/web/src/components/app/appShell.tsx
  - apps/web/src/components/OperationsBoardRail.tsx
  - apps/web/src/components/AdminDashboard.test.tsx
  - apps/web/src/App.test.tsx
- Estrategia: redirecionar qualquer selecao da sidebar admin para / quando a tela atual for /apr, priorizar o titulo APR no header e proteger updates assincronos com mountedRef.
- Riscos considerados: navegacao lateral do admin e comportamento do modal do mural. Mudanca local e reversivel.
- Validacao executada:
  - npm run test --workspace @noctification/web -- src/components/AdminDashboard.test.tsx src/App.test.tsx
  - npm run typecheck --workspace @noctification/web
  - npm run lint --workspace @noctification/web
