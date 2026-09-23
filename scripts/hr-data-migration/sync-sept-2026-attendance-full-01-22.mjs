/**
 * Full Sep 1–22 2026 attendance sync from HR sheet screenshots.
 * Attendance rows only. Blank cells on shown dates clear existing rows.
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
const DATE_TO = "2026-09-22";
const IMPORT_NOTE = "sheet-full-sept-2026-01-22";

/** Days present on the sheet for everyone (blank = omit / clear). */
const STANDARD = {
  "01": "P",
  "02": "P",
  "03": "P",
  "04": "P",
  "05": "P",
  "06": "H",
  "07": "P",
  "08": "P",
  "09": "P",
  "10": "P",
  "11": "P",
  "12": "P",
  "13": "H",
  "14": "P",
  "15": "P",
  "16": "P",
  "17": "P",
  "18": "P",
  "19": "P",
  "20": "H",
  "21": "P",
  // 22-09-2026: Present for everyone on the sheet except Anmol Prasad.
  "22": "P",
};

const SHEET_ROWS = [
  { name: "Om", code: "IF2025002", days: { ...STANDARD, "21": "CL" }, blank: [] },
  { name: "Himani", code: "IF2026002", days: { ...STANDARD }, blank: [] },
  { name: "Akshita", code: "IF2026012", days: { ...STANDARD }, blank: [] },
  {
    name: "Ekta",
    code: "IF2026001",
    days: { ...STANDARD, "04": "H", "05": "CL", "21": "CL" },
    blank: [],
  },
  {
    name: "Diksha",
    code: "IF2026011",
    days: { ...STANDARD, "08": "LOP" },
    blank: [],
  },
  { name: "Swetha", code: "IF2026010", days: { ...STANDARD }, blank: [] },
  { name: "Sumanth", code: "IF2026009", days: { ...STANDARD }, blank: [] },
  {
    name: "Sneha Mahajan",
    code: "IF2026014",
    days: { ...STANDARD, "08": "CL" },
    blank: [],
  },
  { name: "Prajjwal Negi", code: "IF2026015", days: { ...STANDARD }, blank: [] },
  { name: "Syed Samit Ali", code: "IF2026017", days: { ...STANDARD }, blank: [] },
  {
    name: "Vivek Rawat",
    code: "IF2026018",
    days: { ...STANDARD, "05": "CL" },
    blank: [],
  },
  { name: "Venupusa Hemavathi", code: "IF2026019", days: { ...STANDARD }, blank: [] },
  { name: "Shakshay Gupta", code: "IF2026021", days: { ...STANDARD }, blank: [] },
  {
    name: "Shiwali Singh",
    code: "IF2026020",
    days: { ...STANDARD, "09": "LOP" },
    blank: [],
  },
  // Anmol Prasad (sheet row 15) — not Present on 22-09; optional if missing from HRMS.
  {
    name: "Anmol Prasad",
    code: "IF2026022",
    optional: true,
    days: {
      "01": "P",
      "02": "P",
      "03": "P",
      "04": "P",
      "05": "P",
      "06": "H",
      "07": "P",
      "08": "P",
      "09": "P",
      "10": "P",
      "11": "P",
      "12": "CL",
      "13": "H",
      "14": "A",
      "15": "A",
      "16": "A",
      "17": "A",
      "18": "A",
      "19": "A",
      "20": "A",
      "21": "A",
      "22": "A",
    },
    blank: [],
  },
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

function buildSheetRecords(rows) {
  const records = [];
  for (const row of rows) {
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

function buildBlankClears(rows) {
  const clears = [];
  for (const row of rows) {
    for (const dd of row.blank ?? []) {
      clears.push({
        employeeCode: row.code,
        sourceName: row.name,
        date: `2026-09-${dd}`,
      });
    }
  }
  return clears;
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
      for (const [key, value] of Object.entries(filters.gte)) query = query.gte(key, value);
    }
    if (filters.lte) {
      for (const [key, value] of Object.entries(filters.lte)) query = query.lte(key, value);
    }
    if (filters.in) {
      for (const [key, value] of Object.entries(filters.in)) query = query.in(key, value);
    }
    if (filters.is) {
      for (const [key, value] of Object.entries(filters.is)) query = query.is(key, value);
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
  const missingRequired = SHEET_ROWS.filter((r) => !r.optional && !liveByCode.has(r.code)).map(
    (r) => r.code,
  );
  const missingOptional = SHEET_ROWS.filter((r) => r.optional && !liveByCode.has(r.code)).map(
    (r) => `${r.name} (${r.code})`,
  );
  if (missingRequired.length) {
    throw new Error(`Missing employees: ${missingRequired.join(", ")}`);
  }
  if (missingOptional.length) {
    console.warn("SKIPPING_MISSING_OPTIONAL_EMPLOYEES", missingOptional);
  }

  const activeRows = SHEET_ROWS.filter((r) => liveByCode.has(r.code));
  const activeCodes = activeRows.map((r) => r.code);
  const sheetRecords = buildSheetRecords(activeRows);
  const blankClears = buildBlankClears(activeRows);

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
  const softDeletes = [];
  const skipped = { identical: 0, keptRealPresentPunch: 0 };
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

    const current = existingByKey.get(key);
    if (!current || current.deleted_at != null) {
      if (current?.deleted_at != null) {
        updates.push({ id: current.id, ...payload });
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
        planned.push({
          action: "insert",
          code: rec.employeeCode,
          name: rec.sourceName,
          date: rec.date,
          sheet: rec.sourceCode,
          status: rec.mappedStatus,
        });
      }
      continue;
    }

    const realPresentPunch =
      rec.mappedStatus === "present" &&
      Boolean(current.check_in_at) &&
      !isSyntheticOfficePunch(current.check_in_at, rec.date, "10:00");

    if (realPresentPunch) {
      if (current.attendance_status === "present") {
        skipped.keptRealPresentPunch += 1;
        continue;
      }
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
      planned.push({
        action: "update-status-keep-punch",
        code: rec.employeeCode,
        name: rec.sourceName,
        date: rec.date,
        sheet: rec.sourceCode,
        from: current.attendance_status,
        to: "present",
      });
      continue;
    }

    const sameStatus = current.attendance_status === rec.mappedStatus;
    const samePunchShape =
      rec.mappedStatus === "present"
        ? isSyntheticOfficePunch(current.check_in_at, rec.date, "10:00")
        : !current.check_in_at;
    if (sameStatus && samePunchShape) {
      skipped.identical += 1;
      continue;
    }

    updates.push({ id: current.id, ...payload });
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

  const now = new Date().toISOString();
  for (const clear of blankClears) {
    const emp = liveByCode.get(clear.employeeCode);
    const key = `${emp.id}|${clear.date}`;
    const current = existingByKey.get(key);
    if (current && current.deleted_at == null) {
      softDeletes.push(current.id);
      planned.push({
        action: "soft-delete-blank",
        code: clear.employeeCode,
        name: clear.sourceName,
        date: clear.date,
        from: current.attendance_status,
      });
    }
  }

  const exceptions = planned.filter((row) =>
    ["CL", "A", "H", "LOP"].includes(row.sheet) || row.action === "soft-delete-blank",
  );

  console.log(
    JSON.stringify(
      {
        range: { from: DATE_FROM, to: DATE_TO },
        mode: APPLY ? "apply" : "dry-run",
        sheetRecords: sheetRecords.length,
        insert: inserts.length,
        update: updates.length,
        softDelete: softDeletes.length,
        skipped,
        exceptionSample: exceptions.slice(0, 60),
        exceptionTotal: exceptions.length,
        plannedTotal: planned.length,
      },
      null,
      2,
    ),
  );

  if (!APPLY) {
    console.log("\nDry-run only. Re-run with --apply to write.");
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
      .update({ ...rest, updated_at: now })
      .eq("id", id);
    if (error) throw new Error(`update ${id} failed: ${error.message}`);
  }

  if (softDeletes.length) {
    const { error } = await sb
      .schema("hrms")
      .from("attendance")
      .update({ deleted_at: now, updated_at: now })
      .in("id", softDeletes);
    if (error) throw new Error(`soft-delete failed: ${error.message}`);
  }

  const expectedByCode = Object.fromEntries(
    activeRows.map((row) => [
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
  for (const code of activeCodes) {
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
      if (got[date] !== want) mismatches.push({ code, date, want, got: got[date] ?? null });
    }
    const row = activeRows.find((r) => r.code === code);
    for (const dd of row.blank ?? []) {
      const date = `2026-09-${dd}`;
      if (got[date]) mismatches.push({ code, date, want: null, got: got[date] });
    }
  }

  console.log(
    JSON.stringify(
      {
        applied: {
          insert: inserts.length,
          update: updates.length,
          softDelete: softDeletes.length,
        },
        skippedOptionalEmployees: missingOptional,
        verifyMismatchCount: mismatches.length,
        mismatches,
        spot: {
          ekta: expectedByCode.IF2026001,
          vivek: expectedByCode.IF2026018,
          sneha: expectedByCode.IF2026014,
          diksha: expectedByCode.IF2026011,
          shiwali: expectedByCode.IF2026020,
          anmol: expectedByCode.IF2026022 ?? null,
          om: expectedByCode.IF2025002,
        },
      },
      null,
      2,
    ),
  );

  if (mismatches.length) {
    process.exitCode = 1;
    console.error("Verification failed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
