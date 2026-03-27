# 04 - Priorização

## Prioridade 1

### BUG-001 - loopback IPv6 nao reescrito no runtime do frontend

- Tipo: `bug_reproduzivel`
- Severidade: média
- Confiança diagnóstica: alta
- Risco de regressão: baixo
- Motivo da prioridade:
  - bug objetivo
  - correção pequena
  - impacto direto em cenários de acesso remoto/local-LAN usando `::1`

## Prioridade 2

### CFG-001 - `npm test` da raiz não cobre o workspace web

- Tipo: `erro_de_configuracao`
- Severidade: média
- Confiança diagnóstica: alta
- Risco de regressão: baixo
- Motivo da prioridade:
  - pode esconder regressões do frontend em validação local
  - diferença entre validação local e mental model do desenvolvedor

## Prioridade 3

### RISK-001 - unsubscribe Web Push depende de body em DELETE

- Tipo: `risco_potencial`
- Severidade: média
- Confiança diagnóstica: média
- Risco de regressão: baixo
- Motivo da prioridade:
  - não falhou no ambiente atual
  - risco cresce quando houver proxy, gateway ou cliente alternativo

## Prioridade 1

### VULN-001 - dependencias transitivas com advisories high no lockfile

- Tipo: `vulnerabilidade_confirmada`
- Severidade: alta
- Confiança diagnóstica: alta
- Risco de regressão: baixo
- Motivo da prioridade:
  - havia evidencia objetiva via `npm audit --audit-level=high`
  - a correcao viavel ficou restrita ao `package-lock.json`
  - validacao objetiva disponivel com novo `npm audit`, testes e build
