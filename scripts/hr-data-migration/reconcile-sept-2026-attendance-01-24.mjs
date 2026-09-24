/**
 * CRITICAL — September 2026 attendance reconciliation ONLY (01–24 Sep).
 *
 * Source of truth: Attendance Sheet 2026 → Sept-2026 screenshots (01–24).
 * Updates hrms.attendance status mismatches only. No payroll/leave/UI changes.
 *
 * Default: dry-run (mismatch report). Pass --apply to write.
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
const DATE_TO = "2026-09-24";
const IMPORT_NOTE = "sheet-sync-sept-2026-reconcile-01-24";

/** Standard weekday present + Sunday holiday pattern for Sep 1–24. */
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
  "22": "P",
  "23": "P",
  "24": "P",
};

/**
 * Exact Sept-2026 sheet rows (01–24). Lowercase sheet `p` → Present `P`.
 * Employee codes match prior Sept sync scripts.
 */
const SHEET_ROWS = [
  {
    name: "Om",
    code: "IF2025002",
    days: { ...STANDARD, "21": "CL", "23": "EL" },
  },
  { name: "Himani Bhargava Tapadiya", code: "IF2026002", days: { ...STANDARD } },
  { name: "Akshita Potnuru", code: "IF2026012", days: { ...STANDARD } },
  {
    name: "Ekta Pattanaik",
    code: "IF2026001",
    days: { ...STANDARD, "04": "H", "05": "CL", "21": "CL" },
  },
  {
    name: "Diksha",
    code: "IF2026011",
    days: { ...STANDARD, "08": "LOP" },
  },
  { name: "Swetha Chintada", code: "IF2026010", days: { ...STANDARD } },
  { name: "Sumanth", code: "IF2026009", days: { ...STANDARD } },
  {
    name: "Sneha Mahajan",
    code: "IF2026014",
    days: { ...STANDARD, "08": "CL" },
  },
  { name: "Prajjwal Negi", code: "IF2026015", days: { ...STANDARD } },
  { name: "Samit Ali", code: "IF2026017", days: { ...STANDARD } },
  {
    name: "Vivek Rawat",
    code: "IF2026018",
    days: { ...STANDARD, "05": "CL" },
  },
  { name: "Venupusa Hemavathi", code: "IF2026019", days: { ...STANDARD } },
  { name: "Shakshay Gupta", code: "IF2026021", days: { ...STANDARD } },
  { name: "Shiwali Singh", code: "IF2026020", days: { ...STANDARD } },
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
      "09": "LOP",
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
      "20": "H",
      "21": "A",
      "22": "A",
      "23": "A",
      "24": "A",
    },
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
    (r) => `${r.name} (${r.code})`,
  );
  const missingOptional = SHEET_ROWS.filter((r) => r.optional && !liveByCode.has(r.code)).map(
    (r) => `${r.name} (${r.code})`,
  );
  if (missingRequired.length) {
    throw new Error(`Missing employees in HRMS: ${missingRequired.join(", ")}`);
  }

  const activeRows = SHEET_ROWS.filter((r) => liveByCode.has(r.code));
  const sheetRecords = buildSheetRecords(activeRows);
  const employeeIds = activeRows.map((r) => liveByCode.get(r.code).id);

  const existing = await fetchAll(
    sb,
    "attendance",
    "id, employee_id, attendance_date, attendance_status, check_in_at, check_out_at, work_hours, notes, deleted_at",
    {
      gte: { attendance_date: DATE_FROM },
      lte: { attendance_date: DATE_TO },
      in: { employee_id: employeeIds },
    },
  );

  // Duplicate detection within scope (active rows only).
  const activeExisting = existing.filter((r) => r.deleted_at == null);
  const dupCounts = new Map();
  for (const row of activeExisting) {
    const key = `${row.employee_id}|${String(row.attendance_date).slice(0, 10)}`;
    dupCounts.set(key, (dupCounts.get(key) ?? 0) + 1);
  }
  const duplicates = [...dupCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ key, count }));

  const existingByKey = new Map();
  for (const row of existing) {
    const key = `${row.employee_id}|${String(row.attendance_date).slice(0, 10)}`;
    const prev = existingByKey.get(key);
    // Prefer active row; if duplicates, keep first active.
    if (!prev || (prev.deleted_at != null && row.deleted_at == null)) {
      existingByKey.set(key, row);
    }
  }

  const inserts = [];
  const updates = [];
  const mismatches = [];
  const alreadyMatching = [];
  const unsafe = [];
  const keptRealPunch = [];
  const planned = [];

  for (const rec of sheetRecords) {
    const emp = liveByCode.get(rec.employeeCode);
    const key = `${emp.id}|${rec.date}`;
    const current = existingByKey.get(key);
    const punches = punchFields(rec.mappedStatus, rec.date);

    if (duplicates.some((d) => d.key === key)) {
      unsafe.push({
        reason: "duplicate-rows",
        code: rec.employeeCode,
        name: rec.sourceName,
        date: rec.date,
        sheet: rec.sourceCode,
        want: rec.mappedStatus,
      });
      continue;
    }

    if (!current || current.deleted_at != null) {
      mismatches.push({
        code: rec.employeeCode,
        name: rec.sourceName,
        date: rec.date,
        sheet: rec.sourceCode,
        want: rec.mappedStatus,
        got: current?.deleted_at != null ? `${current.attendance_status}(deleted)` : null,
      });
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
      if (current?.deleted_at != null) {
        updates.push({ id: current.id, ...payload });
        planned.push({ action: "undelete+update", ...mismatches[mismatches.length - 1] });
      } else {
        inserts.push(payload);
        planned.push({ action: "insert", ...mismatches[mismatches.length - 1] });
      }
      continue;
    }

    const realPresentPunch =
      Boolean(current.check_in_at) &&
      !isSyntheticOfficePunch(current.check_in_at, rec.date, "10:00");

    // Status already matches → do not alter punches/hours/notes.
    if (current.attendance_status === rec.mappedStatus) {
      alreadyMatching.push({
        code: rec.employeeCode,
        name: rec.sourceName,
        date: rec.date,
        status: rec.mappedStatus,
        sheet: rec.sourceCode,
        keptRealPunch: rec.mappedStatus === "present" && realPresentPunch,
      });
      continue;
    }

    mismatches.push({
      code: rec.employeeCode,
      name: rec.sourceName,
      date: rec.date,
      sheet: rec.sourceCode,
      want: rec.mappedStatus,
      got: current.attendance_status,
      check_in_at: current.check_in_at,
      check_out_at: current.check_out_at,
    });

    // Present with a real punch: fix status only; preserve timestamps.
    if (rec.mappedStatus === "present" && realPresentPunch) {
      updates.push({
        id: current.id,
        attendance_status: "present",
        notes: `src:${rec.sourceCode}|${IMPORT_NOTE}|kept-real-punch`,
        status: "active",
        deleted_at: null,
      });
      keptRealPunch.push({
        code: rec.employeeCode,
        name: rec.sourceName,
        date: rec.date,
        from: current.attendance_status,
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

    // Non-punch sheet statuses must not keep fabricated presence punches.
    updates.push({
      id: current.id,
      organization_id: emp.organization_id,
      branch_id: emp.branch_id,
      employee_id: emp.id,
      attendance_date: rec.date,
      attendance_status: rec.mappedStatus,
      notes: `src:${rec.sourceCode}|${IMPORT_NOTE}`,
      status: "active",
      deleted_at: null,
      ...punches,
    });
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

  // Outside-scope safety: count active rows for these employees outside Sep 1–24 (report only; never written).
  const outsideProbe = await fetchAll(
    sb,
    "attendance",
    "id, employee_id, attendance_date, attendance_status, notes",
    {
      in: { employee_id: employeeIds },
      is: { deleted_at: null },
    },
  );
  const outsideScopeRows = outsideProbe.filter((r) => {
    const d = String(r.attendance_date).slice(0, 10);
    return d < DATE_FROM || d > DATE_TO;
  });

  const report = {
    range: { from: DATE_FROM, to: DATE_TO },
    mode: APPLY ? "apply" : "dry-run",
    totals: {
      recordsChecked: sheetRecords.length,
      mismatchesFound: mismatches.length,
      alreadyMatching: alreadyMatching.length,
      plannedInserts: inserts.length,
      plannedUpdates: updates.length,
      keptRealPunchOnStatusFix: keptRealPunch.length,
      unsafeSkipped: unsafe.length,
      duplicateKeysInScope: duplicates.length,
      outsideScopeRowsUntouched: outsideScopeRows.length,
      employeeNotInHrms: missingOptional.length,
    },
    couldNotSafelyReconcile: [
      ...unsafe,
      ...missingOptional.map((label) => ({
        reason: "employee-not-in-hrms",
        employee: label,
        note: "Sheet row present; no employee record to write attendance against. Did not invent an employee.",
      })),
    ],
    statusMap: {
      P: "present",
      H: "holiday",
      CL: "on_leave",
      EL: "on_leave",
      LOP: "absent",
      A: "absent",
    },
    mismatches,
    unsafe,
    duplicates,
    plannedSample: planned.slice(0, 80),
    plannedTotal: planned.length,
  };

  console.log(JSON.stringify(report, null, 2));

  if (!APPLY) {
    console.log("\nDry-run only. Re-run with --apply to write Sep 1–24 mismatches.");
    return;
  }

  if (unsafe.length || duplicates.length) {
    throw new Error(
      `Refusing to apply: ${unsafe.length} unsafe + ${duplicates.length} duplicate keys. Resolve manually.`,
    );
  }

  const now = new Date().toISOString();

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

  // Post-apply verification: sheet status vs hrms.attendance
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

  const verifyMismatches = [];
  for (const row of activeRows) {
    const emp = liveByCode.get(row.code);
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
      (data ?? []).map((r) => [String(r.attendance_date).slice(0, 10), r.attendance_status]),
    );
    for (const [date, want] of Object.entries(expectedByCode[row.code])) {
      if (got[date] !== want) {
        verifyMismatches.push({
          code: row.code,
          name: row.name,
          date,
          want,
          got: got[date] ?? null,
        });
      }
    }
  }

  // Confirm no dates outside Sep 1–24 were written by this run (notes marker).
  const touchedOutside = outsideProbe.filter((r) => {
    const d = String(r.attendance_date).slice(0, 10);
    return (d < DATE_FROM || d > DATE_TO) && String(r.notes || "").includes(IMPORT_NOTE);
  });

  console.log(
    JSON.stringify(
      {
        applied: {
          recordsChecked: sheetRecords.length,
          mismatchesFound: mismatches.length,
          recordsCorrected: inserts.length + updates.length,
          recordsAlreadyMatching: alreadyMatching.length,
          inserts: inserts.length,
          updates: updates.length,
          keptRealPunchOnStatusFix: keptRealPunch.length,
          couldNotSafelyReconcileCount: unsafe.length + missingOptional.length,
        },
        couldNotSafelyReconcile: [
          ...unsafe,
          ...missingOptional.map((label) => ({
            reason: "employee-not-in-hrms",
            employee: label,
          })),
        ],
        verifyMismatchCount: verifyMismatches.length,
        verifyMismatches,
        touchedOutsideScopeWithImportNote: touchedOutside.length,
      },
      null,
      2,
    ),
  );

  if (verifyMismatches.length) {
    process.exitCode = 1;
    console.error("Post-apply verification failed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
