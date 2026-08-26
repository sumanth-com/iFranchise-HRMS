/**
 * Lightweight TTFB measurement (document navigation only).
 * PERF_BASE_URL=http://localhost:3005 PERF_ROLES=hr,ceo npx tsx scripts/prod-ttfb-verify.mts
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = process.env.PERF_BASE_URL ?? "http://localhost:3005";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type RoleKey = "employee" | "manager" | "hr" | "ceo";

const ROUTES: Record<RoleKey, string[]> = {
  employee: [
    "/employee/profile",
    "/employee/attendance",
    "/employee/payroll",
    "/employee/documents",
    "/employee/leave",
  ],
  manager: ["/manager", "/manager/attendance", "/manager/leave"],
  hr: [
    "/dashboard",
    "/dashboard/hr-overview",
    "/dashboard/employees",
    "/dashboard/attendance/team",
    "/dashboard/leave/team",
  ],
  ceo: [
    "/ceo",
    "/ceo/approvals",
    "/ceo/approvals/leave",
    "/ceo/approvals/regularization",
    "/ceo/approvals/exit",
    "/ceo/payroll/run",
  ],
};

function projectRefFromUrl(url: string) {
  try {
    return new URL(url).hostname.split(".")[0] ?? "supabase";
  } catch {
    return "supabase";
  }
}

async function resolveUsers(admin: ReturnType<typeof createClient>) {
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
  const pick = (pred: (c: Set<string>) => boolean) => {
    for (const [uid, codes] of map) if (pred(codes)) return uid;
    throw new Error("role user missing");
  };
  const ids: Record<RoleKey, string> = {
    employee: pick(
      (c) =>
        c.has("employee") &&
        !c.has("manager") &&
        !c.has("hr_admin") &&
        !c.has("ceo") &&
        !c.has("super_admin"),
    ),
    manager: pick(
      (c) => c.has("manager") && !c.has("hr_admin") && !c.has("ceo") && !c.has("super_admin"),
    ),
    hr: pick((c) => c.has("hr_admin") || c.has("hr_executive")),
    ceo: pick((c) => c.has("ceo") || c.has("founder")),
  };
  const out: Record<RoleKey, string> = {} as Record<RoleKey, string>;
  for (const role of Object.keys(ids) as RoleKey[]) {
    const { data } = await admin.auth.admin.getUserById(ids[role]);
    if (!data.user?.email) throw new Error(`no email ${role}`);
    out[role] = data.user.email;
  }
  return out;
}

async function sessionCookies(email: string) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) throw new Error(error?.message ?? "link");
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const verified = await anon.auth.verifyOtp({
    type: "email",
    token_hash: data.properties.hashed_token,
  });
  if (verified.error || !verified.data.session) throw new Error(verified.error?.message);
  const { createChunks } = await import("@supabase/ssr/dist/module/utils/chunker.js");
  const { stringToBase64URL } = await import("@supabase/ssr/dist/module/utils/base64url.js");
  const session = verified.data.session;
  const storageKey = `sb-${projectRefFromUrl(SUPABASE_URL)}-auth-token`;
  const encoded = `base64-${stringToBase64URL(JSON.stringify(session))}`;
  return createChunks(storageKey, encoded).map((chunk) => ({
    name: chunk.name,
    value: chunk.value,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }));
}

async function main() {
  const roles = (process.env.PERF_ROLES?.split(",") as RoleKey[] | undefined) ??
    (Object.keys(ROUTES) as RoleKey[]);
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const emails = await resolveUsers(admin);
  const browser = await chromium.launch({ headless: true });
  const results: Array<Record<string, unknown>> = [];

  for (const role of roles) {
    const context = await browser.newContext();
    await context.addCookies(await sessionCookies(emails[role]));
    const page = await context.newPage();
    console.log(`\n=== ${role} ===`);

    for (const route of ROUTES[role]) {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message.slice(0, 160)));
      const started = Date.now();
      let useful: number | null = null;
      let ttfb: number | null = null;
      try {
        const response = await page.goto(`${BASE}${route}`, {
          waitUntil: "domcontentloaded",
          timeout: 120_000,
        });
        ttfb = response?.request().timing().responseStart ?? null;
        await page.waitForSelector("main, h1, table, [data-portal-shell]", { timeout: 60_000 });
        useful = Date.now() - started;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
      const navMs = Date.now() - started;
      const body = await page.locator("body").innerText().catch(() => "");
      const crash =
        /Application error: a client-side exception/i.test(body) ||
        /Something went wrong[\s\S]*couldn't load this page/i.test(body) ||
        /Minified React error #310/i.test(errors.join(" "));
      const row = {
        role,
        route,
        navMs,
        usefulMs: useful,
        ttfbMs: ttfb != null ? Math.round(ttfb) : null,
        ok: !crash && errors.filter((e) => !e.includes("Timeout")).length === 0,
        errors: errors.slice(0, 3),
      };
      results.push(row);
      console.log(
        `${route} nav=${navMs}ms useful=${useful ?? "null"} ttfb=${row.ttfbMs} ok=${row.ok}`,
      );
      page.removeAllListeners("pageerror");
      await page.waitForTimeout(300);
    }
    await context.close();
  }

  await browser.close();
  mkdirSync(".perf-artifacts", { recursive: true });
  const out = join(".perf-artifacts", "ttfb-after.json");
  writeFileSync(out, JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2));
  console.log(`\nWrote ${out}`);
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
