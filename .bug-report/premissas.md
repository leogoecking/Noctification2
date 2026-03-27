# Premissas

- Escopo inferido: ajuste pontual no frontend APR para paginar a "Tabela manual" com 5 itens por pagina.
- Tipo de intervencao: correcao incremental de baixo risco, sem alterar API, schema, contrato externo ou dependencias.
- Ambiente observado: monorepo Node.js com workspaces npm; frontend em React + Vite + TypeScript; backend em Express + TypeScript.
- Ferramentas verificadas como disponiveis: `bash`, `find`, `grep`, `sed`, `git`, `npm`, `tsc`, `vitest`.
- Ferramenta indisponivel relevante: `rg` nao instalado; buscas foram feitas com `find` e `grep`.
- Limitacoes: nao houve reproducao manual em navegador; a validacao foi feita por teste automatizado focalizado e `typecheck` do workspace afetado.
- Estado inicial observado: worktree ja continha alteracoes nao relacionadas em arquivos de deploy e API; essas alteracoes nao foram revertidas.
- Duvida resolvida por evidencia local: a "opcao de tabela manual" corresponde ao bloco "Tabela manual" em `apps/web/src/features/apr/AprPage.tsx`.
