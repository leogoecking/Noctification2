## Visão estrutural do repositório

- Tipo: monorepo `npm` com dois apps principais (`apps/api`, `apps/web`).
- Workspaces confirmados em `package.json`: `apps/api` e `apps/web`.
- Há documentação operacional em `docs/` e scripts de deploy/validação em `ops/`.

## Stack detectada

- Backend: Node.js + TypeScript + Express + Socket.IO + Better SQLite3 + Vitest.
- Frontend: React 18 + TypeScript + Vite + Vitest.
- Gerenciador de pacotes ativo: `npm`.
- Lint: ESLint.
- Typecheck: TypeScript (`tsc --noEmit`).
- Build: `tsc` no backend; `tsc -b` + `vite build` no frontend.

## Ferramentas disponíveis

- Disponíveis: `node`, `npm`, `git`, `find`, `grep`, `sed`.
- Indisponíveis: `rg`, `pnpm`.

## Entrypoints confirmados

- API: `apps/api/src/index.ts`, `apps/api/src/app.ts`.
- Web: `apps/web/src/main.tsx`, `apps/web/src/App.tsx`.
- Configuração backend: `apps/api/src/config.ts`.
- Roteamento frontend: `apps/web/src/App.tsx` e `apps/web/src/components/app/appShell.tsx`.

## Módulos críticos

- Autenticação: `apps/api/src/routes/auth.ts`, `apps/api/src/auth.ts`.
- Rotas do usuário: `apps/api/src/routes/me.ts`.
- Rotas administrativas: `apps/api/src/routes/admin.ts`.
- Socket.IO: `apps/api/src/socket.ts` e módulos associados.
- Notificações, lembretes e tarefas: áreas já ativas em `apps/api/src/routes/*`, `apps/api/src/tasks/*`, `apps/api/src/reminders/*` e componentes equivalentes no frontend.

## Áreas de maior risco

- `apps/api/src/app.ts`: qualquer alteração aqui pode afetar registro global de rotas.
- `apps/api/src/config.ts`: mudanças de env podem impactar inicialização da API.
- `apps/web/src/App.tsx` e `apps/web/src/components/app/appShell.tsx`: concentram navegação manual do frontend.

## Estratégia proposta para análise

- Seguir o padrão já existente de rotas isoladas e composição central em `createApp`.
- Introduzir APR por feature flag desligada por padrão.
- Evitar tocar em autenticação, Socket.IO, notificações, lembretes e tarefas.
- Validar por testes focados, `typecheck` e `build` dos apps existentes.
