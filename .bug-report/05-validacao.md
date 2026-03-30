# 05 - Validacao

## Comandos executados

- `npm install`
  - Resultado: sucesso, 4 pacotes adicionados, 0 vulnerabilidades reportadas pelo npm.

- `npm run typecheck`
  - Resultado: sucesso em `@noctification/api`, `@noctification/web`, `@noctification/apr-core` e `@noctification/poste-kml-core`.

- `npm run test`
  - Resultado: sucesso.
  - `@noctification/apr-core`: 9 testes aprovados.
  - `@noctification/poste-kml-core`: 2 testes aprovados.
  - `@noctification/api`: 66 testes aprovados, 14 pulados.
  - `@noctification/web`: 116 testes aprovados.

- `npm run build`
  - Resultado: sucesso.
  - API compilada com build previo de `apr-core` e `poste-kml-core`.
  - Web compilado com Vite.

## Validacoes funcionais cobertas

- Exposicao do modulo backend via teste unitario de `health`.
- Padronizacao do core com ordem documental preservada.
- Tratamento de nomes ignorados e itens excluidos por heuristica.
- Navegacao admin e mocks atualizados sem regressao na suite web.

## O que nao foi validado

- Smoke manual em navegador com upload real de arquivo `.kmz`.
- Execucao do endpoint multipart em ambiente real com sessao HTTP, devido restricao do sandbox para testes com `listen`.
