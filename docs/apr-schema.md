# APR schema

## Objetivo

Persistir dados do modulo APR em tabelas totalmente isoladas das estruturas atuais do `Noctification2`.

## Diretrizes

- Todas as tabelas usam prefixo `apr_`.
- Nenhuma tabela APR escreve em `users`, `notifications`, `reminders`, `tasks` ou outras tabelas legadas.
- O desenho privilegia substituicao simples de cargas por mes e rollback operacional por limpeza do namespace APR.

## Tabelas

### `apr_reference_months`

Representa o mes de referencia operacional do APR.

Colunas principais:

- `id`
- `month_ref` no formato `YYYY-MM`
- `created_at`
- `updated_at`

Regras:

- `month_ref` e unico.

### `apr_entries`

Armazena os registros importados ou digitados do APR por mes e origem.

Colunas principais:

- `id`
- `reference_month_id`
- `source_type` com valores `manual` ou `system`
- `external_id`
- `opened_on`
- `subject`
- `collaborator`
- `raw_payload_json`
- `created_at`
- `updated_at`

Regras:

- `UNIQUE(reference_month_id, source_type, external_id)`
- `FOREIGN KEY` para `apr_reference_months(id)` com `ON DELETE CASCADE`

Uso previsto:

- permitir recarga completa da base manual ou do sistema para um mes sem misturar com tabelas existentes

### `apr_import_runs`

Registra metadados de importacao por mes e origem.

Colunas principais:

- `id`
- `reference_month_id`
- `source_type`
- `file_name`
- `imported_at`
- `total_valid`
- `total_invalid`
- `duplicates`
- `total_invalid_global`
- `duplicates_global`
- `month_detected_by_date`
- `metadata_json`

Regras:

- `FOREIGN KEY` para `apr_reference_months(id)` com `ON DELETE CASCADE`

Uso previsto:

- auditoria basica das importacoes APR
- rastreio de arquivos e contagens sem tocar nos logs atuais do sistema

### `apr_snapshots`

Armazena snapshots logicos do estado APR para restauracao/manual review.

Colunas principais:

- `id`
- `reference_month_id`
- `snapshot_reason`
- `payload_json`
- `checksum`
- `created_at`

Regras:

- `FOREIGN KEY` opcional para `apr_reference_months(id)` com `ON DELETE SET NULL`

Uso previsto:

- preservar rollback simples do namespace APR
- manter historico sem depender de tabelas legadas

### `apr_collaborators`

Catalogo consolidado de colaboradores do modulo APR.

Colunas principais:

- `id`
- `display_name`
- `normalized_name`
- `occurrence_count`
- `created_at`
- `updated_at`

Regras:

- `normalized_name` e unico

Uso previsto:

- alimentar filtros e seletores APR sem consultar tabelas legadas
- manter o catalogo restrito ao namespace APR

## Repository inicial

Arquivo: [apps/api/src/modules/apr/repository.ts](/home/leo/Noctification2/apps/api/src/modules/apr/repository.ts)

Operacoes criadas:

- garantir mes de referencia APR
- substituir entradas de um mes/origem
- listar entradas APR por mes
- registrar importacao APR
- listar importacoes APR
- registrar snapshot APR
- listar snapshots APR
- listar colaboradores APR
- reconstruir catalogo de colaboradores APR
- limpar apenas um mes APR
- limpar todo o namespace APR

## Isolamento

As migrations APR:

- nao alteram tabelas existentes
- nao adicionam colunas em tabelas legadas
- nao criam FKs para modulos de autenticacao, notificacoes ou tarefas

## Rollback operacional

Como as tabelas ficam isoladas no namespace `apr_`, o rollback operacional mais simples e:

1. desabilitar os fluxos APR
2. restaurar o ultimo snapshot APR adequado quando houver rollback logico
3. remover ou limpar apenas as tabelas `apr_*`
4. reaplicar as migrations se necessario

Nao ha dependencia cruzada com dados legados do sistema.
