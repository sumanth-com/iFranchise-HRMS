/**
 * One-time attendance import from Attendence Sheet 2026 (1).xlsx.
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
const DELETE_FILE = process.argv.includes("--delete-file");
const IMPORT_NOTE = "excel-import-2026-09";

function findExcelPath() {
  return EXCEL_CANDIDATES.find((filePath) => fs.existsSync(filePath)) ?? null;
}

function officeStamp(date, hhmm) {
  return new Date(`${date}T${hhmm}:00+05:30`).toISOString();
}

function isSyntheticOfficePunch(iso, date, hhmm) {
  if (!iso) return true;
  const expected = Date.parse(officeStamp(date, hhmm));
  const actual = Date.parse(iso);
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  return Math.abs(actual - expected) <= 60_000;
}

function punchFields(status, date) {
  if (status === "present" || status === "late") {
    return {
      check_in_at: officeStamp(date, "10:00"),
      check_out_at: officeStamp(date, "19:00"),
      work_hours: 9,
    };
  }
  return {
    check_in_at: null,
    check_out_at: null,
    work_hours: 0,
  };
}

async function fetchAll(supabase, table, select, filters = {}) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    let query = supabase.schema("hrms").from(table).select(select).range(from, from + pageSize - 1);
    if (filters.gte) {
      for (const [key, value] of Object.entries(filters.gte)) query = query.gte(key, value);
    }
    if (filters.lte) {
      for (const [key, value] of Object.entries(filters.lte)) query = query.lte(key, value);
    }
    const { data, error } = await query;
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
  const employees = await fetchAll(
    sb,
    "employees",
    "id, organization_id, branch_id, employee_code, first_name, last_name, email, deleted_at",
  );
  const live = employees.filter((row) => !row.deleted_at);
  const liveByCode = new Map(
    live.map((row) => [String(row.employee_code).trim().toUpperCase(), row]),
  );

  const existing = await fetchAll(
    sb,
    "attendance",
    "id, employee_id, attendance_date, attendance_status, check_in_at, check_out_at, notes, deleted_at",
    { gte: { attendance_date: "2026-04-01" }, lte: { attendance_date: "2026-12-31" } },
  );
  const existingByKey = new Map(
    existing.map((row) => [`${row.employee_id}|${row.attendance_date}`, row]),
  );

  const inserts = [];
  const updates = [];
  const skipped = {
    former: 0,
    unmatched: 0,
    unknownCode: 0,
    identical: 0,
    keptPunch: 0,
    duplicate: 0,
    noEmployee: 0,
  };
  const unknownCodes = new Map();
  const unmatchedNames = new Set();
  const seen = new Set();
  const byEmployee = new Map();

  for (const rec of workbook.attendanceRecords) {
    if (rec.unknown || !rec.mappedStatus) {
      skipped.unknownCode += 1;
      unknownCodes.set(rec.sourceCode, (unknownCodes.get(rec.sourceCode) ?? 0) + 1);
      continue;
    }

    const identity = resolvePersonIdentity(rec.sourceName, [], live);
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
      unmatchedNames.add(`${rec.sourceName} (${identity.employeeCode})`);
      continue;
    }

    const key = `${emp.id}|${rec.date}`;
    if (seen.has(key)) {
      skipped.duplicate += 1;
      continue;
    }
    seen.add(key);

    const punches = punchFields(rec.mappedStatus, rec.date);
    const payload = {
      organization_id: emp.organization_id,
      branch_id: emp.branch_id,
      employee_id: emp.id,
      attendance_date: rec.date,
      attendance_status: rec.mappedStatus,
      overtime_hours: 0,
      notes: `src:${rec.sourceCode}|${IMPORT_NOTE}`,
      status: "active",
      deleted_at: null,
      ...punches,
    };

    const counts = byEmployee.get(identity.employeeCode) ?? {
      code: identity.employeeCode,
      name: rec.sourceName,
      insert: 0,
      update: 0,
      skip: 0,
    };

    const current = existingByKey.get(key);
    if (!current) {
      inserts.push(payload);
      counts.insert += 1;
      byEmployee.set(identity.employeeCode, counts);
      continue;
    }

    const realPunch =
      Boolean(current.check_in_at) &&
      !isSyntheticOfficePunch(current.check_in_at, rec.date, "10:00");

    if (realPunch && current.deleted_at == null) {
      skipped.keptPunch += 1;
      counts.skip += 1;
      byEmployee.set(identity.employeeCode, counts);
      continue;
    }

    if (
      current.deleted_at == null &&
      current.attendance_status === rec.mappedStatus
    ) {
      skipped.identical += 1;
      counts.skip += 1;
      byEmployee.set(identity.employeeCode, counts);
      continue;
    }

    updates.push({ id: current.id, ...payload });
    counts.update += 1;
    byEmployee.set(identity.employeeCode, counts);
  }

  const summary = {
    file: path.relative(ROOT, excelPath),
    sheets: Object.fromEntries(
      Object.entries(workbook.sheets).map(([name, sheet]) => [
        name,
        {
          missing: Boolean(sheet.missing),
          employees: sheet.employees?.length ?? 0,
          records: sheet.attendanceRecords?.length ?? 0,
          range: sheet.dateRange ?? null,
          codes: sheet.statusCounts ?? {},
        },
      ]),
    ),
    mode: APPLY ? "apply" : "dry-run",
    insert: inserts.length,
    update: updates.length,
    skipped,
    unmatchedNames: [...unmatchedNames],
    unknownCodes: Object.fromEntries(unknownCodes),
    employees: [...byEmployee.values()].sort((a, b) => a.code.localeCompare(b.code)),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!APPLY) {
    console.log("\nDry-run only. Re-run with --apply to write attendance rows.");
    return;
  }

  for (let i = 0; i < inserts.length; i += 80) {
    const chunk = inserts.slice(i, i + 80);
    const { error } = await sb.schema("hrms").from("attendance").insert(chunk);
    if (error) throw new Error(`insert failed: ${error.message}`);
  }

  for (const row of updates) {
    const { id, ...rest } = row;
    const { error } = await sb
      .schema("hrms")
      .from("attendance")
      .update({
        ...rest,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(`update ${id} failed: ${error.message}`);
  }

  const sample = await sb
    .schema("hrms")
    .from("attendance")
    .select("employee_id, attendance_date, attendance_status, notes, employees!inner(employee_code)")
    .gte("attendance_date", "2026-04-01")
    .lte("attendance_date", "2026-09-30")
    .is("deleted_at", null)
    .eq("employees.employee_code", "IF2026012")
    .order("attendance_date", { ascending: true });

  if (sample.error) throw new Error(sample.error.message);
  console.log(
    `\nVerify IF2026012 rows=${sample.data?.length ?? 0} statuses=`,
    Object.fromEntries(
      Object.entries(
        (sample.data ?? []).reduce((acc, row) => {
          acc[row.attendance_status] = (acc[row.attendance_status] ?? 0) + 1;
          return acc;
        }, {}),
      ),
    ),
  );

  if (DELETE_FILE && fs.existsSync(excelPath) && excelPath.includes("(1)")) {
    fs.unlinkSync(excelPath);
    console.log(`Deleted ${path.relative(ROOT, excelPath)}`);
  }

  console.log(`Imported: insert=${inserts.length} update=${updates.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
