# Checklist Code Review

- Conferir se novas flags de feature possuem fallback seguro no backend e frontend.
- Verificar se patches externos nao removem rotas ou integracoes atuais do monorepo.
- Confirmar que novos exports em utilitarios compartilhados foram refletidos nos mocks de teste.
- Validar se dependencias novas foram adicionadas ao workspace correto e ao lockfile.
- Para algoritmos de transformacao de arquivo, revisar nomes gerados com entradas borderline.
- Sempre confirmar build, typecheck e testes nos workspaces afetados.
