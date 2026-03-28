# Checklist de code review derivado dos achados

- Verificar se testes frontend que dependem de feature flags isolam explicitamente variaveis de ambiente.
- Conferir se leituras de `import.meta.env` nao estao congelando comportamento em escopo de modulo sem necessidade.
- Confirmar que novas suites de teste nao dependem de `.env` local do desenvolvedor.
- Rodar `lint`, `typecheck` e testes do workspace afetado antes de validar a raiz.
- Revisar imports residuais e simbolos nao utilizados antes de merge.
