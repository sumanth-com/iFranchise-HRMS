# iFranchise HRMS

Enterprise HR management platform built with Next.js 15 and Supabase.

## Local development

```bash
npm install
cp .env.example .env.local
npm run generate:secrets
```

Copy the generated secrets into `.env.local`, then fill in Supabase and SMTP values from your project dashboard.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Generate signing secrets

Production token flows use dedicated HMAC secrets (never the Supabase service role key):

```bash
npm run generate:secrets
```

This prints values in `.env` format. Copy them into `.env.local` (development) or your hosting provider (production).

| Variable | Purpose |
| --- | --- |
| `ONBOARDING_TOKEN_SECRET` | Pre-joining onboarding invitation links |
| `APPROVAL_TOKEN_SECRET` | Email approval / reject action links |
| `RESET_PASSWORD_TOKEN_SECRET` | Password reset token signing |
| `EMAIL_VERIFICATION_TOKEN_SECRET` | Email verification codes (onboarding OTP, future flows) |
| `PERMISSION_CACHE_SECRET` | Signed permission cache cookies (middleware) |
| `CRON_SECRET` | Bearer token for `/api/cron/*` endpoints |

In **production**, the application validates these on server startup and will not start if any are missing.

## Deploy on Vercel

### 1. Connect the repository

Import the GitHub repository in [Vercel](https://vercel.com) and deploy.

### 2. Environment variables

Go to **Vercel Dashboard → your project → Settings → Environment Variables**.

Add each variable for the **Production** environment (and **Preview** if you use preview deployments).

#### Required — application

| Name | Example | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://hrmsifranchise.vercel.app` | Must match your Vercel domain |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Server-only; never expose client-side |

#### Required — token signing (run `npm run generate:secrets` locally)

| Name | Notes |
| --- | --- |
| `ONBOARDING_TOKEN_SECRET` | Unique random secret |
| `APPROVAL_TOKEN_SECRET` | Unique random secret |
| `RESET_PASSWORD_TOKEN_SECRET` | Unique random secret |
| `EMAIL_VERIFICATION_TOKEN_SECRET` | Unique random secret |
| `PERMISSION_CACHE_SECRET` | Unique random secret |
| `CRON_SECRET` | Unique random secret |

#### Required for email delivery

| Name | Notes |
| --- | --- |
| `EMAIL_FROM` | e.g. `iFranchise HRMS <noreply@yourdomain.com>` |
| `SMTP_HOST` | Your SMTP provider hostname |
| `SMTP_PORT` | Usually `587` |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |

#### Recommended optional

| Name | Purpose |
| --- | --- |
| `APPROVAL_TOKEN_TTL_HOURS` | Email approval link lifetime (default 48) |

### Secret management rules

- Secrets live **only** in environment variables (`.env.local` locally, Vercel in production).
- **Never** commit `.env`, `.env.local`, or generated secret values to git.
- **Never** use `NEXT_PUBLIC_*` for signing secrets (they would ship to the browser).
- Run `npm run generate:secrets` to create new values — do not reuse across variables.
- Production startup **fails** if any required signing secret is missing.

### 3. Where to paste in Vercel

1. Open [vercel.com](https://vercel.com) → your **iFranchise-HRMS** project.
2. **Settings** → **Environment Variables**.
3. Click **Add New**.
4. Enter **Key** (e.g. `ONBOARDING_TOKEN_SECRET`) and **Value** (paste from `npm run generate:secrets`).
5. Select **Production** (and Preview/Development if needed).
6. Click **Save**.
7. Repeat for every variable in the tables above.

### 4. Redeploy

After adding or changing environment variables:

**Deployments → latest deployment → ⋮ → Redeploy**

Or push a new commit to trigger a fresh build.

Vercel injects env vars at build and runtime; a redeploy is **required** after changes.

### 5. Supabase Auth email templates

Onboarding invitation emails are sent by the **app via SMTP** — not Supabase Auth templates.

Supabase Dashboard → **Authentication → Email Templates** only applies to:

- Invite user (employee company account password setup)
- Password recovery (Supabase Auth flow)

Mirror `supabase/templates/invite.html` and `recovery.html` in the Supabase Dashboard if you customize those flows.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run type-check` | TypeScript check |
| `npm run generate:secrets` | Generate secure signing secrets |
| `npm run supabase:link` | Link local CLI to remote project |

## Security notes

- Never commit `.env`, `.env.local`, or generated secrets to git.
- Use a unique value for each `*_SECRET` / `*_TOKEN_SECRET` variable.
- Do not reuse `SUPABASE_SERVICE_ROLE_KEY` as a signing secret.
- Rotate secrets if you suspect exposure; update Vercel env vars and redeploy.
