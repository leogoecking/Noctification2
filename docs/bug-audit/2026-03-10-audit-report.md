# Bug Audit Report - 2026-03-10

## Executive Summary
- Scope: full monorepo audit (`apps/api`, `apps/web`, root scripts, ops, CI workflows).
- Results: 4 verified findings (3 fixed, 1 open quality gap).
- Security: dependency vulnerabilities now 0 (`npm audit --json` clean).
- Regression safety: API test suite expanded from 7 to 10 tests.

## Phase 1 - Initial Repository Assessment

### Project structure map
- `apps/api`: Express + Socket.IO + SQLite backend.
- `apps/web`: React + Vite frontend.
- `ops/`: deploy scripts (systemd, backup, validation helpers).
- `scripts/`: developer bootstrap/dev runners.
- `.github/workflows/main.yml`: CI (lint, typecheck, tests, dependency audit).

### Technology stack and dependencies
- Language: TypeScript (Node.js 20+), SQL (SQLite migrations).
- Backend: `express`, `better-sqlite3`, `jsonwebtoken`, `socket.io`, `bcryptjs`.
- Frontend: `react`, `vite`, `socket.io-client`, `tailwindcss`.
- Tooling: `eslint`, `typescript`, `vitest`, `supertest`.

### Entry points and critical paths
- API entry: `apps/api/src/index.ts`
- API app wiring: `apps/api/src/app.ts`
- Auth/session path: `apps/api/src/routes/auth.ts` + `apps/api/src/middleware/auth.ts`
- Notification write/read path:
  - Admin send: `apps/api/src/routes/admin.ts` (`POST /admin/notifications`)
  - User consume/respond: `apps/api/src/routes/me.ts`
- Realtime path: `apps/api/src/socket.ts`
- DB schema + migration boundary: `apps/api/migrations/*.sql`, `apps/api/src/db.ts`
- Frontend entry: `apps/web/src/main.tsx`, app shell: `apps/web/src/App.tsx`

### Build and CI/CD review
- CI workflow checks:
  - forbidden sensitive files
  - hardcoded secret pattern scan
  - `npm ci`, lint, typecheck
  - API tests and web tests
  - `npm audit --audit-level=high`
- Build commands validated:
  - `npm run build --workspace @noctification/api`
  - `npm run build --workspace @noctification/web`

### Documentation review
- `README.md` is aligned with major functionality and deploy flow.
- Added security note for login brute-force protection after fix.

## Phase 2 - Systematic Bug Discovery

### Discovery methods executed
- Static code walkthrough across API + web critical paths.
- Automated quality gates:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run test:web`
  - `npm run build`
- Dependency security scan:
  - `npm audit --json`
- Targeted regression testing (new tests added for discovered defects).

## Phase 3 - Findings, Root Cause, Prioritization

### Prioritized findings table
| Bug ID | Severity | Category | Status | Component | Files |
|---|---|---|---|---|---|
| SEC-AUTH-001 | High | Security (Brute force) | Fixed | API Auth | `apps/api/src/routes/auth.ts`, `apps/api/src/test/api.test.ts` |
| BUG-API-001 | High | Functional / Data visibility | Fixed | Admin Notifications API | `apps/api/src/routes/admin.ts`, `apps/api/src/test/api.test.ts` |
| SEC-DEP-001 | Low | Dependency vulnerability | Fixed | API dependency | `apps/api/package.json`, `package-lock.json` |
| QA-WEB-001 | Medium | Code quality / test coverage | Open | Web test layer | `apps/web` |

### Detailed findings

#### SEC-AUTH-001 (Fixed)
- Current behavior: unlimited failed login attempts enabled brute-force attempts.
- Expected behavior: temporary lockout after repeated invalid attempts.
- Root cause: missing rate-limit/lockout logic in `/auth/login`.
- Impact: credential stuffing/brute-force risk on auth boundary.
- Reproduction (before fix): repeat invalid login requests; always `401`, never throttled.
- Verification (after fix): after 5 invalid attempts, next attempt returns `429` and `Retry-After` header.
- Test: `bloqueia login apos muitas tentativas invalidas`.

#### BUG-API-001 (Fixed)
- Current behavior: `GET /admin/notifications?status=unread` could hide older unread notifications.
- Expected behavior: status filter must be applied before limit/pagination.
- Root cause: endpoint applied `LIMIT 200` before unread/read filtering (filter in memory).
- Impact: admin dashboard could miss pending notifications (operational risk).
- Reproduction (before fix): insert 205 notifications with oldest 5 unread and latest 200 resolved; endpoint returned 0 unread.
- Verification (after fix): endpoint returns 5 unread; SQL now filters by status before `LIMIT`.
- Tests:
  - `nao perde notificacoes nao lidas antigas ao filtrar status unread`
  - `retorna 400 para filtro de status invalido no historico admin`

#### SEC-DEP-001 (Fixed)
- Current behavior: direct dependency `cookie@^0.6.0` flagged by advisory GHSA-pxg6-pf52-xh8x.
- Expected behavior: patched version.
- Root cause: outdated package version.
- Impact: low-severity input validation issue in cookie handling library.
- Reproduction: `npm audit --json` showed vulnerability.
- Verification: upgraded to `cookie@^1.1.1`; `npm audit --json` shows 0 vulnerabilities.

#### QA-WEB-001 (Open)
- Current behavior: web workspace has no test files (`vitest --passWithNoTests`).
- Expected behavior: at least smoke/regression tests for login/dashboard/notifications rendering.
- Root cause: missing automated frontend test suite.
- Impact: UI regressions can pass CI undetected.
- Reproduction: `npm run test:web` output "No test files found".
- Planned remediation: add React component/integration tests for auth/session and realtime notification UX.

## Phase 4 - Fix Implementation Process
- Branch strategy requested by spec:
  - `codex/fix-sec-auth-001`
  - `codex/fix-bug-api-001`
  - `codex/fix-sec-dep-001`
- In this execution, fixes were applied in current working branch/session and validated with TDD/regression tests.
- TDD flow used:
  1. Write failing tests for BUG-API-001 and SEC-AUTH-001.
  2. Implement minimal code fix.
  3. Re-run test/lint/typecheck/build/audit.

## Phase 5 - Testing and Validation Evidence
- `npm run lint`: pass
- `npm run typecheck`: pass
- `npm run test`: pass (API 10/10)
- `npm run test:web`: pass (no tests present)
- `npm run build`: pass (api + web)
- `npm audit --json`: pass (0 vulnerabilities)

## Phase 6 - Documentation and Reporting Deliverables
- This Markdown report.
- Machine-readable findings:
  - `docs/bug-audit/2026-03-10-findings.json`
  - `docs/bug-audit/2026-03-10-findings.yaml`
  - `docs/bug-audit/2026-03-10-findings.csv`

### Audit trail of code changes
- `apps/api/src/routes/auth.ts`
- `apps/api/src/routes/admin.ts`
- `apps/api/src/test/api.test.ts`
- `apps/api/package.json`
- `package-lock.json`
- `README.md`

## Phase 7 - Continuous Improvement Recommendations
1. Add frontend regression tests (QA-WEB-001) as CI gate.
2. Increase CI dependency strictness from `--audit-level=high` to at least `moderate` (or `low` if policy allows).
3. Add structured security audit events for lockout incidents.
4. Add observability metrics: login failures, lockouts, unread backlog trend.
5. Add API pagination contract docs for `/admin/notifications` to avoid ambiguity.

## Assumptions
- Scope constrained to repository-local validation and available runtime tools.
- No external production environment validation was performed.
