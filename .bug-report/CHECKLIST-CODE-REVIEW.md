# Checklist de code review

- O componente ou rota está acumulando mais de uma responsabilidade de alto nível?
- Existe mistura entre camada HTTP/UI e regras de domínio?
- O fluxo assíncrono depende de `useEffect` ou callbacks com dependências largas demais?
- Houve separação entre carregamento de catálogos e carregamento do recurso principal?
- O arquivo adiciona mais estado local ao componente raiz em vez de extrair hook/model?
- O teste novo depende de contagem frágil de chamadas em vez de efeito observável?
- A feature adiciona mais acoplamento ao `App.tsx`, `AdminDashboard.tsx` ou `AdminTasksPanel.tsx`?
- Há SQL, parsing e auditoria convivendo na mesma rota?
- Existe cálculo de domínio misturado com query/persistência?
- O teste está crescendo sem uso de fixtures/helpers compartilhados?
