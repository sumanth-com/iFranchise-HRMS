# iFranchise HRMS — Developer → UI/UX Designer Handoff

**Product:** iFranchise HRMS  
**Version:** Current `main` (enterprise multi-portal HRMS)  
**Audience:** Senior UI/UX designer preparing high-fidelity designs  
**Scope:** Documentation of the **existing implementation** — not new UI proposals  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [User Roles](#2-user-roles)
3. [Complete Information Architecture](#3-complete-information-architecture)
4. [Navigation Structure](#4-navigation-structure)
5. [Screen Breakdown (Patterns & Modules)](#5-screen-breakdown-patterns--modules)
6. [Dashboard Specifications](#6-dashboard-specifications)
7. [Design System](#7-design-system)
8. [Color System](#8-color-system)
9. [Responsive Breakpoints](#9-responsive-breakpoints)
10. [UX Guidelines](#10-ux-guidelines)
11. [Design Constraints](#11-design-constraints)
12. [High-Fidelity Expectations](#12-high-fidelity-expectations)
13. [Components Inventory](#13-components-inventory)
14. [Deliverables Expected from UI/UX Designer](#14-deliverables-expected-from-uiux-designer)

---

## 1. Project Overview

### Purpose of the HRMS

iFranchise HRMS is an **enterprise Human Resource Management System** for franchise and multi-branch organizations. It centralizes:

- Employee lifecycle (hire → onboard → manage → exit)
- Time & attendance, leave, payroll, documents, assets
- Performance, recruitment, org structure, roles & permissions
- Executive oversight (CEO portal), manager team operations, employee self-service
- System administration (Super Admin), audit, notifications, reports

### Target users

| Segment | Who they are |
|---------|----------------|
| **HR / People Ops** | Administer workforce, policies, payroll, compliance |
| **Managers** | Lead teams: approvals, attendance, performance, recruitment |
| **Employees** | Self-service: attendance, leave, payslips, documents, profile |
| **Executives (CEO / Founder)** | Workforce analytics, approvals, strategic KPIs |
| **Super Admin** | Platform, IAM, system health, integrations |
| **Candidates** | Pre-hire onboarding via invitation portal |

### Product goals

- **Single source of truth** for employee and org data
- **Permission-scoped portals** — users see only what their role allows
- **Self-service + administration** in one product (HR portal has both)
- **Auditability** — actions logged; enterprise security (RLS, signed tokens)
- **Multi-portal access** for users with multiple roles (portal switcher for Super Admin)

### Enterprise-level expectations

- Role-based access control (RBAC) on every route and action
- Consistent shell across portals (sidebar, top nav, breadcrumbs)
- Production error handling (route error boundaries, graceful fallbacks)
- Dark mode support (`next-themes`)
- Responsive layouts (desktop-first, mobile sheet navigation)
- Accessible focus rings, keyboard-friendly controls (shadcn/Base UI primitives)
- No client-side secrets; server actions for mutations
- Professional, data-dense UI suitable for daily HR operations (not consumer-style)

---

## 2. User Roles

Roles are stored in `hrms.roles` and assigned via `user_roles`. Portal access is gated by **portal permissions** plus module permissions.

### Super Admin

- **Role code:** `super_admin`
- **Default portal:** HR (`/dashboard`)
- **System access:** `/dashboard/system` + `system.admin.access`
- **Responsibilities:**
  - System health (database, storage, email, API keys, backup)
  - Deep links to IAM, audit, company config, feature flags, maintenance
  - **Portal switcher** — can jump between all portals
- **Not provisioned** via standard user provisioning UI (seeded / elevated)

### HR (HR Admin / HR Executive)

- **Role codes:** `hr_admin`, `hr_executive`
- **Portal permission:** `portal.hr.access`
- **Responsibilities:**
  - **Self-service:** own attendance, leave, payroll, documents, profile, settings
  - **Administration:** employees, onboarding, attendance/leave/payroll management, documents, assets, performance, recruitment, exit, organization, roles, reports, audit, company settings
  - User provisioning (HR route)
- **Home:** `/` = personal dashboard; **HR Overview** = `/dashboard/hr-overview`

### CEO / Executive

- **Role codes:** `ceo`, `founder`, `co_founder`
- **Portal permission:** `portal.ceo.access`
- **Portal route:** `/ceo` (alias: `/executive` redirects to `/ceo`)
- **Responsibilities:**
  - Executive KPIs, workforce snapshot, department distribution
  - Approvals (leave, exit, recruitment-related)
  - Analytics, reports, user provisioning (executive route)
  - Read-heavy oversight; drawer-based detail views

### Manager

- **Role code:** `manager`
- **Portal permission:** `portal.manager.access`
- **Responsibilities:**
  - Team roster, member profiles, team attendance & leave approvals
  - Own self-service (profile, payroll, documents, leave)
  - Performance feedback, 1:1s, recruitment (team scope)
  - Manager reports, resignation approvals for team

### Employee

- **Role code:** `employee`
- **Portal permission:** `portal.employee.access`
- **Responsibilities:**
  - Attendance (view/punch per policy)
  - Leave apply & track
  - Payslips, documents, assigned assets
  - **My Profile** (one-time editable personal details + digital ID)
  - Resignation apply, notifications, settings

### Candidate (Onboarding Portal)

- **Not an authenticated app role** — public/candidate flow
- **Routes:** `/onboarding/login`, `/onboarding/invite/[token]`, `/onboarding/portal`
- **Responsibilities:**
  - Complete onboarding wizard (documents, forms, signature)
  - OTP / invitation token access
- **HR manages** cases at `/dashboard/onboarding` and `/dashboard/onboarding/[id]`

---

## 3. Complete Information Architecture

**~190 screens** implemented as Next.js App Router pages. Below: portal → primary areas → routes.

### HR Portal (`/dashboard` + `/`)

#### Self-Service (sidebar section)

| Screen | Route |
|--------|-------|
| Dashboard (personal) | `/` |
| My Profile | `/dashboard/profile` |
| Attendance | `/dashboard/attendance` |
| Leave | `/dashboard/leave` |
| New Leave | `/dashboard/leave/new` |
| Payroll / Payslips | `/dashboard/payroll` |
| Documents (personal) | `/dashboard/documents` |
| Assets (assigned) | `/dashboard/assets` |
| Notifications hub | `/dashboard/notifications` |
| Notification center | `/dashboard/notifications/center` |
| Notification history | `/dashboard/notifications/history` |
| Notification preferences | `/dashboard/notifications/preferences` |
| Settings | `/dashboard/settings`, `/settings` |
| Help | `/dashboard/help` |

#### Administration (sidebar section)

| Area | Routes |
|------|--------|
| **HR Overview** | `/dashboard/hr-overview` |
| **Employees** | `/dashboard/employees`, `/new`, `/[employeeRef]`, `/[employeeRef]/edit` |
| **Directory** | `/dashboard/directory` |
| **User Provisioning** | `/dashboard/user-provisioning` |
| **Onboarding (HR)** | `/dashboard/onboarding`, `/dashboard/onboarding/[id]` |
| **Attendance management** | `/dashboard/attendance-management`, `/new`, `/[id]`, `/[id]/edit`, `/policy`, `/settings` |
| **Leave management** | `/dashboard/leave-management`, `/new`, `/[id]`, `/balances`, `/calendar`, `/policy`, `/settings` |
| **Payroll management** | `/dashboard/payroll-management`, `/run`, `/history`, `/[id]`, salary structures, revisions, bonuses, reimbursements, payslips, settings |
| **Documents management** | `/dashboard/documents-management`, employees, letters, templates, expiring, settings |
| **Assets management** | `/dashboard/assets-management`, inventory, assignments, maintenance, vendors, reports, settings |
| **Performance** | `/dashboard/performance`, goals, KPIs, reviews, feedback, 1:1s, promotions, history, settings |
| **Recruitment** | `/dashboard/recruitment`, jobs, candidates, interviews, offers, analytics, settings |
| **Exit / Offboarding** | `/dashboard/exit`, resignations, clearance, assets, settlement, interview, documents, settings |
| **Organization** | `/dashboard/organization`, profile, branches, departments, designations, employment types, work locations, holidays, shifts, hierarchy |
| **Roles & Access** | `/dashboard/roles`, manage, permissions matrix, assignments, compare |
| **Reports** | `/dashboard/reports`, hr, attendance, leave, payroll, performance, recruitment, assets, exit, exports, settings |
| **Audit** | `/dashboard/audit`, logs, `/logs/[ref]`, timeline, settings |
| **Company Settings** | `/dashboard/company-settings` |
| **Notification admin** | `/dashboard/notifications/templates`, `/dashboard/notifications/settings` |
| **403** | `/403` |

### Manager Portal (`/manager`)

| Screen | Route |
|--------|-------|
| Dashboard | `/manager` |
| My Profile | `/manager/profile` |
| Attendance (my + team) | `/manager/attendance` |
| My Team | `/manager/team`, `/manager/team/[employeeRef]` |
| Leave | `/manager/leave`, `/manager/leave/new` |
| Payroll | `/manager/payroll`, `/manager/payroll/history` |
| Documents | `/manager/documents` |
| Performance | `/manager/performance` |
| Recruitment | `/manager/recruitment` |
| Reports | `/manager/reports` |
| Notifications | `/manager/notifications`, center, history |
| Settings | `/manager/settings` |
| Resignation (team) | `/manager/resignation` |
| Help | `/manager/help` |

### Employee Portal (`/employee`)

| Screen | Route |
|--------|-------|
| Dashboard | `/employee` |
| My Profile | `/employee/profile` |
| Attendance | `/employee/attendance`, `/employee/attendance/policy` |
| Directory | `/employee/directory` |
| Leave | `/employee/leave`, `/new`, `/policy` |
| Payroll | `/employee/payroll`, `/employee/payroll/history` |
| Documents | `/employee/documents` |
| Assets | `/employee/assets` |
| Notifications | `/employee/notifications` |
| Settings | `/employee/settings` |
| Resignation | `/employee/resignation`, `/apply` |
| Help | `/employee/help` |

### CEO / Executive Portal (`/ceo`)

| Screen | Route |
|--------|-------|
| Dashboard | `/ceo` |
| Organization | `/ceo/organization` |
| Recruitment | `/ceo/recruitment` |
| Performance | `/ceo/performance` |
| Payroll | `/ceo/payroll` |
| Attendance | `/ceo/attendance` |
| Leave | `/ceo/leave` |
| Exit | `/ceo/exit` |
| Approvals inbox | `/ceo/approvals` |
| Analytics | `/ceo/analytics` |
| Reports | `/ceo/reports` |
| Notifications | `/ceo/notifications`, center, history |
| User Provisioning | `/ceo/user-provisioning` |
| Profile & settings | `/ceo/profile` |
| Help | `/ceo/help` |

### Super Admin (`/dashboard/system`)

| Screen | Route |
|--------|-------|
| System dashboard | `/dashboard/system` |
| Database | `/dashboard/system/database` |
| Storage | `/dashboard/system/storage` |
| Email services | `/dashboard/system/email` |
| API keys | `/dashboard/system/api-keys` |
| Backup | `/dashboard/system/backup` |
| Module deep links | `/dashboard/system/[module]` (organization, roles, permissions, provisioning, audit, branding, SMTP, integrations, license, feature flags, maintenance, import-export, environment, etc.) |

### Candidate / Onboarding Portal

| Screen | Route |
|--------|-------|
| Candidate login (OTP) | `/onboarding/login` |
| Invitation landing | `/onboarding/invite/[token]` |
| Onboarding wizard | `/onboarding/portal` |

### Public & Auth

| Screen | Route |
|--------|-------|
| Login | `/login` |
| Forgot password | `/forgot-password` |
| Reset password | `/reset-password` |
| Email approval (token) | `/approval/[token]` |
| Public employee profile (QR) | `/e/[employeeRef]`, `/e/[employeeRef]/card` |
| Payslip verification | `/verify/payslip/[payslipRef]` |

---

## 4. Navigation Structure

### Sidebar

- **Component:** `sidebar.tsx` + `mobile-sidebar.tsx` (Sheet on mobile)
- **Width:** `w-64` expanded / `w-16` collapsed (icon-only)
- **Visibility:** `hidden md:flex` on desktop; hamburger opens sheet on mobile
- **Sections:** HR portal splits **Self-service** and **Administration** with section labels
- **Filtering:** Items hidden when user lacks `permissions` on nav item (`getSidebarNavigation`)
- **Active state:** Route match + prefix match for nested routes
- **Icons:** Lucide React (per nav config)

### Top Navigation

- **Height:** `h-14`, border-bottom, `bg-background`
- **Left:** Mobile menu (md:hidden), sidebar collapse (md+), breadcrumbs or “Dashboard” label on portal home
- **Right:** Portal switcher (Super Admin only) → Notification bell → User profile dropdown
- **No global search** on all portals — only **HR Overview** header has command-style search

### Breadcrumbs

- **Component:** `breadcrumb-nav.tsx`
- Path-driven `buildBreadcrumbItems()` with portal-specific overrides
- Portal home shows static “Dashboard” text instead of crumbs
- Supports dynamic labels via `BreadcrumbLabelProvider`

### Quick Actions

- **HR Overview:** Priority task tiles (interviews, probation, payroll due, offers)
- **Manager:** `MANAGER_QUICK_ACTIONS` on team pages (not dashboard home)
- **Employee:** `EmployeeQuickActions` component exists but **not mounted** on dashboard currently
- **HR header:** “Add Employee” when `employee.create` permission

### Notifications

- **Bell:** Dropdown preview in top nav, 30s polling, mark-as-read
- **Full center:** Split list/detail, tabs (all/unread/read/archived), search, pagination
- **HR hub:** My + Team sections at `/dashboard/notifications`

### Search

- **HR Overview only:** `DASHBOARD_SEARCH_CATALOG` (~30 modules), permission-filtered, max 8 results
- **Module lists:** URL `?search=` on employees, notifications, etc.
- **Directory:** Inline filter on employee directory views

### Profile Menu

- **UserProfileDropdown** in top nav — settings links, logout
- **My Profile** is a **sidebar item** (not only in dropdown) for Employee, Manager, HR

### Mobile Navigation

- Sheet-based sidebar (`side="left"`, `w-64`)
- Top nav hamburger triggers `setMobileOpen(true)`
- Page content: `overflow-y-auto`, padding `p-4 md:p-5` or `md:p-6`
- KPI grids collapse to 2 columns on small screens

---

## 5. Screen Breakdown (Patterns & Modules)

Below: **recurring patterns** applied across modules. Designers should apply these consistently to every screen of each type.

### List / Index screens

| Aspect | Implementation |
|--------|----------------|
| **Purpose** | Browse, filter, paginate entity collections |
| **Primary actions** | Create (top-right or sticky bar), row click → detail |
| **Secondary** | Export, bulk actions (module-specific) |
| **Layout** | Page title + description → filter bar → `DataTable` or custom table |
| **Filters** | `FilterSelect`, URL search params, module filter components |
| **Search** | Input bound to URL or local state |
| **Pagination** | URL-driven (`page`, `pageSize`) or TanStack manual pagination |
| **Empty** | `EmptyState` — dashed border, title, description, optional CTA |
| **Loading** | `PageSkeleton`, `LoadingSpinner`, route `loading.tsx` |
| **Error** | `ErrorState` inline or `error.tsx` boundary |

### Detail screens

| Aspect | Implementation |
|--------|----------------|
| **Purpose** | View single record; tabs for overview, employment, documents, etc. |
| **Primary actions** | Edit (permission-gated), approve/reject where applicable |
| **Layout** | Header (name + badges) → tab bar → tab content |
| **Employee detail** | Overview grid: info table + **Digital ID card** (right column) |
| **My Profile** | Same layout; Edit/Save top-right; one-time personal edit |

### Form / Create / Edit screens

| Aspect | Implementation |
|--------|----------------|
| **Purpose** | Create or update records |
| **Pattern** | `react-hook-form` + `zod`; server actions on submit |
| **Layout** | Section headings → 2-column grid on `md+` |
| **Validation** | Inline field errors (`text-xs text-destructive`) |
| **Submit** | Primary button; sticky footer on long forms (`StickyPageActions`) |
| **Success** | `toast.success()` (Sonner); optional `SuccessCelebrationOverlay` |
| **Error** | `toast.error()` + server message |

### Dialogs vs Drawers

| Use dialog (`Modal` / `Dialog`) | Use drawer (`Sheet`) |
|--------------------------------|----------------------|
| Confirmations, delete | Multi-section detail views |
| Short forms (upload, rename) | Team member profile |
| CEO forward/approve quick actions | CEO module inspectors |
| | Manager attendance/leave detail |

### Module-specific notes

| Module | Key UI elements |
|--------|-----------------|
| **Attendance** | Status badges, calendar views, regularization dialogs |
| **Leave** | Status badges, calendar, approval timeline, half-day options |
| **Payroll** | Run wizard, payslip template, status badges, INR formatting |
| **Documents** | Folder explorer, file cards, upload modal, version dialog |
| **Recruitment** | Pipeline tables, interview scheduler, candidate drawers |
| **Performance** | Review stages, rating inputs, 1:1 scheduler |
| **Exit** | Clearance checklist, settlement forms |
| **Onboarding** | Multi-step wizard, signature pad, document upload |
| **Roles** | Permission matrix, role compare |
| **Audit** | Immutable log table, timeline view |

### Status & feedback states

| State | Component / pattern |
|-------|---------------------|
| **Empty** | `EmptyState`, `EmployeeEmpty`, table `emptyMessage` |
| **Loading** | `Skeleton`, `PageSkeleton`, `DashboardSkeleton`, `LoadingSpinner` |
| **Error** | `ErrorState`, `AppRouteError`, `global-error.tsx` |
| **Success** | Sonner toast, celebration overlay (select flows) |

---

## 6. Dashboard Specifications

### Employee Dashboard (`/employee`, HR self-service `/`)

| Element | Content |
|---------|---------|
| **Header** | Greeting, avatar, designation/dept, live date/time |
| **KPIs (4)** | Today's attendance, working hours today, leave balance, pending leave requests |
| **Widgets** | Attendance widget (timer, punch state), Daily Boost card, upcoming holidays |
| **Charts** | None |
| **Quick actions** | Component exists but not on home screen |

### Manager Dashboard (`/manager`)

| Element | Content |
|---------|---------|
| **KPIs (up to 8)** | Team size, present today, on leave, late today, pending leave approvals, pending reviews, open recruitment, probation ending |
| **Panels** | Today's priorities (urgency borders), recent team activity (live feed, 30s poll) |
| **Footer** | Daily Boost (compact) |
| **Charts** | None |

### HR Overview (`/dashboard/hr-overview`)

| Element | Content |
|---------|---------|
| **Header** | Global search + Add Employee |
| **Today's Pulse** | Present, on leave, late, pending approvals, exit requests, upcoming holidays |
| **Priority tasks** | Interviews today, probation ending, payroll due, pending offers |
| **Charts** | 7-day attendance trend (vertical bars), 6-month hiring (vertical bars) |
| **Recent activity** | Activity feed panel |
| **Footer** | Daily Boost (compact) |

### CEO Dashboard (`/ceo`)

| Element | Content |
|---------|---------|
| **KPIs (6)** | Employees, attendance %, attrition %, open roles, pending approvals, payroll cost (INR) |
| **Snapshot strip** | New joiners, exits, net change, hires closed |
| **Workforce panel** | Present/absent/interviews mini-stats + **department donut chart** |
| **Priorities panel** | Leave approvals, reviews, open roles, payroll status tiles |
| **Charts** | Donut on home; additional chart data in types but not rendered on home |

---

## 7. Design System

**Stack:** Tailwind CSS v4, shadcn/ui (`base-nova`), Base UI primitives, `next-themes`, Lucide icons.

### Typography

| Property | Value |
|----------|--------|
| **Font family** | **Inter** (`next/font/google`) — sole UI font |
| **CSS variable** | `--font-sans` on `html` and `body` |
| **Heading font** | Same as body (`--font-heading` = `--font-sans`) |
| **Monospace** | `font-mono` references `--font-geist-mono` (not loaded in layout — falls back to system mono) |

#### Size hierarchy (Tailwind classes in use)

| Level | Classes | Typical use |
|-------|---------|-------------|
| Display / page title | `text-2xl font-semibold tracking-tight` | Page H1 |
| Section title | `text-base font-semibold` or `text-sm font-semibold` | Section H2 |
| Body | `text-sm` | Default UI text, tables, buttons |
| Caption / helper | `text-xs text-muted-foreground` | Hints, field help |
| Micro | `text-[10px]`, `text-[11px]` | KPI labels, compact badges |
| Large values | `text-lg`, `text-xl`, `text-3xl` | KPI numbers, hero headings |

#### Weights

`font-medium` (labels, nav), `font-semibold` (headings, KPIs)

#### Line height / tracking

`leading-snug`, `leading-relaxed`, `tracking-tight`, `tracking-wide`, `uppercase` (section eyebrows), `tabular-nums` (metrics)

### Spacing system

No custom spacing tokens — **Tailwind default scale**.

| Pattern | Values |
|---------|--------|
| Page padding | `p-4 md:p-5` or `px-4 md:px-6`, `md:p-6` |
| Section gap | `gap-4`, `gap-6` between major blocks |
| Card padding | `p-4 md:p-5` |
| Grid gaps | `gap-3`, `gap-4`, `gap-6` |
| Sticky action bar | `sm:p-4` with negative margin alignment |

### Border radius

Base `--radius: 0.625rem` (10px)

| Token | ~Size |
|-------|-------|
| `rounded-md` / `radius-md` | ~8px |
| `rounded-lg` | Buttons, inputs |
| `rounded-xl` | Cards, dialogs, main panels |
| `rounded-2xl` | Profile avatars, document folders |
| `rounded-full` | Badges, pills, avatars |

### Shadows & elevation

No shadow design tokens. Usage:

- `shadow-sm` — cards, panels, filter bars
- `shadow-md` — dropdowns, hover elevation
- `shadow-lg` — sheets
- `ring-1 ring-foreground/10` — dialogs/dropdowns (border substitute)

### Icons

- **Library:** Lucide React
- **Sizes:** `size-4` (buttons), `size-5` (nav), `size-3.5` (compact)

### Buttons

- **Variants:** `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`
- **Sizes:** `default` (h-8), `xs`, `sm`, `lg`, icon variants
- **Base:** `rounded-lg`, `text-sm font-medium`, focus `ring-3 ring-ring/50`

### Inputs

- shadcn `Input`, `Select`, `Label`
- Height often `h-8` or `h-10` on triggers
- Error text below field

### Tables

- shadcn `Table` + `DataTable` wrapper (TanStack)
- Header: `text-muted-foreground`
- Row hover: `hover:bg-muted/50`
- Empty: single row message

### Badges

No shared Badge primitive — domain `*-status-badge.tsx` components:

- Pattern: `inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium`
- Semantic Tailwind colors (emerald, amber, blue, destructive, violet, orange)

### Avatars

- shadcn `Avatar` / `AvatarFallback` / `AvatarImage`
- Employee header, directory cards, notification list

### Cards

Compositional — no `Card` component:

`rounded-xl border bg-card shadow-sm` + internal padding

### Dialogs

- `Dialog` (Base UI): centered, `rounded-xl`, backdrop blur, `sm:max-w-sm` default
- `Modal` wrapper: structured header/body/footer, `sm:max-w-lg`, scrollable body

### Drawers

- `Sheet`: `side` top/right/bottom/left; default right; `w-3/4 sm:max-w-sm` (mobile nav wider)

### Tabs

- Inline tab buttons with border-bottom active state (employee detail, manager drawers)
- Sub-nav: `rounded-lg border bg-card p-1` pill tabs (documents sub-nav pattern)

### Dropdowns

- `DropdownMenu` for profile menu, portal switcher, row actions

### Date pickers

- Native `input type="date"` and date-fns formatting in many forms
- No dedicated calendar picker component in ui folder

### Pagination

- Module components: Prev/Next + page info
- URL params: `page`, `pageSize`

### Toast notifications

- **Sonner:** `position="top-right"`, `richColors`, `closeButton`
- `toast.success()`, `toast.error()`, `toast.message()`

### Skeleton loaders

- `Skeleton`: `animate-pulse rounded-md bg-muted`
- `PageSkeleton`, `DashboardSkeleton`, `ModulePageSkeleton`

---

## 8. Color System

Colors use **oklch** CSS variables. Light (`:root`) and dark (`.dark`) themes.

### Semantic tokens

| Token | Role |
|-------|------|
| `--background` / `--foreground` | Page background and primary text |
| `--card` / `--card-foreground` | Elevated surfaces |
| `--primary` / `--primary-foreground` | Primary actions (near-black in light mode) |
| `--secondary` | Secondary surfaces |
| `--muted` / `--muted-foreground` | Subtle backgrounds and secondary text |
| `--accent` | Hover highlights |
| `--destructive` | Errors, delete actions |
| `--border`, `--input`, `--ring` | Borders, inputs, focus rings |
| `--sidebar-*` | Sidebar-specific palette |

### Status colors (Tailwind utilities, not CSS vars)

| Meaning | Pattern |
|---------|---------|
| Success / active | `emerald-500/10`, `emerald-700` |
| Warning / pending | `amber-500/10`, `amber-700` |
| Info | `blue-500/10`, `blue-700` |
| Error | `destructive/10`, `destructive` |
| Neutral / draft | `muted`, `muted-foreground` |
| Submitted / purple | `violet-500/10` |
| At-risk / orange | `orange-500/10` |

### Text hierarchy

1. **Primary:** `text-foreground` — headings, values  
2. **Secondary:** `text-muted-foreground` — labels, descriptions  
3. **Destructive:** `text-destructive` — errors  
4. **On primary:** `text-primary-foreground` — primary button text  

### Charts

`--chart-1` through `--chart-5` — grayscale oklch steps; bar charts use emerald/violet gradients in HR/CEO dashboards.

---

## 9. Responsive Breakpoints

Tailwind v4 defaults (no custom breakpoints):

| Breakpoint | Min width | Expected behavior |
|------------|-----------|-------------------|
| Default | &lt; 640px | Single column, sheet nav, 2-col KPI grids |
| `sm` | 640px | 2–3 column grids, sticky bar padding |
| `md` | 768px | Sidebar visible, collapsed toggle, `md:p-6` padding |
| `lg` | 1024px | 2-column detail layouts (info + ID card), manager panels |
| `xl` | 1280px | 4–5 column KPI rows |
| `2xl` | 1536px | Max content width patterns |

### Per portal

| Portal | Mobile | Desktop |
|--------|--------|---------|
| **HR** | Sheet sidebar; tables scroll horizontally | Full sidebar + administration sections |
| **Manager** | Team drawers full-width sheet | Split panels on dashboard |
| **Employee** | Stacked dashboard widgets | 3:2 grid attendance + holidays |
| **CEO** | Stacked KPIs and panels | 2-column workforce/priorities |
| **Onboarding** | Single-column wizard steps | Centered wizard with max-width |

---

## 10. UX Guidelines

### Enterprise UX principles

- **Clarity over decoration** — data density acceptable for HR power users
- **Permission-aware UI** — hide/disable actions user cannot perform
- **Consistent shell** — same top nav + sidebar pattern in all portals
- **Link-first navigation** — KPIs and priorities deep-link to filtered module views
- **Server-validated forms** — never trust client-only validation

### Consistency

- Reuse `EmptyState`, `ErrorState`, `DataTable`, status badges per domain
- Page title + muted description under every major screen
- `rounded-xl border bg-card shadow-sm` for content panels

### Accessibility

- `aria-label` on icon-only buttons (menu, collapse, upload photo)
- Focus rings on interactive elements (`ring-ring/50`)
- Semantic tables with `th`/`td`
- Form labels via `Label` component

### Interaction states

| State | Pattern |
|-------|---------|
| **Hover** | `hover:bg-muted`, `hover:bg-accent/40` |
| **Active** | Nav: `bg-primary text-primary-foreground`; tabs: border or pill fill |
| **Focus** | `ring-3 ring-ring/50` on buttons |
| **Disabled** | `disabled:opacity-50`, `disabled:cursor-not-allowed` |
| **Loading** | `Loader2 animate-spin` on buttons; skeleton placeholders |

### Form validation

- Zod schemas server + client (`zodResolver`)
- Errors below fields in `text-xs text-destructive`
- Toast on action failure with server message

### Confirmation dialogs

- Destructive actions: `Modal` with confirm/cancel
- Delete document, cancel interview, etc.

### Loading behavior

- Route-level: `loading.tsx` skeletons
- In-component: Suspense + skeleton/spinner
- Optimistic UI rare — prefer refresh after server action

---

## 11. Design Constraints

**Do not change without product/engineering sign-off:**

| Area | Constraint |
|------|------------|
| **Routes / URLs** | All routes listed in Section 3 are implemented and bookmarked |
| **Permissions** | UI must respect RBAC; no exposing admin actions to employees |
| **Portal boundaries** | Four portals + system admin + onboarding — do not merge into one nav |
| **Workflows** | Leave approval chain, payroll run, onboarding activate, exit clearance |
| **My Profile** | One-time self-edit; HR fields read-only; photo always editable on ID card |
| **Digital ID card** | Front/back flip, QR to public profile route — brand element |
| **Data tables** | Server-driven pagination/filter patterns |
| **Server actions** | Mutations go through existing actions, not new client-only APIs |
| **Breadcrumb logic** | Path-driven; special cases per portal |
| **Notification model** | Bell + center + module-specific hubs |
| **Dark mode** | Must work with existing CSS variable theming |
| **Executive alias** | `/executive` → `/ceo` redirect |

---

## 12. High-Fidelity Expectations

Target quality comparable to **Workday**, **SAP SuccessFactors**, **BambooHR**, **Linear**, **Notion**, **Stripe Dashboard**, **Vercel Dashboard**:

| Principle | Application |
|-----------|-------------|
| **Clean layouts** | Clear page hierarchy; avoid visual clutter in data-heavy tables |
| **Professional spacing** | Consistent `gap-6` rhythm; generous card padding |
| **Premium typography** | Inter at `text-sm` default; strong weight contrast for hierarchy |
| **Visual hierarchy** | Page title → section → field label → value |
| **Modern enterprise UI** | Neutral palette, subtle borders, minimal color except status |
| **Elegant interactions** | Subtle hover, smooth sheet/dialog transitions, no flashy animation |
| **Production-ready** | Every state designed: empty, loading, error, success |
| **Data density** | Tables and KPI grids optimized for 1440px laptops |
| **Trust** | Audit trails, confirmation for destructive actions, clear permission denial |

**Do not** consumer-app aesthetics (oversized rounded corners everywhere, heavy gradients on main UI). Accent color is intentionally **neutral-first**; status colors carry semantic meaning.

---

## 13. Components Inventory

### UI primitives (`src/components/ui/`)

`avatar`, `breadcrumb`, `button`, `dialog`, `dropdown-menu`, `input`, `label`, `select`, `separator`, `sheet`, `skeleton`, `table`, `tooltip`

### Common (`src/components/common/`)

`button`, `input`, `select`, `modal`, `data-table`, `filter-select`, `optional-entity-select`, `sticky-layout` (ModuleShell, PageScroll, StickyPageActions), `page-skeleton`, `empty-state`, `error-state`, `app-route-error`, `loading-spinner`, `success-celebration-overlay`

### Layout (`src/components/layout/`)

`dashboard-shell`, `sidebar`, `mobile-sidebar`, `top-nav`, `breadcrumb-nav`, `user-profile-dropdown`, `portalshell-layout`, `navigation-progress`

### Domain status badges (representative)

`leave-status-badge`, `attendance-status-badge`, `employment-status-badge`, `employee-account-status-badge`, `payroll-status-badge`, `recruitment-status-badge`, `performance-status-badge`, `notification-status-badge`, `audit-status-badge`, `org-status-badge`, `role-status-badge`

### Notable feature components

| Area | Components |
|------|------------|
| **Employee** | `employee-dashboard-view`, `my-profile-view`, `documents-explorer`, `employee-id-card`, directory cards |
| **Manager** | `manager-dashboard`, team member drawer, leave view, recruitment drawers |
| **HR** | `hr-dashboard`, `employee-detail-view`, onboarding review, module management screens |
| **CEO** | `ceo-dashboard`, module drawers (payroll, recruitment, approvals, leave) |
| **System** | `portal-switcher`, system admin panels |
| **Notifications** | `notification-bell`, `notification-center-split-view`, preferences form |
| **Charts** | Custom `VerticalBarChart`, `WorkforceDonut` (SVG, not chart library) |

### Providers

`auth-provider`, `app-providers` (theme + toaster), `active-portal-provider`

### Icons

Lucide React — entire icon set available; nav uses curated subset per portal config.

---

## 14. Deliverables Expected from UI/UX Designer

### 1. Design system documentation (Figma)

- Typography scale mapped to Inter weights/sizes
- Color tokens matching oklch semantic names (light + dark)
- Spacing scale (4px base recommended to align with Tailwind)
- Radius, shadow, elevation scale
- Icon size guidelines

### 2. Component library (Figma)

- All primitives in Section 13 with variants (button, input, select, table, badge, avatar, dialog, sheet, toast, skeleton)
- Status badge variants per domain (leave, attendance, employment, payroll, etc.)
- Digital ID card (front + back + photo states)
- Empty, error, loading state templates

### 3. High-fidelity screens

- **All portal homes** (Employee, Manager, HR self-service, HR Overview, CEO)
- **My Profile** (view, edit, submitted/read-only states)
- **Representative flows:** leave apply, leave approval, employee detail, payroll payslip, document explorer, onboarding wizard step, recruitment candidate drawer, roles permission matrix
- **Auth:** login, forgot/reset password
- **System admin** dashboard panel

### 4. Responsive designs

- Breakpoints: 375px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop)
- Mobile sheet navigation + stacked KPIs
- Tablet: 2-column forms, collapsed sidebar option

### 5. Auto layout & grids

- 12-column grid recommendation for `max-w-6xl` / `max-w-4xl` content areas
- KPI card grid: 2 → 4 → 5 columns
- Detail layout: `lg:grid-cols-[1fr_22rem]` for info + ID card

### 6. Design tokens (export for dev)

| Token type | Examples |
|------------|----------|
| Color | `background`, `foreground`, `primary`, `muted-foreground`, status colors |
| Typography | `text-page-title`, `text-body`, `text-caption` |
| Spacing | `space-page`, `space-section`, `space-card` |
| Radius | `radius-card`, `radius-button`, `radius-badge` |
| Shadow | `shadow-card`, `shadow-dropdown` |

Map tokens to existing CSS variables where possible for 1:1 implementation.

### 7. Interactive prototype

- Portal navigation flow
- Leave approval end-to-end
- My Profile one-time edit → HR contact message
- Manager team member drawer tabs
- Notification center read/archive flow

### 8. Developer handoff package

- Figma dev mode specs for spacing, typography, colors
- Component–code mapping table (Figma component → `src/components/...`)
- Annotation of permission-gated elements
- State matrix per screen (default, loading, empty, error, success)
- Dark mode variants for all screens
- Accessibility notes (focus order, aria labels for icon buttons)

---

## Appendix: Key source files for designers pairing with dev

| Topic | Path |
|-------|------|
| Global styles / tokens | `src/app/globals.css` |
| Font loading | `src/app/layout.tsx` |
| HR navigation | `src/config/navigation.ts` |
| Employee navigation | `src/config/employee-navigation.ts` |
| Manager navigation | `src/config/manager-navigation.ts` |
| CEO navigation | `src/config/ceo-navigation.ts` |
| App shell | `src/components/layout/dashboard-shell.tsx` |
| Search catalog | `src/lib/dashboard/search-catalog.ts` |
| Portal permissions | `src/lib/auth/portals.ts` |

---

*Document generated from codebase audit. Update when routes or design tokens change.*
