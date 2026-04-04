# 02 - Plano de Analise

## Ordem de execucao

1. Reconhecer estrutura, stack e ferramentas disponiveis.
2. Levantar hotspots por tamanho de arquivo e concentracao de responsabilidade.
3. Validar linha de base com testes focados no alvo escolhido.
4. Refatorar somente o alvo priorizado.
5. Rodar typecheck e testes focados no workspace afetado.
6. Consolidar resultados e proximos passos.

## Ferramentas escolhidas

- `find`
  - motivo: mapear estrutura e arquivos sem depender de `rg`
  - escopo: raiz, `apps`, `packages`, `.github`
  - confiabilidade esperada: alta
  - achado esperado: topologia real do repositorio
- `sed`
  - motivo: inspecionar manifests, workflows e hotspots
  - escopo: `package.json`, arquivos grandes e testes relacionados
  - confiabilidade esperada: alta
  - achado esperado: responsabilidades, acoplamento e contratos
- `wc -l`
  - motivo: medir concentracao de complexidade por arquivo
  - escopo: `apps/api/src`, `apps/web/src`, `packages/*/src`
  - confiabilidade esperada: media
  - achado esperado: hotspots de manutenibilidade
- `npm run test --workspace ... -- <filtro>`
  - motivo: validar baseline e refatoracao no menor escopo possivel
  - escopo: `@noctification/web`
  - confiabilidade esperada: alta
  - achado esperado: regressao funcional no alvo
- `npm run typecheck --workspace ...`
  - motivo: detectar regressao estrutural apos a extracao
  - escopo: `@noctification/web`
  - confiabilidade esperada: alta
  - achado esperado: problemas de importacao/tipagem

## Modulos prioritarios

1. `apps/web/src/components/ReminderUserPanel.tsx`
2. `apps/web/src/components/OperationsBoardRail.tsx`
3. `apps/api/src/reminders/me-route-helpers.ts`

## Risco previsto

- Baixo para extracoes internas no frontend de lembretes, porque ha teste dedicado.
- Medio para `OperationsBoardRail`, por falta de teste focado visivel.
- Medio para backend de lembretes, por mistura de SQL e regras de atualizacao.

## Limitacoes

- Sem `rg`, a busca por padroes depende de `find`, `grep` e leitura manual.
- Sem browser ou deploy local nesta rodada, a validacao e estatica/testes automatizados.
- Sem expandir para a suite inteira, resultados valem para o escopo afetado e nao para todo o monorepo.

## Atualizacao 2026-04-04

## Ordem de execucao da rodada atual

1. Atualizar premissas e reconhecimento com o estado real do worktree.
2. Executar `npm run lint`.
3. Executar `npm run typecheck`.
4. Executar `npm run test:core`.
5. Executar testes por workspace com maior probabilidade de capturar regressao atual:
  - `npm run test:web`
  - `npm run test:api`
6. Para falhas reproduzidas, localizar causa raiz, classificar e decidir se a correcao e segura no worktree atual.

## Ferramentas escolhidas na rodada atual

- `find`
  - motivo: descoberta estrutural e inventario sem `rg`
  - escopo: raiz, `apps`, `packages`, `ops`, `.bug-report`
  - confiabilidade esperada: alta
  - achado esperado: topologia e entrypoints reais
- `sed`
  - motivo: leitura de manifests, workflows e arquivos envolvidos
  - escopo: `package.json`, configs, codigo e testes associados aos erros
  - confiabilidade esperada: alta
  - achado esperado: causa raiz e superficie afetada
- `npm run lint`
  - motivo: detectar imports quebrados, variaveis mortas e problemas estruturais evidentes
  - escopo: workspaces configurados
  - confiabilidade esperada: media
  - achado esperado: problema de qualidade e possivel integracao quebrada
- `npm run typecheck`
  - motivo: capturar quebras de contrato entre arquivos e refatoracoes incompletas
  - escopo: workspaces configurados
  - confiabilidade esperada: alta
  - achado esperado: integracao quebrada
- `npm run test:*`
  - motivo: confirmar comportamento quebrado em rotas, componentes e modulos compartilhados
  - escopo: pacotes core, web e api
  - confiabilidade esperada: alta
  - achado esperado: bug reproduzivel ou integracao quebrada

## Modulos prioritarios na rodada atual

1. `apps/api/src/modules/tasks/**`
2. `apps/api/src/routes/**`
3. `apps/web/src/components/admin/**`
4. `apps/web/src/components/app/**`
5. `apps/web/src/features/apr/**`

## Risco previsto na rodada atual

- Medio:
  - validacoes podem acusar falhas decorrentes da refatoracao local em andamento, exigindo triagem cuidadosa
- Baixo:
  - coleta de evidencias via lint, typecheck e testes
- Alto:
  - correcoes em arquivos muito alterados sem antes reproduzir e isolar a falha

## Limitacoes da rodada atual

- O worktree nao esta limpo; parte das falhas pode refletir alteracoes ainda nao concluídas.
- Dependencias e ferramentas externas nao podem ser instaladas.
- Auditoria de dependencias com rede externa nao sera tratada como fonte principal de verdade nesta rodada.
