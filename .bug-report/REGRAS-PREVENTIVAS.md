# Regras preventivas

## Sugestoes de lint e arquitetura

- Adicionar regra de limite de tamanho por arquivo para alertar cedo em UI e rotas legacy.
- Adicionar regra ou convenção de "no direct db.prepare in routes".
- Adotar convenção explícita de `presentation/application/infrastructure` nos módulos que ainda não seguem esse padrão.

## Type rules recomendadas

- Tipar explicitamente view-models de dashboard/admin e APR.
- Reduzir objetos de retorno excessivamente largos em hooks agregadores.
- Preferir tipos de request/query centralizados para evitar parsing repetido.

## Testes ausentes prioritarios

- Testes mais focados para o controller APR:
  - carregamento inicial;
  - mudança de mês;
  - catálogos independentes;
  - efeitos assíncronos estáveis.
- Testes menores por workflow em `AdminTasksPanel`.
- Testes de contrato para rotas legacy após extrações de service/repository.

## Validacoes de CI recomendadas

- Separar `test:web` em grupos menores para localizar regressões com mais precisão.
- Opcionalmente falhar CI em warnings React críticos durante testes de frontend.
- Rodar um alvo dedicado para APR frontend enquanto a feature estiver em estabilização.

## Politicas de revisao uteis

- Toda nova feature em admin/APR deve declarar onde termina a camada de orquestração.
- Toda rota nova deve evitar SQL direto se já existir módulo de domínio para o contexto.
- Nenhum teste de componente grande deve crescer sem avaliar extração de fixtures e helpers.
