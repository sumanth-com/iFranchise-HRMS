# Performance audit

Measured live portal timings (dashboard, HR, manager, CEO, employee, attendance, leave, payroll, directory, provisioning, onboarding): **LIVE PERFORMANCE: NOT VERIFIED** (no authenticated production traces). Unauthenticated production timings only: `/` ~0.18s, `/login` ~0.13s, portal redirects ~0.12s, `/onboarding/login` ~0.37s (https://hrmsifranchise.vercel.app).

No performance code was changed. Sensitive HR data must not be globally cached; any future cache must be keyed by authenticated user + organization + role/permissions.

## Rate limiting (not a performance change)

**REMAINING SECURITY IMPROVEMENT:** `src/lib/security/rate-limit.ts` is in-memory per process. On distributed Vercel this is **not** sufficient. Distributed rate limiting is a remaining production security improvement. Do not add Redis/Upstash until explicitly approved. Current login/forgot-password `assertRateLimit` is kept.

---

## Bottlenecks (static evidence)

### 1. Middleware auth bootstrap (latency / 504 risk)

- **Evidence:** `updateSession` awaits `supabase.auth.getUser()` (4s abort). Uncached requests then `Promise.all` of `userAccountAllowsPortalAccess`, `resolveUserPermissionCodes`, `resolveUserRoleCodes` (4s race). Permission RPCs only — no attendance/leave/payroll/directory.
- **Affected route:** All matched routes (`src/middleware.ts`).
- **Query/component:** `src/lib/supabase/middleware.ts`, `src/lib/auth/permission-resolver.ts` (`get_user_permission_codes` RPC + fallbacks).
- **Expected improvement:** Stay under Vercel middleware limit; cookie cache (`hrms_permissions`, 5 min, HMAC, userId-bound) already avoids repeat RPCs.
- **Proposed fix:** None this pass (timeouts + fail-closed already present). Optional later: ensure permission cookie hits in production (measure `cachedPermissionPayload` hit rate).
- **Risk:** Low if unchanged.
- **Files:** none

### 2. Manager/HR team scope loads full org hierarchy

- **Evidence:** `getManagerTeamContext` → `listHierarchyEmployees` for the whole organization, then in-memory descendants (`src/lib/manager/services/team-hierarchy.ts`).
- **Affected route:** Manager team, leave, attendance, reports.
- **Expected improvement:** Faster manager portal as headcount grows.
- **Proposed fix:** SQL descendants or scoped select — **not implemented** (touches shared hierarchy; needs approval).
- **Risk:** High (shared org tree).
- **Files if later:** `team-hierarchy.ts`, `org-queries.ts`

### 3. Duplicate session/profile work after middleware

- **Evidence:** Middleware `getUser` + layouts/`requireServer*Permission` typically load profile again.
- **Affected route:** All authenticated pages.
- **Expected improvement:** Less duplicate auth work per navigation.
- **Proposed fix:** Reuse request-scoped profile — **not implemented** (auth rewrite forbidden).
- **Risk:** High if done naively (cross-user cache).
- **Files:** none

### 4. Leave queries admin client for HR/CEO role lists

- **Evidence:** `listHrLeaveApplicantEmployeeIds` / CEO approver lookups use `createAdminClient()` (`leave-queries.ts`) because RLS can hide role rows.
- **Affected route:** Leave apply / approval routing (server only after isolation).
- **Expected improvement:** Use user-scoped RPCs if RLS can expose needed role lists.
- **Proposed fix:** Deferred (functionality + security tradeoff).
- **Risk:** Medium.
- **Files:** none this pass

### 5. Client bundle / attendance format

- **Evidence:** Client previously pulled `manager-self-attendance-service` (and thus `leave-queries` / admin) for `formatHoursLabel`.
- **Affected route:** Manager/employee attendance views.
- **Expected improvement:** Smaller client JS; no service-role in browser.
- **Proposed fix:** **Done** — import `@/lib/employee/attendance-format`.
- **Risk:** Low (display helper only).
- **Files changed:** `manager-profile-summary-cards.tsx`, `manager-profile-history-table.tsx`, plus other admin isolation cuts.

---

## What was not optimized

N+1 in other modules, SELECT *, images, third-party deps: **not measured**. Do not treat this list as a license to rewrite portals.

## Caching safety

- Permission cookie is user-bound (`payload.userId !== userId` → ignore).
- Do not add `unstable_cache` / CDN cache for payslips, leave, attendance, bank, or directory without user+org+role keys.
