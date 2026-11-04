/**
 * Sumanth-only October 2026 attendance + salary-period + payroll fix.
 * Does not write other employees' attendance or leave.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireSupabaseEnv } from "./lib/env.mjs";
import { mapAttendanceCode } from "./lib/excel-attendance.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SUMANTH_CODE = "IF2026009";
const DATE_FROM = "2026-10-01";
const DATE_TO = "2026-10-31";
const IMPORT_NOTE = "sumanth-oct-2026-cl-lop-fix";
const FULL_TIME_FROM = "2026-10-14";
const PROBATION_TO = "2026-10-13";
const CL_TYPE_ID = "b0000000-0000-4000-8000-000000000502";
const LOP_TYPE_ID = "b0000000-0000-4000-8000-000000000504";

const DAYS = {
  "01": "P", "02": "H", "03": "P", "04": "H", "05": "P", "06": "P", "07": "P",
  "08": "P", "09": "P", "10": "P", "11": "H", "12": "P", "13": "P", "14": "P",
  "15": "P", "16": "P", "17": "P", "18": "H", "19": "P", "20": "H", "21": "CL",
  "22": "LOP", "23": "LOP", "24": "P", "25": "H", "26": "P", "27": "P", "28": "P",
  "29": "P", "30": "P", "31": "P",
};

function officeStamp(date, hhmm) {
  return new Date(`${date}T${hhmm}:00+05:30`).toISOString();
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

function loadEnvLocal() {
  const env = loadEnv(ROOT);
  const { url, key } = requireSupabaseEnv(env);
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] == null) process.env[k] = String(v);
  }
  return { url, key };
}

async function main() {
  const { url, key } = loadEnvLocal();
  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sumanth, error: se } = await sb
    .schema("hrms")
    .from("employees")
    .select(
      "id, organization_id, branch_id, employee_code, first_name, last_name, user_id, designation_id, employment_type_id",
    )
    .eq("employee_code", SUMANTH_CODE)
    .is("deleted_at", null)
    .maybeSingle();
  if (se || !sumanth) throw new Error(se?.message || "Sumanth not found");

  const { data: actor, error: ae } = await sb
    .schema("hrms")
    .from("employees")
    .select("id, user_id, organization_id, branch_id, email, first_name, last_name, employee_code")
    .eq("employee_code", "IF2026001")
    .maybeSingle();
  if (ae || !actor?.user_id) throw new Error(ae?.message || "HR actor missing");

  const now = new Date().toISOString();

  const { data: existingAtt, error: attErr } = await sb
    .schema("hrms")
    .from("attendance")
    .select("id, attendance_date, attendance_status, notes")
    .eq("employee_id", sumanth.id)
    .gte("attendance_date", DATE_FROM)
    .lte("attendance_date", DATE_TO);
  if (attErr) throw attErr;
  const byDate = new Map(
    (existingAtt ?? []).map((row) => [String(row.attendance_date).slice(0, 10), row]),
  );

  let attUpdates = 0;
  let attInserts = 0;
  for (const [dd, sourceCode] of Object.entries(DAYS)) {
    const date = `2026-10-${dd}`;
    const mapped = mapAttendanceCode(sourceCode, date);
    const payload = {
      organization_id: sumanth.organization_id,
      branch_id: sumanth.branch_id,
      employee_id: sumanth.id,
      attendance_date: date,
      attendance_status: mapped.mappedStatus,
      notes: `src:${sourceCode}|${IMPORT_NOTE}`,
      status: "active",
      deleted_at: null,
      updated_at: now,
      ...punchFields(mapped.mappedStatus, date),
    };
    const current = byDate.get(date);
    if (!current) {
      const { error } = await sb.schema("hrms").from("attendance").insert({
        ...payload,
        created_at: now,
      });
      if (error) throw new Error(`insert ${date}: ${error.message}`);
      attInserts += 1;
      continue;
    }
    const { error } = await sb
      .schema("hrms")
      .from("attendance")
      .update(payload)
      .eq("id", current.id);
    if (error) throw new Error(`update ${date}: ${error.message}`);
    attUpdates += 1;
  }

  const { data: leaves, error: le } = await sb
    .schema("hrms")
    .from("leave_requests")
    .select("id, leave_type_id, start_date, end_date, leave_status")
    .eq("employee_id", sumanth.id)
    .lte("start_date", DATE_TO)
    .gte("end_date", DATE_FROM)
    .is("deleted_at", null);
  if (le) throw le;

  const wanted = [
    { typeId: CL_TYPE_ID, start: "2026-10-21", end: "2026-10-21", days: 1, code: "CL" },
    { typeId: LOP_TYPE_ID, start: "2026-10-22", end: "2026-10-23", days: 2, code: "LOP" },
  ];
  const used = new Set();
  for (const want of wanted) {
    const match = (leaves ?? []).find(
      (row) =>
        row.leave_status === "approved" &&
        row.leave_type_id === want.typeId &&
        String(row.start_date).slice(0, 10) === want.start &&
        String(row.end_date).slice(0, 10) === want.end,
    );
    if (match) {
      used.add(match.id);
      continue;
    }
    const dates = [];
    for (
      let cursor = new Date(`${want.start}T00:00:00Z`);
      cursor.toISOString().slice(0, 10) <= want.end;
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    ) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    const kind = want.code === "LOP" ? "lop" : "paid";
    const { error } = await sb.schema("hrms").from("leave_requests").insert({
      employee_id: sumanth.id,
      leave_type_id: want.typeId,
      start_date: want.start,
      end_date: want.end,
      total_days: want.days,
      reason: "October 2026 attendance correction",
      leave_status: "approved",
      status: "active",
      is_half_day: false,
      duration_breakdown: {
        days: dates.map((date) => ({
          date,
          kind: "working",
          class: "working",
          counted: 1,
          inRequestedRange: true,
        })),
        endDate: want.end,
        lopDays: want.code === "LOP" ? want.days : 0,
        halfDays: 0,
        paidDays: want.code === "LOP" ? 0 : want.days,
        startDate: want.start,
        workingDays: want.days,
        sandwichDays: 0,
        dayAllocations: dates.map((date) => ({ date, kind, counted: 1 })),
        publicHolidays: 0,
        requestedDates: dates,
        totalLeaveDays: want.days,
        weeklyHolidays: 0,
        sandwichExplanations: [],
      },
      created_by: actor.user_id,
      updated_by: actor.user_id,
      created_at: now,
      updated_at: now,
    });
    if (error) throw new Error(`insert leave ${want.code}: ${error.message}`);
  }
  for (const row of leaves ?? []) {
    if (used.has(row.id) || row.leave_status !== "approved") continue;
    const { error } = await sb
      .schema("hrms")
      .from("leave_requests")
      .update({
        leave_status: "cancelled",
        updated_by: actor.user_id,
        updated_at: now,
      })
      .eq("id", row.id);
    if (error) throw new Error(`cancel leave ${row.id}: ${error.message}`);
  }

  const { data: structures, error: stErr } = await sb
    .schema("hrms")
    .from("salary_structures")
    .select("id, gross_salary, effective_from, effective_to")
    .eq("employee_id", sumanth.id)
    .is("deleted_at", null);
  if (stErr) throw stErr;

  for (const row of structures ?? []) {
    const gross = Number(row.gross_salary);
    if (gross === 12_000 && row.effective_to !== PROBATION_TO) {
      const { error } = await sb
        .schema("hrms")
        .from("salary_structures")
        .update({ effective_to: PROBATION_TO, updated_by: actor.user_id, updated_at: now })
        .eq("id", row.id);
      if (error) throw new Error(`close 12k: ${error.message}`);
    }
    if (gross === 50_000 && row.effective_from !== FULL_TIME_FROM) {
      const { error } = await sb
        .schema("hrms")
        .from("salary_structures")
        .update({ effective_from: FULL_TIME_FROM, updated_by: actor.user_id, updated_at: now })
        .eq("id", row.id);
      if (error) throw new Error(`move 50k: ${error.message}`);
    }
  }

  const { error: empErr } = await sb
    .schema("hrms")
    .from("employees")
    .update({
      full_time_effective_date: FULL_TIME_FROM,
      probation_end_date: PROBATION_TO,
      updated_by: actor.user_id,
      updated_at: now,
    })
    .eq("id", sumanth.id);
  if (empErr) throw empErr;

  await sb
    .schema("hrms")
    .from("salary_revisions")
    .update({ effective_from: FULL_TIME_FROM, updated_at: now })
    .eq("employee_id", sumanth.id)
    .eq("new_gross_salary", 50_000);

  await sb
    .schema("hrms")
    .from("employment_confirmations")
    .update({
      effective_date: FULL_TIME_FROM,
      probation_end_date: PROBATION_TO,
      updated_at: now,
    })
    .eq("employee_id", sumanth.id);

  console.log(
    JSON.stringify(
      {
        employee: SUMANTH_CODE,
        attendanceWrites: { attUpdates, attInserts },
        salary: { probationTo: PROBATION_TO, fullTimeFrom: FULL_TIME_FROM },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
