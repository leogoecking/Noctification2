# Pos-correcao

## Comparativo antes vs depois

- `BUG-001`
  - Antes: registros legados `assumida` podiam aparecer como `recebida` ou `visualizada`.
  - Depois: runtime e migration convergem para `assumida`.

- `BUG-002`
  - Antes: mudar a agenda nao alterava o proximo disparo quando `last_scheduled_for` existia.
  - Depois: a ancora do scheduler e recalculada quando a agenda muda.

## Problemas resolvidos

- `BUG-001`: resolvido.
- `BUG-002`: resolvido.
- `RISK-001`: resolvido.

## Problemas persistentes

- Nenhum bug confirmado pendente.

## Novos riscos detectados

- Nenhum novo risco relevante foi detectado na validacao executada.

## Pendencias para revisao humana

- Nenhuma pendencia critica aberta a partir dos bugs confirmados nesta rodada.
