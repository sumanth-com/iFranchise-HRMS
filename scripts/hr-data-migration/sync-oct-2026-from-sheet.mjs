/**
 * Sync October 2026 attendance from the HR attendance-sheet screenshots,
 * align leave markers, apply Sumanth's effective-dated confirmation/salary,
 * and refresh the unlocked October payroll run with the existing calculator.
 *
 * Default: dry-run. Pass --apply to write.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireSupabaseEnv } from "./lib/env.mjs";
import { mapAttendanceCode } from "./lib/excel-attendance.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const DATE_FROM = "2026-10-01";
const DATE_TO = "2026-10-31";
const IMPORT_NOTE = "sheet-screenshot-sync-2026-10";
const SUMANTH_CODE = "IF2026009";
const FULL_TIME_FROM = "2026-10-14";
const PROBATION_TO = "2026-10-13";
const FULL_TIME_GROSS = 50_000;
const PROBATION_GROSS = 12_000;

const CL_TYPE_ID = "b0000000-0000-4000-8000-000000000502";
const EL_TYPE_ID = "b0000000-0000-4000-8000-000000000501";
const LOP_TYPE_ID = "b0000000-0000-4000-8000-000000000504";
const FULL_TIME_TYPE_ID = "a0000000-0000-4000-8000-000000000401";

/**
 * Day cells from the October 2026 attendance screenshots (01–31).
 * Totals are verified in-script against Present/Absent/Holiday/CL/EL columns.
 */
const SHEET_ROWS = [
  {
    name: "Himani",
    code: "IF2026002",
    days: {
      "01": "P", "02": "H", "03": "P", "04": "H", "05": "P", "06": "P", "07": "P",
      "08": "P", "09": "CL", "10": "P", "11": "H", "12": "P", "13": "P", "14": "P",
      "15": "P", "16": "P", "17": "P", "18": "H", "19": "P", "20": "H", "21": "P",
      "22": "P", "23": "P", "24": "P", "25": "H", "26": "P", "27": "P", "28": "P",
      "29": "P", "30": "P", "31": "P",
    },
  },
  {
    name: "Akshita",
    code: "IF2026012",
    days: {
      "01": "P", "02": "H", "03": "P", "04": "H", "05": "P", "06": "P", "07": "P",
      "08": "P", "09": "P", "10": "P", "11": "H", "12": "P", "13": "P", "14": "P",
      "15": "P", "16": "P", "17": "P", "18": "H", "19": "P", "20": "H", "21": "P",
      "22": "P", "23": "P", "24": "P", "25": "H", "26": "P", "27": "P", "28": "P",
      "29": "P", "30": "P", "31": "P",
    },
  },
  {
    name: "Ekta",
    code: "IF2026001",
    days: {
      "01": "P", "02": "H", "03": "P", "04": "H", "05": "P", "06": "P", "07": "P",
      "08": "P", "09": "P", "10": "P", "11": "H", "12": "P", "13": "P", "14": "P",
      "15": "P", "16": "P", "17": "P", "18": "H", "19": "P", "20": "H", "21": "P",
      "22": "P", "23": "P", "24": "P", "25": "H", "26": "P", "27": "P", "28": "P",
      "29": "CL", "30": "P", "31": "P",
    },
  },
  {
    name: "Swetha",
    code: "IF2026010",
    days: {
      "01": "P", "02": "H", "03": "P", "04": "H", "05": "P", "06": "P", "07": "P",
      "08": "P", "09": "P", "10": "P", "11": "H", "12": "P", "13": "P", "14": "CL",
      "15": "P", "16": "P", "17": "P", "18": "H", "19": "P", "20": "H", "21": "P",
      "22": "P", "23": "EL", "24": "P", "25": "H", "26": "P", "27": "P", "28": "P",
      "29": "CL", "30": "P", "31": "P",
    },
  },
  {
    name: "Sumanth",
    code: "IF2026009",
    days: {
      "01": "P", "02": "H", "03": "P", "04": "H", "05": "P", "06": "P", "07": "P",
      "08": "P", "09": "P", "10": "P", "11": "H", "12": "P", "13": "P", "14": "P",
      "15": "P", "16": "P", "17": "P", "18": "H", "19": "P", "20": "H", "21": "CL",
      "22": "LOP", "23": "LOP", "24": "P", "25": "H", "26": "P", "27": "P", "28": "P",
      "29": "P", "30": "P", "31": "P",
    },
  },
  {
    name: "Sneha Mahajan",
    code: "IF2026014",
    days: {
      "01": "P", "02": "H", "03": "P", "04": "H", "05": "P", "06": "P", "07": "P",
      "08": "P", "09": "P", "10": "P", "11": "H", "12": "P", "13": "P", "14": "P",
      "15": "P", "16": "P", "17": "P", "18": "H", "19": "P", "20": "H", "21": "P",
      "22": "P", "23": "P", "24": "P", "25": "H", "26": "P", "27": "P", "28": "CL",
      "29": "P", "30": "P", "31": "P",
    },
  },
  {
    name: "Prajjwal Negi",
    code: "IF2026015",
    days: {
      "01": "P", "02": "H", "03": "P", "04": "H", "05": "P", "06": "P", "07": "P",
      "08": "P", "09": "P", "10": "P", "11": "H", "12": "P", "13": "P", "14": "P",
      "15": "P", "16": "P", "17": "P", "18": "H", "19": "P", "20": "H", "21": "P",
      "22": "P", "23": "P", "24": "P", "25": "H", "26": "P", "27": "P", "28": "P",
      "29": "P", "30": "P", "31": "P",
    },
  },
  {
    name: "Syed Samit Ali",
    code: "IF2026017",
    days: {
      "01": "P", "02": "H", "03": "P", "04": "H", "05": "P", "06": "P", "07": "P",
      "08": "CL", "09": "P", "10": "P", "11": "H", "12": "P", "13": "P", "14": "P",
      "15": "P", "16": "P", "17": "P", "18": "H", "19": "P", "20": "H", "21": "P",
      "22": "P", "23": "P", "24": "P", "25": "H", "26": "P", "27": "P", "28": "P",
      "29": "P", "30": "P", "31": "P",
    },
  },
  {
    name: "Vivek Rawat",
    code: "IF2026018",
    days: {
      "01": "P", "02": "H", "03": "P", "04": "H", "05": "P", "06": "P", "07": "P",
      "08": "P", "09": "P", "10": "P", "11": "H", "12": "P", "13": "P", "14": "P",
      "15": "P", "16": "P", "17": "P", "18": "H", "19": "P", "20": "H", "21": "P",
      "22": "P", "23": "CL", "24": "P", "25": "H", "26": "P", "27": "P", "28": "P",
      "29": "P", "30": "P", "31": "P",
    },
  },
  {
    name: "Venupusa Hemavathi",
    code: "IF2026019",
    days: {
      "01": "P", "02": "H", "03": "P", "04": "H", "05": "P", "06": "P", "07": "P",
      "08": "P", "09": "P", "10": "P", "11": "H", "12": "P", "13": "P", "14": "P",
      "15": "P", "16": "P", "17": "P", "18": "H", "19": "P", "20": "H", "21": "P",
      "22": "P", "23": "CL", "24": "P", "25": "H", "26": "P", "27": "P", "28": "P",
      "29": "A", "30": "P", "31": "P",
    },
  },
  {
    name: "Shakshay Gupta",
    code: "IF2026021",
    days: {
      "01": "P", "02": "H", "03": "P", "04": "H", "05": "CL", "06": "LOP", "07": "LOP",
      "08": "P", "09": "P", "10": "P", "11": "H", "12": "P", "13": "P", "14": "P",
      "15": "P", "16": "P", "17": "P", "18": "H", "19": "P", "20": "H", "21": "P",
      "22": "P", "23": "P", "24": "P", "25": "H", "26": "P", "27": "P", "28": "P",
      "29": "P", "30": "P", "31": "P",
    },
  },
  {
    name: "Shiwali Singh",
    code: "IF2026020",
    days: {
      "01": "P", "02": "H", "03": "P", "04": "H", "05": "P", "06": "P", "07": "P",
      "08": "P", "09": "P", "10": "P", "11": "H", "12": "P", "13": "P", "14": "P",
      "15": "P", "16": "P", "17": "P", "18": "H", "19": "P", "20": "H", "21": "P",
      "22": "P", "23": "P", "24": "P", "25": "H", "26": "P", "27": "P", "28": "P",
      "29": "CL", "30": "P", "31": "P",
    },
  },
  {
    name: "Naman Thapiyal",
    code: "IF2026023",
    days: {
      "01": "A", "02": "A", "03": "A", "04": "A", "05": "A", "06": "A", "07": "A",
      "08": "A", "09": "A", "10": "A", "11": "A", "12": "A", "13": "A", "14": "P",
      "15": "P", "16": "P", "17": "P", "18": "H", "19": "P", "20": "H", "21": "P",
      "22": "P", "23": "P", "24": "P", "25": "H", "26": "P", "27": "P", "28": "P",
      "29": "P", "30": "P", "31": "P",
    },
  },
];

const SHEET_PAYOUT = {
  IF2026002: 24800,
  IF2026012: 7000,
  IF2026001: 24800,
  IF2026010: 49800,
  IF2026009: 30838.71,
  IF2026014: 10000,
  IF2026015: 10000,
  IF2026017: 10000,
  IF2026018: 53966.67,
  IF2026019: 9677.42,
  IF2026021: 46574.19,
  IF2026020: 49800,
  IF2026023: 18961.29,
};

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

function tally(days) {
  const counts = { P: 0, A: 0, H: 0, CL: 0, EL: 0, LOP: 0 };
  for (const code of Object.values(days)) counts[code] = (counts[code] ?? 0) + 1;
  return counts;
}

function assertSheetMatrix() {
  for (const row of SHEET_ROWS) {
    const keys = Object.keys(row.days);
    if (keys.length !== 31) {
      throw new Error(`${row.name} has ${keys.length} days, expected 31`);
    }
    const counts = tally(row.days);
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    if (total !== 31) throw new Error(`${row.name} tally ${total}`);
  }
}

function buildSheetRecords() {
  const records = [];
  for (const row of SHEET_ROWS) {
    for (const [dd, sourceCode] of Object.entries(row.days)) {
      const date = `2026-10-${dd}`;
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

function leaveSpans(row) {
  const spans = [];
  let current = null;
  for (let day = 1; day <= 31; day += 1) {
    const dd = String(day).padStart(2, "0");
    const code = row.days[dd];
    const date = `2026-10-${dd}`;
    if (code === "CL" || code === "EL" || code === "LOP") {
      if (current && current.code === code) {
        current.endDate = date;
        current.dates.push(date);
      } else {
        current = { code, startDate: date, endDate: date, dates: [date] };
        spans.push(current);
      }
    } else {
      current = null;
    }
  }
  return spans;
}

function breakdownForSpan(span) {
  const kind = span.code === "LOP" ? "lop" : "paid";
  return {
    days: span.dates.map((date) => ({
      date,
      kind: "working",
      class: "working",
      counted: 1,
      inRequestedRange: true,
    })),
    endDate: span.endDate,
    lopDays: span.code === "LOP" ? span.dates.length : 0,
    halfDays: 0,
    paidDays: span.code === "LOP" ? 0 : span.dates.length,
    startDate: span.startDate,
    workingDays: span.dates.length,
    sandwichDays: 0,
    dayAllocations: span.dates.map((date) => ({ date, kind, counted: 1 })),
    publicHolidays: 0,
    requestedDates: span.dates,
    totalLeaveDays: span.dates.length,
    weeklyHolidays: 0,
    sandwichExplanations: [],
  };
}

function leaveTypeId(code) {
  if (code === "EL") return EL_TYPE_ID;
  if (code === "LOP") return LOP_TYPE_ID;
  return CL_TYPE_ID;
}

function splitGross(gross) {
  const basic = Math.round(gross * 0.5 * 100) / 100;
  const hra = Math.round(gross * 0.25 * 100) / 100;
  const special = Math.round(gross * 0.15 * 100) / 100;
  const lta = Math.round((gross - basic - hra - special) * 100) / 100;
  return { basic, hra, special, lta, gross: basic + hra + special + lta };
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

function hrProfile(actor) {
  return {
    userId: actor.user_id,
    email: actor.email,
    roles: [{ id: "hr", name: "HR", code: "hr", isSystemRole: true, status: "active" }],
    permissions: [],
    permissionCodes: [
      "employee.edit",
      "employee.view",
      "payroll.run",
      "payroll.view",
      "payroll.edit",
      "portal.hr.access",
      "system.admin.access",
    ],
    employee: {
      id: actor.id,
      organizationId: actor.organization_id,
      branchId: actor.branch_id,
      employeeCode: actor.employee_code,
      firstName: actor.first_name,
      lastName: actor.last_name,
      email: actor.email,
      employmentStatus: "active",
      status: "active",
    },
    organization: {
      id: actor.organization_id,
      name: "iFranchise",
      legalName: "iFranchise",
      email: actor.email,
      logoStoragePath: null,
      logoUrl: null,
      status: "active",
    },
  };
}

async function syncAttendance(sb, liveByCode) {
  const sheetRecords = buildSheetRecords();
  const codes = SHEET_ROWS.map((row) => row.code);
  const existing = await fetchAll(
    sb,
    "attendance",
    "id, employee_id, attendance_date, attendance_status, check_in_at, check_out_at, notes, deleted_at",
    { gte: { attendance_date: DATE_FROM }, lte: { attendance_date: DATE_TO } },
  );
  const existingByKey = new Map(
    existing.map((row) => [`${row.employee_id}|${String(row.attendance_date).slice(0, 10)}`, row]),
  );

  const inserts = [];
  const updates = [];
  const planned = [];
  const skipped = { identical: 0, keptRealPresentPunch: 0 };

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
        planned.push({ action: "undelete+update", code: rec.employeeCode, date: rec.date, to: rec.sourceCode });
      } else {
        inserts.push(payload);
        planned.push({ action: "insert", code: rec.employeeCode, date: rec.date, to: rec.sourceCode });
      }
      continue;
    }

    const realPresentPunch =
      rec.mappedStatus === "present" &&
      Boolean(current.check_in_at) &&
      !isSyntheticOfficePunch(current.check_in_at, rec.date, "10:00");

    if (realPresentPunch) {
      const notes = `src:${rec.sourceCode}|${IMPORT_NOTE}|kept-real-punch`;
      if (current.attendance_status === "present" && String(current.notes ?? "").includes(`src:${rec.sourceCode}`)) {
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
        notes,
        status: "active",
        deleted_at: null,
        check_in_at: current.check_in_at,
        check_out_at: current.check_out_at,
      });
      planned.push({ action: "keep-punch", code: rec.employeeCode, date: rec.date, to: rec.sourceCode });
      continue;
    }

    const sameStatus = current.attendance_status === rec.mappedStatus;
    const sameNotes = String(current.notes ?? "").includes(`src:${rec.sourceCode}`);
    const samePunchShape =
      rec.mappedStatus === "present"
        ? isSyntheticOfficePunch(current.check_in_at, rec.date, "10:00")
        : !current.check_in_at;
    if (sameStatus && sameNotes && samePunchShape) {
      skipped.identical += 1;
      continue;
    }

    updates.push({ id: current.id, ...payload });
    planned.push({
      action: "update",
      code: rec.employeeCode,
      date: rec.date,
      from: current.attendance_status,
      to: rec.mappedStatus,
      sheet: rec.sourceCode,
    });
  }

  if (APPLY) {
    const now = new Date().toISOString();
    for (let i = 0; i < inserts.length; i += 80) {
      const chunk = inserts.slice(i, i + 80).map((row) => ({ ...row, created_at: now, updated_at: now }));
      const { error } = await sb.schema("hrms").from("attendance").insert(chunk);
      if (error) throw new Error(`attendance insert: ${error.message}`);
    }
    for (const row of updates) {
      const { id, ...rest } = row;
      const { error } = await sb
        .schema("hrms")
        .from("attendance")
        .update({ ...rest, updated_at: now })
        .eq("id", id);
      if (error) throw new Error(`attendance update ${id}: ${error.message}`);
    }
  }

  return { inserts: inserts.length, updates: updates.length, skipped, planned };
}

async function syncLeaveRequests(sb, liveByCode, actorUserId) {
  const codes = SHEET_ROWS.map((row) => row.code);
  const employeeIds = codes.map((code) => liveByCode.get(code).id);
  const existing = await fetchAll(
    sb,
    "leave_requests",
    "id, employee_id, leave_type_id, start_date, end_date, leave_status, duration_breakdown, deleted_at",
    {
      in: { employee_id: employeeIds },
      lte: { start_date: DATE_TO },
      gte: { end_date: DATE_FROM },
      is: { deleted_at: null },
    },
  );

  const cancel = [];
  const insert = [];
  const keep = [];
  const wantedByEmployee = new Map();

  for (const row of SHEET_ROWS) {
    wantedByEmployee.set(liveByCode.get(row.code).id, leaveSpans(row));
  }

  const usedExisting = new Set();
  for (const empId of employeeIds) {
    const spans = wantedByEmployee.get(empId) ?? [];
    const current = existing.filter((row) => row.employee_id === empId && row.leave_status === "approved");
    for (const span of spans) {
      const match = current.find((row) => {
        if (usedExisting.has(row.id)) return false;
        if (row.leave_type_id !== leaveTypeId(span.code)) return false;
        return row.start_date === span.startDate && row.end_date === span.endDate;
      });
      if (match) {
        usedExisting.add(match.id);
        keep.push({ employeeId: empId, span, id: match.id });
      } else {
        insert.push({ employeeId: empId, span });
      }
    }
    for (const row of current) {
      if (usedExisting.has(row.id)) continue;
      cancel.push(row);
    }
  }

  if (APPLY) {
    const now = new Date().toISOString();
    for (const row of cancel) {
      const { error } = await sb
        .schema("hrms")
        .from("leave_requests")
        .update({
          leave_status: "cancelled",
          updated_by: actorUserId,
          updated_at: now,
        })
        .eq("id", row.id);
      if (error) throw new Error(`cancel leave ${row.id}: ${error.message}`);
    }
    for (const item of insert) {
      const span = item.span;
      const { error } = await sb.schema("hrms").from("leave_requests").insert({
        employee_id: item.employeeId,
        leave_type_id: leaveTypeId(span.code),
        start_date: span.startDate,
        end_date: span.endDate,
        total_days: span.dates.length,
        reason: "October 2026 attendance sheet",
        leave_status: "approved",
        status: "active",
        is_half_day: false,
        duration_breakdown: breakdownForSpan(span),
        created_by: actorUserId,
        updated_by: actorUserId,
        created_at: now,
        updated_at: now,
      });
      if (error) throw new Error(`insert leave ${span.startDate}: ${error.message}`);
    }
  }

  return {
    cancel: cancel.map((row) => ({
      id: row.id,
      employee_id: row.employee_id,
      start_date: row.start_date,
      end_date: row.end_date,
    })),
    insert: insert.map((item) => ({
      employeeId: item.employeeId,
      code: item.span.code,
      startDate: item.span.startDate,
      endDate: item.span.endDate,
    })),
    keep: keep.length,
  };
}

async function applySumanthConfirmation(sb, sumanth, actor) {
  const { data: structures, error: se } = await sb
    .schema("hrms")
    .from("salary_structures")
    .select("id, gross_salary, effective_from, effective_to, components")
    .eq("employee_id", sumanth.id)
    .is("deleted_at", null)
    .order("effective_from");
  if (se) throw se;

  const currentOpen = (structures ?? []).filter((row) => !row.effective_to);
  const ftRow = (structures ?? []).find((row) => Number(row.gross_salary) === FULL_TIME_GROSS);
  const alreadyFt = Boolean(ftRow && ftRow.effective_from === FULL_TIME_FROM);

  const notes = [];
  if (alreadyFt) {
    notes.push(`50k structure already effective ${FULL_TIME_FROM}`);
  }

  let newStructureId = ftRow?.id;

  if (APPLY && !alreadyFt && ftRow) {
    const now = new Date().toISOString();
    const { error: moveErr } = await sb
      .schema("hrms")
      .from("salary_structures")
      .update({ effective_from: FULL_TIME_FROM, updated_by: actor.user_id, updated_at: now })
      .eq("id", ftRow.id);
    if (moveErr) throw new Error(`move 50k structure: ${moveErr.message}`);
    for (const row of structures ?? []) {
      if (Number(row.gross_salary) === PROBATION_GROSS && row.effective_to !== PROBATION_TO) {
        const { error } = await sb
          .schema("hrms")
          .from("salary_structures")
          .update({ effective_to: PROBATION_TO, updated_by: actor.user_id, updated_at: now })
          .eq("id", row.id);
        if (error) throw new Error(`close probation structure: ${error.message}`);
      }
    }
    notes.push(`moved 50k structure to ${FULL_TIME_FROM}`);
  }

  if (APPLY && !alreadyFt && !ftRow) {
    const now = new Date().toISOString();
    for (const row of currentOpen) {
      if (Number(row.gross_salary) === PROBATION_GROSS || row.effective_from < FULL_TIME_FROM) {
        const { error } = await sb
          .schema("hrms")
          .from("salary_structures")
          .update({ effective_to: PROBATION_TO, updated_by: actor.user_id, updated_at: now })
          .eq("id", row.id);
        if (error) throw new Error(`close probation structure: ${error.message}`);
      }
    }

    const split = splitGross(FULL_TIME_GROSS);
    const prevComponents = currentOpen[0]?.components ?? {};
    const { data: inserted, error: ie } = await sb
      .schema("hrms")
      .from("salary_structures")
      .insert({
        employee_id: sumanth.id,
        effective_from: FULL_TIME_FROM,
        effective_to: null,
        currency_code: "INR",
        basic_salary: split.basic,
        hra_amount: split.hra,
        transport_allowance: split.lta,
        other_allowances: split.special,
        tax_deduction: 0,
        other_deductions: 0,
        gross_salary: split.gross,
        net_salary: split.gross,
        components: {
          ...prevComponents,
          pf: 0,
          esi: 0,
          other: 0,
          medical: 0,
          incomeTax: 0,
          professionalTax: 0,
          specialAllowance: split.special,
          probation_end_date: PROBATION_TO,
        },
        status: "active",
        created_by: actor.user_id,
        updated_by: actor.user_id,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();
    if (ie) throw new Error(`insert 50k structure: ${ie.message}`);
    newStructureId = inserted.id;

    const { data: revision, error: re } = await sb
      .schema("hrms")
      .from("salary_revisions")
      .insert({
        organization_id: sumanth.organization_id,
        employee_id: sumanth.id,
        previous_structure_id: currentOpen[0]?.id ?? null,
        new_structure_id: newStructureId,
        old_gross_salary: PROBATION_GROSS,
        new_gross_salary: FULL_TIME_GROSS,
        old_net_salary: PROBATION_GROSS,
        new_net_salary: FULL_TIME_GROSS,
        effective_from: FULL_TIME_FROM,
        revision_status: "applied",
        reason: "Probation confirmation effective 2026-10-13",
        approver_employee_id: actor.id,
        approved_at: now,
        created_by: actor.user_id,
        updated_by: actor.user_id,
      })
      .select("id")
      .single();
    if (re) throw new Error(`salary revision: ${re.message}`);

    const { data: confirmation, error: ce } = await sb
      .schema("hrms")
      .from("employment_confirmations")
      .insert({
        organization_id: sumanth.organization_id,
        employee_id: sumanth.id,
        previous_designation_id: sumanth.designation_id,
        new_designation_id: sumanth.designation_id,
        previous_employment_type_id: sumanth.employment_type_id,
        new_employment_type_id: FULL_TIME_TYPE_ID,
        previous_gross_salary: PROBATION_GROSS,
        new_gross_salary: FULL_TIME_GROSS,
        probation_end_date: PROBATION_TO,
        effective_date: FULL_TIME_FROM,
        confirmation_status: "confirmed",
        notes: "Confirmed full-time from October attendance/payroll sheet",
        salary_structure_id: newStructureId,
        salary_revision_id: revision.id,
        confirmed_by: actor.user_id,
        confirmed_at: now,
        created_by: actor.user_id,
        updated_by: actor.user_id,
      })
      .select("id")
      .single();
    if (ce) throw new Error(`confirmation: ${ce.message}`);

    await sb.schema("hrms").from("employment_confirmation_events").insert({
      organization_id: sumanth.organization_id,
      confirmation_id: confirmation.id,
      event_type: "confirmed",
      actor_user_id: actor.user_id,
      payload: {
        effectiveDate: FULL_TIME_FROM,
        previousGross: PROBATION_GROSS,
        newGross: FULL_TIME_GROSS,
      },
    });
  }

  if (APPLY) {
    const now = new Date().toISOString();
    const { error: ee } = await sb
      .schema("hrms")
      .from("employees")
      .update({
        employment_type_id: FULL_TIME_TYPE_ID,
        employment_status: "active",
        full_time_effective_date: FULL_TIME_FROM,
        probation_end_date: PROBATION_TO,
        updated_by: actor.user_id,
        updated_at: now,
      })
      .eq("id", sumanth.id);
    if (ee) throw new Error(`employee update: ${ee.message}`);
  }

  return {
    alreadyFt,
    newStructureId,
    employee: {
      code: sumanth.employee_code,
      fromType: sumanth.employment_type_id,
      toType: FULL_TIME_TYPE_ID,
      probationSalaryUntil: PROBATION_TO,
      fullTimeFrom: FULL_TIME_FROM,
      fullTimeSalary: FULL_TIME_GROSS,
    },
    notes,
  };
}

async function ensureNamanSalary(sb, naman, actor) {
  if (!naman) return { skipped: true };
  const { data: existing, error } = await sb
    .schema("hrms")
    .from("salary_structures")
    .select("id, gross_salary, effective_from")
    .eq("employee_id", naman.id)
    .is("deleted_at", null);
  if (error) throw error;
  if ((existing ?? []).some((row) => Number(row.gross_salary) > 0)) {
    return { skipped: true, existing };
  }
  if (!APPLY) return { wouldInsert: 33000, effectiveFrom: naman.date_of_joining };
  const split = splitGross(33000);
  const joining = String(naman.date_of_joining).slice(0, 10) || "2026-10-14";
  const now = new Date().toISOString();
  const { data, error: ie } = await sb
    .schema("hrms")
    .from("salary_structures")
    .insert({
      employee_id: naman.id,
      effective_from: joining,
      effective_to: null,
      currency_code: "INR",
      basic_salary: split.basic,
      hra_amount: split.hra,
      transport_allowance: split.lta,
      other_allowances: split.special,
      tax_deduction: 0,
      other_deductions: 0,
      gross_salary: split.gross,
      net_salary: split.gross,
      components: {
        pf: 0,
        esi: 0,
        other: 0,
        medical: 0,
        incomeTax: 0,
        professionalTax: 0,
        specialAllowance: split.special,
      },
      status: "active",
      created_by: actor.user_id,
      updated_by: actor.user_id,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();
  if (ie) throw new Error(`naman salary: ${ie.message}`);
  return { inserted: data.id, gross: 33000, effectiveFrom: joining };
}

async function verifyAttendance(sb, liveByCode) {
  const mismatches = [];
  const totals = [];
  for (const row of SHEET_ROWS) {
    const emp = liveByCode.get(row.code);
    const { data, error } = await sb
      .schema("hrms")
      .from("attendance")
      .select("attendance_date, attendance_status, notes")
      .eq("employee_id", emp.id)
      .gte("attendance_date", DATE_FROM)
      .lte("attendance_date", DATE_TO)
      .is("deleted_at", null);
    if (error) throw error;
    const got = new Map(
      (data ?? []).map((item) => [String(item.attendance_date).slice(0, 10), item]),
    );
    const counts = { present: 0, absent: 0, holiday: 0, cl: 0, el: 0, lop: 0 };
    for (const [dd, sourceCode] of Object.entries(row.days)) {
      const date = `2026-10-${dd}`;
      const mapped = mapAttendanceCode(sourceCode, date);
      const rowGot = got.get(date);
      const notes = String(rowGot?.notes ?? "");
      const okStatus = rowGot?.attendance_status === mapped.mappedStatus;
      const okSrc = notes.includes(`src:${sourceCode}`);
      if (!okStatus || !okSrc) {
        mismatches.push({
          code: row.code,
          date,
          want: sourceCode,
          gotStatus: rowGot?.attendance_status ?? null,
          gotNotes: rowGot?.notes ?? null,
        });
      }
      if (sourceCode === "P") counts.present += 1;
      else if (sourceCode === "A") counts.absent += 1;
      else if (sourceCode === "H") counts.holiday += 1;
      else if (sourceCode === "CL") counts.cl += 1;
      else if (sourceCode === "EL") counts.el += 1;
      else if (sourceCode === "LOP") counts.lop += 1;
    }
    totals.push({ code: row.code, name: row.name, ...counts, sheet: tally(row.days) });
  }
  return { mismatches, totals };
}

async function main() {
  assertSheetMatrix();
  const env = loadEnv(ROOT);
  const { url, key } = requireSupabaseEnv(env);
  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const codes = SHEET_ROWS.map((row) => row.code);
  const employees = await fetchAll(
    sb,
    "employees",
    "id, organization_id, branch_id, employee_code, first_name, last_name, designation_id, employment_type_id, employment_status, date_of_joining, full_time_effective_date, probation_end_date, user_id, email, deleted_at",
    { in: { employee_code: codes }, is: { deleted_at: null } },
  );
  const liveByCode = new Map(
    employees.map((row) => [String(row.employee_code).trim().toUpperCase(), row]),
  );
  const missing = codes.filter((code) => !liveByCode.has(code));
  if (missing.length) throw new Error(`Missing employees: ${missing.join(", ")}`);

  const actor = liveByCode.get("IF2026001");
  if (!actor?.user_id) throw new Error("HR actor (Ekta) missing user_id");

  const attendance = await syncAttendance(sb, liveByCode);
  const leaves = await syncLeaveRequests(sb, liveByCode, actor.user_id);
  const confirmation = await applySumanthConfirmation(sb, liveByCode.get(SUMANTH_CODE), actor);
  const namanSalary = await ensureNamanSalary(sb, liveByCode.get("IF2026023"), actor);

  console.log(
    JSON.stringify(
      {
        mode: APPLY ? "apply" : "dry-run",
        sheetTallies: SHEET_ROWS.map((row) => ({ code: row.code, name: row.name, ...tally(row.days) })),
        attendance,
        leaves,
        confirmation,
        namanSalary,
      },
      null,
      2,
    ),
  );

  if (!APPLY) {
    console.log("\nDry-run only. Re-run with --apply to write October attendance, leave, salary, and payroll.");
    return;
  }

  const stubDir = path.resolve(ROOT, ".tmp-stubs");
  mkdirSync(stubDir, { recursive: true });
  writeFileSync(path.join(stubDir, "server-only.js"), "module.exports = {};\n");
  register(pathToFileURL(path.resolve(ROOT, "scripts/tmp-refresh-sept-hook.mjs")).href);

  const { reconcileEmployeePaidLeaveLedger } = await import(
    pathToFileURL(path.resolve(ROOT, "src/lib/leave/services/leave-ledger-reconcile.ts")).href
  );
  for (const emp of employees) {
    await reconcileEmployeePaidLeaveLedger(sb, emp.id, {
      balanceYear: 2026,
      actorUserId: actor.user_id,
    });
  }

  const { ensureCompanyPayrollRun } = await import(
    pathToFileURL(path.resolve(ROOT, "src/lib/payroll/services/payroll-mutations.ts")).href
  );
  const { resolveFinalPayableAmount } = await import(
    pathToFileURL(path.resolve(ROOT, "src/lib/payroll/services/payroll-utils.ts")).href
  );

  const payrollId = await ensureCompanyPayrollRun(sb, hrProfile(actor), { month: 10, year: 2026 });

  const { data: items, error: ie } = await sb
    .schema("hrms")
    .from("payroll_items")
    .select(
      "net_salary, gross_salary, total_deductions, breakdown, employees:employee_id(employee_code, first_name, last_name)",
    )
    .eq("payroll_id", payrollId)
    .is("deleted_at", null);
  if (ie) throw ie;

  const payrollCompare = [];
  for (const item of items ?? []) {
    const emp = Array.isArray(item.employees) ? item.employees[0] : item.employees;
    const code = emp?.employee_code;
    if (!codes.includes(code)) continue;
    const payable = resolveFinalPayableAmount({
      netSalary: item.net_salary,
      breakdown: item.breakdown,
    });
    const att = item.breakdown?.attendance ?? {};
    payrollCompare.push({
      code,
      name: `${emp.first_name} ${emp.last_name}`.trim(),
      gross: item.gross_salary,
      net: item.net_salary,
      payable,
      sheetPayout: SHEET_PAYOUT[code] ?? null,
      present: att.presentDays,
      absent: att.absentDays,
      holiday: att.holidayCount,
      cl: att.clDays,
      el: att.elDays,
      lop: att.lopDays,
      paidDays: att.paidDays,
      segments: item.breakdown?.salarySegments ?? null,
    });
  }

  const attendanceVerify = await verifyAttendance(sb, liveByCode);
  const { data: sumanthEmp } = await sb
    .schema("hrms")
    .from("employees")
    .select("employee_code, employment_status, employment_type_id, full_time_effective_date, probation_end_date")
    .eq("id", liveByCode.get(SUMANTH_CODE).id)
    .maybeSingle();
  const { data: sumanthPay } = await sb
    .schema("hrms")
    .from("salary_structures")
    .select("gross_salary, effective_from, effective_to")
    .eq("employee_id", liveByCode.get(SUMANTH_CODE).id)
    .is("deleted_at", null)
    .order("effective_from");

  console.log(
    JSON.stringify(
      {
        payrollId,
        attendanceMismatchCount: attendanceVerify.mismatches.length,
        attendanceMismatches: attendanceVerify.mismatches,
        attendanceTotals: attendanceVerify.totals,
        sumanthEmployee: sumanthEmp,
        sumanthSalary: sumanthPay,
        payrollCompare,
      },
      null,
      2,
    ),
  );

  if (attendanceVerify.mismatches.length) {
    process.exitCode = 1;
    console.error("Attendance verification failed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
