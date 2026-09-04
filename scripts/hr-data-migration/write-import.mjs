/**
 * PRODUCTION write importer for HR Excel migration.
 * Conservative rules per approved plan. Service-role only.
 * Does NOT print full bank/Aadhaar/PAN/salary to console.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireSupabaseEnv } from "./lib/env.mjs";
import { parseEmployeeDirectory } from "./lib/excel-directory.mjs";
import {
  parseAttendanceWorkbook,
  ATTENDANCE_STATUS_MAP,
} from "./lib/excel-attendance.mjs";
import {
  resolvePersonIdentity,
  PERSON_CLASS,
  accountsEqual,
  ifscEqual,
  isPlaceholderAccount,
} from "./lib/mapping.mjs";
import {
  buildExcelPayrollBreakdown,
  buildExcelPayrollItemPayload,
  computeExcelPayrollAmounts,
} from "./lib/excel-payroll-amounts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ATT_PATH = path.join(ROOT, "src/assets/Attendence Sheet 2026.xlsx");
const DIR_PATH = path.join(ROOT, "src/assets/Employee Directory.xlsx");
const BACKUP_DIR = path.join(__dirname, "backups");
const AUDIT_DIR = path.join(__dirname, "audit");
const ORG_ID = "a0000000-0000-4000-8000-000000000001";
const BRANCH_HQ = "a0000000-0000-4000-8000-000000000002";

const CREATE_CODES = [
  "IF2026017",
  "IF2026018",
  "IF2026019",
  "IF2026020",
  "IF2026021",
  "IF2026022",
];

function money(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "Unknown", last: "Employee" };
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function mapMaster(directoryEmp, masters) {
  const title = (directoryEmp.designation || "").toLowerCase();
  const code = directoryEmp.employeeCode;
  let department_id = masters.depts.TECH;
  let designation_id = masters.desigs.INTERN;
  let employment_type_id = masters.types.INTERN;

  if (/bdm|business development/.test(title)) {
    department_id = masters.depts.SALES;
    designation_id = masters.desigs.ASSISTANT_BDM;
    employment_type_id = masters.types.FULL_TIME;
  } else if (/performance marketing|marketing specialist/.test(title)) {
    department_id = masters.depts.MARKETING;
    designation_id = masters.desigs.DIGITAL_MARKETING_SPECIALIST;
    employment_type_id = masters.types.FULL_TIME;
  } else if (/graphic|motion|video/.test(title)) {
    department_id = masters.depts.MARKETING;
    designation_id = masters.desigs.MOTION_GRAPHICS_DESIGNER;
    employment_type_id = /intern/.test(title)
      ? masters.types.INTERN
      : masters.types.FULL_TIME;
  } else if (/qa|test/.test(title)) {
    department_id = masters.depts.TECH;
    designation_id = masters.desigs.TESTING_INTERN || masters.desigs.INTERN;
    employment_type_id = masters.types.INTERN;
  } else if (/ui\/ux|ux|ui/.test(title)) {
    department_id = masters.depts.TECH;
    designation_id = masters.desigs.INTERN;
    employment_type_id = masters.types.INTERN;
  } else if (/content|social/.test(title)) {
    department_id = masters.depts.MARKETING;
    designation_id = masters.desigs.CONTENT_SOCIAL_MEDIA_INTERN;
    employment_type_id = masters.types.INTERN;
  } else if (/hr/.test(title)) {
    department_id = masters.depts.HR;
    designation_id = masters.desigs.HR_OPERATIONS_INTERN;
    employment_type_id = masters.types.INTERN;
  }

  // code-specific overrides from directory titles
  if (code === "IF2026017") {
    department_id = masters.depts.TECH;
    designation_id = masters.desigs.INTERN;
    employment_type_id = masters.types.INTERN;
  }
  if (code === "IF2026018") {
    department_id = masters.depts.MARKETING;
    designation_id = masters.desigs.DIGITAL_MARKETING_SPECIALIST;
    employment_type_id = masters.types.FULL_TIME;
  }
  if (code === "IF2026019") {
    department_id = masters.depts.TECH;
    designation_id = masters.desigs.TESTING_INTERN || masters.desigs.INTERN;
    employment_type_id = masters.types.INTERN;
  }
  if (code === "IF2026020" || code === "IF2026021") {
    department_id = masters.depts.SALES;
    designation_id = masters.desigs.ASSISTANT_BDM;
    employment_type_id = masters.types.FULL_TIME;
  }
  if (code === "IF2026022") {
    department_id = masters.depts.MARKETING;
    designation_id = masters.desigs.MOTION_GRAPHICS_DESIGNER;
    employment_type_id = masters.types.FULL_TIME;
  }

  return { department_id, designation_id, employment_type_id };
}

function employmentStatus(doj, probationEnd) {
  const today = new Date().toISOString().slice(0, 10);
  if (doj && today < doj) return "draft";
  if (probationEnd && today <= probationEnd) return "probation";
  return "active";
}

function adminClient(url, key) {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchAll(sb, table, select, filters = {}) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    let q = sb.schema("hrms").from(table).select(select).range(from, from + pageSize - 1);
    for (const [k, v] of Object.entries(filters.eq || {})) q = q.eq(k, v);
    for (const [k, v] of Object.entries(filters.gte || {})) q = q.gte(k, v);
    for (const [k, v] of Object.entries(filters.lte || {})) q = q.lte(k, v);
    for (const k of filters.isNull || []) q = q.is(k, null);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function main() {
  const batchId = randomUUID();
  const startedAt = new Date().toISOString();
  const auditEvents = [];
  const summary = {
    batchId,
    startedAt,
    employeesCreated: [],
    employeesSkipped: [],
    attendanceInserted: 0,
    attendanceSkippedIdentical: 0,
    attendanceConflicts: [],
    attendanceExcluded: 0,
    payrollImported: 0,
    payrollSkipped: 0,
    payrollConflicts: [],
    payrollReconcile: [],
    payslipsGenerated: 0,
    payslipsSkipped: 0,
    bankUpdated: 0,
    bankCreated: 0,
    bankSkipped: 0,
    bankConflicts: [],
    warnings: [],
    errors: [],
    abrar: null,
    abdul: null,
    backupPath: null,
  };

  function audit(event) {
    auditEvents.push({ ...event, batchId, timestamp: new Date().toISOString() });
  }

  console.log("=== PRE-FLIGHT ===");
  console.log(`Batch: ${batchId}`);

  const env = loadEnv(ROOT);
  const { url, key } = requireSupabaseEnv(env);
  const sb = adminClient(url, key);

  // --- Snapshot backup (local recoverable copy) ---
  console.log("Creating local pre-migration snapshot…");
  const employees = await fetchAll(sb, "employees", "*", { isNull: ["deleted_at"] });
  const attendance = await fetchAll(sb, "attendance", "*", {
    isNull: ["deleted_at"],
    gte: { attendance_date: "2026-04-01" },
    lte: { attendance_date: "2026-08-31" },
  });
  const payrolls = await fetchAll(sb, "payrolls", "*", { isNull: ["deleted_at"] });
  const payrollItems = await fetchAll(sb, "payroll_items", "*", { isNull: ["deleted_at"] });
  const payslips = await fetchAll(sb, "payslips", "*", { isNull: ["deleted_at"] });
  const banks = await fetchAll(sb, "bank_accounts", "id,employee_id,ifsc_code,is_primary,account_number,deleted_at", {
    isNull: ["deleted_at"],
  });
  const userRoles = await fetchAll(sb, "user_roles", "*", { isNull: ["deleted_at"] });

  const snapshot = {
    createdAt: startedAt,
    batchId,
    note: "Pre-migration local snapshot. Bank account numbers included for restore only — do not commit.",
    counts: {
      employees: employees.length,
      attendance: attendance.length,
      payrolls: payrolls.length,
      payrollItems: payrollItems.length,
      payslips: payslips.length,
      banks: banks.length,
      userRoles: userRoles.length,
    },
    employees,
    attendance,
    payrolls,
    payrollItems,
    payslips,
    banks,
    userRoles,
  };
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupPath = path.join(BACKUP_DIR, `pre-migration-${batchId}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(snapshot));
  summary.backupPath = backupPath;
  console.log(`Backup snapshot written: ${backupPath} (${employees.length} employees, ${attendance.length} attendance rows)`);

  // --- Executive verification ---
  const abdul = employees.find((e) => e.employee_code === "EMP-2026020");
  if (
    !abdul ||
    !/abdul/i.test(`${abdul.first_name} ${abdul.last_name} ${abdul.email}`) ||
    abdul.email?.toLowerCase() !== "abdul@ifranchise.in"
  ) {
    throw new Error("ABORT: EMP-2026020 failed Abdul identity verification");
  }
  const abdulRole = userRoles.find((ur) => ur.employee_id === abdul.id);
  // fetch role code
  const { data: roles } = await sb.schema("hrms").from("roles").select("id,code").is("deleted_at", null);
  const roleById = Object.fromEntries((roles || []).map((r) => [r.id, r.code]));
  const abdulRoleCodes = userRoles
    .filter((ur) => ur.employee_id === abdul.id || ur.user_id === abdul.user_id)
    .map((ur) => roleById[ur.role_id]);
  if (!abdulRoleCodes.includes("ceo")) {
    throw new Error("ABORT: EMP-2026020 does not have ceo role");
  }
  summary.abdul = {
    verified: true,
    employee_code: abdul.employee_code,
    id: abdul.id,
    roles: abdulRoleCodes,
    action: "PRESERVE — import April attendance only onto existing identity",
  };
  console.log("Abdul verified:", summary.abdul.employee_code, summary.abdul.roles);

  // Abrar deep check
  const abrarEmp = employees.filter((e) =>
    /abrar/i.test(`${e.first_name} ${e.last_name} ${e.email} ${e.employee_code}`),
  );
  const { data: authUsers } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  const abrarAuth = (authUsers?.users || []).filter((u) =>
    /abrar/i.test(`${u.email} ${JSON.stringify(u.user_metadata || {})}`),
  );
  summary.abrar = {
    employeesFound: abrarEmp.map((e) => e.employee_code),
    authFound: abrarAuth.map((u) => u.email),
    decision:
      abrarEmp.length || abrarAuth.length
        ? "STOP_ATTENDANCE — identity ambiguous, needs manual mapping"
        : "AUDIT_ONLY — no HRMS identity; do not create; do not import attendance",
  };
  if (abrarEmp.length || abrarAuth.length) {
    console.log("Abrar identity found unexpectedly — attendance import blocked:", summary.abrar);
  } else {
    console.log("Abrar: no identity — attendance remains audit-only");
  }

  // Confirm IF2026008 does not exist / will not create
  if (employees.some((e) => e.employee_code === "IF2026008")) {
    summary.warnings.push("IF2026008 already exists in DB — will not modify/delete (former Fazil policy)");
  }

  // Master data
  const { data: depts } = await sb.schema("hrms").from("departments").select("id,code").eq("organization_id", ORG_ID).is("deleted_at", null);
  const { data: desigs } = await sb.schema("hrms").from("designations").select("id,code,title").eq("organization_id", ORG_ID).is("deleted_at", null);
  const { data: types } = await sb.schema("hrms").from("employment_types").select("id,code").eq("organization_id", ORG_ID).is("deleted_at", null);
  const masters = {
    depts: Object.fromEntries((depts || []).map((d) => [d.code, d.id])),
    desigs: Object.fromEntries((desigs || []).map((d) => [d.code, d.id])),
    types: Object.fromEntries((types || []).map((t) => [t.code, t.id])),
  };
  // alias TESTING intern designation if present by title
  const testDesig = (desigs || []).find((d) => /qa|test/i.test(d.title) && /intern|analyst/i.test(d.title));
  if (testDesig) masters.desigs.TESTING_INTERN = testDesig.id;

  const directory = parseEmployeeDirectory(DIR_PATH);
  const attendanceWb = parseAttendanceWorkbook(ATT_PATH);
  const byCode = new Map(employees.map((e) => [String(e.employee_code).toUpperCase(), e]));
  const byEmail = new Map(employees.filter((e) => e.email).map((e) => [e.email.toLowerCase(), e]));
  const byId = new Map(employees.map((e) => [e.id, e]));

  // --- Create active employees ---
  console.log("=== EMPLOYEES ===");
  for (const code of CREATE_CODES) {
    const dirEmp = directory.employees.find((e) => e.employeeCode === code);
    if (!dirEmp) {
      summary.errors.push({ entity: "employee", code, error: "Missing from Directory" });
      continue;
    }
    if (byCode.has(code)) {
      summary.employeesSkipped.push({ code, reason: "EXISTS_BY_CODE" });
      audit({ entity: "employee", action: "SKIP", sourceIdentity: code, targetIdentity: code, reason: "already exists" });
      continue;
    }
    if (dirEmp.email && byEmail.has(dirEmp.email)) {
      summary.employeesSkipped.push({ code, reason: "EMAIL_EXISTS_OTHER", other: byEmail.get(dirEmp.email).employee_code });
      audit({ entity: "employee", action: "SKIP", sourceIdentity: code, reason: "email exists on another employee" });
      continue;
    }
    // auth email check
    const authHit = (authUsers?.users || []).find((u) => u.email?.toLowerCase() === dirEmp.email);
    if (authHit) {
      summary.warnings.push(`Auth user exists for ${code} email — creating employee without linking user_id`);
    }

    const { first, last } = splitName(dirEmp.fullName);
    const mapped = mapMaster(dirEmp, masters);
    const status = employmentStatus(dirEmp.dateOfJoining, dirEmp.probationEnd);
    const phone = dirEmp.mobile ? String(dirEmp.mobile).replace(/\D/g, "").slice(0, 15) : null;

    const insertRow = {
      organization_id: ORG_ID,
      branch_id: BRANCH_HQ,
      department_id: mapped.department_id,
      designation_id: mapped.designation_id,
      employment_type_id: mapped.employment_type_id,
      employee_code: code,
      first_name: first,
      last_name: last,
      email: dirEmp.email,
      phone,
      employment_status: status,
      date_of_joining: dirEmp.dateOfJoining,
      account_status: "draft",
      status: "active",
    };

    const { data: created, error } = await sb
      .schema("hrms")
      .from("employees")
      .insert(insertRow)
      .select("id,employee_code")
      .single();

    if (error) {
      summary.errors.push({ entity: "employee", code, error: error.message });
      audit({ entity: "employee", action: "ERROR", sourceIdentity: code, reason: error.message });
      continue;
    }

    await sb.schema("hrms").from("employee_profiles").insert({
      employee_id: created.id,
      date_of_birth: null,
      status: "active",
    });

    byCode.set(code, { ...insertRow, id: created.id });
    byId.set(created.id, { ...insertRow, id: created.id });
    if (dirEmp.email) byEmail.set(dirEmp.email, { ...insertRow, id: created.id });
    summary.employeesCreated.push(code);
    audit({ entity: "employee", action: "INSERT", sourceIdentity: code, targetIdentity: created.id });
    console.log("Created", code);
  }

  // Refresh employee maps for attendance
  const liveEmployees = await fetchAll(sb, "employees", "id,organization_id,branch_id,employee_code,first_name,last_name,email,user_id", {
    isNull: ["deleted_at"],
  });
  const liveByCode = new Map(liveEmployees.map((e) => [String(e.employee_code).toUpperCase(), e]));
  const liveById = new Map(liveEmployees.map((e) => [e.id, e]));

  // Resolve identities with live DB
  const sourceNames = [
    ...new Set([
      ...attendanceWb.attendanceRecords.map((r) => r.sourceName),
      ...attendanceWb.payrollRecords.map((r) => r.sourceName),
    ]),
  ];
  const identityMap = new Map();
  for (const name of sourceNames) {
    identityMap.set(
      name.toLowerCase().replace(/\s+/g, " ").trim(),
      resolvePersonIdentity(name, directory.employees, liveEmployees),
    );
  }

  function identityFor(record) {
    const key = record.normalizedName;
    return (
      identityMap.get(key) ||
      identityMap.get(key.split(" ")[0]) ||
      resolvePersonIdentity(record.sourceName, directory.employees, liveEmployees)
    );
  }

  // --- Attendance ---
  console.log("=== ATTENDANCE ===");
  const existingAtt = await fetchAll(
    sb,
    "attendance",
    "id,employee_id,attendance_date,attendance_status,notes",
    {
      isNull: ["deleted_at"],
      gte: { attendance_date: "2026-04-01" },
      lte: { attendance_date: "2026-08-31" },
    },
  );
  const attKey = new Map(existingAtt.map((r) => [`${r.employee_id}|${r.attendance_date}`, r]));

  const inserts = [];
  const seen = new Set();

  for (const rec of attendanceWb.attendanceRecords) {
    const identity = identityFor(rec);
    if (!rec.mappedStatus) {
      summary.warnings.push(`Unknown status ${rec.sourceCode} on ${rec.date}`);
      continue;
    }
    if (!identity.importAttendance || !identity.employeeCode) {
      summary.attendanceExcluded += 1;
      continue;
    }
    // Abrar guard
    if (identity.category === PERSON_CLASS.EXECUTIVE && identity.displayName === "Abrar") {
      summary.attendanceExcluded += 1;
      continue;
    }
    // Abdul only if verified EMP-2026020
    if (identity.category === PERSON_CLASS.EXECUTIVE && identity.displayName === "Abdul") {
      if (identity.employeeCode !== "EMP-2026020") {
        summary.attendanceExcluded += 1;
        continue;
      }
    }

    const emp = liveByCode.get(identity.employeeCode);
    if (!emp) {
      summary.warnings.push(`Attendance defer — employee missing ${identity.employeeCode}`);
      continue;
    }

    // Strict Apr–Aug 2026 only (guards Excel serial timezone edge dates)
    if (rec.date < "2026-04-01" || rec.date > "2026-08-31") {
      continue;
    }

    const key = `${emp.id}|${rec.date}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const existing = attKey.get(key);
    if (!existing) {
      const isPresent = rec.mappedStatus === "present";
      inserts.push({
        organization_id: ORG_ID,
        branch_id: emp.branch_id || BRANCH_HQ,
        employee_id: emp.id,
        attendance_date: rec.date,
        check_in_at: isPresent
          ? new Date(`${rec.date}T10:00:00+05:30`).toISOString()
          : null,
        check_out_at: isPresent
          ? new Date(`${rec.date}T19:00:00+05:30`).toISOString()
          : null,
        attendance_status: rec.mappedStatus,
        work_hours: isPresent ? 9 : 0,
        notes: `src:${rec.sourceCode}|import:${batchId}`,
        status: "active",
      });
      continue;
    }

    if (existing.attendance_status === rec.mappedStatus) {
      summary.attendanceSkippedIdentical += 1;
      audit({
        entity: "attendance",
        action: "SKIP",
        sourceIdentity: `${identity.employeeCode}|${rec.date}|${rec.sourceCode}`,
        targetIdentity: existing.id,
        reason: "identical",
      });
    } else {
      summary.attendanceConflicts.push({
        employeeCode: identity.employeeCode,
        date: rec.date,
        excel: rec.mappedStatus,
        excelSource: rec.sourceCode,
        existing: existing.attendance_status,
        action: "KEPT_EXISTING",
      });
      audit({
        entity: "attendance",
        action: "CONFLICT",
        sourceIdentity: `${identity.employeeCode}|${rec.date}|${rec.sourceCode}`,
        targetIdentity: existing.id,
        reason: `excel=${rec.mappedStatus} db=${existing.attendance_status}; kept DB`,
      });
    }
  }

  // batch insert attendance
  for (let i = 0; i < inserts.length; i += 100) {
    const chunk = inserts.slice(i, i + 100);
    const { error } = await sb.schema("hrms").from("attendance").insert(chunk);
    if (error) {
      // fallback row-by-row
      for (const row of chunk) {
        const { error: e2 } = await sb.schema("hrms").from("attendance").insert(row);
        if (e2) {
          summary.errors.push({
            entity: "attendance",
            code: `${row.employee_id}|${row.attendance_date}`,
            error: e2.message,
          });
          audit({
            entity: "attendance",
            action: "ERROR",
            sourceIdentity: `${row.attendance_date}`,
            reason: e2.message,
          });
        } else {
          summary.attendanceInserted += 1;
          audit({
            entity: "attendance",
            action: "INSERT",
            sourceIdentity: row.notes,
            targetIdentity: `${row.employee_id}|${row.attendance_date}`,
          });
        }
      }
    } else {
      summary.attendanceInserted += chunk.length;
      for (const row of chunk) {
        audit({
          entity: "attendance",
          action: "INSERT",
          sourceIdentity: row.notes,
          targetIdentity: `${row.employee_id}|${row.attendance_date}`,
        });
      }
    }
  }
  console.log(
    `Attendance insert=${summary.attendanceInserted} skip=${summary.attendanceSkippedIdentical} conflicts=${summary.attendanceConflicts.length} excluded=${summary.attendanceExcluded}`,
  );

  // --- Payroll ---
  console.log("=== PAYROLL ===");
  const livePayrolls = await fetchAll(sb, "payrolls", "*", { isNull: ["deleted_at"] });
  const payrollByMonth = new Map(
    livePayrolls.map((p) => [String(p.payroll_month).slice(0, 10), p]),
  );
  const liveItems = await fetchAll(
    sb,
    "payroll_items",
    "id,payroll_id,employee_id,net_salary,gross_salary,total_deductions,breakdown",
    { isNull: ["deleted_at"] },
  );
  const itemByPayEmp = new Map(
    liveItems.map((i) => [`${i.payroll_id}|${i.employee_id}`, i]),
  );

  // Deduplicate payroll source rows preferring row_columns
  const payrollPlan = new Map(); // code|month -> record
  for (const rec of attendanceWb.payrollRecords) {
    const identity = identityFor(rec);
    if (!identity.importPayroll || !identity.employeeCode) {
      summary.payrollSkipped += 1;
      audit({
        entity: "payroll",
        action: "EXCLUDED",
        sourceIdentity: rec.sourceName,
        reason: identity.reason || "excluded",
      });
      continue;
    }
    const month = rec.payrollMonth;
    if (!month) continue;
    const key = `${identity.employeeCode}|${month}`;
    const prev = payrollPlan.get(key);
    if (prev && prev.source === "row_columns" && rec.source === "april_pay_roll_block") {
      continue;
    }
    payrollPlan.set(key, { ...rec, identity });
  }

  async function ensurePayroll(month) {
    let p = payrollByMonth.get(month);
    if (p) return p;
    const { data, error } = await sb
      .schema("hrms")
      .from("payrolls")
      .insert({
        organization_id: ORG_ID,
        branch_id: null,
        payroll_month: month,
        payroll_status: "paid",
        total_gross: 0,
        total_deductions: 0,
        total_net: 0,
        notes: `historical_import:${batchId}`,
        status: "active",
      })
      .select("*")
      .single();
    if (error) throw new Error(`Create payroll ${month}: ${error.message}`);
    payrollByMonth.set(month, data);
    audit({ entity: "payroll_run", action: "INSERT", sourceIdentity: month, targetIdentity: data.id });
    return data;
  }

  async function bumpPayrollTotals(payrollId) {
    const { data: items } = await sb
      .schema("hrms")
      .from("payroll_items")
      .select("gross_salary,total_deductions,net_salary")
      .eq("payroll_id", payrollId)
      .is("deleted_at", null);
    const total_gross = (items || []).reduce((s, i) => s + Number(i.gross_salary || 0), 0);
    const total_deductions = (items || []).reduce((s, i) => s + Number(i.total_deductions || 0), 0);
    const total_net = Math.round((total_gross - total_deductions) * 100) / 100;
    await sb
      .schema("hrms")
      .from("payrolls")
      .update({
        total_gross: Math.round(total_gross * 100) / 100,
        total_deductions: Math.round(total_deductions * 100) / 100,
        total_net,
      })
      .eq("id", payrollId);
  }

  const newPayrollItemIds = [];

  for (const [, rec] of payrollPlan) {
    const code = rec.identity.employeeCode;
    const month = rec.payrollMonth;
    const emp = liveByCode.get(code);
    if (!emp) {
      summary.warnings.push(`Payroll skip — missing employee ${code}`);
      continue;
    }

    const amounts = computeExcelPayrollAmounts(rec);
    if (!amounts) continue;

    let payroll = payrollByMonth.get(month);
    if (!payroll) {
      payroll = await ensurePayroll(month);
    }

    const existingItem = itemByPayEmp.get(`${payroll.id}|${emp.id}`);
    if (existingItem) {
      const existingNet = money(existingItem.net_salary);
      if (existingNet != null && amounts.netSalary != null && existingNet === amounts.netSalary) {
        summary.payrollSkipped += 1;
        audit({
          entity: "payroll_item",
          action: "SKIP",
          sourceIdentity: `${code}|${month}`,
          targetIdentity: existingItem.id,
          reason: "identical net",
        });
        continue;
      }

      // Conflict — keep DB
      const conflict = {
        employeeCode: code,
        month,
        excelFinalPayout: amounts.finalPayable,
        existingNetSalary: existingNet,
        payrollStatus: payroll.payroll_status,
        action: "KEPT_EXISTING",
      };
      if (month === "2026-08-01" || payroll.payroll_status === "processed" || payroll.payroll_status === "paid" || payroll.payroll_status === "approved") {
        conflict.type = "PAYROLL_RECONCILIATION_REQUIRED";
        summary.payrollReconcile.push(conflict);
      } else {
        conflict.type = "PAYROLL_NET_CONFLICT";
      }
      summary.payrollConflicts.push(conflict);
      audit({
        entity: "payroll_item",
        action: "CONFLICT",
        sourceIdentity: `${code}|${month}`,
        targetIdentity: existingItem.id,
        reason: `excel_net=${amounts.netSalary} db_net=${existingNet}; kept DB`,
      });
      continue;
    }

    // No existing item — insert even into processed/paid runs (additive historical)
    const breakdown = buildExcelPayrollBreakdown(rec, amounts, batchId);
    const payload = buildExcelPayrollItemPayload(amounts, breakdown);

    const { data: item, error } = await sb
      .schema("hrms")
      .from("payroll_items")
      .insert({
        payroll_id: payroll.id,
        employee_id: emp.id,
        ...payload,
      })
      .select("id")
      .single();

    if (error) {
      summary.errors.push({ entity: "payroll_item", code: `${code}|${month}`, error: error.message });
      audit({ entity: "payroll_item", action: "ERROR", sourceIdentity: `${code}|${month}`, reason: error.message });
      continue;
    }

    itemByPayEmp.set(`${payroll.id}|${emp.id}`, {
      id: item.id,
      payroll_id: payroll.id,
      employee_id: emp.id,
      net_salary: amounts.netSalary,
    });
    newPayrollItemIds.push({
      itemId: item.id,
      payrollId: payroll.id,
      employeeId: emp.id,
      code,
      month,
      net: amounts.netSalary,
    });
    summary.payrollImported += 1;
    audit({ entity: "payroll_item", action: "INSERT", sourceIdentity: `${code}|${month}`, targetIdentity: item.id });
    await bumpPayrollTotals(payroll.id);
  }
  console.log(
    `Payroll imported=${summary.payrollImported} skipped/excluded=${summary.payrollSkipped} conflicts=${summary.payrollConflicts.length}`,
  );

  // --- Payslips ---
  console.log("=== PAYSLIPS ===");
  const livePayslips = await fetchAll(
    sb,
    "payslips",
    "id,payroll_item_id,employee_id,payslip_number",
    { isNull: ["deleted_at"] },
  );
  const slipByItem = new Map(livePayslips.map((p) => [p.payroll_item_id, p]));
  const slipByNumber = new Map(livePayslips.map((p) => [p.payslip_number, p]));

  // Generate for newly inserted items + identical skips that lack payslip
  const payslipCandidates = [...newPayrollItemIds];
  for (const [, rec] of payrollPlan) {
    const code = rec.identity.employeeCode;
    const month = rec.payrollMonth;
    const emp = liveByCode.get(code);
    const payroll = payrollByMonth.get(month);
    if (!emp || !payroll) continue;
    const item = itemByPayEmp.get(`${payroll.id}|${emp.id}`);
    if (!item) continue;
    // skip if this was a conflict (existing with different net) — already handled by not being in newPayrollItemIds
    const conflicted = summary.payrollConflicts.some(
      (c) => c.employeeCode === code && c.month === month,
    );
    if (conflicted) continue;
    if (!payslipCandidates.some((c) => c.itemId === item.id)) {
      payslipCandidates.push({
        itemId: item.id,
        payrollId: payroll.id,
        employeeId: emp.id,
        code,
        month,
        net: money(item.net_salary),
      });
    }
  }

  for (const c of payslipCandidates) {
    const yyyymm = c.month.slice(0, 7).replace("-", "");
    const payslipNumber = `PS-${yyyymm}-${c.code}`;
    if (slipByItem.has(c.itemId) || slipByNumber.has(payslipNumber)) {
      summary.payslipsSkipped += 1;
      audit({
        entity: "payslip",
        action: "SKIP",
        sourceIdentity: payslipNumber,
        reason: "already exists",
      });
      continue;
    }

    const { data: slip, error } = await sb
      .schema("hrms")
      .from("payslips")
      .insert({
        payroll_id: c.payrollId,
        payroll_item_id: c.itemId,
        employee_id: c.employeeId,
        payslip_number: payslipNumber,
        payment_mode: "Bank Transfer",
        is_current: true,
        status: "active",
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      summary.errors.push({ entity: "payslip", code: payslipNumber, error: error.message });
      audit({ entity: "payslip", action: "ERROR", sourceIdentity: payslipNumber, reason: error.message });
      continue;
    }

    summary.payslipsGenerated += 1;
    slipByItem.set(c.itemId, slip);
    slipByNumber.set(payslipNumber, slip);
    audit({ entity: "payslip", action: "INSERT", sourceIdentity: payslipNumber, targetIdentity: slip.id });
  }
  console.log(`Payslips generated=${summary.payslipsGenerated} skipped=${summary.payslipsSkipped}`);

  // --- Bank ---
  console.log("=== BANK ===");
  const liveBanks = await fetchAll(
    sb,
    "bank_accounts",
    "id,employee_id,account_number,ifsc_code,is_primary,account_holder_name,bank_name",
    { isNull: ["deleted_at"] },
  );
  const bankByEmp = new Map();
  for (const b of liveBanks) {
    if (b.is_primary) bankByEmp.set(b.employee_id, b);
  }

  for (const dirEmp of directory.employees) {
    const excelBank = directory.banksByCode.get(dirEmp.employeeCode);
    if (!excelBank) continue;
    const emp = liveByCode.get(dirEmp.employeeCode);
    if (!emp) continue;

    const existing = bankByEmp.get(emp.id);
    if (!existing) {
      const { error } = await sb.schema("hrms").from("bank_accounts").insert({
        employee_id: emp.id,
        bank_name: "Imported",
        account_holder_name: dirEmp.fullName,
        account_number: excelBank.accountNumber,
        ifsc_code: excelBank.ifscCode,
        account_type: "salary",
        is_primary: true,
        status: "active",
      });
      if (error) {
        summary.errors.push({ entity: "bank", code: dirEmp.employeeCode, error: error.message });
      } else {
        summary.bankCreated += 1;
        audit({
          entity: "bank",
          action: "INSERT",
          sourceIdentity: dirEmp.employeeCode,
          targetIdentity: emp.id,
          reason: "primary bank created",
        });
      }
      continue;
    }

    const placeholder = isPlaceholderAccount(existing.account_number);
    const sameAcct = accountsEqual(existing.account_number, excelBank.accountNumber);
    const sameIfsc = ifscEqual(existing.ifsc_code, excelBank.ifscCode);

    if (sameAcct && sameIfsc) {
      summary.bankSkipped += 1;
      audit({ entity: "bank", action: "SKIP", sourceIdentity: dirEmp.employeeCode, reason: "identical" });
      continue;
    }

    if (placeholder) {
      const { error } = await sb
        .schema("hrms")
        .from("bank_accounts")
        .update({
          account_number: excelBank.accountNumber,
          ifsc_code: excelBank.ifscCode,
          account_holder_name: dirEmp.fullName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) {
        summary.errors.push({ entity: "bank", code: dirEmp.employeeCode, error: error.message });
      } else {
        summary.bankUpdated += 1;
        audit({
          entity: "bank",
          action: "UPDATE",
          sourceIdentity: dirEmp.employeeCode,
          targetIdentity: existing.id,
          reason: "replaced PENDING placeholder",
        });
      }
      continue;
    }

    summary.bankConflicts.push({
      employeeCode: dirEmp.employeeCode,
      ifscConflict: !sameIfsc,
      accountConflict: !sameAcct,
      action: "KEPT_EXISTING",
    });
    audit({
      entity: "bank",
      action: "CONFLICT",
      sourceIdentity: dirEmp.employeeCode,
      targetIdentity: existing.id,
      reason: "BANK_DATA_CONFLICT kept existing",
    });
  }
  console.log(
    `Bank created=${summary.bankCreated} updated=${summary.bankUpdated} skipped=${summary.bankSkipped} conflicts=${summary.bankConflicts.length}`,
  );

  // --- Post verify executives unchanged ---
  const abdulAfter = await sb
    .schema("hrms")
    .from("employees")
    .select("id,employee_code,employment_status,deleted_at,user_id")
    .eq("id", abdul.id)
    .single();
  const rolesAfter = await fetchAll(sb, "user_roles", "*", { isNull: ["deleted_at"] });
  const abdulRolesAfter = rolesAfter
    .filter((ur) => ur.employee_id === abdul.id)
    .map((ur) => roleById[ur.role_id]);
  summary.postVerify = {
    abdulStillExists: Boolean(abdulAfter.data && !abdulAfter.data.deleted_at),
    abdulCode: abdulAfter.data?.employee_code,
    abdulRoles: abdulRolesAfter,
    fazilCreated: Boolean(liveByCode.get("IF2026008") && summary.employeesCreated.includes("IF2026008")),
    if2026008Exists: Boolean(
      (await fetchAll(sb, "employees", "employee_code", { isNull: ["deleted_at"] })).some(
        (e) => e.employee_code === "IF2026008",
      ),
    ),
  };

  summary.completedAt = new Date().toISOString();
  summary.status = summary.errors.length ? "completed_with_errors" : "completed";

  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  const auditPath = path.join(AUDIT_DIR, `batch-${batchId}.json`);
  fs.writeFileSync(
    auditPath,
    JSON.stringify(
      {
        summary: {
          ...summary,
          // strip nothing sensitive from summary — bank conflicts have no full numbers
        },
        events: auditEvents,
      },
      null,
      2,
    ),
  );

  const resultPath = path.join(__dirname, "reports", "write-import-result-latest.json");
  fs.mkdirSync(path.join(__dirname, "reports"), { recursive: true });
  fs.writeFileSync(resultPath, JSON.stringify(summary, null, 2));

  console.log("\n=== WRITE IMPORT COMPLETE ===");
  console.log(JSON.stringify({
    batchId,
    employeesCreated: summary.employeesCreated,
    employeesSkipped: summary.employeesSkipped,
    attendanceInserted: summary.attendanceInserted,
    attendanceSkippedIdentical: summary.attendanceSkippedIdentical,
    attendanceConflicts: summary.attendanceConflicts.length,
    attendanceExcluded: summary.attendanceExcluded,
    payrollImported: summary.payrollImported,
    payrollConflicts: summary.payrollConflicts.length,
    payslipsGenerated: summary.payslipsGenerated,
    bankUpdated: summary.bankUpdated,
    bankCreated: summary.bankCreated,
    errors: summary.errors.length,
    abdul: summary.abdul,
    abrar: summary.abrar,
    postVerify: summary.postVerify,
    auditPath,
    backupPath,
  }, null, 2));
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
