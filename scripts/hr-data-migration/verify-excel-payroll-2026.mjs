/**
 * Verify Apr–Aug 2026 payroll_items against Attendance Sheet 2026 Excel source.
 *
 * Usage: node scripts/hr-data-migration/verify-excel-payroll-2026.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireSupabaseEnv } from "./lib/env.mjs";
import { parseAttendanceWorkbook } from "./lib/excel-attendance.mjs";
import { computeExcelPayrollAmounts } from "./lib/excel-payroll-amounts.mjs";
import { resolvePersonIdentity } from "./lib/mapping.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const EXCEL_PATH = path.join(ROOT, "src/assets/Attendence Sheet 2026 (1).xlsx");

const HISTORICAL_MONTHS = new Set([
  "2026-04-01",
  "2026-05-01",
  "2026-06-01",
  "2026-07-01",
  "2026-08-01",
]);

function close(a, b) {
  if (a == null && b == null) return true;
  return Math.abs(Number(a) - Number(b)) < 0.02;
}

async function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Excel file not found: ${EXCEL_PATH}`);
  }

  const workbook = parseAttendanceWorkbook(EXCEL_PATH);
  const env = loadEnv(ROOT);
  const { url, key } = requireSupabaseEnv(env);
  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: employees, error: empError } = await sb
    .schema("hrms")
    .from("employees")
    .select("id, employee_code, first_name, last_name")
    .is("deleted_at", null);
  if (empError) throw new Error(empError.message);

  const liveByCode = new Map(
    employees.map((row) => [String(row.employee_code).trim().toUpperCase(), row]),
  );

  const payrollPlan = new Map();
  for (const rec of workbook.payrollRecords) {
    if (!rec.payrollMonth || !HISTORICAL_MONTHS.has(rec.payrollMonth)) continue;
    const identity = resolvePersonIdentity(rec.sourceName, [], employees);
    let code = identity.employeeCode;
    if (!code && identity.category === "FORMER_EMPLOYEE" && identity.employeeCode) {
      code = identity.employeeCode;
    }
    if (!code) continue;
    const key = `${code}|${rec.payrollMonth}`;
    const prev = payrollPlan.get(key);
    const rank = { row_columns: 3, april_merged: 2, april_pay_roll_block: 1 };
    if (prev && (rank[prev.source] ?? 0) >= (rank[rec.source] ?? 0)) continue;
    payrollPlan.set(key, { ...rec, employeeCode: code });
  }

  const { data: payrolls, error: payrollError } = await sb
    .schema("hrms")
    .from("payrolls")
    .select("id, payroll_month")
    .in("payroll_month", [...HISTORICAL_MONTHS])
    .is("deleted_at", null);
  if (payrollError) throw new Error(payrollError.message);

  const payrollByMonth = new Map(
    payrolls.map((p) => [String(p.payroll_month).slice(0, 10), p.id]),
  );

  const mismatches = [];
  let verified = 0;
  let missing = 0;

  for (const [key, rec] of payrollPlan) {
    const amounts = computeExcelPayrollAmounts(rec);
    if (!amounts) continue;

    const emp = liveByCode.get(String(rec.employeeCode).toUpperCase());
    const payrollId = payrollByMonth.get(rec.payrollMonth);
    if (!emp || !payrollId) {
      missing += 1;
      continue;
    }

    const { data: item, error } = await sb
      .schema("hrms")
      .from("payroll_items")
      .select("basic_salary, gross_salary, net_salary, total_deductions, total_allowances, breakdown")
      .eq("payroll_id", payrollId)
      .eq("employee_id", emp.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);

    if (!item) {
      missing += 1;
      mismatches.push({ key, issue: "missing_db_item", expected: amounts });
      continue;
    }

    const fields = [
      ["monthlySalary", item.basic_salary, amounts.monthlySalary],
      ["attendanceEarnings", item.gross_salary, amounts.attendanceEarnings],
      ["netSalary", item.net_salary, amounts.netSalary],
      ["deductions", item.total_deductions, amounts.deductions],
      ["reimbursement", item.total_allowances, amounts.reimbursement],
    ];

    const rowMismatches = fields.filter(([, db, expected]) => !close(db, expected));
    if (rowMismatches.length > 0) {
      mismatches.push({
        key,
        name: rec.sourceName,
        issues: rowMismatches.map(([field, db, expected]) => ({
          field,
          db: Number(db),
          expected: Number(expected),
        })),
      });
    } else {
      verified += 1;
    }
  }

  const report = { verified, missing, mismatchCount: mismatches.length, mismatches };
  const reportPath = path.join(__dirname, "reports", "excel-payroll-verify-2026.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verified, missing, mismatchCount: mismatches.length }, null, 2));
  if (mismatches.length > 0) {
    console.log("First mismatches:", JSON.stringify(mismatches.slice(0, 5), null, 2));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
