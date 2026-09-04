/**
 * Repair pass: generate missing payslips + fix failed Himani May payroll item.
 * Idempotent. Does not overwrite existing conflicts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireSupabaseEnv } from "./lib/env.mjs";
import {
  buildExcelPayrollBreakdown,
  buildExcelPayrollItemPayload,
  computeExcelPayrollAmounts,
} from "./lib/excel-payroll-amounts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const resultPath = path.join(__dirname, "reports", "write-import-result-latest.json");

function admin(url, key) {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function main() {
  const env = loadEnv(ROOT);
  const { url, key } = requireSupabaseEnv(env);
  const sb = admin(url, key);
  const prev = JSON.parse(fs.readFileSync(resultPath, "utf8"));
  const batchId = prev.batchId;
  const repair = { payslipsGenerated: 0, payslipsSkipped: 0, payrollFixed: 0, errors: [] };

  // Fix Himani May if missing
  const { data: himani } = await sb
    .schema("hrms")
    .from("employees")
    .select("id")
    .eq("employee_code", "IF2026002")
    .is("deleted_at", null)
    .maybeSingle();
  const { data: mayPay } = await sb
    .schema("hrms")
    .from("payrolls")
    .select("id")
    .eq("payroll_month", "2026-05-01")
    .is("deleted_at", null)
    .maybeSingle();

  if (himani && mayPay) {
    const { data: existing } = await sb
      .schema("hrms")
      .from("payroll_items")
      .select("id")
      .eq("payroll_id", mayPay.id)
      .eq("employee_id", himani.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!existing) {
      const rec = {
        salary: 25000,
        workingDaySalary: 25000,
        professionalTax: 200,
        reimbursement: 210,
        amountAfterPt: 24800,
        finalPayout: 25010,
      };
      const amounts = computeExcelPayrollAmounts(rec);
      const breakdown = buildExcelPayrollBreakdown(rec, amounts, batchId);
      const payload = buildExcelPayrollItemPayload(amounts, breakdown);
      const { data: item, error } = await sb
        .schema("hrms")
        .from("payroll_items")
        .insert({
          payroll_id: mayPay.id,
          employee_id: himani.id,
          ...payload,
        })
        .select("id")
        .single();
      if (error) repair.errors.push({ entity: "payroll_item", error: error.message });
      else {
        repair.payrollFixed += 1;
        console.log("Fixed Himani May payroll item", item.id);
      }
    }
  }

  // Find payroll items from this import batch missing payslips
  const { data: items } = await sb
    .schema("hrms")
    .from("payroll_items")
    .select("id,payroll_id,employee_id,net_salary,breakdown,employees:employee_id(employee_code),payrolls:payroll_id(payroll_month)")
    .is("deleted_at", null);

  const importItems = (items || []).filter((i) => {
    const b = i.breakdown || {};
    return b.importBatchId === batchId || b.source === "excel_historical_option_1";
  });

  const { data: slips } = await sb
    .schema("hrms")
    .from("payslips")
    .select("id,payroll_item_id,payslip_number")
    .is("deleted_at", null);
  const byItem = new Map((slips || []).map((s) => [s.payroll_item_id, s]));
  const byNumber = new Map((slips || []).map((s) => [s.payslip_number, s]));

  for (const item of importItems) {
    const code = item.employees?.employee_code;
    const month = String(item.payrolls?.payroll_month || "").slice(0, 10);
    if (!code || !month) continue;
    const yyyymm = month.slice(0, 7).replace("-", "");
    const payslipNumber = `PS-${yyyymm}-${code}`;
    if (byItem.has(item.id) || byNumber.has(payslipNumber)) {
      repair.payslipsSkipped += 1;
      continue;
    }

    const { data: slip, error } = await sb
      .schema("hrms")
      .from("payslips")
      .insert({
        payroll_id: item.payroll_id,
        payroll_item_id: item.id,
        employee_id: item.employee_id,
        payslip_number: payslipNumber,
        payment_mode: "Bank Transfer",
        is_current: true,
        status: "active",
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      repair.errors.push({ entity: "payslip", code: payslipNumber, error: error.message });
      continue;
    }
    repair.payslipsGenerated += 1;
    byItem.set(item.id, slip);
    byNumber.set(payslipNumber, slip);
  }

  prev.payslipsGenerated = (prev.payslipsGenerated || 0) + repair.payslipsGenerated;
  prev.payslipsSkipped = (prev.payslipsSkipped || 0) + repair.payslipsSkipped;
  prev.payrollImported = (prev.payrollImported || 0) + repair.payrollFixed;
  prev.repair = repair;
  prev.repairedAt = new Date().toISOString();
  fs.writeFileSync(resultPath, JSON.stringify(prev, null, 2));
  console.log(JSON.stringify(repair, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
