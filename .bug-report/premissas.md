## Premissas assumidas

- O repositório é um monorepo `npm` com workspaces ativos em `apps/api` e `apps/web`.
- O objetivo desta intervenção é apenas preparar a estrutura inicial do módulo APR, sem ativar fluxos funcionais novos por padrão.
- A feature flag `ENABLE_APR_MODULE` deve nascer desligada para preservar o comportamento atual.
- No frontend, a rota `/apr` deve existir no código, mas sem interferir na navegação atual quando a flag estiver desligada.

## Limitações do ambiente

- A ferramenta `rg` não está instalada; a inspeção foi feita com `find`, `grep`, `sed` e leitura direta de arquivos.
- `pnpm` não está instalado; a execução seguirá com `npm`, que já está configurado no monorepo.
- A validação será restrita a `build`, `test` e `typecheck` disponíveis localmente.

## Ferramentas ausentes

- `rg`
- `pnpm`

## Dúvidas relevantes

- Nenhuma dependência entre `packages/apr-core` e os apps foi solicitada nesta fase; o pacote será criado como esqueleto reaproveitável.
- A ativação operacional da flag em frontend e backend dependerá de configuração de ambiente em fases posteriores.

## Escopo inferido

- Criar estrutura mínima de backend, frontend e pacote compartilhado para APR.
- Adicionar rota de health isolada no backend.
- Adicionar placeholder visual simples no frontend.
- Registrar a integração inicial em documentação técnica.

## Complemento desta frente

- Nesta iteração, o placeholder do frontend APR foi substituído por uma feature isolada em `apps/web/src/features/apr`.
- A navegação existente deve continuar intacta; o único ponto de integração fora da feature é o `appShell`.
- O menu APR só pode aparecer quando `VITE_ENABLE_APR_MODULE=true`.
