/**
 * Import monthly gross salary structures from Attendence Sheet 2026.xlsx.
 * One structure per employee per salary change; later months carry forward.
 * Default is dry-run. Pass --apply to write.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireSupabaseEnv } from "./lib/env.mjs";
import { parseAttendanceWorkbook } from "./lib/excel-attendance.mjs";
import { resolvePersonIdentity } from "./lib/mapping.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const EXCEL_CANDIDATES = [
  path.join(ROOT, "src/assets/Attendence Sheet 2026 (1).xlsx"),
  path.join(ROOT, "src/assets/Attendence Sheet 2026.xlsx"),
];
const APPLY = process.argv.includes("--apply");

function findExcelPath() {
  return EXCEL_CANDIDATES.find((filePath) => fs.existsSync(filePath)) ?? null;
}

function money(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function splitMonthlyGross(gross) {
  const basic = Math.round(gross * 0.5 * 100) / 100;
  const hra = Math.round(gross * 0.25 * 100) / 100;
  const special = Math.round(gross * 0.15 * 100) / 100;
  const lta = Math.round((gross - basic - hra - special) * 100) / 100;
  return { basic, hra, special, lta };
}

function dayBefore(iso) {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function monthEnd(monthStart) {
  const [year, month] = monthStart.slice(0, 10).split("-").map(Number);
  const last = new Date(year, month, 0).getDate();
  return `${monthStart.slice(0, 8)}${String(last).padStart(2, "0")}`;
}

function structureCoversMonth(row, monthStart) {
  const from = String(row.effective_from).slice(0, 10);
  const to = row.effective_to ? String(row.effective_to).slice(0, 10) : null;
  const end = monthEnd(monthStart);
  return from <= end && (to == null || to >= monthStart);
}

async function fetchAll(supabase, table, select) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const { data, error } = await supabase
      .schema("hrms")
      .from(table)
      .select(select)
      .is("deleted_at", null)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function main() {
  const excelPath = findExcelPath();
  if (!excelPath) {
    throw new Error("Attendance XLSX not found under src/assets/");
  }

  const env = loadEnv(ROOT);
  const { url, key } = requireSupabaseEnv(env);
  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const workbook = parseAttendanceWorkbook(excelPath);
  const employees = (await fetchAll(
    sb,
    "employees",
    "id, employee_code, first_name, last_name, email, date_of_joining, deleted_at",
  )).filter((row) => !row.deleted_at);
  const liveByCode = new Map(
    employees.map((row) => [String(row.employee_code).trim().toUpperCase(), row]),
  );

  const existing = await fetchAll(
    sb,
    "salary_structures",
    "id, employee_id, effective_from, effective_to, gross_salary, deleted_at",
  );
  const existingByEmployee = new Map();
  for (const row of existing) {
    const list = existingByEmployee.get(row.employee_id) ?? [];
    list.push(row);
    existingByEmployee.set(row.employee_id, list);
  }

  const monthlyByEmployee = new Map();
  const skipped = { unmatched: 0, former: 0, noSalary: 0, noEmployee: 0 };
  const unmatchedNames = new Set();

  const records = [...workbook.payrollRecords].sort((a, b) =>
    String(a.payrollMonth ?? "").localeCompare(String(b.payrollMonth ?? "")),
  );

  for (const rec of records) {
    if (!rec.payrollMonth) continue;
    const identity = resolvePersonIdentity(rec.sourceName, [], employees);
    if (!identity.importAttendance || !identity.employeeCode) {
      if (identity.category === "FORMER_EMPLOYEE") skipped.former += 1;
      else {
        skipped.unmatched += 1;
        unmatchedNames.add(rec.sourceName);
      }
      continue;
    }
    const emp = liveByCode.get(String(identity.employeeCode).toUpperCase());
    if (!emp) {
      skipped.noEmployee += 1;
      continue;
    }
    const salary = money(rec.salary);
    if (salary == null) {
      skipped.noSalary += 1;
      continue;
    }
    const months = monthlyByEmployee.get(emp.id) ?? [];
    months.push({
      employeeId: emp.id,
      employeeCode: emp.employee_code,
      sourceName: rec.sourceName,
      month: rec.payrollMonth,
      salary,
    });
    monthlyByEmployee.set(emp.id, months);
  }

  const plannedInserts = [];
  const plannedCloses = [];
  const skippedExisting = [];

  for (const [employeeId, months] of monthlyByEmployee) {
    months.sort((a, b) => a.month.localeCompare(b.month));
    const existingRows = [...(existingByEmployee.get(employeeId) ?? [])].sort((a, b) =>
      String(a.effective_from).localeCompare(String(b.effective_from)),
    );

    for (const entry of months) {
      const covering = existingRows
        .filter((row) => structureCoversMonth(row, entry.month))
        .sort((a, b) => String(b.effective_from).localeCompare(String(a.effective_from)))[0];
      if (covering) {
        skippedExisting.push({
          employeeCode: entry.employeeCode,
          month: entry.month,
          reason: "structure already covers month",
        });
        continue;
      }

      const nextFrom = existingRows
        .map((row) => String(row.effective_from).slice(0, 10))
        .filter((from) => from > entry.month)
        .sort()[0];
      const priorOpen = existingRows.find(
        (row) =>
          !row.effective_to &&
          String(row.effective_from).slice(0, 10) < entry.month &&
          !String(row.id).startsWith("pending-"),
      );
      if (priorOpen) {
        plannedCloses.push({
          id: priorOpen.id,
          effective_to: dayBefore(entry.month),
        });
        priorOpen.effective_to = dayBefore(entry.month);
      }

      const split = splitMonthlyGross(entry.salary);
      const effectiveTo = nextFrom ? dayBefore(nextFrom) : null;
      plannedInserts.push({
        employee_id: employeeId,
        employeeCode: entry.employeeCode,
        sourceName: entry.sourceName,
        effective_from: entry.month,
        effective_to: effectiveTo,
        currency_code: "INR",
        basic_salary: split.basic,
        hra_amount: split.hra,
        transport_allowance: split.lta,
        other_allowances: split.special,
        tax_deduction: 0,
        other_deductions: 0,
        gross_salary: entry.salary,
        net_salary: entry.salary,
        components: {
          specialAllowance: split.special,
          medical: 0,
          pf: 0,
          esi: 0,
          professionalTax: 0,
          incomeTax: 0,
          other: 0,
        },
      });
      existingRows.push({
        id: `pending-${entry.month}`,
        employee_id: employeeId,
        effective_from: entry.month,
        effective_to: effectiveTo,
        gross_salary: entry.salary,
      });
    }
  }

  const summary = {
    file: path.relative(ROOT, excelPath),
    mode: APPLY ? "apply" : "dry-run",
    payrollRows: records.length,
    employeesWithSalary: monthlyByEmployee.size,
    insert: plannedInserts.length,
    closePrevious: plannedCloses.length,
    skippedExisting: skippedExisting.length,
    skipped,
    unmatchedNames: [...unmatchedNames],
    sampleInserts: plannedInserts.slice(0, 12).map((row) => ({
      employeeCode: row.employeeCode,
      sourceName: row.sourceName,
      effectiveFrom: row.effective_from,
      gross: row.gross_salary,
    })),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!APPLY) {
    console.log("\nDry-run only. Re-run with --apply to write salary structures.");
    return;
  }

  for (const close of plannedCloses) {
    const { error } = await sb
      .schema("hrms")
      .from("salary_structures")
      .update({ effective_to: close.effective_to, updated_at: new Date().toISOString() })
      .eq("id", close.id);
    if (error) throw new Error(`close ${close.id} failed: ${error.message}`);
  }

  for (let i = 0; i < plannedInserts.length; i += 40) {
    const chunk = plannedInserts.slice(i, i + 40).map(
      ({ employeeCode, sourceName, ...row }) => row,
    );
    const { error } = await sb.schema("hrms").from("salary_structures").insert(chunk);
    if (error) throw new Error(`insert failed: ${error.message}`);
  }

  console.log(`Wrote ${plannedInserts.length} salary structures.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
