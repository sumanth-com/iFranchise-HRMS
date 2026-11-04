/**
 * Refresh unlocked October 2026 payroll after the attendance/salary sheet sync.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ensureCompanyPayrollRun } from "@/lib/payroll/services/payroll-mutations";
import { resolveFinalPayableAmount } from "@/lib/payroll/services/payroll-utils";

function loadEnv(path: string) {
  const text = readFileSync(path, "utf8");
  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

const env = loadEnv(resolve(process.cwd(), ".env.local"));
for (const [key, value] of Object.entries(env)) {
  if (process.env[key] == null) process.env[key] = value;
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: actor, error: ae } = await admin
  .schema("hrms")
  .from("employees")
  .select("id, user_id, organization_id, branch_id, email, first_name, last_name, employee_code")
  .eq("employee_code", "IF2026001")
  .maybeSingle();
if (ae || !actor?.user_id) throw new Error(ae?.message || "HR actor missing");

const profile = {
  userId: actor.user_id,
  email: actor.email,
  roles: [{ id: "hr", name: "HR", code: "hr", isSystemRole: true, status: "active" as const }],
  permissions: [],
  permissionCodes: [
    "employee.edit",
    "payroll.run",
    "payroll.view",
    "payroll.edit",
    "portal.hr.access",
    "system.admin.access",
  ],
  employee: {
    id: actor.id,
    organizationId: actor.organization_id,
    branchId: actor.branch_id,
    employeeCode: actor.employee_code,
    firstName: actor.first_name,
    lastName: actor.last_name,
    email: actor.email,
    employmentStatus: "active" as const,
    status: "active" as const,
  },
  organization: {
    id: actor.organization_id,
    name: "iFranchise",
    legalName: "iFranchise",
    email: actor.email,
    logoStoragePath: null,
    logoUrl: null,
    status: "active" as const,
  },
};

const id = await ensureCompanyPayrollRun(admin, profile as never, { month: 10, year: 2026 });
console.log("refreshed", id);

const { data: items, error: ie } = await admin
  .schema("hrms")
  .from("payroll_items")
  .select(
    "net_salary, total_allowances, gross_salary, breakdown, employees:employee_id(first_name, last_name, employee_code)",
  )
  .eq("payroll_id", id)
  .is("deleted_at", null);
if (ie) throw ie;

for (const it of items ?? []) {
  const emp = Array.isArray(it.employees) ? it.employees[0] : it.employees;
  const att = (it.breakdown as { attendance?: Record<string, number> } | null)?.attendance ?? {};
  const segments = (it.breakdown as { salarySegments?: unknown } | null)?.salarySegments ?? null;
  console.log(
    JSON.stringify({
      name: `${emp?.first_name ?? ""} ${emp?.last_name ?? ""}`.trim(),
      code: emp?.employee_code,
      present: att.presentDays,
      absent: att.absentDays,
      holiday: att.holidayCount,
      paidLeave: att.paidLeaveDays,
      cl: att.clDays,
      el: att.elDays,
      lop: att.lopDays,
      paidDays: att.paidDays,
      gross: it.gross_salary,
      net: it.net_salary,
      payable: resolveFinalPayableAmount(
        Number(it.net_salary),
        it.breakdown as never,
        Number(it.total_allowances),
      ),
      segments,
    }),
  );
}
