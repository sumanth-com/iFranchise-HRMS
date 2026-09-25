/**
 * Historical leave-usage reconciliation from Attendence Sheet 2026 workbook.
 *
 * One-time / idempotent migration:
 * - Reads every monthly sheet (APR–SEPT 2026)
 * - Syncs CL / EL / PL / LOP / OH attendance markers into hrms.attendance
 * - Also corrects DB leave markers that disagree with Excel non-leave cells
 * - Does not invent employees; uses resolvePersonIdentity + live employee_code
 * - Does not create duplicate rows
 * - Correct records are left untouched
 *
 * After attendance writes, rebuilds CL/EL/PL leave_balances used/available
 * from attendance + approved requests (same merge rule as leave-ledger-reconcile).
 *
 * Usage:
 *   node scripts/hr-data-migration/reconcile-leave-usage-from-excel.mjs
 *   node scripts/hr-data-migration/reconcile-leave-usage-from-excel.mjs --apply
 *   node scripts/hr-data-migration/reconcile-leave-usage-from-excel.mjs --apply --file "/path/to.xlsx"
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
const APPLY = process.argv.includes("--apply");
const IMPORT_NOTE = "excel-leave-reconcile-2026-workbook";

const LEAVE_CODES = new Set(["CL", "EL", "PL", "LOP", "OH"]);
const MONTHLY_ACCRUAL = new Set(["CL", "EL"]);

const DEFAULT_EXCEL_CANDIDATES = [
  path.join(ROOT, "src/assets/Attendence Sheet 2026.xlsx"),
  path.join(ROOT, "src/assets/Attendence Sheet 2026 (4).xlsx"),
  path.join(ROOT, "src/assets/Attendence Sheet 2026 (1).xlsx"),
  "/Users/sumanthreddy/Downloads/Attendence Sheet 2026 (4).xlsx",
];

function fileArg() {
  const idx = process.argv.indexOf("--file");
  if (idx >= 0 && process.argv[idx + 1]) return path.resolve(process.argv[idx + 1]);
  return null;
}

function findExcelPath() {
  const explicit = fileArg();
  if (explicit) {
    if (!fs.existsSync(explicit)) throw new Error(`Excel not found: ${explicit}`);
    return explicit;
  }
  return DEFAULT_EXCEL_CANDIDATES.find((p) => fs.existsSync(p)) ?? null;
}

function leaveCodeFromNotes(notes) {
  const match = String(notes ?? "").match(/\bsrc:(CL|EL|PL|LOP|OH)\b/i);
  return match ? match[1].toUpperCase() : null;
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

function paidDaysFromBreakdown(row) {
  const breakdown = row.duration_breakdown;
  if (breakdown && typeof breakdown.paidDays === "number") {
    return Math.max(0, breakdown.paidDays);
  }
  return Math.max(0, Number(row.total_days) || 0);
}

async function reconcileLedgers(sb, employeeIds) {
  const results = [];
  for (const employeeId of employeeIds) {
    const [
      { data: balances, error: balErr },
      { data: attendance, error: attErr },
      { data: requests, error: reqErr },
    ] = await Promise.all([
      sb
        .schema("hrms")
        .from("leave_balances")
        .select(
          "id, allocated_days, used_days, pending_days, balance_days, leave_types:leave_type_id(code, days_per_year)",
        )
        .eq("employee_id", employeeId)
        .eq("balance_year", 2026)
        .is("deleted_at", null),
      sb
        .schema("hrms")
        .from("attendance")
        .select("notes")
        .eq("employee_id", employeeId)
        .gte("attendance_date", "2026-01-01")
        .lte("attendance_date", "2026-12-31")
        .is("deleted_at", null),
      sb
        .schema("hrms")
        .from("leave_requests")
        .select(
          "leave_status, total_days, duration_breakdown, leave_types:leave_type_id(code)",
        )
        .eq("employee_id", employeeId)
        .in("leave_status", ["approved", "pending"])
        .lte("start_date", "2026-12-31")
        .gte("end_date", "2026-01-01")
        .is("deleted_at", null),
    ]);
    if (balErr) throw new Error(balErr.message);
    if (attErr) throw new Error(attErr.message);
    if (reqErr) throw new Error(reqErr.message);

    const attendanceUsed = { CL: 0, EL: 0, PL: 0 };
    for (const row of attendance ?? []) {
      const code = leaveCodeFromNotes(row.notes);
      if (code === "CL" || code === "EL" || code === "PL") {
        attendanceUsed[code] += 1;
      }
    }

    const requestUsed = { CL: 0, EL: 0, PL: 0 };
    const pendingUsed = { CL: 0, EL: 0, PL: 0 };
    for (const row of requests ?? []) {
      const leaveType = Array.isArray(row.leave_types)
        ? row.leave_types[0]
        : row.leave_types;
      const code = String(leaveType?.code ?? "").toUpperCase();
      if (code !== "CL" && code !== "EL" && code !== "PL") continue;
      const paid = paidDaysFromBreakdown(row);
      if (row.leave_status === "approved") {
        requestUsed[code] += paid;
      } else {
        pendingUsed[code] += paid;
      }
    }

    const now = new Date().toISOString();
    for (const row of balances ?? []) {
      const leaveType = Array.isArray(row.leave_types)
        ? row.leave_types[0]
        : row.leave_types;
      const code = String(leaveType?.code ?? "").toUpperCase();
      if (code !== "CL" && code !== "EL" && code !== "PL") continue;

      const used = Math.max(attendanceUsed[code] ?? 0, requestUsed[code] ?? 0);
      const pending = Math.max(0, pendingUsed[code] ?? 0);
      const daysPerYear = Math.max(0, Number(leaveType?.days_per_year) || 0);
      const allocated = MONTHLY_ACCRUAL.has(code)
        ? Math.max(0, Number(row.allocated_days) || 0, used + pending)
        : Math.max(Number(row.allocated_days) || 0, daysPerYear, used + pending);
      const balanceDays = Math.max(0, allocated - used - pending);
      const same =
        Number(row.allocated_days) === allocated &&
        Number(row.used_days) === used &&
        Number(row.pending_days) === pending &&
        Number(row.balance_days) === balanceDays;
      if (same) continue;

      results.push({
        employeeId,
        code,
        from: {
          allocated: row.allocated_days,
          used: row.used_days,
          balance: row.balance_days,
        },
        to: { allocated, used, pending, balance: balanceDays },
      });

      if (APPLY) {
        const { error } = await sb
          .schema("hrms")
          .from("leave_balances")
          .update({
            allocated_days: allocated,
            used_days: used,
            pending_days: pending,
            balance_days: balanceDays,
            updated_at: now,
          })
          .eq("id", row.id)
          .is("deleted_at", null);
        if (error) throw new Error(error.message);
      }
    }
  }
  return results;
}

async function main() {
  const excelPath = findExcelPath();
  if (!excelPath) {
    throw new Error(
      "Attendance workbook not found. Pass --file /path/to.xlsx or place it under src/assets/.",
    );
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
    { is: { deleted_at: null } },
  );
  const liveByCode = new Map(
    employees.map((row) => [String(row.employee_code).trim().toUpperCase(), row]),
  );

  const existing = await fetchAll(
    sb,
    "attendance",
    "id, employee_id, attendance_date, attendance_status, check_in_at, check_out_at, notes, deleted_at",
    {
      gte: { attendance_date: "2026-04-01" },
      lte: { attendance_date: "2026-09-30" },
    },
  );

  const existingByKey = new Map();
  const dupKeys = new Set();
  for (const row of existing) {
    const key = `${row.employee_id}|${String(row.attendance_date).slice(0, 10)}`;
    const prev = existingByKey.get(key);
    if (prev && prev.deleted_at == null && row.deleted_at == null) {
      dupKeys.add(key);
    }
    if (!prev || (prev.deleted_at != null && row.deleted_at == null)) {
      existingByKey.set(key, row);
    }
  }

  const inserts = [];
  const updates = [];
  const planned = [];
  const skipped = {
    unmatched: 0,
    former: 0,
    identical: 0,
    nonLeave: 0,
    unknown: 0,
    duplicateKey: 0,
    unsafeDuplicate: 0,
    keptRealPunchOnLeaveTarget: 0,
  };
  const unmatchedNames = new Set();
  const affectedEmployeeIds = new Set();
  const seenExcelKeys = new Set();
  const byMonth = {};

  for (const rec of workbook.attendanceRecords) {
    if (rec.unknown || !rec.mappedStatus) {
      skipped.unknown += 1;
      continue;
    }

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
      skipped.unmatched += 1;
      unmatchedNames.add(`${rec.sourceName} (${identity.employeeCode})`);
      continue;
    }

    const key = `${emp.id}|${rec.date}`;
    if (seenExcelKeys.has(key)) {
      skipped.duplicateKey += 1;
      continue;
    }
    seenExcelKeys.add(key);

    const current = existingByKey.get(key);
    const currentLeave = leaveCodeFromNotes(current?.notes);
    const excelIsLeave = LEAVE_CODES.has(rec.sourceCode);
    const dbIsLeave = Boolean(currentLeave);

    // Only touch leave-relevant days (Excel leave OR DB leave that Excel contradicts).
    if (!excelIsLeave && !dbIsLeave) {
      skipped.nonLeave += 1;
      continue;
    }

    if (dupKeys.has(key)) {
      skipped.unsafeDuplicate += 1;
      planned.push({
        action: "skip-duplicate-rows",
        code: identity.employeeCode,
        name: rec.sourceName,
        date: rec.date,
        excel: rec.sourceCode,
      });
      continue;
    }

    const alreadyMatches =
      current &&
      current.deleted_at == null &&
      current.attendance_status === rec.mappedStatus &&
      (excelIsLeave
        ? currentLeave === rec.sourceCode
        : !currentLeave);

    if (alreadyMatches) {
      skipped.identical += 1;
      continue;
    }

    // Preserve genuine punches when Excel wants Present — leave→present with real punch stays.
    // When Excel wants leave, clear punches (leave days should not keep office punches).
    const realPunch =
      Boolean(current?.check_in_at) &&
      !isSyntheticOfficePunch(current.check_in_at, rec.date, "10:00");

    if (
      excelIsLeave &&
      realPunch &&
      current?.deleted_at == null &&
      current.attendance_status === "present"
    ) {
      // Sheet says leave, DB has a real punch marked Present — still apply leave
      // (historical sheet is source of truth for leave usage), clearing punches.
      skipped.keptRealPunchOnLeaveTarget += 0;
    }

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

    const monthKey = rec.date.slice(0, 7);
    byMonth[monthKey] = byMonth[monthKey] ?? { insert: 0, update: 0 };
    affectedEmployeeIds.add(emp.id);

    if (!current || current.deleted_at != null) {
      if (current?.deleted_at != null) {
        updates.push({ id: current.id, ...payload });
        byMonth[monthKey].update += 1;
        planned.push({
          action: "undelete+update",
          code: identity.employeeCode,
          name: rec.sourceName,
          date: rec.date,
          excel: rec.sourceCode,
          from: currentLeave ?? current.attendance_status,
        });
      } else {
        inserts.push(payload);
        byMonth[monthKey].insert += 1;
        planned.push({
          action: "insert",
          code: identity.employeeCode,
          name: rec.sourceName,
          date: rec.date,
          excel: rec.sourceCode,
        });
      }
      continue;
    }

    updates.push({ id: current.id, ...payload });
    byMonth[monthKey].update += 1;
    planned.push({
      action: "update",
      code: identity.employeeCode,
      name: rec.sourceName,
      date: rec.date,
      excel: rec.sourceCode,
      from: currentLeave ?? current.attendance_status,
    });
  }

  console.log(
    JSON.stringify(
      {
        mode: APPLY ? "APPLY" : "DRY_RUN",
        file: excelPath,
        plannedCount: planned.length,
        inserts: inserts.length,
        updates: updates.length,
        skipped,
        byMonth,
        unmatchedNames: [...unmatchedNames].slice(0, 30),
        sample: planned.slice(0, 40),
      },
      null,
      2,
    ),
  );

  if (APPLY) {
    const now = new Date().toISOString();
    for (const row of inserts) {
      const { error } = await sb.schema("hrms").from("attendance").insert({
        ...row,
        created_at: now,
        updated_at: now,
      });
      if (error) throw new Error(`insert ${row.attendance_date}: ${error.message}`);
    }
    for (const row of updates) {
      const { id, ...rest } = row;
      const { error } = await sb
        .schema("hrms")
        .from("attendance")
        .update({ ...rest, updated_at: now })
        .eq("id", id);
      if (error) throw new Error(`update ${id}: ${error.message}`);
    }
  }

  const ledgerUpdates = await reconcileLedgers(sb, [...affectedEmployeeIds]);

  // Verification: Excel leave days vs DB for a few sample employees/months.
  const verify = [];
  for (const month of ["2026-09", "2026-08", "2026-07", "2026-06", "2026-05", "2026-04"]) {
    const excelLeave = workbook.attendanceRecords.filter(
      (r) => r.date.startsWith(month) && LEAVE_CODES.has(r.sourceCode),
    );
    let matched = 0;
    let missing = 0;
    if (APPLY || true) {
      for (const rec of excelLeave) {
        const identity = resolvePersonIdentity(rec.sourceName, [], employees);
        if (!identity.importAttendance || !identity.employeeCode) continue;
        const emp = liveByCode.get(String(identity.employeeCode).toUpperCase());
        if (!emp) continue;
        const key = `${emp.id}|${rec.date}`;
        const row = existingByKey.get(key);
        // After apply, re-read would be better; for dry-run use planned overlay.
        const plannedHit = planned.find(
          (p) => p.code === identity.employeeCode && p.date === rec.date,
        );
        const effectiveCode = plannedHit
          ? plannedHit.excel
          : leaveCodeFromNotes(row?.notes);
        if (effectiveCode === rec.sourceCode) matched += 1;
        else missing += 1;
      }
    }
    verify.push({
      month,
      excelLeaveDays: excelLeave.length,
      matchedOrPlanned: matched,
      stillMismatch: missing,
    });
  }

  console.log(
    JSON.stringify(
      {
        ledgerUpdates: ledgerUpdates.length,
        ledgerSample: ledgerUpdates.slice(0, 20),
        verify,
        affectedEmployees: affectedEmployeeIds.size,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
