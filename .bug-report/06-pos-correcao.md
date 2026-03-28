# Fase 7 - Reanalise pos-correcao

## Problemas resolvidos

- `BUG-001`: suite web ficou deterministica no cenario de APR desativado e o teste voltou a passar mesmo com `.env` local contendo `VITE_ENABLE_APR_MODULE=true`.
- `QLT-001`: `lint` da API deixou de falhar por import morto.

## Problemas persistentes

- Nenhum bug reproduzivel adicional foi observado nas validacoes executadas.

## Novos riscos detectados

- O projeto depende de variaveis de ambiente Vite para modular partes da UI; qualquer novo teste cobrindo feature flags deve stubar explicitamente o ambiente.
- Ha avisos externos de `npm config globalignorefile`, mas sem evidencia versionada no repositorio para tratativa aqui.
- A validacao funcional manual confirmou o contrato HTTP, mas nao substitui uma verificacao visual em navegador real.

## Pendencias para revisao humana

- Verificar se a equipe deseja padronizar o carregamento de feature flags em um unico modulo para toda a aplicacao web.
- Revisar se o arquivo local `apps/web/.env` com APR ativo representa o comportamento esperado de desenvolvimento.
- Se necessario, confirmar qual processo mantem a API em `:4000` durante o desenvolvimento para evitar conflitos de porta ao usar `run.sh`.
