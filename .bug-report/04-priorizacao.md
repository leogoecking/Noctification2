# Fase 4 - Priorizacao

## Itens relevantes triados

### 1. BUG-001

- Tipo: `bug_reproduzivel`
- Severidade: media
- Confianca diagnostica: alta
- Risco de regressao da correcao: baixo
- Decisao: corrigir agora
- Justificativa:
  - Tinha reproducao objetiva
  - Quebrava a suite web no ambiente analisado
  - A correcao poderia ser pequena, localizada e validada rapidamente

### 2. QLT-001

- Tipo: `problema_de_qualidade`
- Severidade: baixa
- Confianca diagnostica: alta
- Risco de regressao da correcao: baixo
- Decisao: corrigir agora
- Justificativa:
  - Nao era bug funcional, mas quebrava `lint`
  - A alteracao era trivial e sem impacto comportamental

## Itens nao priorizados para correcao adicional imediata

- Nenhum outro bug reproduzivel foi encontrado nas validacoes automatizadas e na leitura dirigida dos modulos tocados.
- Os avisos de `npm config globalignorefile` nao foram atribuidos ao repositorio por falta de evidencia em arquivo versionado.
## Analise incremental 2026-03-28

### Melhorias priorizadas

1. `QLT-ORG-001` | prioridade 1
   Acao: adicionar `*.tsbuildinfo` ao [`.gitignore`](/home/leo/Noctification2/.gitignore) e evitar versionamento de artefatos de compilacao incremental.
   Impacto: reduz ruido no `git status` e evita commits acidentais.

2. `MEL-CI-001` | prioridade 2
   Acao: reduzir reinstalacoes repetidas no CI com reuso de cache/artifacts ou consolidacao por matriz/job.
   Impacto: ganho direto de tempo e custo operacional em toda PR.

3. `MEL-PROD-001` | prioridade 3
   Acao: adotar orquestrador de tarefas com cache por workspace ou ao menos scripts paralelizaveis/seletivos.
   Impacto: melhora produtividade local e feedback loop do time.

4. `MEL-FE-001` | prioridade 4
   Acao: separar roteamento/autenticacao/sessao do shell principal do frontend.
   Impacto: reduz acoplamento e facilita testes de fluxo.

5. `MEL-ARC-001` | prioridade 5
   Acao: reorganizar diretorios por dominio/coesão em vez de acumular helpers de primeiro nivel.
   Impacto: melhora navegabilidade do codigo e onboarding.

6. `MEL-QUAL-001` | prioridade 6
   Acao: quebrar arquivos extensos e testes monoliticos em modulos menores orientados a cenario.
   Impacto: aumenta clareza, reduz custo de manutencao e tempo de falha localizada.

7. `MEL-QUAL-002` | prioridade 7
   Acao: endurecer lint para arquitetura e seguranca de tipos.
   Impacto: previne regressao organizacional, mas depende de rollout gradual.

### Itens para corrigir agora

- Nenhum item foi tratado como bug confirmado nesta rodada.
- As prioridades acima sao recomendacoes de melhoria com alta confianca diagnostica e baixo risco de implementacao incremental.
