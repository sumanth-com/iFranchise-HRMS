/**
 * Import historical payroll from Attendence Sheet 2026 (1).xlsx.
 * Upserts Apr–Aug as locked Excel truth; clears erroneous auto-sent payslip flags.
 *
 * Usage: node scripts/hr-data-migration/import-excel-payroll-2026.mjs [--apply] [--delete-file]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireSupabaseEnv } from "./lib/env.mjs";
import { parseAttendanceWorkbook } from "./lib/excel-attendance.mjs";
import {
  buildExcelPayrollBreakdown,
  buildExcelPayrollItemPayload,
  computeExcelPayrollAmounts,
} from "./lib/excel-payroll-amounts.mjs";
import { resolvePersonIdentity } from "./lib/mapping.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const EXCEL_PATH = path.join(ROOT, "src/assets/Attendence Sheet 2026 (1).xlsx");
const ORG_ID = "a0000000-0000-4000-8000-000000000001";
const APPLY = process.argv.includes("--apply");
const DELETE_FILE = process.argv.includes("--delete-file");
const BATCH_ID = randomUUID();

/** Past months imported from Excel — September stays live-calculated. */
const HISTORICAL_MONTHS = new Set([
  "2026-04-01",
  "2026-05-01",
  "2026-06-01",
  "2026-07-01",
  "2026-08-01",
]);

function money(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function buildBreakdown(rec, amounts) {
  return buildExcelPayrollBreakdown(rec, amounts, BATCH_ID);
}

function computeAmounts(rec) {
  return computeExcelPayrollAmounts(rec);
}

async function fetchAll(sb, table, select, filters = {}) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    let q = sb.schema("hrms").from(table).select(select).range(from, from + pageSize - 1);
    for (const [k, v] of Object.entries(filters.eq || {})) q = q.eq(k, v);
    for (const k of filters.isNull || []) q = q.is(k, null);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function salaryCreditDateForMonth(payrollMonth) {
  const [year, month] = payrollMonth.slice(0, 10).split("-").map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-02`;
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

  const employees = await fetchAll(sb, "employees", "id, employee_code, first_name, last_name", {
    isNull: ["deleted_at"],
  });
  const liveByCode = new Map(
    employees.map((row) => [String(row.employee_code).trim().toUpperCase(), row]),
  );

  const payrollPlan = new Map();
  for (const rec of workbook.payrollRecords) {
    if (!rec.payrollMonth || !HISTORICAL_MONTHS.has(rec.payrollMonth)) continue;

    const identity = resolvePersonIdentity(rec.sourceName, [], employees);
    let code = identity.employeeCode;

    // Import historical payroll for former employees when they exist in HRMS.
    if (!code && identity.category === "FORMER_EMPLOYEE" && identity.employeeCode) {
      code = identity.employeeCode;
    }
    if (!code) {
      console.warn(`Skip payroll — no employee match: ${rec.sourceName} (${rec.payrollMonth})`);
      continue;
    }

    const key = `${code}|${rec.payrollMonth}`;
    const prev = payrollPlan.get(key);
    const rank = { row_columns: 3, april_merged: 2, april_pay_roll_block: 1 };
    if (prev && (rank[prev.source] ?? 0) >= (rank[rec.source] ?? 0)) continue;
    payrollPlan.set(key, { ...rec, employeeCode: code });
  }

  console.log(`Planned historical payroll upserts: ${payrollPlan.size}`);

  const livePayrolls = await fetchAll(sb, "payrolls", "*", { isNull: ["deleted_at"] });
  const payrollByMonth = new Map(
    livePayrolls.map((p) => [String(p.payroll_month).slice(0, 10), p]),
  );

  const summary = {
    batchId: BATCH_ID,
    payrollUpserted: 0,
    payrollSkipped: 0,
    payslipsCreated: 0,
    payslipsReset: 0,
    payrollsLocked: 0,
    errors: [],
  };

  if (!APPLY) {
    console.log("Dry run — pass --apply to write.");
    for (const [key, rec] of payrollPlan) {
      const amounts = computeAmounts(rec);
      if (!amounts) continue;
      console.log(
        `  ${key} monthly=${amounts.monthlySalary} attendance=${amounts.attendanceEarnings} net=${amounts.netSalary} reimb=${amounts.reimbursement} final=${amounts.finalPayable}`,
      );
    }
    return;
  }

  async function ensurePayroll(month) {
    let payroll = payrollByMonth.get(month);
    if (payroll) return payroll;

    const { data, error } = await sb
      .schema("hrms")
      .from("payrolls")
      .insert({
        organization_id: ORG_ID,
        payroll_month: month,
        payroll_status: "paid",
        total_gross: 0,
        total_deductions: 0,
        total_net: 0,
        is_locked: true,
        notes: `historical_import:${BATCH_ID}`,
        status: "active",
      })
      .select("*")
      .single();
    if (error) throw new Error(`Create payroll ${month}: ${error.message}`);
    payrollByMonth.set(month, data);
    return data;
  }

  for (const [, rec] of payrollPlan) {
    const emp = liveByCode.get(String(rec.employeeCode).toUpperCase());
    if (!emp) {
      summary.payrollSkipped += 1;
      continue;
    }

    const amounts = computeAmounts(rec);
    if (!amounts) {
      summary.payrollSkipped += 1;
      continue;
    }

    const payroll = await ensurePayroll(rec.payrollMonth);
    const breakdown = buildBreakdown(rec, amounts);

    const { data: existing } = await sb
      .schema("hrms")
      .from("payroll_items")
      .select("id")
      .eq("payroll_id", payroll.id)
      .eq("employee_id", emp.id)
      .is("deleted_at", null)
      .maybeSingle();

    const payload = buildExcelPayrollItemPayload(amounts, breakdown);

    if (existing) {
      const { error } = await sb
        .schema("hrms")
        .from("payroll_items")
        .update(payload)
        .eq("id", existing.id);
      if (error) {
        summary.errors.push({ key: `${rec.employeeCode}|${rec.payrollMonth}`, error: error.message });
        continue;
      }
    } else {
      const { error } = await sb
        .schema("hrms")
        .from("payroll_items")
        .insert({
          payroll_id: payroll.id,
          employee_id: emp.id,
          ...payload,
        });
      if (error) {
        summary.errors.push({ key: `${rec.employeeCode}|${rec.payrollMonth}`, error: error.message });
        continue;
      }
    }
    summary.payrollUpserted += 1;
  }

  // Recompute payroll headers and lock historical runs.
  for (const month of HISTORICAL_MONTHS) {
    const payroll = payrollByMonth.get(month);
    if (!payroll) continue;

    const { data: items } = await sb
      .schema("hrms")
      .from("payroll_items")
      .select("gross_salary, total_deductions, net_salary")
      .eq("payroll_id", payroll.id)
      .is("deleted_at", null);

    const total_gross = Math.round(
      (items ?? []).reduce((s, i) => s + Number(i.gross_salary || 0), 0) * 100,
    ) / 100;
    const total_deductions = Math.round(
      (items ?? []).reduce((s, i) => s + Number(i.total_deductions || 0), 0) * 100,
    ) / 100;
    const total_net = Math.round(
      (items ?? []).reduce((s, i) => s + Number(i.net_salary || 0), 0) * 100,
    ) / 100;

    await sb
      .schema("hrms")
      .from("payrolls")
      .update({
        total_gross,
        total_deductions,
        total_net,
        is_locked: true,
        payroll_status: "paid",
        notes: payroll.notes?.includes("historical_import")
          ? payroll.notes
          : `historical_import:${BATCH_ID}`,
      })
      .eq("id", payroll.id);
    summary.payrollsLocked += 1;

    // Ensure payslip stubs exist; never mark as sent unless HR already sent.
    const { data: payrollItems } = await sb
      .schema("hrms")
      .from("payroll_items")
      .select("id, employee_id, employees (employee_code)")
      .eq("payroll_id", payroll.id)
      .is("deleted_at", null);

    for (const item of payrollItems ?? []) {
      const employee = Array.isArray(item.employees) ? item.employees[0] : item.employees;
      const code = employee?.employee_code ?? "EMP";
      const payslipNumber = `PS-${month.slice(0, 7).replace("-", "")}-${code}`;

      const { data: slip } = await sb
        .schema("hrms")
        .from("payslips")
        .select("id, email_sent_at")
        .eq("payroll_item_id", item.id)
        .maybeSingle();

      if (!slip) {
        await sb.schema("hrms").from("payslips").insert({
          payroll_id: payroll.id,
          payroll_item_id: item.id,
          employee_id: item.employee_id,
          payslip_number: payslipNumber,
          payment_mode: "Bank Transfer",
          is_current: true,
          status: "active",
          published_at: null,
          salary_credit_date: salaryCreditDateForMonth(month),
        });
        summary.payslipsCreated += 1;
      } else if (!slip.email_sent_at) {
        await sb
          .schema("hrms")
          .from("payslips")
          .update({ published_at: null })
          .eq("id", slip.id);
        summary.payslipsReset += 1;
      }
    }
  }

  // Clear schedule-based auto-sent flags on all unsent payslips org-wide.
  const { data: autoSent } = await sb
    .schema("hrms")
    .from("payslips")
    .select("id")
    .is("email_sent_at", null)
    .not("published_at", "is", null);

  if (autoSent?.length) {
    await sb
      .schema("hrms")
      .from("payslips")
      .update({ published_at: null })
      .in(
        "id",
        autoSent.map((row) => row.id),
      );
    summary.payslipsReset += autoSent.length;
  }

  const reportPath = path.join(__dirname, "reports", "excel-payroll-import-latest.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  if (DELETE_FILE && fs.existsSync(EXCEL_PATH)) {
    fs.unlinkSync(EXCEL_PATH);
    console.log(`Removed ${EXCEL_PATH}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
