# Fase 3 - Achados brutos

## Evidencias coletadas

### ACH-001

- Tipo preliminar: `bug_reproduzivel`
- Origem: `npm run test --workspace @noctification/web`
- Evidencia:
  - Falha em `src/App.test.tsx > App routing > redireciona admin de /apr para dashboard quando o modulo nao esta ativo`
  - O DOM renderizado permaneceu na tela APR em vez de redirecionar para o dashboard
  - No ambiente local, `apps/web/.env` define `VITE_ENABLE_APR_MODULE=true`
- Interpretacao:
  - O frontend lia a flag APR em escopo de modulo (`import.meta.env`) em [`App.tsx`](/home/leo/Noctification2/apps/web/src/App.tsx) e [`appShell.tsx`](/home/leo/Noctification2/apps/web/src/components/app/appShell.tsx)
  - O teste assumia APR desativado, mas dependia do `.env` local do desenvolvedor
  - Resultado: suite web nao deterministica e falha reproduzivel neste ambiente

### ACH-002

- Tipo preliminar: `problema_de_qualidade`
- Origem: `npm run lint --workspace @noctification/api`
- Evidencia:
  - ESLint falhou em [`apps/api/src/modules/apr/import.ts`](/home/leo/Noctification2/apps/api/src/modules/apr/import.ts) com `File is defined but never used`
- Interpretacao:
  - Nao houve evidencia de bug funcional, mas a quebra bloqueava a validacao de qualidade e a CI local

## Achados nao confirmados como bug de producao

- Os avisos `npm warn Unknown builtin config "globalignorefile"` apareceram nas execucoes de `npm`.
- Nao atribui esse ponto ao repositorio porque nao encontrei configuracao correspondente versionada aqui.
- Classificacao por enquanto: fora do escopo do codigo versionado, requer inspecao do ambiente do desenvolvedor/runner.
## Analise incremental 2026-03-28

### Evidencias coletadas

- `npm run lint`: sucesso.
- `npm run typecheck`: sucesso.
- `npm` emitiu aviso recorrente sobre `globalignorefile`, indicando ruido de ambiente ou configuracao local do runner.
- `git status --short`: `M apps/web/tsconfig.tsbuildinfo`.
- Scripts raiz executam `build` e `test` em serie via `npm workspaces` sem cache/orquestracao dedicada.
- CI repete `npm ci` em multiplos jobs independentes.
- O frontend implementa navegacao com `window.history` e regras de acesso dentro de [`apps/web/src/App.tsx`](/home/leo/Noctification2/apps/web/src/App.tsx).
- `.eslintrc.cjs` contem conjunto minimo de regras, sem guardrails para imports, promessas e limites arquiteturais.
- `.gitignore` nao contem `*.tsbuildinfo`.

### Achados classificados

1. `QLT-ORG-001` | `problema_de_qualidade`
   Sintoma: artefato gerado `apps/web/tsconfig.tsbuildinfo` aparece sujando o worktree.
   Evidencia: `git status --short`.

2. `MEL-PROD-001` | `melhoria`
   Sintoma: raiz usa scripts seriais em [`package.json`](/home/leo/Noctification2/package.json) para `build` e `test`.
   Evidencia: linhas 18-23 do manifest raiz.

3. `MEL-CI-001` | `melhoria`
   Sintoma: o workflow executa `npm ci` novamente em `install-and-quality`, `dependency-audit`, `test-api` e `test-web`.
   Evidencia: [`.github/workflows/main.yml`](/home/leo/Noctification2/.github/workflows/main.yml) linhas 88-89, 112-113, 133-134, 154-155.

4. `MEL-FE-001` | `melhoria`
   Sintoma: navegacao, sessao, toasts e gating por papel estao concentrados em um unico shell React.
   Evidencia: [`apps/web/src/App.tsx`](/home/leo/Noctification2/apps/web/src/App.tsx) linhas 26-247.

5. `MEL-ARC-001` | `melhoria`
   Sintoma: alta densidade de arquivos em pastas criticas e muitos helpers de mesmo nivel em `routes`, `tasks`, `components` e `lib`.
   Evidencia: inventario estrutural com 71 arquivos de primeiro nivel nessas pastas.

6. `MEL-QUAL-001` | `melhoria`
   Sintoma: arquivos de componente/helper/teste longos, varios acima de 300 linhas e testes acima de 700.
   Evidencia: medicao por `wc -l`, com destaques para `AdminTasksPanel.test.tsx` (839), `AdminDashboard.test.tsx` (831), `TaskUserPanel.test.tsx` (788), `reminder-routes.test.ts` (708).

7. `MEL-QUAL-002` | `melhoria`
   Sintoma: padrao de lint esta funcional, mas com cobertura arquitetural minima.
   Evidencia: [`.eslintrc.cjs`](/home/leo/Noctification2/.eslintrc.cjs) linhas 16-31.

8. `RISK-ENV-001` | `risco_potencial`
   Sintoma: warnings de `npm config globalignorefile` poluem a saida e podem mascarar sinais reais em CI/local.
   Evidencia: saida de `npm run lint` e `npm run typecheck`.
