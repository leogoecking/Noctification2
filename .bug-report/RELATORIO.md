## Resumo executivo

Foi preparada a estrutura inicial do modulo APR no `Noctification2` com diff minimo e sem alterar fluxos existentes por padrao. A ativacao ficou protegida por feature flags desligadas.
Nesta etapa adicional, o frontend APR deixou de ser placeholder e passou a operar como feature isolada no `apps/web`, sem refatorar telas fora do modulo.
Nesta correcao incremental, foi confirmado e corrigido um bug funcional no backend APR que mantinha `external_id` no formato bruto de texto-formula Excel, afetando `auditoria/divergencia`.

## Visao geral do repositorio

- Monorepo `npm`
- Apps: `apps/api`, `apps/web`
- Novo workspace: `packages/apr-core`

## Estrategia adotada

- Seguir o padrao existente de composicao central no backend
- Seguir o roteamento manual ja usado no frontend
- Isolar tudo atras de feature flag

## Quantidade de achados por tipo

- `melhoria`: 1
- `bug_reproduzivel`: 1
- `vulnerabilidade_confirmada`: 0
- `risco_potencial`: 0

## Bugs confirmados

- `BUG-003`: `external_id` no formato `="235269"` podia ser exibido e comparado incorretamente no modulo APR.

## Bugs corrigidos

- Nenhum bug; a entrega corresponde a uma melhoria controlada (`APR-001`).
- Evolucao controlada `APR-002`: feature frontend APR com meses, resumo, CRUD manual, audit, history e importacao, isolada do restante do sistema.
- Evolucao controlada `APR-003`: catalogo de colaboradores, snapshots, restore do ultimo snapshot e operacoes destrutivas APR com validacao explicita.
- `BUG-003`: normalizacao de `externalId` aplicada na validacao manual, leitura de registros e comparacao de auditoria APR.

## Bugs pendentes

- Nenhum bug confirmado pendente no escopo corrigido.

## Vulnerabilidades confirmadas

- Nenhuma no escopo validado.

## Riscos potenciais

- Habilitacao desencontrada entre frontend e backend em ambientes diferentes.

## Principais padroes recorrentes

- Backend centraliza montagem em `createApp`.
- Frontend centraliza rotas em `App` e `appShell`.
- Flags operacionais ja fazem parte do padrao do repositório.

## Limitacoes da analise

- Sem validacao e2e em navegador.
- Sem rollout operacional.
- Sem integracao funcional do dominio APR nesta fase.
- A validacao do frontend APR foi feita por testes de componente e checks de build/typecheck, nao por navegacao real autenticada.
- Nao foi executada limpeza retroativa de dados historicos ja persistidos com formatos divergentes; a correcao normaliza leitura e novos fluxos.

## Recomendacoes praticas

- Habilitar APR primeiro em ambiente de teste.
- Introduzir contrato compartilhado real em `packages/apr-core` quando o dominio APR ganhar payloads e tipos.
- Adicionar smoke test dedicado quando a feature deixar de ser placeholder.
- Quando a flag for ativada, validar a experiencia de importacao com arquivos reais `csv/xlsx/xls`.
- Restringir `clear-all` e `restore-last` a operadores autorizados e sempre revisar o `confirm_text` e o `reason` antes da execucao.
- Se houver massa historica com `external_id` encapsulado como texto-formula, avaliar uma rotina de saneamento retroativo.
