# Premissas

- Escopo inferido: priorizar refatoracoes incrementais de baixo risco nas areas com maior concentracao de complexidade e melhor validacao local disponivel.
- Estado inicial do worktree: havia arquivos nao rastreados fora do escopo (`.codex`, `CLAUDE.md`, `REDESIGN_PLAN.md`); eles nao foram alterados.
- Limitacoes do ambiente confirmadas:
  - `rg` indisponivel
  - `pnpm` indisponivel
  - `docker` e `docker-compose` indisponiveis
  - `pytest` indisponivel
  - sem acesso de rede util para pesquisa externa
- Ferramentas confirmadas no ambiente:
  - `git`
  - `node`
  - `npm`
  - `npx`
  - `python3`
- Escopo tecnico inferido do repositorio:
  - monorepo npm workspaces
  - `apps/api` em Express + TypeScript + SQLite + Socket.IO
  - `apps/web` em React + Vite + TypeScript
  - bibliotecas compartilhadas em `packages/apr-core` e `packages/poste-kml-core`
- Criterio de decisao adotado:
  - preferir refatoracao estrutural com contrato externo preservado
  - evitar mudancas simultaneas em areas sem testes focados
  - validar no menor escopo possivel antes de ampliar
- Dvida relevante no inicio:
  - decidir entre atacar frontend legado de lembretes ou trilho operacional; a decisao final foi guiada por combinacao de tamanho, coesao e existencia de testes.

## Atualizacao 2026-04-04

- A pasta `.bug-report` ja existia no inicio desta rodada; os artefatos anteriores foram preservados e servem apenas como contexto historico.
- O estado inicial do worktree nesta rodada inclui muitas alteracoes locais rastreadas e nao rastreadas em `apps/api` e `apps/web`; elas nao serao revertidas nem reorganizadas por esta varredura.
- Escopo inferido para esta rodada: varredura por bugs e integracoes quebradas no estado atual do workspace, com foco em evidencias reproduziveis antes de qualquer correcao.
- Limitacoes do ambiente confirmadas nesta rodada:
  - `rg` indisponivel
  - `pnpm` indisponivel
  - `docker` e `docker-compose` indisponiveis
  - `pytest` indisponivel
  - sem acesso de rede util para auditorias externas ou instalacao de ferramentas
- Ferramentas confirmadas nesta rodada:
  - `git`
  - `node`
  - `npm`
  - `jq`
  - `sqlite3`
  - `python3`
- Duvidas relevantes nesta rodada:
  - parte das falhas pode refletir refatoracao em andamento e nao regressao historica do `main`
  - correcoes so devem ocorrer quando houver baixa chance de conflitar com os arquivos ja editados localmente
