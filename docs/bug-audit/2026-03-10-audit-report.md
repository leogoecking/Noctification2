# Bug Audit and Refactor Report - 2026-03-10

## Executive summary
- Goal: implement the classic notification flow with full compatibility.
- Scope: `apps/api`, `apps/web`, config/examples and tests.
- Findings verified: 7
- Fixed: 7
- Open critical/high: 0

## Phase 1 - Initial assessment

### Repository map
- `apps/api`: auth, admin/user notification APIs, Socket.IO server, SQLite access.
- `apps/web`: login/admin/user dashboards and notification UX.
- `docs/bug-audit`: audit artifacts.
- `ops/`: deploy samples/scripts.

### Stack and dependencies
- API: TypeScript, Express, Socket.IO, better-sqlite3, bcryptjs, jsonwebtoken.
- Web: React, Vite, Tailwind, socket.io-client.
- QA: Vitest, Supertest, React Testing Library, ESLint, TypeScript.

### Critical paths and boundaries
- Auth boundary: `POST /auth/register`, `POST /auth/login`, cookie session.
- Notification write/read boundary:
  - Admin send: `POST /admin/notifications`
  - User consume/read/respond: `/me/notifications*`
- Realtime boundary: Socket.IO events (`notification:new`, `notification:read_update`).

## Phase 2 - Systematic discovery method
- Static analysis of API and web flows for login, read/unread and response semantics.
- Contract validation against requested UX routes and actions.
- Dependency/build/config review.
- Test-first updates (API and web) for refactor risks.

## Phase 3 - Findings and prioritization

| Bug ID | Severity | Category | Status | Component |
|---|---|---|---|---|
| AUTH-REG-001 | High | Functional | Fixed | API auth |
| AUTH-ADMIN-001 | High | Security-policy | Fixed | API auth/admin |
| NOTIF-READ-001 | High | Functional | Fixed | Read semantics |
| NOTIF-USER-002 | Medium | Functional | Fixed | User notifications API |
| WEB-ROUTE-001 | Medium | UI/UX | Fixed | Web routing/login |
| WEB-BELL-002 | Medium | UI/UX | Fixed | Bell + notifications page |
| WEB-ADMIN-READ-003 | Low | Functional | Fixed | Admin pending list |

## Phase 4 - Implemented corrections
- Added user self-registration endpoint with auto-session.
- Enforced fixed admin credential model (`admin/admin`) in config/login/admin management rules.
- Decoupled read state from response state (`read_at` drives `isRead`).
- Added `POST /api/v1/me/notifications/read-all`.
- Updated admin and user filters to use read semantics (`read`/`unread` based on `read_at`).
- Added web route flows for `/login`, `/admin/login`, `/notifications`.
- Updated bell UX to show latest 10 overall and unread badge.
- Added mark-all-read action to full notifications page.
- Fixed admin dashboard pending-user logic to rely on `readAt === null`.

## Phase 5 - Testing and validation

Executed and passing:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:web`
- `npm run build`

Coverage updates included:
- API tests for register/admin fixed login/read-all/read-vs-response compatibility.
- Web tests for login/register UI, admin login mode, bell latest-10 behavior, and mark-all-read UX.

## Phase 6 - Deliverables
- Markdown report: `docs/bug-audit/2026-03-10-audit-report.md`
- JSON report: `docs/bug-audit/2026-03-10-findings.json`
- YAML report: `docs/bug-audit/2026-03-10-findings.yaml`
- CSV report: `docs/bug-audit/2026-03-10-findings.csv`

## Phase 7 - Continuous improvement recommendations
1. Add E2E tests for cross-tab realtime UX (admin sends, user receives).
2. Add API contract tests for backward-compatibility response shapes.
3. Add CI gate for schema migrations rollback checks.
4. Add metrics/logs for unread backlog and read-all usage.
5. Plan a post-cycle hardening ticket to replace fixed admin credential policy in production contexts.

## Audit trail (files changed in this cycle)
- `apps/api/src/config.ts`
- `apps/api/src/routes/auth.ts`
- `apps/api/src/routes/me.ts`
- `apps/api/src/routes/admin.ts`
- `apps/api/src/socket.ts`
- `apps/api/src/test/api.test.ts`
- `apps/api/src/scripts/bootstrap-admin.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/components/LoginScreen.tsx`
- `apps/web/src/components/UserDashboard.tsx`
- `apps/web/src/components/AdminDashboard.tsx`
- `apps/web/src/lib/api.ts`
- `apps/web/src/components/LoginScreen.test.tsx`
- `apps/web/src/components/UserDashboard.test.tsx`
- `apps/web/src/App.test.tsx`
- `apps/web/src/test/setup.ts`
- `apps/web/vite.config.ts`
- `apps/web/package.json`
- `apps/api/.env.example`
- `ops/systemd/api.env.example`
- `README.md`
- `package-lock.json`
