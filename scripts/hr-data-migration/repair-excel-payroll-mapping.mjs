/**
 * Repair Apr–Aug 2026 payroll_items where gross incorrectly included reimbursement.
 * Uses persisted breakdown.excel snapshots — no XLSX required.
 *
 * Usage: node scripts/hr-data-migration/repair-excel-payroll-mapping.mjs [--apply]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireSupabaseEnv } from "./lib/env.mjs";
import {
  amountsFromStoredExcelBreakdown,
  buildExcelPayrollBreakdown,
  buildExcelPayrollItemPayload,
} from "./lib/excel-payroll-amounts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

const HISTORICAL_MONTHS = [
  "2026-04-01",
  "2026-05-01",
  "2026-06-01",
  "2026-07-01",
  "2026-08-01",
];

async function main() {
  const env = loadEnv(ROOT);
  const { url, key } = requireSupabaseEnv(env);
  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: payrolls, error: payrollError } = await sb
    .schema("hrms")
    .from("payrolls")
    .select("id, payroll_month")
    .in("payroll_month", HISTORICAL_MONTHS)
    .is("deleted_at", null);

  if (payrollError) throw new Error(payrollError.message);

  const summary = { scanned: 0, repaired: 0, skipped: 0, samples: [] };

  for (const payroll of payrolls ?? []) {
    const { data: items, error } = await sb
      .schema("hrms")
      .from("payroll_items")
      .select("id, gross_salary, net_salary, basic_salary, total_allowances, total_deductions, breakdown")
      .eq("payroll_id", payroll.id)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    for (const item of items ?? []) {
      summary.scanned += 1;
      const breakdown = item.breakdown;
      if (!breakdown?.excel) {
        summary.skipped += 1;
        continue;
      }

      const amounts = amountsFromStoredExcelBreakdown(breakdown);
      if (!amounts) {
        summary.skipped += 1;
        continue;
      }

      const nextBreakdown = buildExcelPayrollBreakdown(
        {
          totalWorkingDays: breakdown.attendance?.workingDays,
          present: breakdown.attendance?.presentDays,
          absent: breakdown.attendance?.absentDays,
          lop: breakdown.attendance?.lopDays,
          holiday: breakdown.attendance?.holidayCount,
          perDay: breakdown.excel?.perDay,
        },
        amounts,
        breakdown.importBatchId ?? "repair-mapping",
      );
      nextBreakdown.importBatchId = breakdown.importBatchId;
      const payload = buildExcelPayrollItemPayload(amounts, nextBreakdown);

      const changed =
        Number(item.gross_salary) !== payload.gross_salary ||
        Number(item.net_salary) !== payload.net_salary ||
        Number(item.basic_salary) !== payload.basic_salary ||
        Number(item.total_allowances) !== payload.total_allowances;

      if (!changed) {
        summary.skipped += 1;
        continue;
      }

      if (summary.samples.length < 5) {
        summary.samples.push({
          id: item.id,
          month: payroll.payroll_month,
          before: {
            monthly: item.basic_salary,
            gross: item.gross_salary,
            net: item.net_salary,
            allowances: item.total_allowances,
          },
          after: {
            monthly: payload.basic_salary,
            attendance: payload.gross_salary,
            net: payload.net_salary,
            allowances: payload.total_allowances,
            final: amounts.finalPayable,
          },
        });
      }

      if (APPLY) {
        const { error: updateError } = await sb
          .schema("hrms")
          .from("payroll_items")
          .update(payload)
          .eq("id", item.id);
        if (updateError) throw new Error(updateError.message);
      }
      summary.repaired += 1;
    }

    if (APPLY) {
      const { data: refreshed } = await sb
        .schema("hrms")
        .from("payroll_items")
        .select("gross_salary, total_deductions, net_salary")
        .eq("payroll_id", payroll.id)
        .is("deleted_at", null);

      const total_gross = Math.round(
        (refreshed ?? []).reduce((s, i) => s + Number(i.gross_salary || 0), 0) * 100,
      ) / 100;
      const total_deductions = Math.round(
        (refreshed ?? []).reduce((s, i) => s + Number(i.total_deductions || 0), 0) * 100,
      ) / 100;
      const total_net = Math.round(
        (refreshed ?? []).reduce((s, i) => s + Number(i.net_salary || 0), 0) * 100,
      ) / 100;

      await sb
        .schema("hrms")
        .from("payrolls")
        .update({ total_gross, total_deductions, total_net })
        .eq("id", payroll.id);
    }
  }

  const reportPath = path.join(__dirname, "reports", "excel-payroll-mapping-repair.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (!APPLY) console.log("Dry run — pass --apply to write fixes.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
