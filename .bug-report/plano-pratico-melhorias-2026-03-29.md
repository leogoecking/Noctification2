# Plano Pratico de Melhorias

Data: 2026-03-29

## Objetivo

Transformar os achados de produtividade e organizacao em um backlog executavel, com fases curtas, baixo risco e retorno cumulativo.

## Criterios de priorizacao usados

- Impacto direto no fluxo diario do time
- Baixo risco de regressao
- Facilidade de validacao
- Capacidade de destravar fases seguintes

## Fase 1 - Ganhos rapidos e baixo risco

Prazo sugerido: 0.5 a 1 dia

Objetivo: remover ruido operacional e melhorar o tempo de feedback sem tocar em contratos de negocio.

### Itens

1. Ignorar artefatos `*.tsbuildinfo`
   Arquivos principais: [`.gitignore`](/home/leo/Noctification2/.gitignore)
   Impacto: reduz worktree sujo e commits acidentais.
   Esforco: baixo.
   Risco: baixo.
   Validacao:
   - `git status --short` nao deve mais listar `*.tsbuildinfo` novos.

2. Limpar o warning recorrente de `globalignorefile`
   Arquivos provaveis: configs de ambiente do npm e documentacao operacional.
   Impacto: melhora leitura de `lint` e `typecheck` local/CI.
   Esforco: baixo.
   Risco: baixo.
   Validacao:
   - `npm run lint`
   - `npm run typecheck`
   - ambos sem o warning na saida.

3. Otimizar reinstalacao repetida no CI
   Arquivos principais: [`.github/workflows/main.yml`](/home/leo/Noctification2/.github/workflows/main.yml)
   Impacto: reduz tempo e custo de PR.
   Esforco: baixo a medio.
   Risco: baixo.
   Validacao:
   - workflow executando com o mesmo conjunto de checks.
   - comparacao de tempo antes/depois por job.

### Definicao de pronto

- Ruido de artefatos removido.
- Saida local de qualidade mais limpa.
- CI mantendo cobertura atual com menos desperdicio.

## Fase 2 - Estrutura e produtividade de desenvolvimento

Prazo sugerido: 2 a 4 dias

Objetivo: reduzir atrito de manutencao e melhorar a navegabilidade do monorepo.

### Itens

1. Adotar orquestracao com cache por workspace
   Arquivos principais: [`package.json`](/home/leo/Noctification2/package.json), possivelmente `turbo.json` ou equivalente.
   Impacto: acelera `build`, `test`, `lint` e `typecheck`.
   Esforco: medio.
   Risco: medio.
   Validacao:
   - comandos da raiz continuam equivalentes funcionalmente.
   - medicao simples de tempo antes/depois em pelo menos `lint` e `typecheck`.

2. Reorganizar diretorios por dominio
   Alvos sugeridos:
   - `apps/api/src/routes`
   - `apps/api/src/tasks`
   - `apps/web/src/components`
   - `apps/web/src/lib`
   Impacto: reduz custo de onboarding e descoberta.
   Esforco: medio.
   Risco: medio.
   Estrategia segura:
   - mover por fatias pequenas, sem misturar com alteracao comportamental.
   - atualizar imports e validar por workspace.
   Validacao:
   - `npm run lint`
   - `npm run typecheck`
   - testes do workspace tocado.

3. Fatiar testes monoliticos
   Alvos iniciais:
   - [`apps/web/src/components/admin/AdminTasksPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/components/admin/AdminTasksPanel.test.tsx)
   - [`apps/web/src/components/AdminDashboard.test.tsx`](/home/leo/Noctification2/apps/web/src/components/AdminDashboard.test.tsx)
   - [`apps/web/src/components/TaskUserPanel.test.tsx`](/home/leo/Noctification2/apps/web/src/components/TaskUserPanel.test.tsx)
   - [`apps/api/src/test/reminder-routes.test.ts`](/home/leo/Noctification2/apps/api/src/test/reminder-routes.test.ts)
   Impacto: falhas ficam mais localizadas e o teste fica mais legivel.
   Esforco: medio.
   Risco: baixo.
   Validacao:
   - testes refatorados com mesmo comportamento.
   - tempo de diagnostico de falha reduzido por cenario isolado.

### Definicao de pronto

- Estrutura de pastas mais coerente por feature.
- Scripts raiz mais rapidos ou com cache perceptivel.
- Testes grandes quebrados em cenarios menores.

## Fase 3 - Blindagem arquitetural e simplificacao do frontend

Prazo sugerido: 3 a 5 dias

Objetivo: conter crescimento organico desordenado e reduzir acoplamento no frontend.

### Itens

1. Extrair sessao, navegacao e gating de [`apps/web/src/App.tsx`](/home/leo/Noctification2/apps/web/src/App.tsx)
   Caminho sugerido:
   - criar modulo de roteamento/app state
   - mover auth/session para hook ou controller dedicado
   - isolar toasts em provider ou servico interno
   Impacto: melhora testabilidade e clareza do shell principal.
   Esforco: medio a alto.
   Risco: medio.
   Validacao:
   - `npm run test:web`
   - `npm run typecheck`
   - smoke manual de login, logout e troca de tela.

2. Endurecer lint e regras arquiteturais
   Arquivo principal: [`.eslintrc.cjs`](/home/leo/Noctification2/.eslintrc.cjs)
   Regras candidatas:
   - detectar imports ciclicos ou cruzamentos indevidos entre camadas
   - reforcar tratamento de promises
   - restringir imports de baixo nivel fora do modulo dono
   Impacto: prevencao de regressao organizacional.
   Esforco: medio.
   Risco: medio se ativado de uma vez.
   Estrategia segura:
   - ativar por grupos pequenos
   - usar modo warning antes de error quando necessario
   Validacao:
   - `npm run lint`
   - correcoes incrementais por area.

### Definicao de pronto

- `App.tsx` deixa de ser ponto de concentracao excessiva.
- Guardrails automatizados passam a impedir regressao estrutural.

## Ordem recomendada

1. Fase 1 inteira.
2. Fase 2 item 1.
3. Fase 2 item 3.
4. Fase 2 item 2.
5. Fase 3 item 1.
6. Fase 3 item 2.

## Sequencia sugerida de PRs

1. PR 1: `.gitignore` + limpeza do warning `npm` + ajuste de CI.
2. PR 2: orquestracao/cache dos workspaces.
3. PR 3: refactor apenas de testes grandes.
4. PR 4: reorganizacao de diretorios por dominio, por fatias.
5. PR 5: simplificacao de `App.tsx`.
6. PR 6: endurecimento gradual de lint.

## O que nao misturar

- Nao misturar reorganizacao de pastas com mudanca de comportamento.
- Nao misturar endurecimento de lint com refactor grande de frontend.
- Nao trocar ferramenta de build/teste ao mesmo tempo em que reorganiza modulo.

## Resultado esperado

- Menos ruido no repositorio.
- Feedback mais rapido em PR e desenvolvimento local.
- Codigo mais facil de navegar.
- Menor custo para evoluir `tasks`, `reminders`, `APR` e dashboards sem espalhar acoplamento.
