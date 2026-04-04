# Regras Preventivas

## Lint e validacoes

- tratar warnings React `act(...)` como falha em testes de componente quando reproduziveis
- manter comandos de teste isolados por arquivo para facilitar triagem rapida

## Regras de teste prioritarias

- preferir harness in-process para rotas Express quando o objetivo e validar contrato sem necessidade real de socket/listen
- em testes que mutam `document.documentElement`, garantir `cleanup` ou `unmount` antes de alterar classes globais
- evitar observers globais sem teardown verificavel em componente testado

## CI recomendado

- adicionar uma etapa explicita de execucao em ambiente restrito para detectar suites dependentes de bind local
- separar suites que exigem permissao de rede local das suites puramente in-process
- capturar stderr dos testes e falhar em warnings recorrentes apos fase de ajuste

## Politicas de revisao

- revisar novos testes HTTP quanto a dependencia de `listen()`
- revisar testes de UI que mexem em tema global, `MutationObserver` ou `window/document`
- exigir uma justificativa curta quando um teste so puder rodar fora do ambiente padrao do projeto
