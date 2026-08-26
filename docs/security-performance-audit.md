# iFranchise HRMS — Security, Authentication & Performance Audit

**Date:** 2026-08-24  
**Scope:** Read-only architecture audit of the production HRMS codebase.  
**Baseline:** Application is considered functional and stable.  
**Deployment:** Vercel + Next.js 15 + Supabase (NGINX **not applicable**).

---

## 1. Current authentication architecture

| Layer | Implementation |
|--------|----------------|
| Primary auth | **Supabase Auth** (`signInWithPassword`, SSR cookies via `@supabase/ssr`) |
| Passwords | Managed by Supabase Auth for employees; **custom scrypt + OTP** for onboarding candidates |
| Session | Middleware `getUser()` + `getServerSession()` (React `cache`) |
| Idle timeout | 2 hours via HttpOnly `hrms_last_activity` + client hook |
| Remember-me | Cookie flag only (extends idle cookie max-age; does not change Supabase JWT lifetime) |
| Permission cookie | HMAC-signed `hrms_permissions` (5 min TTL), requires `PERMISSION_CACHE_SECRET` |
| Onboarding | Separate invite/OTP/password path under `/onboarding` |

**Key files:** `src/middleware.ts`, `src/lib/supabase/{middleware,server,client,admin,env}.ts`, `src/lib/auth/*`, `src/components/layout/portalshell-layout.tsx`, onboarding security modules.

---

## 2. Current authorization architecture

| Control | Role |
|---------|------|
| Middleware | Portal path gating + system-admin check + primary-portal anti-downgrade |
| PortalShellLayout | Requires live session + profile (does **not** re-check portal permission) |
| `requireServerPermission*` | Page/action gates |
| RLS | Org membership baseline; permission-aware on **some** sensitive SELECTs |
| Manager team | `assertTeamMember` / `getManagerTeamScope` (strong where used) |

**Important:** UI visibility and middleware are not sufficient alone. Server actions + RLS must enforce every sensitive operation.

---

## 3. Current RLS / security model

- Policies generally use org helpers (`user_belongs_to_organization`, etc.), not literal `USING (true)`.
- Enterprise hardening migration improved several SELECT paths (payroll, bank SELECT, employees UPDATE).
- **Writes** on leave, leave balances, bank accounts, addresses, emergency contacts, profiles, attendance often remain **org-membership-only** (any authenticated org user with a user-scoped client can mutate if app checks are bypassed).
- Service role is used server-side for signed URLs, sync, public QR, onboarding — safe only when preceded by strong authz.

---

## 4–6. Performance / page-load / DB bottlenecks

| Rank | Bottleneck | Verified? |
|------|------------|-----------|
| 1 | CEO dashboard: domain sync **before** queue read + serial upserts | Yes (code) |
| 2 | Manager team leave: N+1 role + conflict queries per row | Yes (code) |
| 3 | Portal layout: signed org logo URL on every navigation | Yes (code) |
| 4 | Middleware permission bootstrap on cache miss (every ~5 min / cold) | Yes (code) |
| 5 | Duplicate CEO leave “ensure pending” calls | Yes (code) |
| 6 | `getLeaveSummary` downloads all org leave_balances | Yes (code) |
| 7 | Manager dashboard multi-wave attendance day counts | Yes (code) |
| 8 | Thin `next/dynamic` usage; large client tables | Partial |
| 9 | Image `remotePatterns` missing; some logos `unoptimized` | Yes |

**Not a problem:** lodash/recharts full imports (not present). Leave/attendance list queries generally select explicit columns.

**NGINX:** Not applicable (Vercel).

---

## SECURITY FINDINGS

### Critical

1. **Leave create IDOR** — Anyone with `leave.create` (employee role includes it) can pass another `employeeId`; mutation only checks same org.  
   Files: `src/lib/leave/actions.ts`, `src/lib/leave/services/leave-mutations.ts`, leave RLS insert.

2. **Org-wide RLS writes without permission checks** — leave_requests / leave_balances / bank_accounts UPDATE / profiles / contacts / addresses / attendance INSERT|UPDATE.  
   Files: `supabase/migrations/20260702141100_hrms_rls_policies.sql` (+ partial hardening elsewhere).

3. **Profile photo IDOR** — Employee role has `employee_profile.edit`; action allows editing **others’** photos.  
   File: `src/lib/employees/profile-image-actions.ts`.

### High

4. **Manager document access is org-wide** (`isEmployeeScoped` false for managers + `documents.view`).  
5. **Employee `employee.view` can load coworker PII dossier** (email/phone/addresses/emergency).  
6. **Middleware permission timeout fail-open** can skip portal gates under load.  
7. **Public `/e/[employeeRef]`** exposes email/phone/stats via service role.  
8. **REMAINING SECURITY IMPROVEMENT:** In-memory login rate limit (`src/lib/security/rate-limit.ts`) does not span Vercel instances. Kept as-is; Redis/Upstash not implemented. Distributed rate limiting is a remaining production security improvement.

### Medium

9. `createAdminClient` isolation: client import bridges cut; `src/lib/supabase/admin.ts` uses `import "server-only"`.  
10. Idle activity cookie missing → idle check skipped until JWT expiry.  
11. Some auth/profile errors are more revealing than needed.  
12. CSP allows `unsafe-inline` / `unsafe-eval`.  
13. Leave balance/apply-context actions share leave-create IDOR surface.

### Low

14. Remember-me does not extend Supabase JWT lifetime.  
15. Password-reset redirect may put PII in query string.  
16. CSP / headers otherwise solid (HSTS, frame deny, nosniff, etc.).

---

## AUTHENTICATION FINDINGS

**Good:** Supabase Auth (no custom password table for employees), generic invalid credentials, forgot-password generic success copy, login rate limit present, idle timeout, signed permission cache, open-redirect helper, production secret validation.

**Gaps:** Distributed rate limiting; fail-open middleware; idle cookie edge case; occasional raw/invite error leakage.

---

## AUTHORIZATION FINDINGS

**Good:** Portal anti-downgrade; manager `assertTeamMember` on many team paths; payslip defense-in-depth; many employee self actions bind `profile.employee.id`.

**Gaps:** Leave create/context for arbitrary IDs; profile photo; manager documents; coworker PII via `employee.view`; middleware fail-open.

---

## RLS FINDINGS

- SELECT hardening exists for some financial/employee paths.  
- WRITE policies lag behind — primary defense-in-depth gap.  
- No `USING (true)` found in review.

---

## DATA LEAK RISKS

| Risk | Severity |
|------|----------|
| Employee creates leave for coworker | Critical |
| Employee changes coworker profile photo | Critical |
| Manager downloads any org document | High |
| Employee views coworker emergency/address PII | High |
| Public QR card email/phone | High |
| Cross-org access | Generally blocked (profile org + RLS) |

---

## PERFORMANCE FINDINGS / BUNDLE / IMAGES

See sections 4–6. Bundle: date-fns optimized; no lodash/recharts. Images: add Supabase `remotePatterns`. Dynamic imports underused.

---

## RECOMMENDED FIXES (priority order)

1. **App:** Leave create/update/balance/context — self **or** HR (`employee.edit` / `leave.manage` / portal HR) **or** manager+team.  
2. **App:** Profile photo — self **or** `employee.edit` only.  
3. **App:** Documents signed URL / list — managers must pass team assert.  
4. **App:** Middleware — fail closed on permission timeout for portal paths; seed idle cookie if missing.  
5. **App:** `import "server-only"` on admin client.  
6. **App:** Portal layout — require matching portal permission.  
7. **Migration (justified):** Tighten leave_requests INSERT + bank_accounts UPDATE RLS to self-or-permission.  
8. **Perf (small):** Avoid blocking CEO sync on critical path if safe; batch leave N+1 later.  
9. **Later:** Distributed rate limit (Upstash/Redis); public `/e` PII strip; CSP nonces; leave_balances aggregate RPC.

---

## FILES TO MODIFY (this implementation pass)

- `src/lib/leave/actions.ts`  
- `src/lib/leave/services/leave-mutations.ts` (shared assert helper if needed)  
- `src/lib/employees/profile-image-actions.ts`  
- `src/lib/supabase/admin.ts`  
- `src/middleware.ts`  
- `src/components/layout/portalshell-layout.tsx`  
- `src/lib/documents/actions.ts` (and/or utils)  
- `supabase/migrations/<new>_security_leave_bank_rls.sql` (focused)

## FILES NOT TO MODIFY

- Unrelated payroll/attendance/recruitment business logic  
- UI/UX redesign  
- Full RLS rewrite of all tables  
- Auth provider replacement  
- NGINX / new infrastructure  
- Production data

---

## INTENTIONALLY DEFERRED

| Item | Reason |
|------|--------|
| Distributed rate limiting | Needs Redis/Upstash env not confirmed in repo |
| Full RLS write rewrite for all tables | High risk; ship focused leave+bank first |
| Public `/e` PII strip | Product decision (QR card may be intentional) |
| CSP remove unsafe-inline/eval | Can break Next; report before destructive change |
| CEO sync offload / leave N+1 batch | Performance follow-up after security pass |
| Strip employee `employee.view` dossier | Needs directory vs dossier product split |

---

*Audit completed before code changes. Implementation follows this document.*
