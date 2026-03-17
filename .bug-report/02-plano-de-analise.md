# Plano de analise

## Ordem de execucao

1. Reconhecimento da stack e das ferramentas realmente disponiveis.
2. Execucao de `lint`, `typecheck`, testes de API, testes web e `build`.
3. Revisao manual de:
   - auth/sessao
   - notificacoes e filtros
   - socket/realtime
   - lembretes e scheduler
4. Reproducao minima dos achados com maior confianca.
5. Triagem e priorizacao.

## Ferramentas escolhidas

- `npm run lint`
  - Motivo: detectar erros objetivos de qualidade/sintaxe.
  - Escopo: workspaces `api` e `web`.
  - Confiabilidade: alta para problemas estaticos simples.
  - Achados esperados: erros de lint relevantes.

- `npm run typecheck`
  - Motivo: validar contratos TypeScript.
  - Escopo: workspaces `api` e `web`.
  - Confiabilidade: alta para inconsistencias de tipos.
  - Achados esperados: incompatibilidades de interfaces e chamadas.

- `npm run test:api`
  - Motivo: validar rotas, regras de negocio e scheduler cobertos.
  - Escopo: backend.
  - Confiabilidade: alta no que esta coberto; limitada fora da cobertura.
  - Achados esperados: regressao funcional nas rotas e no scheduler.

- `npm run test:web`
  - Motivo: validar fluxos principais de UI.
  - Escopo: frontend.
  - Confiabilidade: media/alta para os cenarios testados.
  - Achados esperados: regressao de tela, filtros e atualizacao de estado.

- `npm run build`
  - Motivo: comprovar integracao final e empacotamento.
  - Escopo: monorepo.
  - Confiabilidade: alta para problemas de compilacao/build.
  - Achados esperados: erros de build ou dependencia entre modulos.

- Reproducoes minimas com `node --import tsx -e ...`
  - Motivo: demonstrar bugs nao cobertos pelos testes automatizados.
  - Escopo: cenarios pontuais no backend.
  - Confiabilidade: alta, pois exercitam o codigo real com banco em memoria.

## Modulos prioritarios

- `apps/api/src/routes/me.ts`
- `apps/api/src/routes/admin.ts`
- `apps/api/src/socket.ts`
- `apps/api/src/routes/reminders-me.ts`
- `apps/api/src/reminders/scheduler.ts`
- `apps/web/src/App.tsx`

## Risco previsto

- Medio: varias regras dependem de compatibilidade com colunas legadas no SQLite.
- Medio: scheduler depende de estado persistido (`last_scheduled_for`).

## Limitacoes

- Nao houve exercicio manual em navegador real.
- Nao foi executado `npm audit`.
- A validacao de bugs fora da cobertura automatica foi feita com reproducoes minimas locais.
