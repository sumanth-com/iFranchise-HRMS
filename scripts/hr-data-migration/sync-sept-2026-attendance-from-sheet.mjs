/**
 * Sync Sep 1–8 2026 attendance from the HR attendance sheet screenshot
 * (not the stale XLSX, which is missing later September days).
 *
 * Attendance rows only — does not create leave_requests or touch payroll/GPS/UI.
 *
 * Default: dry-run. Pass --apply to write.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireSupabaseEnv } from "./lib/env.mjs";
import { mapAttendanceCode } from "./lib/excel-attendance.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const DATE_FROM = "2026-09-01";
const DATE_TO = "2026-09-08";
const IMPORT_NOTE = "sheet-screenshot-sync-2026-09-01-08";

/**
 * Screenshot matrix (01–08 Sep 2026). Codes: P / H / CL / LOP.
 * Order matches the sheet rows.
 */
const SHEET_ROWS = [
  { name: "Om", code: "IF2025002", days: { "01": "P", "02": "P", "03": "P", "04": "P", "05": "P", "06": "H", "07": "P", "08": "P" } },
  { name: "Himani", code: "IF2026002", days: { "01": "P", "02": "P", "03": "P", "04": "P", "05": "P", "06": "H", "07": "P", "08": "P" } },
  { name: "Akshita", code: "IF2026012", days: { "01": "P", "02": "P", "03": "P", "04": "P", "05": "P", "06": "H", "07": "P", "08": "P" } },
  { name: "Ekta", code: "IF2026001", days: { "01": "P", "02": "P", "03": "P", "04": "H", "05": "CL", "06": "H", "07": "P", "08": "P" } },
  { name: "Diksha", code: "IF2026011", days: { "01": "P", "02": "P", "03": "P", "04": "P", "05": "P", "06": "H", "07": "P", "08": "LOP" } },
  { name: "Swetha", code: "IF2026010", days: { "01": "P", "02": "P", "03": "P", "04": "P", "05": "P", "06": "H", "07": "P", "08": "P" } },
  { name: "Sumanth", code: "IF2026009", days: { "01": "P", "02": "P", "03": "P", "04": "P", "05": "P", "06": "H", "07": "P", "08": "P" } },
  { name: "Sneha Mahajan", code: "IF2026014", days: { "01": "P", "02": "P", "03": "P", "04": "P", "05": "P", "06": "H", "07": "P", "08": "CL" } },
  { name: "Prajjwal Negi", code: "IF2026015", days: { "01": "P", "02": "P", "03": "P", "04": "P", "05": "P", "06": "H", "07": "P", "08": "P" } },
  { name: "Syed Samit Ali", code: "IF2026017", days: { "01": "P", "02": "P", "03": "P", "04": "P", "05": "P", "06": "H", "07": "P", "08": "P" } },
  { name: "Vivek Rawat", code: "IF2026018", days: { "01": "P", "02": "P", "03": "P", "04": "P", "05": "P", "06": "H", "07": "P", "08": "P" } },
  { name: "Venupusa Hemavathi", code: "IF2026019", days: { "01": "P", "02": "P", "03": "P", "04": "P", "05": "P", "06": "H", "07": "P", "08": "P" } },
  { name: "Shakshay Gupta", code: "IF2026021", days: { "01": "P", "02": "P", "03": "P", "04": "P", "05": "P", "06": "H", "07": "P", "08": "P" } },
  { name: "Shiwali Singh", code: "IF2026020", days: { "01": "P", "02": "P", "03": "P", "04": "P", "05": "P", "06": "H", "07": "P", "08": "P" } },
  { name: "Anmol Prasad", code: "IF2026022", days: { "01": "P", "02": "P", "03": "P", "04": "P", "05": "P", "06": "H", "07": "P", "08": "P" } },
];

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
      overtime_hours: 0,
    };
  }
  return {
    check_in_at: null,
    check_out_at: null,
    work_hours: 0,
    overtime_hours: 0,
  };
}

function buildSheetRecords() {
  const records = [];
  for (const row of SHEET_ROWS) {
    for (const [dd, sourceCode] of Object.entries(row.days)) {
      const date = `2026-09-${dd}`;
      const mapped = mapAttendanceCode(sourceCode, date);
      if (mapped.skip || !mapped.mappedStatus || mapped.unknown) {
        throw new Error(`Bad sheet code ${sourceCode} for ${row.name} ${date}`);
      }
      records.push({
        employeeCode: row.code,
        sourceName: row.name,
        date,
        sourceCode: mapped.sourceCode,
        mappedStatus: mapped.mappedStatus,
      });
    }
  }
  return records;
}

async function fetchAll(supabase, table, select, filters = {}) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    let query = supabase
      .schema("hrms")
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);
    if (filters.gte) {
      for (const [key, value] of Object.entries(filters.gte)) {
        query = query.gte(key, value);
      }
    }
    if (filters.lte) {
      for (const [key, value] of Object.entries(filters.lte)) {
        query = query.lte(key, value);
      }
    }
    if (filters.in) {
      for (const [key, value] of Object.entries(filters.in)) {
        query = query.in(key, value);
      }
    }
    if (filters.is) {
      for (const [key, value] of Object.entries(filters.is)) {
        query = query.is(key, value);
      }
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
  const sheetRecords = buildSheetRecords();
  const env = loadEnv(ROOT);
  const { url, key } = requireSupabaseEnv(env);
  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const codes = SHEET_ROWS.map((r) => r.code);
  const employees = await fetchAll(
    sb,
    "employees",
    "id, organization_id, branch_id, employee_code, first_name, last_name, deleted_at",
    { in: { employee_code: codes }, is: { deleted_at: null } },
  );
  const liveByCode = new Map(
    employees.map((row) => [String(row.employee_code).trim().toUpperCase(), row]),
  );

  const missingCodes = codes.filter((c) => !liveByCode.has(c));
  if (missingCodes.length) {
    throw new Error(`Missing employees in HRMS: ${missingCodes.join(", ")}`);
  }

  const existing = await fetchAll(
    sb,
    "attendance",
    "id, employee_id, attendance_date, attendance_status, check_in_at, check_out_at, notes, deleted_at",
    { gte: { attendance_date: DATE_FROM }, lte: { attendance_date: DATE_TO } },
  );
  const existingByKey = new Map(
    existing.map((row) => [`${row.employee_id}|${row.attendance_date}`, row]),
  );

  const inserts = [];
  const updates = [];
  const skipped = {
    identical: 0,
    keptRealPresentPunch: 0,
  };
  const byEmployee = new Map();
  const planned = [];

  for (const rec of sheetRecords) {
    const emp = liveByCode.get(rec.employeeCode);
    const key = `${emp.id}|${rec.date}`;
    const punches = punchFields(rec.mappedStatus, rec.date);
    const payload = {
      organization_id: emp.organization_id,
      branch_id: emp.branch_id,
      employee_id: emp.id,
      attendance_date: rec.date,
      attendance_status: rec.mappedStatus,
      notes: `src:${rec.sourceCode}|${IMPORT_NOTE}`,
      status: "active",
      deleted_at: null,
      ...punches,
    };

    const counts = byEmployee.get(rec.employeeCode) ?? {
      code: rec.employeeCode,
      name: rec.sourceName,
      insert: 0,
      update: 0,
      skip: 0,
    };

    const current = existingByKey.get(key);
    if (!current || current.deleted_at != null) {
      if (current?.deleted_at != null) {
        updates.push({ id: current.id, ...payload });
        counts.update += 1;
        planned.push({
          action: "undelete+update",
          code: rec.employeeCode,
          name: rec.sourceName,
          date: rec.date,
          sheet: rec.sourceCode,
          from: current.attendance_status,
          to: rec.mappedStatus,
        });
      } else {
        inserts.push(payload);
        counts.insert += 1;
        planned.push({
          action: "insert",
          code: rec.employeeCode,
          name: rec.sourceName,
          date: rec.date,
          sheet: rec.sourceCode,
          status: rec.mappedStatus,
        });
      }
      byEmployee.set(rec.employeeCode, counts);
      continue;
    }

    // Preserve live GPS / real self-service punches only when sheet says Present.
    const realPresentPunch =
      rec.mappedStatus === "present" &&
      Boolean(current.check_in_at) &&
      !isSyntheticOfficePunch(current.check_in_at, rec.date, "10:00");

    if (realPresentPunch) {
      if (current.attendance_status === "present") {
        skipped.keptRealPresentPunch += 1;
        counts.skip += 1;
        byEmployee.set(rec.employeeCode, counts);
        continue;
      }
      // Status wrong but keep punches — only fix status/notes.
      updates.push({
        id: current.id,
        organization_id: emp.organization_id,
        branch_id: emp.branch_id,
        employee_id: emp.id,
        attendance_date: rec.date,
        attendance_status: "present",
        notes: `src:${rec.sourceCode}|${IMPORT_NOTE}|kept-real-punch`,
        status: "active",
        deleted_at: null,
        check_in_at: current.check_in_at,
        check_out_at: current.check_out_at,
      });
      counts.update += 1;
      planned.push({
        action: "update-status-keep-punch",
        code: rec.employeeCode,
        name: rec.sourceName,
        date: rec.date,
        sheet: rec.sourceCode,
        from: current.attendance_status,
        to: "present",
      });
      byEmployee.set(rec.employeeCode, counts);
      continue;
    }

    const sameStatus = current.attendance_status === rec.mappedStatus;
    const samePunchShape =
      rec.mappedStatus === "present"
        ? isSyntheticOfficePunch(current.check_in_at, rec.date, "10:00")
        : !current.check_in_at;

    if (sameStatus && samePunchShape) {
      skipped.identical += 1;
      counts.skip += 1;
      byEmployee.set(rec.employeeCode, counts);
      continue;
    }

    updates.push({ id: current.id, ...payload });
    counts.update += 1;
    byEmployee.set(rec.employeeCode, counts);
    planned.push({
      action: "update",
      code: rec.employeeCode,
      name: rec.sourceName,
      date: rec.date,
      sheet: rec.sourceCode,
      from: current.attendance_status,
      to: rec.mappedStatus,
    });
  }

  const exceptions = planned.filter((row) =>
    ["CL", "LOP", "H"].includes(row.sheet),
  );

  const summary = {
    source: "screenshot-matrix",
    range: { from: DATE_FROM, to: DATE_TO },
    mode: APPLY ? "apply" : "dry-run",
    sheetRecords: sheetRecords.length,
    insert: inserts.length,
    update: updates.length,
    skipped,
    exceptionChanges: exceptions,
    plannedSample: planned.slice(0, 40),
    plannedTotal: planned.length,
    employees: [...byEmployee.values()].sort((a, b) => a.code.localeCompare(b.code)),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!APPLY) {
    console.log("\nDry-run only. Re-run with --apply to write Sep 1–8 attendance.");
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

  // Post-apply verification against screenshot expectations.
  const expectedByCode = Object.fromEntries(
    SHEET_ROWS.map((row) => [
      row.code,
      Object.fromEntries(
        Object.entries(row.days).map(([dd, code]) => {
          const date = `2026-09-${dd}`;
          return [date, mapAttendanceCode(code, date).mappedStatus];
        }),
      ),
    ]),
  );

  const mismatches = [];
  for (const code of codes) {
    const emp = liveByCode.get(code);
    const { data, error } = await sb
      .schema("hrms")
      .from("attendance")
      .select("attendance_date, attendance_status")
      .eq("employee_id", emp.id)
      .gte("attendance_date", DATE_FROM)
      .lte("attendance_date", DATE_TO)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    const got = Object.fromEntries(
      (data ?? []).map((r) => [r.attendance_date, r.attendance_status]),
    );
    for (const [date, want] of Object.entries(expectedByCode[code])) {
      if (got[date] !== want) {
        mismatches.push({ code, date, want, got: got[date] ?? null });
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        applied: { insert: inserts.length, update: updates.length },
        verifyMismatchCount: mismatches.length,
        mismatches,
        ekta: expectedByCode.IF2026001,
        diksha: expectedByCode.IF2026011,
        sneha: expectedByCode.IF2026014,
      },
      null,
      2,
    ),
  );

  if (mismatches.length) {
    process.exitCode = 1;
    console.error("Verification failed — statuses do not match screenshot.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
