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
