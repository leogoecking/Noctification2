# APR advanced operations

## Objetivo

Adicionar catalogo, snapshots, restore e operacoes de limpeza ao modulo APR sem impactar tabelas ou fluxos fora do namespace `apr_`.

## Recursos

### Catalogo de colaboradores

- Tabela dedicada: `apr_collaborators`
- Uso: consolidar nomes unicos de colaboradores encontrados nas entradas APR
- Escopo: somente dados APR

### Snapshots

- Rotas:
  - `POST /api/v1/apr/snapshots`
  - `GET /api/v1/apr/snapshots`
  - `POST /api/v1/apr/months/:month/snapshots`
  - `GET /api/v1/apr/months/:month/snapshots`
- Todo snapshot guarda payload serializado e checksum
- O snapshot pode ser global ou por mes

### Restore do ultimo snapshot

- Rotas:
  - `POST /api/v1/apr/restore-last`
  - `POST /api/v1/apr/months/:month/restore-last`
- Protecoes:
  - `reason` obrigatorio
  - `confirm_text` obrigatorio e exato
  - cria snapshot de salvaguarda antes da restauracao

### Clear-month e clear-all

- Rotas:
  - `POST /api/v1/apr/months/:month/clear`
  - `POST /api/v1/apr/clear-all`
- Protecoes:
  - `reason` obrigatorio
  - `confirm_text` obrigatorio e exato
  - cria snapshot de salvaguarda antes da limpeza
  - escopo restrito ao namespace `apr_`

## Confirmacoes exigidas

### Restore

- mes: `RESTORE APR MONTH YYYY-MM`
- global: `RESTORE ALL APR DATA`

### Clear

- mes: `CLEAR APR MONTH YYYY-MM`
- global: `CLEAR ALL APR DATA`

## Riscos

- Restore pode sobrescrever o estado APR atual se usado sem revisao do snapshot mais recente.
- `clear-all` remove meses, entradas, importacoes e catalogo APR atuais; os snapshots permanecem para rollback.
- Snapshots guardam estado logico do modulo, nao estado externo do sistema.

## Rollback

1. listar snapshots APR
2. validar o escopo desejado
3. executar restore com `reason` e `confirm_text` exatos
4. conferir meses, entradas e catalogo restaurados

## Limitacoes

- o restore usa o ultimo snapshot disponivel do escopo informado; nao ha selecao manual por id nesta fase
- o catalogo de colaboradores e reconstruido a partir das entradas APR
- operacoes destrutivas nao alteram tabelas legadas fora do namespace `apr_`
