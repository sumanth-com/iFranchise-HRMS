/**
 * Idempotent fix: Om Anil Ramtekkar (IF2025002) September 2026 EL days
 * confirmed by Attendance Sheet 2026 → Sept-2026 screenshots.
 *
 * Sheet truth (relevant days):
 *   21 Sep = CL (already correct in DB — not changed)
 *   23 Sep = EL (already correct — not changed)
 *   24 Sep = EL (DB was Present — update)
 *   25 Sep = EL (already correct — not changed)
 *   26 Sep = EL (DB missing — insert)
 *
 * Scope: only Om + only 24 Sep and 26 Sep.
 * Default: dry-run. Pass --apply to write.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireSupabaseEnv } from "./lib/env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

const EMPLOYEE_CODE = "IF2025002";
const IMPORT_NOTE = "sheet-sync-om-sept-2026-el-24-26";
const EL_NOTE = `src:EL|${IMPORT_NOTE}`;

/** Confirmed EL dates that were mismatched vs sheet (only these are written). */
const TARGET_EL_DATES = ["2026-09-24", "2026-09-26"];

/** Expected post-fix snapshot for verification (read-only asserts). */
const EXPECTED_AFTER = {
  "2026-09-21": { status: "on_leave", code: "CL" },
  "2026-09-23": { status: "on_leave", code: "EL" },
  "2026-09-24": { status: "on_leave", code: "EL" },
  "2026-09-25": { status: "on_leave", code: "EL" },
  "2026-09-26": { status: "on_leave", code: "EL" },
};

function leaveCodeFromNotes(notes) {
  const match = String(notes ?? "").match(/\bsrc:(CL|EL|PL|LOP|H|P)\b/i);
  return match ? match[1].toUpperCase() : null;
}

function isAlreadyEl(row) {
  if (!row || row.deleted_at != null) return false;
  return (
    row.attendance_status === "on_leave" && leaveCodeFromNotes(row.notes) === "EL"
  );
}

async function reconcileOmElLedger(sb, employeeId) {
  const yearStart = "2026-01-01";
  const yearEnd = "2026-12-31";
  const MONTHLY = new Set(["CL", "EL"]);

  const [{ data: balances, error: balErr }, { data: attendance, error: attErr }] =
    await Promise.all([
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
        .select("attendance_date, notes")
        .eq("employee_id", employeeId)
        .gte("attendance_date", yearStart)
        .lte("attendance_date", yearEnd)
        .is("deleted_at", null),
    ]);

  if (balErr) throw new Error(balErr.message);
  if (attErr) throw new Error(attErr.message);

  const usedByCode = { CL: 0, EL: 0, PL: 0 };
  for (const row of attendance ?? []) {
    const code = leaveCodeFromNotes(row.notes);
    if (code === "CL" || code === "EL" || code === "PL") {
      usedByCode[code] += 1;
    }
  }

  const now = new Date().toISOString();
  const updates = [];
  for (const row of balances ?? []) {
    const leaveType = Array.isArray(row.leave_types)
      ? row.leave_types[0]
      : row.leave_types;
    const code = String(leaveType?.code ?? "").toUpperCase();
    if (code !== "CL" && code !== "EL" && code !== "PL") continue;

    const used = usedByCode[code] ?? 0;
    const pending = Math.max(0, Number(row.pending_days) || 0);
    const daysPerYear = Math.max(0, Number(leaveType?.days_per_year) || 0);
    // Match leave-ledger-reconcile.ts: monthly CL/EL do not force days_per_year.
    const allocated = MONTHLY.has(code)
      ? Math.max(0, Number(row.allocated_days) || 0, used + pending)
      : Math.max(Number(row.allocated_days) || 0, daysPerYear, used + pending);
    const balanceDays = Math.max(0, allocated - used - pending);
    const same =
      Number(row.allocated_days) === allocated &&
      Number(row.used_days) === used &&
      Number(row.pending_days) === pending &&
      Number(row.balance_days) === balanceDays;
    if (same) continue;

    updates.push({
      id: row.id,
      code,
      from: {
        allocated: row.allocated_days,
        used: row.used_days,
        pending: row.pending_days,
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

  return { usedByCode, updates };
}

async function main() {
  const env = loadEnv(ROOT);
  const { url, key } = requireSupabaseEnv(env);
  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: emp, error: empErr } = await sb
    .schema("hrms")
    .from("employees")
    .select("id, organization_id, branch_id, employee_code, first_name, last_name")
    .eq("employee_code", EMPLOYEE_CODE)
    .is("deleted_at", null)
    .maybeSingle();
  if (empErr) throw new Error(empErr.message);
  if (!emp) throw new Error(`Employee ${EMPLOYEE_CODE} not found`);

  const { data: rows, error: attErr } = await sb
    .schema("hrms")
    .from("attendance")
    .select(
      "id, attendance_date, attendance_status, notes, check_in_at, check_out_at, deleted_at",
    )
    .eq("employee_id", emp.id)
    .in("attendance_date", [
      "2026-09-21",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
    ])
    .order("attendance_date");
  if (attErr) throw new Error(attErr.message);

  const byDate = new Map();
  for (const row of rows ?? []) {
    const date = String(row.attendance_date).slice(0, 10);
    const prev = byDate.get(date);
    if (!prev || (prev.deleted_at != null && row.deleted_at == null)) {
      byDate.set(date, row);
    }
  }

  const planned = [];
  for (const date of TARGET_EL_DATES) {
    const current = byDate.get(date);
    if (isAlreadyEl(current)) {
      planned.push({ date, action: "noop-already-el", id: current.id });
      continue;
    }

    if (current && current.deleted_at == null) {
      // Duplicate guard: ensure only one active row for this date.
      const activeSameDate = (rows ?? []).filter(
        (r) =>
          String(r.attendance_date).slice(0, 10) === date && r.deleted_at == null,
      );
      if (activeSameDate.length > 1) {
        throw new Error(
          `Duplicate active attendance rows for ${EMPLOYEE_CODE} ${date} — aborting`,
        );
      }

      planned.push({
        date,
        action: "update",
        id: current.id,
        from: {
          status: current.attendance_status,
          notes: current.notes,
        },
        to: {
          status: "on_leave",
          notes: EL_NOTE,
        },
      });
      continue;
    }

    if (current?.deleted_at != null) {
      planned.push({
        date,
        action: "undelete+update",
        id: current.id,
        from: {
          status: current.attendance_status,
          notes: current.notes,
          deleted: true,
        },
        to: {
          status: "on_leave",
          notes: EL_NOTE,
        },
      });
      continue;
    }

    planned.push({
      date,
      action: "insert",
      to: {
        status: "on_leave",
        notes: EL_NOTE,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        mode: APPLY ? "APPLY" : "DRY_RUN",
        employee: {
          code: emp.employee_code,
          name: `${emp.first_name} ${emp.last_name}`.trim(),
          id: emp.id,
        },
        planned,
      },
      null,
      2,
    ),
  );

  if (APPLY) {
    const now = new Date().toISOString();
    for (const item of planned) {
      if (item.action === "noop-already-el") continue;

      if (item.action === "update" || item.action === "undelete+update") {
        const { error } = await sb
          .schema("hrms")
          .from("attendance")
          .update({
            attendance_status: "on_leave",
            notes: EL_NOTE,
            check_in_at: null,
            check_out_at: null,
            work_hours: 0,
            overtime_hours: 0,
            status: "active",
            deleted_at: null,
            updated_at: now,
          })
          .eq("id", item.id)
          .eq("employee_id", emp.id);
        if (error) throw new Error(`${item.date} update: ${error.message}`);
        continue;
      }

      if (item.action === "insert") {
        const { error } = await sb.schema("hrms").from("attendance").insert({
          organization_id: emp.organization_id,
          branch_id: emp.branch_id,
          employee_id: emp.id,
          attendance_date: item.date,
          attendance_status: "on_leave",
          notes: EL_NOTE,
          check_in_at: null,
          check_out_at: null,
          work_hours: 0,
          overtime_hours: 0,
          status: "active",
          deleted_at: null,
          created_at: now,
          updated_at: now,
        });
        if (error) throw new Error(`${item.date} insert: ${error.message}`);
      }
    }
  }

  // Re-read and verify expected snapshot (including untouched CL/EL days).
  const { data: afterRows, error: afterErr } = await sb
    .schema("hrms")
    .from("attendance")
    .select("attendance_date, attendance_status, notes, deleted_at")
    .eq("employee_id", emp.id)
    .in("attendance_date", Object.keys(EXPECTED_AFTER))
    .is("deleted_at", null)
    .order("attendance_date");
  if (afterErr) throw new Error(afterErr.message);

  const afterByDate = new Map(
    (afterRows ?? []).map((r) => [String(r.attendance_date).slice(0, 10), r]),
  );

  const verification = [];
  let ok = true;
  for (const [date, want] of Object.entries(EXPECTED_AFTER)) {
    const row = afterByDate.get(date);
    const gotCode = leaveCodeFromNotes(row?.notes);
    const match =
      Boolean(row) &&
      row.attendance_status === want.status &&
      gotCode === want.code;
    if (!match) ok = false;
    verification.push({
      date,
      want,
      got: row
        ? { status: row.attendance_status, code: gotCode, notes: row.notes }
        : null,
      match: APPLY ? match : date === "2026-09-24" || date === "2026-09-26" ? "pending-apply" : match,
    });
  }

  const ledger = await reconcileOmElLedger(sb, emp.id);

  console.log(
    JSON.stringify(
      {
        verification,
        verificationOk: APPLY ? ok : "dry-run",
        ledger,
        septElDates: (afterRows ?? [])
          .filter((r) => leaveCodeFromNotes(r.notes) === "EL")
          .map((r) => String(r.attendance_date).slice(0, 10)),
      },
      null,
      2,
    ),
  );

  if (APPLY && !ok) {
    process.exitCode = 1;
    throw new Error("Post-apply verification failed for Om September EL/CL snapshot");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
