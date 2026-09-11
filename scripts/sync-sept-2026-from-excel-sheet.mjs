/**
 * Sync September 2026 attendance from Attendence Sheet 2026 → Sept-2026,
 * then refresh the unlocked September payroll run.
 *
 * - Excel H (including Sundays) → attendance_status holiday
 * - Does not invent marks for blank Excel cells
 * - Does not touch locked/paid payrolls or other months
 *
 * Default: dry-run. Pass --apply to write + refresh payroll.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";

import { parseAttendanceWorkbook } from "./hr-data-migration/lib/excel-attendance.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const APPLY = process.argv.includes("--apply");
const XLSX_PATH = resolve(ROOT, "src/assets/Attendence Sheet 2026 (2).xlsx");
const IMPORT_NOTE = "excel-sept-2026-sheet-sync";

const NAME_TO_CODE = {
  om: "IF2025002",
  himani: "IF2026002",
  akshita: "IF2026012",
  ekta: "IF2026001",
  diksha: "IF2026011",
  dikhsha: "IF2026011",
  swetha: "IF2026010",
  sumanth: "IF2026009",
  "gangaram sumanth reddy": "IF2026009",
  "sneha mahajan": "IF2026014",
  "prajjwal negi": "IF2026015",
  "syed samit ali": "IF2026017",
  "samit ali": "IF2026017",
  "vivek rawat": "IF2026018",
  "venupusa hemavathi": "IF2026019",
  "vennapusa hemavathi": "IF2026019",
  "shakshay gupta": "IF2026021",
  "shiwali singh": "IF2026020",
  "anmol prasad": "IF2026022",
};

function loadEnv(path) {
  const text = readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function resolveCode(sourceName) {
  const n = norm(sourceName);
  if (NAME_TO_CODE[n]) return NAME_TO_CODE[n];
  for (const [key, code] of Object.entries(NAME_TO_CODE)) {
    if (n.includes(key) || key.includes(n.split(" ")[0])) return code;
  }
  return null;
}

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

async function main() {
  const parsed = parseAttendanceWorkbook(XLSX_PATH);
  const sept = parsed.sheets["SEPT-2026"];
  if (!sept?.employees?.length) throw new Error("Sept-2026 sheet missing");

  const env = loadEnv(resolve(ROOT, ".env.local"));
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] == null) process.env[key] = value;
  }
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const codes = [
    ...new Set(
      sept.employees.map((e) => resolveCode(e.sourceName)).filter(Boolean),
    ),
  ];
  const { data: employees, error: empErr } = await sb
    .schema("hrms")
    .from("employees")
    .select("id, organization_id, branch_id, employee_code, first_name, last_name, date_of_joining")
    .in("employee_code", codes)
    .is("deleted_at", null);
  if (empErr) throw new Error(empErr.message);
  const byCode = new Map(
    (employees || []).map((e) => [String(e.employee_code).toUpperCase(), e]),
  );

  const todayIst = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  const desired = [];
  const unmatched = [];
  for (const emp of sept.employees) {
    const code = resolveCode(emp.sourceName);
    const row = code ? byCode.get(code) : null;
    if (!row) {
      unmatched.push(emp.sourceName);
      continue;
    }
    for (const day of emp.dayStatuses) {
      if (!day.mappedStatus || day.unknown) {
        throw new Error(`Bad code ${day.sourceCode} for ${emp.sourceName} ${day.date}`);
      }
      // Never invent future attendance from the sheet — only sync through today (IST).
      if (day.date > todayIst) continue;
      desired.push({
        employee: row,
        date: day.date,
        sourceCode: day.sourceCode,
        mappedStatus: day.mappedStatus,
        sourceName: emp.sourceName.trim(),
        excelSummary: emp.summary,
      });
    }
  }

  const employeeIds = [...new Set(desired.map((d) => d.employee.id))];
  const { data: existing, error: attErr } = await sb
    .schema("hrms")
    .from("attendance")
    .select(
      "id, employee_id, attendance_date, attendance_status, notes, organization_id, branch_id",
    )
    .in("employee_id", employeeIds)
    .gte("attendance_date", "2026-09-01")
    .lte("attendance_date", "2026-09-30")
    .is("deleted_at", null);
  if (attErr) throw new Error(attErr.message);

  const existingByKey = new Map(
    (existing || []).map((row) => [
      `${row.employee_id}|${String(row.attendance_date).slice(0, 10)}`,
      row,
    ]),
  );

  const updates = [];
  const inserts = [];
  for (const item of desired) {
    const key = `${item.employee.id}|${item.date}`;
    const prev = existingByKey.get(key);
    const punches = punchFields(item.mappedStatus, item.date);
    const notes = `src:${item.sourceCode}|${IMPORT_NOTE}`;
    if (prev) {
      if (prev.attendance_status !== item.mappedStatus || !String(prev.notes || "").includes(IMPORT_NOTE)) {
        updates.push({
          id: prev.id,
          attendance_status: item.mappedStatus,
          notes,
          ...punches,
          updated_at: new Date().toISOString(),
        });
      }
    } else {
      inserts.push({
        organization_id: item.employee.organization_id,
        branch_id: item.employee.branch_id,
        employee_id: item.employee.id,
        attendance_date: item.date,
        attendance_status: item.mappedStatus,
        notes,
        status: "active",
        ...punches,
      });
    }
  }

  // Soft-delete: (1) blank Excel days for sheet employees, (2) any future sheet-synced
  // rows after today so open-month payroll never counts invented future Sundays/Hs.
  const excelDatesByEmp = new Map();
  for (const item of desired) {
    const set = excelDatesByEmp.get(item.employee.id) ?? new Set();
    set.add(item.date);
    excelDatesByEmp.set(item.employee.id, set);
  }
  const softDeletes = [];
  for (const row of existing || []) {
    const date = String(row.attendance_date).slice(0, 10);
    if (!excelDatesByEmp.has(row.employee_id)) continue;
    const notes = String(row.notes || "");
    const fromSheet =
      notes.includes(IMPORT_NOTE) ||
      notes.includes("excel-import-2026-09") ||
      notes.includes("sheet-screenshot-sync");
    if (date > todayIst && fromSheet) {
      softDeletes.push(row.id);
      continue;
    }
    const marked = excelDatesByEmp.get(row.employee_id);
    if (marked?.has(date)) continue;
    softDeletes.push(row.id);
  }

  console.log(
    JSON.stringify(
      {
        mode: APPLY ? "apply" : "dry-run",
        employees: employeeIds.length,
        unmatched,
        desiredDays: desired.length,
        updates: updates.length,
        inserts: inserts.length,
        softDeletes: softDeletes.length,
      },
      null,
      2,
    ),
  );

  if (!APPLY) {
    console.log("Dry-run only. Re-run with --apply to write attendance and refresh payroll.");
    return;
  }

  // Vinayaka Chavithi is not marked H for anyone on the Excel sheet — do not auto-credit.
  const { error: holErr } = await sb
    .schema("hrms")
    .from("holidays")
    .update({ is_optional: true })
    .eq("holiday_date", "2026-09-14")
    .eq("is_optional", false);
  if (holErr) throw new Error(`holiday update: ${holErr.message}`);

  for (const chunk of chunked(updates, 50)) {
    for (const row of chunk) {
      const { id, ...patch } = row;
      const { error } = await sb.schema("hrms").from("attendance").update(patch).eq("id", id);
      if (error) throw new Error(`update ${id}: ${error.message}`);
    }
  }
  for (const chunk of chunked(inserts, 50)) {
    const { error } = await sb.schema("hrms").from("attendance").insert(chunk);
    if (error) throw new Error(`insert: ${error.message}`);
  }
  if (softDeletes.length) {
    const { error } = await sb
      .schema("hrms")
      .from("attendance")
      .update({ deleted_at: new Date().toISOString(), notes: `${IMPORT_NOTE}|cleared-blank-excel-day` })
      .in("id", softDeletes);
    if (error) throw new Error(`soft-delete: ${error.message}`);
  }

  // Refresh unlocked September payroll.
  const stubDir = resolve(ROOT, ".tmp-stubs");
  mkdirSync(stubDir, { recursive: true });
  writeFileSync(resolve(stubDir, "server-only.js"), "module.exports = {};\n");
  register(pathToFileURL(resolve(ROOT, "scripts/tmp-refresh-sept-hook.mjs")).href);

  const { ensureCompanyPayrollRun } = await import(
    pathToFileURL(resolve(ROOT, "src/lib/payroll/services/payroll-mutations.ts")).href
  );

  const { data: payroll, error: pe } = await sb
    .schema("hrms")
    .from("payrolls")
    .select("id, organization_id, payroll_status, is_locked, total_net")
    .eq("payroll_month", "2026-09-01")
    .is("deleted_at", null)
    .maybeSingle();
  if (pe || !payroll) throw new Error(pe?.message || "September payroll missing");
  if (payroll.is_locked) throw new Error("September payroll is locked");
  if (!["draft", "processing", "processed"].includes(payroll.payroll_status)) {
    throw new Error(`September payroll status not recalculable: ${payroll.payroll_status}`);
  }

  const { data: actor } = await sb
    .schema("hrms")
    .from("employees")
    .select("id, user_id, organization_id, branch_id, email, first_name, last_name")
    .eq("organization_id", payroll.organization_id)
    .not("user_id", "is", null)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (!actor?.user_id) throw new Error("No actor employee for payroll refresh");

  const profile = {
    userId: actor.user_id,
    email: actor.email,
    roles: ["hr"],
    permissionCodes: ["payroll.run", "payroll.view", "portal.hr.access"],
    employee: {
      id: actor.id,
      organizationId: actor.organization_id,
      branchId: actor.branch_id,
      firstName: actor.first_name,
      lastName: actor.last_name,
    },
  };

  const id = await ensureCompanyPayrollRun(sb, profile, { month: 9, year: 2026 });
  const { data: after } = await sb
    .schema("hrms")
    .from("payrolls")
    .select("id, total_net, total_gross, payroll_status")
    .eq("id", id)
    .maybeSingle();

  const { data: items } = await sb
    .schema("hrms")
    .from("payroll_items")
    .select(
      "net_salary, gross_salary, breakdown, employees:employee_id(employee_code, first_name, last_name)",
    )
    .eq("payroll_id", id)
    .is("deleted_at", null);

  const byCodeItem = new Map();
  for (const it of items || []) {
    const emp = Array.isArray(it.employees) ? it.employees[0] : it.employees;
    byCodeItem.set(String(emp?.employee_code || "").toUpperCase(), { it, emp });
  }

  console.log("\nAFTER REFRESH vs EXCEL:");
  for (const emp of sept.employees) {
    const code = resolveCode(emp.sourceName);
    const hit = code ? byCodeItem.get(code) : null;
    const att = hit?.it?.breakdown?.attendance || {};
    const paid =
      att.paidDays ??
      Number(att.presentDays || 0) +
        Number(att.holidayCount || att.holidayDays || 0) +
        Number(att.paidLeaveDays || 0);
    console.log(
      JSON.stringify({
        name: emp.sourceName.trim(),
        code,
        excelTWD: emp.summary.totalWorkingDays,
        excelFinal: Math.round(Number(emp.summary.finalPayout || 0)),
        hrmsPaid: paid,
        hrmsNet: hit ? Math.round(Number(hit.it.net_salary)) : null,
        hrmsAtt: {
          P: att.presentDays,
          H: att.holidayCount ?? att.holidayDays,
          WO: att.weekOffDays,
          leave: att.paidLeaveDays ?? att.leaveDays,
          LOP: att.lopDays ?? att.absentDays,
        },
      }),
    );
  }
  console.log("payroll header", after);
}

function chunked(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
