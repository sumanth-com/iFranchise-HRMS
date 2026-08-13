<p align="center">
  <img src="docs/brand/readme-banner.svg" alt="iFranchise HRMS" width="100%" />
</p>

<p align="center">
  <strong>Enterprise HR management</strong> for modern organizations — attendance, leave, payroll, performance, recruitment, and system administration in one secure platform.
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=nextdotjs" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img alt="Vercel" src="https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

---

## Overview

iFranchise HRMS is a production HRMS with role-based portals:

| Portal | Audience |
| --- | --- |
| **Employee** | Self-service attendance, leave, payslips, documents, goals |
| **Manager** | Team attendance, leave approvals, performance, recruitment |
| **HR / Dashboard** | Organization HR operations and reporting |
| **CEO** | Executive monitoring and approvals |
| **Super Admin** | System health, security, integrations, audit, provisioning |

Built with **Next.js 15**, **Supabase (Auth + Postgres + RLS)**, and **server actions** — no mock data in production paths.

---

## Quick start

```bash
npm install
cp .env.example .env.local
npm run generate:secrets
```

1. Copy generated secrets into `.env.local`
2. Add Supabase URL/keys and SMTP settings
3. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Required secrets

Signing secrets are **HMAC tokens** — never reuse the Supabase service role key.

| Variable | Purpose |
| --- | --- |
| `ONBOARDING_TOKEN_SECRET` | Onboarding invitation links |
| `APPROVAL_TOKEN_SECRET` | Email approve / reject links |
| `RESET_PASSWORD_TOKEN_SECRET` | Password reset signing |
| `EMAIL_VERIFICATION_TOKEN_SECRET` | Email verification / OTP flows |
| `PERMISSION_CACHE_SECRET` | Signed permission cookies (middleware) |
| `CRON_SECRET` | Bearer auth for `/api/cron/*` |

Production **will not start** if any required secret is missing.

```bash
npm run generate:secrets
```

---

## Deploy (Vercel)

1. Import this repository in [Vercel](https://vercel.com)
2. Set environment variables for **Production** (and Preview if needed)
3. Redeploy after any env change

### Application

| Name | Notes |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Exact production URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only — never expose to the client |

### Email

| Name | Notes |
| --- | --- |
| `EMAIL_FROM` | e.g. `iFranchise HRMS <noreply@yourdomain.com>` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | SMTP provider credentials |

### Rules

- Keep secrets in Vercel / `.env.local` only — **never commit them**
- Do not prefix signing secrets with `NEXT_PUBLIC_`
- Use a unique value for each secret
- Rotate and redeploy if a secret may be exposed

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run type-check` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run generate:secrets` | Generate signing secrets |
| `npm run supabase:link` | Link Supabase CLI to remote project |

---

## Security

- Row Level Security (RLS) on HRMS data
- Role + permission checks on server routes and actions
- Audit logging for sensitive operations
- No service-role keys in client bundles

Onboarding invitation email is sent by the **app via SMTP**. Supabase Auth email templates only cover invite-user and password-recovery flows (`supabase/templates/`).

---

<p align="center">
  <sub>Built for reliability · Optimized for speed · Secured by design</sub>
</p>
