# Roadmap Noctification2

## Fase 1: Seguranca e Regras Basicas

Objetivo: reduzir risco operacional sem quebrar o fluxo atual de desenvolvimento.

- Concluido: remover dependencia implícita de `admin/admin` e deixar o uso inseguro explicito por ambiente.
- Concluido: impedir que envio para `all` alcance administradores.
- Endurecer validacoes de payload e limites de campos.
- Revisar cookies, CORS e segredos para subida fora de desenvolvimento.
- Ajustar bootstrap do admin para falhar cedo em configuracoes inseguras fora de dev.

## Fase 2: Escala e Observabilidade

Objetivo: fazer o sistema crescer sem degradar consulta, realtime e manutencao.

- Concluido: paginar historico administrativo.
- Reduzir recargas integrais do dashboard admin a cada evento em tempo real.
- Concluido: corrigir o acoplamento atual entre filtros/paginacao e recargas integrais no hook de realtime.
- Melhorar modelagem de consultas do historico para evitar custo por notificacao.
- Fortalecer a suite de testes da API sem dependencia de porta real.
- Adicionar indicadores de saude operacional, logs estruturados e cobertura de fluxos criticos.
- Concluido: refatorar filtros e efeitos do admin para evitar recarga automatica e desnecessaria durante digitacao.
- Concluido: alinhar a persistencia principal com a nomenclatura de visualizacao e reduzir dependencia de `read_at`.

## Fase 3: Produto Operacional

Objetivo: transformar o sistema em um painel operacional de fato.

- Concluido: exibir usuarios online e auditoria no frontend admin.
- Concluido: adicionar filtros e paginacao para auditoria e historico administrativo.
- Pendente: expandir filtros para fila operacional e demais visoes do admin.
- Concluido: explicitar no admin a diferenca entre visualizacao e andamento operacional.
- Concluido: tornar a superficie de API/frontend explicita com `isVisualized` e `visualizedAt`.
- Concluido: refatorar o `AdminDashboard` em componentes menores e hooks dedicados.
- Criar SLA por prioridade com destaque de atraso.
- Concluido: separar estados de notificacao em uma maquina de estado explicita, com impacto em modelo de dados, API e UI:
  - `recebida`
  - `visualizada`
  - `em_andamento`
  - `assumida`
  - `resolvida`
- Criar exportacao de historico/auditoria e notificacoes recorrentes.

## Inicio desta rodada

Mudancas entregues nesta rodada:

1. Tornar o uso do admin fixo inseguro explicito e controlado por ambiente.
2. Corrigir o envio para `all` para atingir apenas usuarios comuns ativos.
3. Exibir usuarios online e auditoria no admin.
4. Adicionar filtros e paginacao real em auditoria e historico administrativo.
5. Corrigir a leitura operacional para manter `em_andamento` fora de concluidas.
6. Tornar a API e o frontend mais explicitos com `isVisualized` e `visualizedAt`.
7. Refatorar o `AdminDashboard` em componentes menores.
8. Separar o fluxo do admin em hooks de realtime e de acoes.
9. Separar filtros em edicao de filtros aplicados e isolar recargas por area do admin.
10. Implementar `operational_status` no backend com migracao de dados e compatibilidade de resposta.
11. Atualizar frontend admin/usuario para exibir e consumir a nova maquina de estados operacional.
12. Introduzir `visualized_at` na persistencia e migrar o backend para esse campo como referencia principal.

## Proximos focos recomendados

1. Melhorar modelagem de consultas do historico para reduzir custo e permitir evolucao da fila operacional.
2. Expandir filtros operacionais do admin para a fila e demais visoes que ainda nao usam o novo estado.
3. Fortalecer a suite de testes da API sem dependencia de porta real para cobrir a nova maquina de estados.
