# Checklist Code Review

- O teste depende de bind de porta local? Se sim, isso e necessario ou existe alternativa in-process?
- O teste roda em ambiente restrito sem acesso especial ao host?
- O cleanup do teste desmonta observadores, timers e listeners antes de mutar o DOM global?
- Existe warning em stderr/stderr durante a suite? Se sim, ele foi tratado ou justificado?
- Mudancas em arquivos de teste preservam portabilidade entre CI, sandbox e ambiente local?
- Componentes que observam `document` ou `window` possuem estrategia clara de unsubscribe/desconexao?
