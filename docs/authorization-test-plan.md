# Authorization test plan (targeted)

Do not treat UI hiding as proof of access control. Server actions, RLS, and layout permission gates must reject unauthorized IDs.

## Status legend

- **STATIC** — verified by reading code / unit tests (no live users).
- **LIVE** — signed in as real Employee A/B, Manager, HR, CEO against the database.
- This run: **LIVE = NOT VERIFIED** (no Employee A→B / Manager / HR / CEO sessions were executed; no test-account credentials in this environment).

## Employee

| Case | Expected | This run |
| --- | --- | --- |
| A → A profile | Allow (session employee id) | STATIC |
| A → B profile | Deny unless `employee.view`/`employee.edit` and org scope | STATIC (coworker PII via `employee.view` remains a known gap) |
| A → A attendance | Allow | STATIC |
| A → B attendance | Deny manager/HR-only paths | STATIC |
| A → A leave | Allow `assertCanApplyLeaveForEmployee` self | STATIC + unit test |
| A → B leave | Reject “only apply leave for yourself” | STATIC + unit test |
| A → A payslip | Allow via RLS + `getPayslipById` org/self | STATIC |
| A → B payslip (`payslipId` swap) | `getPayslipById` returns null / no employee access | STATIC (RLS + org check); **LIVE NOT VERIFIED** |
| A → B documents | Signed URL / mutations bind self or `documents.*` | STATIC |
| A → B bank details | RLS `user_can_view_employee_financial` (self or `employee.edit`) | STATIC (migration applied); **LIVE NOT VERIFIED** |

## Manager

| Case | Expected | This run |
| --- | --- | --- |
| Assigned team member | `assertTeamMember` allows | STATIC + unit test |
| Another manager’s team | Throws reporting-hierarchy error | STATIC + unit test |
| Unrelated employee | Same reject | STATIC + unit test |

## HR

| Case | Expected | This run |
| --- | --- | --- |
| Authorized employee (same org, `employee.edit` / `leave.manage` / `portal.hr.access`) | Leave insert RLS + app HR branch | STATIC |
| Cross-org | `employee_belongs_to_user_org` / org filters | STATIC; **LIVE NOT VERIFIED** |

## CEO / executive

| Case | Expected | This run |
| --- | --- | --- |
| Portal `/ceo` | `portal.ceo.access` + middleware portal gate | STATIC |
| Employee visibility | Existing CEO query permissions (unchanged this pass) | **LIVE NOT VERIFIED** |

## ID manipulation (must be rejected server-side)

`employeeId`, `userId`, `organizationId`, `managerId`, `hrId`, `documentId`, `attendanceId`, `leaveRequestId`, `payslipId`

| ID | Server behavior (code) | Live |
| --- | --- | --- |
| `employeeId` on leave apply | `assertCanApplyLeaveForEmployee` + RLS insert | NOT VERIFIED live |
| `payslipId` on employee payroll actions | Session profile + RLS; not another employee’s session | NOT VERIFIED live |
| `documentId` | Self or documents permissions + storage path org check | NOT VERIFIED live |
| `organizationId` | Profile org, not client-supplied org for self-service | STATIC |
| `userId` | Auth session user, not request body | STATIC |
| `leaveRequestId` | Mutations check applicant / approver authorization | STATIC |

## Unit tests added

- `src/lib/leave/leave-applicant-roles.test.ts`
- `src/lib/leave/services/leave-access.test.ts`
- `src/lib/manager/services/team-member-guard.test.ts`
