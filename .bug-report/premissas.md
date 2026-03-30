## Premissas

- Rodada atual: implementacao do modulo KML/KMZ para padronizacao de postes conforme `PATCH_PARA_CODEX_KML_MODULE.md`.
- O patch fornecido foi tratado como especificacao funcional, nao como diff literal, porque a versao atual do repositorio possui rotas e shell administrativo mais recentes do que a base do patch.
- A prioridade foi preservar comportamento existente fora do escopo da feature, especialmente `operations-board`, dashboards e navegacao admin.

## Limitacoes do ambiente

- O ambiente nao possui `rg`; a navegacao no repositorio foi feita com `find`, `grep` e `sed`.
- O sandbox bloqueia testes HTTP que tentam abrir porta efemera; por isso a cobertura funcional principal do algoritmo ficou no pacote compartilhado puro, sem sockets ou `listen`.
- Os comandos `npm` emitem warning de configuracao `globalignorefile`; o warning nao bloqueou `install`, `typecheck`, `test` nem `build`.

## Ferramentas disponiveis

- Disponiveis: `node`, `npm`, `git`, `find`, `grep`, `sed`, `eslint`.
- Indisponiveis: `rg`.

## Escopo inferido

- Backend Express com feature flag `ENABLE_KML_POSTE_MODULE`.
- Frontend React/Vite com feature flag `VITE_ENABLE_KML_POSTE_MODULE`.
- Novo pacote compartilhado `packages/poste-kml-core` para parsing e padronizacao de KML.
