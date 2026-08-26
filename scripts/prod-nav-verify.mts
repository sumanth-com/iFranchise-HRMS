/**
 * Production-mode navigation + cookie smoke harness.
 * Creates short-lived admin magic-link sessions (no password changes).
 *
 * Usage (server must already be on :3000 via `npm run start`):
 *   npx tsx scripts/prod-nav-verify.mts
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { chromium, type Browser, type Page, type Response } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = process.env.PERF_BASE_URL ?? "http://localhost:3001";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type RoleKey = "employee" | "manager" | "hr" | "ceo";

const ROLE_ROUTES: Record<RoleKey, string[]> = {
  employee: [
    "/employee",
    "/employee/profile",
    "/employee/attendance",
    "/employee/payroll",
    "/employee/documents",
    "/employee/leave",
  ],
  manager: [
    "/manager",
    "/manager/attendance",
    "/manager/leave",
  ],
  hr: [
    "/dashboard",
    "/dashboard/hr-overview",
    "/dashboard/employees",
    "/dashboard/recruitment/jobs",
    "/dashboard/attendance/team",
    "/dashboard/leave/team",
    "/dashboard/payroll/team/run",
    "/dashboard/assets/team",
    "/dashboard/performance",
    "/dashboard/reports/attendance",
    "/dashboard/organization",
    "/dashboard/user-provisioning",
    "/dashboard/roles",
  ],
  ceo: [
    "/ceo",
    "/ceo/approvals",
    "/ceo/approvals/leave",
    "/ceo/approvals/regularization",
    "/ceo/approvals/exit",
    "/ceo/payroll/run",
    // Alias paths must HTTP-redirect without React #310
    "/ceo/leave",
    "/ceo/exit",
    "/ceo/payroll",
    "/ceo/regularization",
  ],
};

type NavMetric = {
  role: RoleKey;
  route: string;
  navMs: number;
  requests: number;
  transferBytes: number;
  slowestUrl: string;
  slowestMs: number;
  serverTTFB: number | null;
  firstUsefulMs: number | null;
  errors: string[];
  ok: boolean;
};

function projectRefFromUrl(url: string): string {
  try {
    return new URL(url).hostname.split(".")[0] ?? "supabase";
  } catch {
    return "supabase";
  }
}

async function resolveRoleUsers(
  admin: ReturnType<typeof createClient>,
  roles: RoleKey[] = ["employee", "manager", "hr", "ceo"],
): Promise<Partial<Record<RoleKey, { userId: string; email: string }>>> {
  const { data: ur, error } = await admin
    .schema("hrms")
    .from("user_roles")
    .select("user_id, roles(code)");
  if (error) throw error;

  const map = new Map<string, Set<string>>();
  for (const row of ur ?? []) {
    const code = (row as { roles?: { code?: string } }).roles?.code;
    if (!code) continue;
    if (!map.has(row.user_id)) map.set(row.user_id, new Set());
    map.get(row.user_id)!.add(code);
  }

  function pick(pred: (codes: Set<string>) => boolean): string {
    for (const [uid, codes] of map) {
      if (pred(codes)) return uid;
    }
    throw new Error("No user matched role predicate");
  }

  const ids: Record<RoleKey, string> = {
    employee: pick(
      (c) =>
        c.has("employee") &&
        !c.has("manager") &&
        !c.has("hr_admin") &&
        !c.has("hr_executive") &&
        !c.has("ceo") &&
        !c.has("super_admin"),
    ),
    manager: pick(
      (c) =>
        c.has("manager") &&
        !c.has("hr_admin") &&
        !c.has("ceo") &&
        !c.has("super_admin"),
    ),
    hr: pick((c) => c.has("hr_admin") || c.has("hr_executive")),
    ceo: pick((c) => c.has("ceo") || c.has("founder") || c.has("co_founder")),
  };

  const out: Partial<Record<RoleKey, { userId: string; email: string }>> = {};
  for (const role of roles) {
    const { data, error: userError } = await admin.auth.admin.getUserById(ids[role]);
    if (userError || !data.user?.email) {
      throw new Error(`Missing email for ${role}: ${userError?.message ?? JSON.stringify(data)}`);
    }
    out[role] = { userId: ids[role], email: data.user.email };
  }
  return out;
}

async function sessionForEmail(email: string) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error || !data.properties?.hashed_token) {
    throw new Error(`generateLink failed for role user: ${error?.message}`);
  }

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const verified = await anon.auth.verifyOtp({
    type: "email",
    token_hash: data.properties.hashed_token,
  });
  if (verified.error || !verified.data.session) {
    throw new Error(`verifyOtp failed: ${verified.error?.message}`);
  }
  return verified.data.session;
}

async function authCookiesFromSession(session: {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user?: unknown;
}) {
  const { createChunks } = await import("@supabase/ssr/dist/module/utils/chunker.js");
  const { stringToBase64URL } = await import(
    "@supabase/ssr/dist/module/utils/base64url.js"
  );
  const ref = projectRefFromUrl(SUPABASE_URL);
  const storageKey = `sb-${ref}-auth-token`;
  const sessionJson = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at:
      session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600),
    expires_in: session.expires_in ?? 3600,
    token_type: session.token_type ?? "bearer",
    user: session.user ?? null,
  });
  const encoded = `base64-${stringToBase64URL(sessionJson)}`;
  const chunks = createChunks(storageKey, encoded);
  return chunks.map((chunk) => ({
    name: chunk.name,
    value: chunk.value,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }));
}

async function measureRoute(
  page: Page,
  role: RoleKey,
  route: string,
): Promise<NavMetric> {
  const errors: string[] = [];
  const onPageError = (err: Error) => errors.push(`pageerror:${err.message}`);
  const onConsole = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === "error") errors.push(`console:${msg.text().slice(0, 240)}`);
  };
  page.on("pageerror", onPageError);
  page.on("console", onConsole);

  const sizes = new Map<string, { bytes: number; ms: number }>();
  let serverTTFB: number | null = null;

  const onResponse = async (response: Response) => {
    const url = response.url();
    const timing = response.request().timing();
    const ms = timing.responseEnd || 0;
    let bytes = 0;
    try {
      const buf = await response.body();
      bytes = buf.byteLength;
    } catch {
      // aborted / opaque
    }
    const prev = sizes.get(url);
    if (!prev || bytes > prev.bytes) sizes.set(url, { bytes, ms });
    if (
      (url.includes(route) || url.endsWith(route)) &&
      response.request().resourceType() === "document"
    ) {
      serverTTFB = timing.responseStart || null;
    }
  };
  page.on("response", onResponse);

  const started = Date.now();
  let firstUsefulMs: number | null = null;
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    // First useful: main content or known shell marker
    try {
      await page.waitForSelector("main, [data-portal-shell], h1, table, [data-testid]", {
        timeout: 30_000,
      });
      firstUsefulMs = Date.now() - started;
    } catch {
      firstUsefulMs = Date.now() - started;
    }
    // Settle briefly — avoid networkidle (can hang under middleware load).
    await page.waitForTimeout(400);
  } catch (error) {
    errors.push(`goto:${error instanceof Error ? error.message : String(error)}`);
  }

  const navMs = Date.now() - started;
  page.off("pageerror", onPageError);
  page.off("console", onConsole);
  page.off("response", onResponse);

  let transferBytes = 0;
  let slowestUrl = "";
  let slowestMs = 0;
  for (const [url, info] of sizes) {
    transferBytes += info.bytes;
    if (info.ms > slowestMs) {
      slowestMs = info.ms;
      slowestUrl = url.replace(BASE, "");
    }
  }

  const bodyText = await page.locator("body").innerText().catch(() => "");
  const crash =
    /Application error: a client-side exception/i.test(bodyText) ||
    /Something went wrong/i.test(bodyText) ||
    /We couldn't load this page/i.test(bodyText);

  if (crash) errors.push("UI_CRASH_BANNER");

  return {
    role,
    route,
    navMs,
    requests: sizes.size,
    transferBytes,
    slowestUrl,
    slowestMs: Math.round(slowestMs),
    serverTTFB: serverTTFB != null ? Math.round(serverTTFB) : null,
    firstUsefulMs,
    errors,
    ok: !crash && errors.filter((e) => e.startsWith("pageerror:") || e === "UI_CRASH_BANNER").length === 0,
  };
}

async function rapidNavigate(page: Page, routes: string[]): Promise<string[]> {
  const errors: string[] = [];
  for (const route of routes) {
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(150);
    } catch (error) {
      errors.push(`${route}:${error instanceof Error ? error.message : String(error)}`);
    }
    const bodyText = await page.locator("body").innerText().catch(() => "");
    if (/Application error: a client-side exception/i.test(bodyText)) {
      errors.push(`${route}:CLIENT_EXCEPTION`);
    }
    if (/Something went wrong/i.test(bodyText) && /couldn't load this page/i.test(bodyText)) {
      errors.push(`${route}:ROUTE_ERROR_UI`);
    }
  }
  // Back/forward
  try {
    await page.goBack({ waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.goForward({ waitUntil: "domcontentloaded", timeout: 30_000 });
  } catch (error) {
    errors.push(`history:${error instanceof Error ? error.message : String(error)}`);
  }
  // Refresh
  try {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  } catch (error) {
    errors.push(`reload:${error instanceof Error ? error.message : String(error)}`);
  }
  return errors;
}

async function inspectPermissionCookies(page: Page): Promise<{
  chunkCount: number;
  maxBytes: number;
  names: string[];
}> {
  const cookies = await page.context().cookies();
  const perm = cookies.filter(
    (c) => c.name === "hrms_permissions" || c.name.startsWith("hrms_permissions."),
  );
  return {
    chunkCount: perm.length,
    maxBytes: perm.reduce((m, c) => Math.max(m, c.value.length), 0),
    names: perm.map((c) => c.name),
  };
}

async function runRole(
  browser: Browser,
  role: RoleKey,
  email: string,
): Promise<{ metrics: NavMetric[]; rapidErrors: string[]; cookies: Awaited<ReturnType<typeof inspectPermissionCookies>> }> {
  const session = await sessionForEmail(email);
  const context = await browser.newContext();
  await context.addCookies(await authCookiesFromSession(session));
  const page = await context.newPage();

  const metrics: NavMetric[] = [];
  for (const route of ROLE_ROUTES[role]) {
    metrics.push(await measureRoute(page, role, route));
  }

  const rapid =
    role === "employee"
      ? [
          "/employee/leave",
          "/employee/payroll",
          "/employee/documents",
          "/employee/attendance",
          "/employee/leave",
          "/employee",
          "/employee/profile",
          "/employee/attendance",
          "/employee/payroll",
          "/employee/documents",
          "/employee/leave",
          "/employee",
        ]
      : ROLE_ROUTES[role].concat(ROLE_ROUTES[role]).concat(ROLE_ROUTES[role]);

  const rapidErrors = await rapidNavigate(page, rapid);
  const cookies = await inspectPermissionCookies(page);

  // Deep link refresh on last route
  await page.reload({ waitUntil: "networkidle", timeout: 60_000 }).catch(() => undefined);

  await context.close();
  return { metrics, rapidErrors, cookies };
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    throw new Error("Missing Supabase env");
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const selectedRoles = (
    process.env.PERF_ROLES
      ? process.env.PERF_ROLES.split(",").map((r) => r.trim())
      : (Object.keys(ROLE_ROUTES) as RoleKey[])
  ).filter((r): r is RoleKey => r in ROLE_ROUTES);

  const users = await resolveRoleUsers(admin, selectedRoles);
  console.log(
    "Resolved roles:",
    Object.fromEntries(
      Object.entries(users).map(([role, u]) => [role, u!.userId.slice(0, 8)]),
    ),
  );

  const browser = await chromium.launch({ headless: true });
  const allMetrics: NavMetric[] = [];
  const rapidByRole: Record<string, string[]> = {};
  const cookiesByRole: Record<string, Awaited<ReturnType<typeof inspectPermissionCookies>>> = {};

  for (const role of selectedRoles) {
    console.log(`\n=== ${role} ===`);
    const result = await runRole(browser, role, users[role]!.email);
    allMetrics.push(...result.metrics);
    rapidByRole[role] = result.rapidErrors;
    cookiesByRole[role] = result.cookies;
    for (const m of result.metrics) {
      console.log(
        `${m.route}  ${m.navMs}ms  req=${m.requests}  xfer=${fmtBytes(m.transferBytes)}  useful=${m.firstUsefulMs}ms  ok=${m.ok}  errors=${m.errors.length}`,
      );
      if (m.errors.length) console.log("  ", m.errors.slice(0, 5));
    }
    console.log("rapid errors:", result.rapidErrors.length ? result.rapidErrors : "none");
    console.log("permission cookies:", result.cookies);
  }

  await browser.close();

  const outDir = join(process.cwd(), ".perf-artifacts");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "prod-nav-verify.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        base: BASE,
        at: new Date().toISOString(),
        metrics: allMetrics,
        rapidByRole,
        cookiesByRole,
      },
      null,
      2,
    ),
  );
  console.log(`\nWrote ${outPath}`);

  const failures = allMetrics.filter((m) => !m.ok);
  const rapidFails = Object.values(rapidByRole).flat();
  if (failures.length || rapidFails.length) {
    console.error("\nFAILURES detected", {
      routeFailures: failures.map((f) => f.route),
      rapidFails,
    });
    process.exitCode = 1;
  } else {
    console.log("\nAll measured routes OK (no client crash banners / pageerrors).");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
