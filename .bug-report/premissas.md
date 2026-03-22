# Premissas e limites

- Data da analise: 2026-03-16.
- Escopo solicitado: revisar o repositorio conforme `AGENTS.md` e verificar se existem bugs.
- Ambiente detectado: workspace local com permissao de leitura e escrita no repositorio, sem acesso amplo a rede.
- Ferramentas confirmadas inicialmente: `node`, `npm`, `npx`, `git`, `find`, `sed`.
- Ferramenta ausente detectada: `rg`.
- O repositorio contem `node_modules`, entao a analise pode usar scripts locais sem instalar dependencias.
- A classificacao de bug sera feita apenas quando houver evidencia objetiva de falha, inconsistencia logica demonstravel ou regressao clara.
- Itens sem reproducao objetiva serao tratados como risco potencial ou problema de qualidade.
- Nesta etapa, nenhuma correcao sera aplicada sem antes confirmar impacto e risco.

## Atualizacao 2026-03-17

- Escopo solicitado nesta rodada: verificar o que ainda falta para o deploy.
- Ferramentas confirmadas nesta rodada: `node`, `npm`, `git`, `find`, `sed`, `sqlite3`, `systemctl`.
- Ferramentas ausentes confirmadas nesta rodada no ambiente local: `rg`, `curl`, `nginx`.
- O ambiente analisado nesta rodada e local ao repositorio; nao houve acesso root nem validacao final em `/etc`.
- Os resultados abaixo distinguem:
  - lacunas operacionais ainda dependentes da VM
  - inconsistencias reais do fluxo de deploy que puderam ser corrigidas no repositorio

## Atualizacao 2026-03-17 - deploy guiado por documentacao

- Escopo solicitado nesta rodada: ler `AGENTS.md` e `docs/operations/deploy-vm-debian.md`, seguir o procedimento de deploy e validar com evidencias reais.
- Limite encontrado: o arquivo `docs/operations/deploy-vm-debian.md` nao existe neste checkout.
- Fallback adotado com evidencia: uso de `docs/debian-vm-deploy.md`, unico playbook Debian presente em `docs/`.
- Restricao de privilegio confirmada: `sudo -n true` falha com `sudo: a password is required`, entao alteracoes em `/etc` e `systemd` dependem de execucao privilegiada pelo usuario.
- Validacoes HTTP locais foram executadas com comandos reais contra `127.0.0.1` e contra os servicos ativos da VM.

## Atualizacao 2026-03-21 - frente de tarefas

- Escopo solicitado nesta rodada: ler `AGENTS.md` e `ROADMAP.md`, tratar o roadmap atual como fonte de verdade, propor uma nova frente de evolucao para transformar o sistema em tarefas com notificacoes e automacoes, e executar apenas a primeira etapa com baixo risco.
- Estado atual registrado antes dos edits: `git status --short` mostra itens nao rastreados em `.deploy/`; eles nao fazem parte desta mudanca e nao serao alterados.
- Ferramentas confirmadas nesta rodada: `git`, `node`, `npm`, `sqlite3`, `python3`, `find`, `sed`.
- Ferramentas ausentes ou indisponiveis no PATH nesta rodada: `rg`, `docker`, `docker-compose`, `pnpm`, `yarn`, `bun`, `tsc`, `vite`, `pytest`.
- O repositorio ja possui `node_modules`, entao validacoes podem usar dependencias locais via scripts npm sem instalar pacotes.
- Evidencia funcional desta rodada: o codigo atual nao possui modulo de `tasks`; as ocorrencias de `task` estavam concentradas no `ROADMAP.md`, nao nas rotas, migrations e tipos aplicados em runtime.
- Premissa operacional adotada: a primeira etapa de menor risco deve ser passiva, abrindo estrutura de dados e contratos sem alterar os fluxos existentes de notificacoes e lembretes.
- Limite assumido conscientemente: nao sera feita migracao em massa de notificacoes legadas nem vinculacao automatica a tarefas nesta rodada.

## Atualizacao 2026-03-21 - UI minima de tarefas

- Escopo solicitado nesta rodada: executar o proximo passo apos schema passivo e CRUD inicial de tarefas.
- Premissa operacional adotada: a etapa segura agora e expor a primeira UI de tarefas consumindo o CRUD existente, sem alterar notificacoes, lembretes ou scheduler.
- Validacao desta rodada fica restrita ao workspace `apps/web`, com testes direcionados e `typecheck`.
- Limites mantidos conscientemente: sem board, sem realtime de tarefas, sem comentarios, sem vinculacao de notificacoes e sem automacoes nesta rodada.

## Atualizacao 2026-03-21 - notificacoes vinculadas a tarefa

- Escopo solicitado nesta rodada: executar o proximo passo do roadmap apos a UI minima de tarefas.
- Premissa operacional adotada: a etapa segura aqui e vincular notificacoes novas a `task` de forma opcional, sem migracao em massa do historico e sem automacoes por scheduler.
- Ferramentas confirmadas nesta rodada: `node`, `npm`, `git`, `find`, `sed`.
- Validacao desta rodada deve cobrir backend e frontend com testes focados de migration, rotas e UI de notificacoes.
- Limites mantidos conscientemente: sem `due_soon`, `overdue`, `stale_task` ou qualquer regra automatica de tarefa nesta rodada.

## Atualizacao 2026-03-21 - primeira fatia da Etapa 4

- Escopo solicitado nesta rodada: executar o proximo passo do roadmap apos a vinculacao opcional de notificacoes a tarefa.
- Premissa operacional adotada: a menor entrega segura da Etapa 4 e introduzir automacoes operacionais iniciais com flags desligadas por padrao, idempotencia e observabilidade, sem concluir ainda a recorrencia de tarefa.
- Ferramentas confirmadas nesta rodada: `node`, `npm`, `git`, `find`, `sed`.
- O scheduler de lembretes existente foi tratado como motor compartilhado; a separacao funcional entre lembrete pessoal e automacao de tarefa deve permanecer explicita na configuracao e nos logs.
- Limites mantidos conscientemente:
  - sem migracao de lembretes pessoais para tarefas
  - sem board ou nova navegacao de notificacao para tarefa
  - sem concluir recorrencia de tarefa nesta rodada
  - sem alterar o comportamento legado quando `ENABLE_TASK_AUTOMATION_SCHEDULER=false`

## Atualizacao 2026-03-21 - conclusao segura da Etapa 4

- Escopo solicitado nesta rodada: executar o proximo passo apos a primeira fatia das automacoes operacionais.
- Premissa operacional adotada: o menor fechamento seguro da Etapa 4 e adicionar recorrencia configuravel de tarefa com geracao automatica da proxima tarefa apenas depois da conclusao da atual.
- Ferramentas confirmadas nesta rodada: `node`, `npm`, `git`, `find`, `sed`.
- Limites mantidos conscientemente:
  - sem board, comentarios ou checklist/subtarefas nesta rodada
  - sem mudar a semantica de lembrete pessoal
  - sem ligar `ENABLE_TASK_AUTOMATION_SCHEDULER` por padrao
  - sem reabrir tarefa concluida; a recorrencia cria uma nova tarefa filha

## Atualizacao 2026-03-21 - hardening e rollout operacional

- Escopo solicitado nesta rodada: executar a Fase 8 da frente de tarefas com hardening, checklist de rollout e documentacao operacional.
- Premissa operacional adotada: o menor passo seguro aqui e fortalecer observabilidade e artefatos operacionais, evitando qualquer ampliacao de UX ou mudanca de regra de negocio.
- Ferramentas confirmadas nesta rodada: `node`, `npm`, `git`, `find`, `sed`, `bash`.
- Limites mantidos conscientemente:
  - sem ativacao real de `ENABLE_TASK_AUTOMATION_SCHEDULER` neste ambiente
  - sem alteracao na logica de `due_soon`, `overdue`, `stale_task` ou `recurring_task`
  - sem tocar nos itens nao rastreados de `.deploy/`

## Atualizacao 2026-03-22 - comentarios por tarefa

- Escopo solicitado nesta rodada: seguir para o proximo passo funcional de `tasks` com comentarios por tarefa.
- Ferramentas confirmadas nesta rodada: `node`, `npm`, `git`, `find`, `sed`, `grep`.
- Ferramenta ausente confirmada novamente: `rg`.
- Premissa operacional adotada: a menor entrega segura e adicionar comentarios como trilha separada no detalhe da tarefa, sem unificar ainda a timeline com `task_events`.
- Limites mantidos conscientemente:
  - sem checklist/subtarefas nesta rodada
  - sem realtime dedicado de comentarios
  - sem alterar regras de automacao de tarefa
  - sem misturar comentario com `task_events` para evitar ampliar o contrato alem do necessario
