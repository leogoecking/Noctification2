# Premissas da analise

- Data da rodada: 2026-04-01.
- Objetivo desta rodada: buscar bugs reais com evidência objetiva após a sequência principal de refatorações e modularizações.
- Escopo efetivo: `apps/api`, `apps/web`, `packages/apr-core`, `packages/poste-kml-core`, `scripts`, `ops` e `.github/workflows/main.yml`.
- Estado prévio observado: a pasta `.bug-report/` já existia com artefatos anteriores. Nesta rodada, os relatórios obrigatórios foram reescritos para refletir apenas o diagnóstico atual.
- Estado do worktree antes desta rodada de busca por bugs: havia alterações locais já rastreadas em `.bug-report/`, `apps/api` e `apps/web`; nenhuma foi revertida.

# Limitacoes do ambiente

- `rg` não está instalado; a inspeção foi feita com `find`, `grep`, `sed`, `wc`, `git` e `npm`.
- `pnpm`, `pytest`, `docker` e `tsc` global não estão disponíveis no PATH. O projeto depende de `npm` e de binários locais em `node_modules`.
- `tsx` local existe, mas falhou no sandbox ao abrir pipe IPC em `/tmp`; a reprodução foi feita com `node` e leitura direta do código.
- A análise foi local e estática/dinâmica via testes e verificações já existentes; não houve validação com ambiente externo, browser real ou infraestrutura de deploy.

# Ferramentas disponiveis

- Disponíveis: `git`, `node`, `npm`, `npx`, `python3`, `eslint`.
- Indisponíveis no PATH: `rg`, `pnpm`, `pytest`, `docker`, `tsc`.
- Disponível com limitação de sandbox: `./node_modules/.bin/tsx`.

# Escopo inferido

- Monorepo npm workspaces com duas aplicações (`api`, `web`) e dois pacotes core (`apr-core`, `poste-kml-core`).
- Back-end em Node.js + Express + Better SQLite3 + Socket.IO.
- Front-end em React + Vite + TypeScript + Vitest.
- CI focado em segurança básica, lint, typecheck, testes e audit de dependências.

# Criterios desta priorizacao

- Prioridade de refatoração considera, nesta ordem:
  1. Risco estrutural real.
  2. Acoplamento e mistura de responsabilidades.
  3. Pressão observável de testes/qualidade.
  4. Tamanho e dificuldade de manutenção.
  5. Facilidade de refatoração incremental e segura.

# Duvidas e hipoteses registradas

- A suíte completa e o typecheck seguem verdes; portanto a rodada atual depende mais de inspeção dirigida e inconsistência lógica claramente demonstrável.
- Há evidência objetiva de bug funcional na validação de `timeOfDay` de lembretes: horários inválidos como `99:99` passam pela validação e podem ser convertidos em outra data/hora pelo scheduler.
- As falhas atuais de `lint` encontradas nesta rodada foram tratadas como qualidade, não como bug reproduzível, por falta de impacto funcional direto.
