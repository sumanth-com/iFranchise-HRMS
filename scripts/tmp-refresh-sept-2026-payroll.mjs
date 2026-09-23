/**
 * One-off: safely refresh unlocked September 2026 payroll with the Excel calculator.
 * Does not touch locked/paid runs.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { register } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stubDir = resolve(root, ".tmp-stubs");
mkdirSync(stubDir, { recursive: true });
writeFileSync(resolve(stubDir, "server-only.js"), "module.exports = {};\n");

register(pathToFileURL(resolve(root, "scripts/tmp-refresh-sept-hook.mjs")).href);

function loadEnv(path) {
  const text = readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

const env = loadEnv(resolve(root, ".env.local"));
for (const [key, value] of Object.entries(env)) {
  if (process.env[key] == null) process.env[key] = value;
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: "hrms" },
});

const { ensureCompanyPayrollRun } = await import(
  pathToFileURL(resolve(root, "src/lib/payroll/services/payroll-mutations.ts")).href
);
const { resolveFinalPayableAmount } = await import(
  pathToFileURL(resolve(root, "src/lib/payroll/services/payroll-utils.ts")).href
);

const payrollId = "28eb2f7c-f8a0-428e-83bf-8afcf16b56e1";
const { data: payroll, error: pe } = await admin
  .from("payrolls")
  .select("id, organization_id, payroll_status, is_locked, payroll_month, total_net")
  .eq("id", payrollId)
  .maybeSingle();

if (pe || !payroll) throw new Error(pe?.message || "payroll missing");
console.log("before", {
  status: payroll.payroll_status,
  locked: payroll.is_locked,
  total_net: payroll.total_net,
});

if (payroll.is_locked) {
  console.log("SKIP: payroll locked");
  process.exit(0);
}
if (!["draft", "processing", "processed"].includes(payroll.payroll_status)) {
  console.log("SKIP: status not recalculable:", payroll.payroll_status);
  process.exit(0);
}

const { data: actor } = await admin
  .from("employees")
  .select("id, user_id, organization_id, branch_id, email, first_name, last_name")
  .eq("organization_id", payroll.organization_id)
  .not("user_id", "is", null)
  .is("deleted_at", null)
  .limit(1)
  .maybeSingle();

if (!actor?.user_id) throw new Error("No actor employee");

const profile = {
  userId: actor.user_id,
  email: actor.email,
  roles: ["hr"],
  permissionCodes: ["payroll.run", "payroll.view", "portal.hr.access"],
  employee: {
    id: actor.id,
    organizationId: actor.organization_id,
    branchId: actor.branch_id,
    firstName: actor.first_name,
    lastName: actor.last_name,
  },
};

const id = await ensureCompanyPayrollRun(admin, profile, { month: 9, year: 2026 });
console.log("refreshed", id);

const { data: items } = await admin
  .from("payroll_items")
  .select(
    `net_salary, total_allowances, gross_salary, breakdown, employees:employee_id ( first_name, last_name, employee_code )`,
  )
  .eq("payroll_id", id)
  .is("deleted_at", null);

const keys = ["Om", "Akshita", "Ekta", "Dikhsha", "Diksha", "Vivek", "IT Team", "Sumanth", "Swetha"];
for (const it of items || []) {
  const emp = Array.isArray(it.employees) ? it.employees[0] : it.employees;
  const name = `${emp?.first_name || ""} ${emp?.last_name || ""}`.trim();
  if (!keys.some((k) => name.includes(k))) continue;
  const b = it.breakdown || {};
  const att = b.attendance || {};
  const reimb = (b.earnings || [])
    .filter((l) => String(l.code || "").includes("reimb"))
    .reduce((s, l) => s + Number(l.amount || 0), 0);
  console.log(
    JSON.stringify({
      name,
      code: emp?.employee_code,
      paidDays: att.paidDays,
      present: att.presentDays,
      holiday: att.holidayCount,
      weekOff: att.weekOffDays,
      paidLeave: att.paidLeaveDays,
      dailyRate: att.dailyRate,
      gross: it.gross_salary,
      net: it.net_salary,
      reimb,
      finalPayable: resolveFinalPayableAmount(
        Number(it.net_salary),
        b,
        Number(it.total_allowances),
      ),
    }),
  );
}

const { data: after } = await admin
  .from("payrolls")
  .select("total_gross, total_net, total_deductions")
  .eq("id", id)
  .single();
console.log("after totals", after);
