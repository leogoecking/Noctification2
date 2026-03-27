# VULN-001

## Resumo do problema

O `package-lock.json` resolvia dependencias transitivas com advisories `high` confirmados por `npm audit`: `flatted@3.4.0`, `picomatch@2.3.1/4.0.3` e `socket.io-parser@4.2.5`.

## Causa raiz

O lockfile estava desatualizado em relacao aos patches de seguranca ja publicados no registro npm para dependencias transitivas usadas por `eslint`, `tailwindcss`, `vite`, `vitest`, `socket.io` e `socket.io-client`.

## Arquivos alterados

- `package-lock.json`

## Estrategia da correcao

- Executar `npm audit fix` para atualizar apenas as resolucoes transitivas do lockfile.
- Evitar `npm audit fix --force`, porque ele exigiria upgrade major para `eslint@10.1.0`.

## Riscos considerados

- Baixo risco funcional: nenhuma API publica ou dependencia principal foi alterada manualmente.
- Risco residual conhecido: permaneceram 9 achados `moderate` na cadeia do `eslint`, dependentes de upgrade major futuro.

## Validacao executada

- `npm ls flatted picomatch socket.io-parser --all`
- `npm audit --audit-level=high`
- `npm run test:api`
- `npm run test:web`
- `npm run build`
