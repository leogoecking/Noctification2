# Roadmap Noctification2

## Fase 1: Seguranca e Regras Basicas

Objetivo: reduzir risco operacional sem quebrar o fluxo atual de desenvolvimento.

- Remover dependencia implícita de `admin/admin` e deixar o uso inseguro explicito por ambiente.
- Impedir que envio para `all` alcance administradores.
- Endurecer validacoes de payload e limites de campos.
- Revisar cookies, CORS e segredos para subida fora de desenvolvimento.
- Ajustar bootstrap do admin para falhar cedo em configuracoes inseguras fora de dev.

## Fase 2: Escala e Observabilidade

Objetivo: fazer o sistema crescer sem degradar consulta, realtime e manutencao.

- Paginar historico administrativo e notificacoes do usuario.
- Reduzir recargas integrais do dashboard admin a cada evento em tempo real.
- Melhorar modelagem de consultas do historico para evitar custo por notificacao.
- Fortalecer a suite de testes da API sem dependencia de porta real.
- Adicionar indicadores de saude operacional, logs estruturados e cobertura de fluxos criticos.

## Fase 3: Produto Operacional

Objetivo: transformar o sistema em um painel operacional de fato.

- Exibir usuarios online e auditoria no frontend admin.
- Criar SLA por prioridade com destaque de atraso.
- Separar estados de notificacao: recebida, visualizada, assumida, resolvida.
- Adicionar filtros por prioridade, periodo, usuario e status.
- Criar exportacao de historico/auditoria e notificacoes recorrentes.

## Inicio desta rodada

Mudancas iniciadas agora:

1. Tornar o uso do admin fixo inseguro explicito e controlado por ambiente.
2. Corrigir o envio para `all` para atingir apenas usuarios comuns ativos.
