import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv, requireSupabaseEnv } from "./lib/env.mjs";
import { parseEmployeeDirectory } from "./lib/excel-directory.mjs";
import {
  parseAttendanceWorkbook,
  ATTENDANCE_STATUS_MAP,
} from "./lib/excel-attendance.mjs";
import {
  resolvePersonIdentity,
  classifyDirectoryEmployees,
  PERSON_CLASS,
  accountsEqual,
  ifscEqual,
  isPlaceholderAccount,
} from "./lib/mapping.mjs";
import { loadDbSnapshot } from "./lib/db-readonly.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ATT_PATH = path.join(ROOT, "src/assets/Attendence Sheet 2026.xlsx");
const DIR_PATH = path.join(ROOT, "src/assets/Employee Directory.xlsx");
const REPORT_DIR = path.join(__dirname, "reports");

function money(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function exclusionRollup(identity, attendanceEnriched, payrollEnriched, payslipPlan) {
  const att = attendanceEnriched.filter(
    (r) => r.normalizedName === identity.normalizedName,
  );
  const pay = payrollEnriched.filter(
    (r) => r.normalizedName === identity.normalizedName,
  );
  const months = [
    ...new Set([
      ...att.map((r) => r.sheetName),
      ...pay.map((r) => r.sheetName || r.payrollMonth),
    ]),
  ];
  const payslipRelated = (payslipPlan || []).filter(
    (p) =>
      p.employeeCode &&
      identity.employeeCode &&
      p.employeeCode === identity.employeeCode,
  );
  return {
    name: identity.displayName || identity.sourceName,
    sourceName: identity.sourceName,
    category: identity.category,
    status: identity.status,
    sourceEmployeeId: identity.employeeCode ?? null,
    linkedEmployeeCode: identity.employeeCode ?? null,
    linkedEmployeeId: identity.employeeId ?? null,
    roleLabel: identity.roleLabel ?? null,
    reason: identity.reason,
    affectedMonths: months,
    affectedAttendanceRecords: att.length,
    affectedPayrollRecords: pay.length,
    affectedPayslipRecords: payslipRelated.length,
    importAttendance: Boolean(identity.importAttendance),
    importPayroll: Boolean(identity.importPayroll),
    importPayslip: Boolean(identity.importPayslip),
    createEmployee: Boolean(identity.createEmployee),
  };
}

async function main() {
  console.log("HR data migration DRY-RUN — read-only, no database writes.");
  console.log("Parsing Excel workbooks…");

  const directory = parseEmployeeDirectory(DIR_PATH);
  const attendanceWb = parseAttendanceWorkbook(ATT_PATH);

  const attNameList = [...new Set(attendanceWb.attendanceRecords.map((r) => r.sourceName))];
  const payrollNameList = [...new Set(attendanceWb.payrollRecords.map((r) => r.sourceName))];
  const allSourceNames = [...new Set([...attNameList, ...payrollNameList])];

  const dateFrom = "2026-04-01";
  const dateTo = "2026-08-31";
  const payrollMonths = [
    "2026-04-01",
    "2026-05-01",
    "2026-06-01",
    "2026-07-01",
    "2026-08-01",
  ];

  console.log("Loading read-only DB snapshot for conflict detection…");
  const env = loadEnv(ROOT);
  const { url, key } = requireSupabaseEnv(env);
  const db = await loadDbSnapshot(url, key, {
    employeeCodes: [
      ...directory.employees.map((e) => e.employeeCode),
      "IF2026016",
      "EMP-2026020",
    ],
    dateFrom,
    dateTo,
    payrollMonths,
  });

  const dbEmployeeList = db.employees;

  const { map: identityByNormalized, list: identityList } = (() => {
    const map = new Map();
    const list = [];
    for (const name of allSourceNames) {
      const resolved = resolvePersonIdentity(
        name,
        directory.employees,
        dbEmployeeList,
      );
      map.set(resolved.normalizedName, resolved);
      list.push(resolved);
    }
    return { map, list };
  })();

  function attachIdentity(record) {
    const key = record.normalizedName;
    const first = key.split(" ")[0];
    const identity =
      identityByNormalized.get(key) ??
      identityByNormalized.get(first) ??
      resolvePersonIdentity(record.sourceName, directory.employees, dbEmployeeList);
    return { ...record, identity };
  }

  const attendanceEnriched = attendanceWb.attendanceRecords.map(attachIdentity);
  const payrollEnriched = attendanceWb.payrollRecords.map(attachIdentity);

  const directoryClassification = classifyDirectoryEmployees(
    directory.employees,
    db.employeesByCode,
    db.employeesByEmail,
  );

  // Abhishek only — active employee that may exist via seed (not Fazil)
  const activeSeedChecks = ["IF2026016"].map((code) => {
    const emp = db.employeesByCode.get(code) ?? null;
    return {
      employeeCode: code,
      existsInDb: Boolean(emp),
      dbId: emp?.id ?? null,
      canonicalName: emp ? `${emp.first_name} ${emp.last_name}` : null,
      organizationId: emp?.organization_id ?? null,
      action: emp ? "USE_EXISTING" : "CREATE_IF_IN_DIRECTORY_OR_REVIEW",
    };
  });

  // Attendance conflict detection
  const attendanceByEmpDate = new Map();
  for (const row of db.attendance) {
    attendanceByEmpDate.set(`${row.employee_id}|${row.attendance_date}`, row);
  }

  const attendanceActions = [];
  const attendanceConflicts = [];
  const attendanceDuplicatesInSource = [];
  const seenSourceKeys = new Map();
  const excludedAttendance = [];
  const unknownStatusRecords = [];

  for (const rec of attendanceEnriched) {
    const sourceKey = `${rec.normalizedName}|${rec.date}|${rec.sourceCode}`;
    if (seenSourceKeys.has(sourceKey)) {
      attendanceDuplicatesInSource.push(rec);
    } else {
      seenSourceKeys.set(sourceKey, true);
    }

    if (rec.unknown) {
      unknownStatusRecords.push({
        sourceName: rec.sourceName,
        date: rec.date,
        sourceCode: rec.sourceCode,
      });
      continue;
    }

    if (!rec.identity.importAttendance) {
      excludedAttendance.push({
        type: "EXCLUDED_ATTENDANCE",
        category: rec.identity.category,
        sourceName: rec.sourceName,
        date: rec.date,
        sourceCode: rec.sourceCode,
        sheetName: rec.sheetName,
        reason: rec.identity.reason,
        linkedEmployeeCode: rec.identity.employeeCode ?? null,
      });
      continue;
    }

    if (!rec.identity.employeeCode) {
      excludedAttendance.push({
        type: "EXCLUDED_ATTENDANCE",
        category: rec.identity.category,
        sourceName: rec.sourceName,
        date: rec.date,
        sourceCode: rec.sourceCode,
        sheetName: rec.sheetName,
        reason: rec.identity.reason || "No employee code for import",
      });
      continue;
    }

    const dbEmp =
      rec.identity.employeeId
        ? db.employeesById.get(rec.identity.employeeId)
        : db.employeesByCode.get(rec.identity.employeeCode);
    if (!dbEmp) {
      attendanceActions.push({
        action: "DEFER_UNTIL_EMPLOYEE_CREATED",
        employeeCode: rec.identity.employeeCode,
        date: rec.date,
        sourceCode: rec.sourceCode,
        mappedStatus: rec.mappedStatus,
        notes: rec.notes,
      });
      continue;
    }

    const existing = attendanceByEmpDate.get(`${dbEmp.id}|${rec.date}`);
    if (!existing) {
      attendanceActions.push({
        action: "INSERT",
        employeeCode: rec.identity.employeeCode,
        employeeId: dbEmp.id,
        date: rec.date,
        sourceCode: rec.sourceCode,
        mappedStatus: rec.mappedStatus,
        notes: rec.notes,
      });
      continue;
    }

    if (existing.attendance_status === rec.mappedStatus) {
      attendanceActions.push({
        action: "SKIP_IDENTICAL",
        employeeCode: rec.identity.employeeCode,
        employeeId: dbEmp.id,
        date: rec.date,
        sourceCode: rec.sourceCode,
        mappedStatus: rec.mappedStatus,
        existingStatus: existing.attendance_status,
      });
    } else {
      attendanceConflicts.push({
        type: "ATTENDANCE_STATUS_CONFLICT",
        employeeCode: rec.identity.employeeCode,
        date: rec.date,
        excelSourceCode: rec.sourceCode,
        excelMappedStatus: rec.mappedStatus,
        existingStatus: existing.attendance_status,
        existingNotes: existing.notes,
        actionRequired: "REVIEW — do not silent overwrite",
      });
    }
  }

  // Deduplicate attendance actions by employee+date (last wins from source dedupe)
  const attendanceDeduped = new Map();
  for (const a of attendanceActions) {
    if (!a.employeeCode || !a.date) continue;
    attendanceDeduped.set(`${a.employeeCode}|${a.date}`, a);
  }
  const uniqueAttendancePlan = [...attendanceDeduped.values()];

  // Leave vs attendance leave-code conflicts (report only) — active/executive-linked only
  const leaveConflicts = [];
  for (const rec of attendanceEnriched) {
    if (!["CL", "PL", "EL"].includes(rec.sourceCode)) continue;
    if (!rec.identity.importAttendance || !rec.identity.employeeCode) continue;
    const dbEmp =
      (rec.identity.employeeId && db.employeesById.get(rec.identity.employeeId)) ||
      db.employeesByCode.get(rec.identity.employeeCode);
    if (!dbEmp) continue;
    const overlapping = db.leaveRequests.filter(
      (lr) =>
        lr.employee_id === dbEmp.id &&
        lr.start_date <= rec.date &&
        lr.end_date >= rec.date &&
        ["approved", "pending"].includes(lr.leave_status),
    );
    // Conflict only if there is NO overlapping leave while attendance says leave,
    // OR overlapping leave exists — both are informational. User asked: if attendance and leave conflict, report.
    // Define conflict as: attendance is leave day but no approved/pending leave request covering that date.
    if (overlapping.length === 0) {
      leaveConflicts.push({
        type: "ATTENDANCE_LEAVE_WITHOUT_LEAVE_REQUEST",
        employeeCode: rec.identity.employeeCode,
        date: rec.date,
        sourceCode: rec.sourceCode,
        note: "Attendance shows leave; no matching leave_request. Leave tables will NOT be modified.",
      });
    }
  }

  // Payroll plan
  const payrollByMonth = {};
  const payrollConflicts = [];
  const excludedPayroll = [];
  const payrollDuplicatesInSource = [];
  const seenPayrollKeys = new Map();

  const payrollsByMonth = new Map();
  for (const p of db.payrolls) {
    payrollsByMonth.set(String(p.payroll_month).slice(0, 10), p);
  }

  const itemsByPayrollEmp = new Map();
  for (const item of db.payrollItems) {
    itemsByPayrollEmp.set(`${item.payroll_id}|${item.employee_id}`, item);
  }

  for (const rec of payrollEnriched) {
    const month = rec.payrollMonth;
    if (!month) continue;
    if (!payrollByMonth[month]) {
      payrollByMonth[month] = {
        month,
        rows: [],
        plan: [],
        missingValues: [],
      };
    }

    const key = `${rec.normalizedName}|${month}|${rec.source}`;
    if (seenPayrollKeys.has(key)) {
      payrollDuplicatesInSource.push({
        sourceName: rec.sourceName,
        month,
        source: rec.source,
      });
    } else {
      seenPayrollKeys.set(key, true);
    }

    if (!rec.identity.importPayroll) {
      excludedPayroll.push({
        type: "EXCLUDED_PAYROLL",
        category: rec.identity.category,
        sourceName: rec.sourceName,
        month,
        finalPayout: money(rec.finalPayout),
        salary: money(rec.salary),
        source: rec.source,
        reason: rec.identity.reason,
        linkedEmployeeCode: rec.identity.employeeCode ?? null,
      });
      continue;
    }

    if (!rec.identity.employeeCode) {
      excludedPayroll.push({
        type: "EXCLUDED_PAYROLL",
        category: rec.identity.category,
        sourceName: rec.sourceName,
        month,
        finalPayout: money(rec.finalPayout),
        salary: money(rec.salary),
        source: rec.source,
        reason: "No employee code for payroll import",
      });
      continue;
    }

    // Prefer row_columns over april block when both exist for same person/month
    const existingPlanIdx = payrollByMonth[month].plan.findIndex(
      (p) => p.employeeCode === rec.identity.employeeCode,
    );

    const row = {
      employeeCode: rec.identity.employeeCode,
      sourceName: rec.sourceName,
      source: rec.source,
      present: rec.present,
      absent: rec.absent,
      holiday: rec.holiday,
      cl: rec.cl,
      pl: rec.pl,
      el: rec.el,
      lop: rec.lop,
      totalWorkingDays: rec.totalWorkingDays,
      salary: money(rec.salary),
      workingDaySalary: money(rec.workingDaySalary),
      professionalTax: money(rec.professionalTax),
      amountAfterPt: money(rec.amountAfterPt),
      reimbursement: money(rec.reimbursement),
      finalPayout: money(rec.finalPayout),
    };

    payrollByMonth[month].rows.push(row);

    if (row.finalPayout == null && row.salary == null && row.workingDaySalary == null) {
      payrollByMonth[month].missingValues.push({
        employeeCode: row.employeeCode,
        sourceName: row.sourceName,
        note: "No salary/workingDaySalary/finalPayout",
      });
      continue;
    }

    const dbEmp = db.employeesByCode.get(rec.identity.employeeCode);
    const existingPayroll = payrollsByMonth.get(month) ?? null;
    const existingItem =
      dbEmp && existingPayroll
        ? itemsByPayrollEmp.get(`${existingPayroll.id}|${dbEmp.id}`) ?? null
        : null;

    let action = "INSERT_ITEM";
    if (!dbEmp) action = "DEFER_UNTIL_EMPLOYEE_CREATED";
    else if (existingItem) {
      const existingNet = money(existingItem.net_salary);
      if (existingNet != null && row.finalPayout != null && existingNet !== row.finalPayout) {
        action = "CONFLICT";
        payrollConflicts.push({
          type: "PAYROLL_NET_CONFLICT",
          employeeCode: rec.identity.employeeCode,
          month,
          excelFinalPayout: row.finalPayout,
          existingNetSalary: existingNet,
          payrollStatus: existingPayroll?.payroll_status,
          isLocked: existingPayroll?.is_locked,
          actionRequired: "REVIEW — do not silent overwrite historical item",
        });
      } else if (
        existingNet != null &&
        row.finalPayout != null &&
        existingNet === row.finalPayout
      ) {
        action = "SKIP_IDENTICAL";
      } else {
        action = "REVIEW_EXISTING_ITEM";
      }
    }

    const planEntry = {
      action,
      employeeCode: rec.identity.employeeCode,
      employeeId: dbEmp?.id ?? null,
      month,
      ...row,
      breakdownPreview: {
        source: "excel_historical_option_1",
        salary: row.salary,
        workingDaySalary: row.workingDaySalary,
        present: row.present,
        absent: row.absent,
        holiday: row.holiday,
        cl: row.cl,
        pl: row.pl,
        el: row.el,
        lop: row.lop,
        totalWorkingDays: row.totalWorkingDays,
        professionalTax: row.professionalTax,
        amountAfterPt: row.amountAfterPt,
        reimbursement: row.reimbursement,
        finalPayout: row.finalPayout,
        importNote: "Do not recalculate with live payroll engine",
      },
    };

    if (existingPlanIdx >= 0) {
      const prev = payrollByMonth[month].plan[existingPlanIdx];
      // Prefer richer row_columns over april block
      if (prev.source === "april_pay_roll_block" && rec.source === "row_columns") {
        payrollByMonth[month].plan[existingPlanIdx] = planEntry;
      } else if (prev.source === "row_columns" && rec.source === "april_pay_roll_block") {
        // keep richer
      } else {
        payrollByMonth[month].plan[existingPlanIdx] = planEntry;
      }
    } else {
      payrollByMonth[month].plan.push(planEntry);
    }
  }

  // Payslip plan
  const payslipPlan = [];
  const payslipDuplicates = [];
  const payslipsByItem = new Map(db.payslips.map((p) => [p.payroll_item_id, p]));
  const payslipsByNumber = new Map(
    db.payslips.map((p) => [p.payslip_number, p]),
  );

  for (const month of Object.keys(payrollByMonth).sort()) {
    for (const item of payrollByMonth[month].plan) {
      if (!["INSERT_ITEM", "SKIP_IDENTICAL", "REVIEW_EXISTING_ITEM"].includes(item.action) && item.action !== "CONFLICT") {
        if (item.action === "DEFER_UNTIL_EMPLOYEE_CREATED") {
          payslipPlan.push({
            action: "DEFER",
            employeeCode: item.employeeCode,
            month,
            reason: "Employee not in DB yet",
          });
          continue;
        }
      }
      if (item.action === "CONFLICT") {
        payslipPlan.push({
          action: "BLOCKED_BY_PAYROLL_CONFLICT",
          employeeCode: item.employeeCode,
          month,
        });
        continue;
      }
      if (item.finalPayout == null && item.salary == null) continue;

      const yyyymm = month.slice(0, 7).replace("-", "");
      const payslipNumber = `PS-${yyyymm}-${item.employeeCode}`;
      const existingByNumber = payslipsByNumber.get(payslipNumber);
      const dbEmp = db.employeesByCode.get(item.employeeCode);
      const existingPayroll = payrollsByMonth.get(month);
      const existingItem =
        dbEmp && existingPayroll
          ? itemsByPayrollEmp.get(`${existingPayroll.id}|${dbEmp.id}`)
          : null;
      const existingPayslip = existingItem
        ? payslipsByItem.get(existingItem.id)
        : null;

      if (existingPayslip || existingByNumber) {
        payslipPlan.push({
          action: "SKIP_OR_REVIEW",
          employeeCode: item.employeeCode,
          month,
          payslipNumber,
          existingPayslipId: existingPayslip?.id ?? existingByNumber?.id ?? null,
        });
        if (existingPayslip && existingByNumber && existingPayslip.id !== existingByNumber.id) {
          payslipDuplicates.push({
            employeeCode: item.employeeCode,
            month,
            payslipNumber,
            note: "Multiple payslip identity matches",
          });
        }
      } else if (item.action === "INSERT_ITEM" || item.action === "SKIP_IDENTICAL" || item.action === "REVIEW_EXISTING_ITEM") {
        payslipPlan.push({
          action: item.action === "INSERT_ITEM" ? "GENERATE_AFTER_PAYROLL_ITEM" : "GENERATE_IF_MISSING",
          employeeCode: item.employeeCode,
          month,
          payslipNumber,
        });
      }
    }
  }

  // Bank plan — never include full account numbers in report
  const bankPlan = [];
  const bankConflicts = [];
  const banksByEmployeeId = new Map();
  for (const b of db.bankAccounts) {
    if (!b.is_primary) continue;
    banksByEmployeeId.set(b.employee_id, b);
  }

  for (const emp of directory.employees) {
    const excelBank = directory.banksByCode.get(emp.employeeCode);
    const dbEmp = db.employeesByCode.get(emp.employeeCode);
    if (!excelBank) {
      bankPlan.push({
        employeeCode: emp.employeeCode,
        bankRecordExists: Boolean(dbEmp && banksByEmployeeId.get(dbEmp.id)),
        ifscConflict: false,
        accountConflict: false,
        actionRequired: "NO_DIRECTORY_BANK_ROW",
      });
      continue;
    }
    if (!dbEmp) {
      bankPlan.push({
        employeeCode: emp.employeeCode,
        bankRecordExists: false,
        ifscConflict: false,
        accountConflict: false,
        actionRequired: "CREATE_BANK_AFTER_EMPLOYEE_CREATE",
        accountLast4: excelBank.accountLast4,
      });
      continue;
    }
    const existing = banksByEmployeeId.get(dbEmp.id);
    if (!existing) {
      bankPlan.push({
        employeeCode: emp.employeeCode,
        bankRecordExists: false,
        ifscConflict: false,
        accountConflict: false,
        actionRequired: "INSERT_PRIMARY_BANK",
        accountLast4: excelBank.accountLast4,
      });
      continue;
    }

    const placeholder = isPlaceholderAccount(existing.account_number);
    const accountSame = accountsEqual(existing.account_number, excelBank.accountNumber);
    const ifscSame = ifscEqual(existing.ifsc_code, excelBank.ifscCode);

    if (accountSame && ifscSame) {
      bankPlan.push({
        employeeCode: emp.employeeCode,
        bankRecordExists: true,
        ifscConflict: false,
        accountConflict: false,
        actionRequired: "SKIP_IDENTICAL",
        accountLast4: excelBank.accountLast4,
      });
    } else if (placeholder) {
      bankPlan.push({
        employeeCode: emp.employeeCode,
        bankRecordExists: true,
        ifscConflict: !ifscSame,
        accountConflict: false,
        actionRequired: "UPDATE_FROM_PLACEHOLDER",
        accountLast4: excelBank.accountLast4,
        existingIsPlaceholder: true,
      });
    } else {
      bankConflicts.push({
        type: "BANK_DATA_CONFLICT",
        employeeCode: emp.employeeCode,
        ifscConflict: !ifscSame,
        accountConflict: !accountSame,
        actionRequired: "REVIEW — do not silent overwrite",
        excelAccountLast4: excelBank.accountLast4,
        existingAccountLast4: String(existing.account_number).slice(-4),
      });
      bankPlan.push({
        employeeCode: emp.employeeCode,
        bankRecordExists: true,
        ifscConflict: !ifscSame,
        accountConflict: !accountSame,
        actionRequired: "BANK_DATA_CONFLICT",
        accountLast4: excelBank.accountLast4,
      });
    }
  }

  // Classification rollups (after payslip plan exists)
  const activePeople = identityList.filter((i) => i.category === PERSON_CLASS.ACTIVE);
  const formerPeople = identityList.filter((i) => i.category === PERSON_CLASS.FORMER);
  const executivePeople = identityList.filter((i) => i.category === PERSON_CLASS.EXECUTIVE);
  const unmatchedPeople = identityList.filter((i) => i.category === PERSON_CLASS.UNMATCHED);

  const excludedPeopleDetailed = [...formerPeople, ...executivePeople, ...unmatchedPeople].map(
    (i) => exclusionRollup(i, attendanceEnriched, payrollEnriched, payslipPlan),
  );

  const unmatchedEmployees = unmatchedPeople.map((i) =>
    exclusionRollup(i, attendanceEnriched, payrollEnriched, payslipPlan),
  );

  // Status totals
  const statusTotals = {};
  for (const rec of attendanceWb.attendanceRecords) {
    statusTotals[rec.sourceCode] = (statusTotals[rec.sourceCode] ?? 0) + 1;
  }

  const monthAttendanceCounts = {};
  for (const sheet of attendanceWb.monthSheets) {
    const s = attendanceWb.sheets[sheet];
    monthAttendanceCounts[sheet] = {
      records: s?.attendanceRecords?.length ?? 0,
      blankCells: s?.blankCells ?? 0,
      dayCells: s?.dayCells ?? 0,
      employees: s?.employees?.length ?? 0,
      empty: Boolean(s?.empty || s?.missing),
      dateRange: s?.dateRange ?? null,
      statusCounts: s?.statusCounts ?? {},
    };
  }

  const report = {
    meta: {
      mode: "DRY_RUN",
      databaseWrites: false,
      generatedAt: new Date().toISOString(),
      sources: {
        attendance: "src/assets/Attendence Sheet 2026.xlsx",
        directory: "src/assets/Employee Directory.xlsx",
      },
      decisions: {
        payroll: "OPTION_1_PRESERVE_EXCEL",
        hMapping: "week_off",
        leaveFromAttendance: false,
        bankImport: true,
        aprilPayrollBlock: true,
        formerExcluded: ["Fazil (IF2026008)", "Ehtesham"],
        executives: [
          "Abdul = CEO → link EMP-2026020 if present; no create; no role change",
          "Abrar = Co-founder → no create; link only if existing identity found",
        ],
        cancelled: ["Do not create/resolve Fazil IF2026008"],
        abhishekActive: "IF2026016",
      },
      attendanceStatusMap: ATTENDANCE_STATUS_MAP,
      dbEmployeeCount: db.employees.length,
      dbAttendanceInRange: db.attendance.length,
      dbPayrollMonthsFound: db.payrolls.map((p) => p.payroll_month),
      dbPayslipCountInScope: db.payslips.length,
    },
    employees: {
      directoryTotal: directory.employees.length,
      existingHrmsTotal: db.employees.length,
      classification: {
        ACTIVE_EMPLOYEE: activePeople.map((i) => ({
          sourceName: i.sourceName,
          employeeCode: i.employeeCode,
          status: i.status,
          reason: i.reason,
        })),
        FORMER_EMPLOYEE: formerPeople.map((i) =>
          exclusionRollup(i, attendanceEnriched, payrollEnriched, payslipPlan),
        ),
        EXECUTIVE: executivePeople.map((i) =>
          exclusionRollup(i, attendanceEnriched, payrollEnriched, payslipPlan),
        ),
        UNMATCHED: unmatchedPeople.map((i) =>
          exclusionRollup(i, attendanceEnriched, payrollEnriched, payslipPlan),
        ),
      },
      excludedPeopleDetailed,
      newEmployeesToCreate: directoryClassification.toCreate,
      alreadyExisting: directoryClassification.alreadyExisting,
      ambiguousEmailConflicts: directoryClassification.ambiguous,
      activeSeedChecks,
      attendanceIdentityMap: identityList,
      unmatchedEmployees,
      ambiguousEmployees: identityList.filter((i) => i.status === "AMBIGUOUS"),
    },
    attendance: {
      byMonth: monthAttendanceCounts,
      totalFilledCells: attendanceWb.attendanceRecords.length,
      statusTotals,
      blankCellsTotal: Object.values(monthAttendanceCounts).reduce(
        (s, m) => s + (m.blankCells || 0),
        0,
      ),
      duplicateSourceRecords: attendanceDuplicatesInSource.length,
      unknownStatuses: unknownStatusRecords,
      excludedAttendanceRecords: excludedAttendance.length,
      excludedAttendanceSamples: excludedAttendance.slice(0, 50),
      planCounts: {
        insert: uniqueAttendancePlan.filter((a) => a.action === "INSERT").length,
        skipIdentical: uniqueAttendancePlan.filter((a) => a.action === "SKIP_IDENTICAL")
          .length,
        deferUntilEmployeeCreated: uniqueAttendancePlan.filter(
          (a) => a.action === "DEFER_UNTIL_EMPLOYEE_CREATED",
        ).length,
        conflicts: attendanceConflicts.length,
        excluded: excludedAttendance.length,
      },
      conflicts: attendanceConflicts,
      leaveConflictsSample: leaveConflicts.slice(0, 100),
      leaveConflictCount: leaveConflicts.length,
      note: "CL/PL/EL remain attendance only — leave_requests/balances untouched. Former/executive-without-link excluded.",
    },
    payroll: {
      byMonth: Object.fromEntries(
        Object.entries(payrollByMonth).map(([month, data]) => [
          month,
          {
            employeeCount: data.plan.length,
            employees: data.plan.map((p) => ({
              employeeCode: p.employeeCode,
              sourceName: p.sourceName,
              source: p.source,
              action: p.action,
              salary: p.salary,
              workingDaySalary: p.workingDaySalary,
              professionalTax: p.professionalTax,
              reimbursement: p.reimbursement,
              finalPayout: p.finalPayout,
              present: p.present,
              absent: p.absent,
              holiday: p.holiday,
              cl: p.cl,
              pl: p.pl,
              el: p.el,
              lop: p.lop,
              totalWorkingDays: p.totalWorkingDays,
            })),
            missingValues: data.missingValues,
          },
        ]),
      ),
      conflicts: payrollConflicts,
      excluded: excludedPayroll,
      duplicateSourceRows: payrollDuplicatesInSource,
      totalPlanRows: Object.values(payrollByMonth).reduce(
        (s, m) => s + m.plan.length,
        0,
      ),
    },
    payslips: {
      existingInScope: db.payslips.map((p) => ({
        id: p.id,
        employeeId: p.employee_id,
        payslipNumber: p.payslip_number,
      })),
      plan: payslipPlan,
      canGenerate: payslipPlan.filter((p) =>
        ["GENERATE_AFTER_PAYROLL_ITEM", "GENERATE_IF_MISSING"].includes(p.action),
      ).length,
      skipOrReview: payslipPlan.filter((p) => p.action === "SKIP_OR_REVIEW").length,
      blocked: payslipPlan.filter((p) =>
        ["BLOCKED_BY_PAYROLL_CONFLICT", "DEFER"].includes(p.action),
      ).length,
      duplicates: payslipDuplicates,
    },
    bank: {
      plan: bankPlan,
      conflicts: bankConflicts,
      note: "Full account numbers omitted from report. Last4 only.",
    },
    proposedDatabaseChanges: {
      tables: [
        {
          name: "hrms.data_import_batches",
          status: "PROPOSED — not applied",
          file: "scripts/hr-data-migration/proposed/001_data_import_batches.sql",
        },
      ],
      noEnumChanges: true,
      noRlsChanges: true,
      noLeaveTableWrites: true,
      noPayrollEngineChanges: true,
    },
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(REPORT_DIR, `dry-run-report-${stamp}.json`);
  const mdPath = path.join(REPORT_DIR, `dry-run-report-${stamp}.md`);
  const latestJson = path.join(REPORT_DIR, "dry-run-report-latest.json");
  const latestMd = path.join(REPORT_DIR, "dry-run-report-latest.md");

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(latestJson, JSON.stringify(report, null, 2));

  const md = renderMarkdown(report);
  fs.writeFileSync(mdPath, md);
  fs.writeFileSync(latestMd, md);

  // Console: counts only — no salary/bank/PII
  console.log("\n=== DRY-RUN COMPLETE (no DB writes) ===");
  console.log(`Directory employees: ${report.employees.directoryTotal}`);
  console.log(`HRMS employees (active): ${report.employees.existingHrmsTotal}`);
  console.log(`ACTIVE (source people): ${report.employees.classification.ACTIVE_EMPLOYEE.length}`);
  console.log(`FORMER (excluded): ${report.employees.classification.FORMER_EMPLOYEE.length}`);
  console.log(`EXECUTIVE: ${report.employees.classification.EXECUTIVE.length}`);
  console.log(`UNMATCHED: ${report.employees.classification.UNMATCHED.length}`);
  console.log(`New employees to create: ${report.employees.newEmployeesToCreate.length}`);
  console.log(`Attendance filled cells: ${report.attendance.totalFilledCells}`);
  console.log(`Attendance plan INSERT: ${report.attendance.planCounts.insert}`);
  console.log(`Attendance SKIP identical: ${report.attendance.planCounts.skipIdentical}`);
  console.log(`Attendance conflicts: ${report.attendance.planCounts.conflicts}`);
  console.log(`Attendance excluded records: ${report.attendance.excludedAttendanceRecords}`);
  console.log(`Leave/attendance informational conflicts: ${report.attendance.leaveConflictCount}`);
  console.log(`Payroll plan rows: ${report.payroll.totalPlanRows}`);
  console.log(`Payroll excluded rows: ${report.payroll.excluded.length}`);
  console.log(`Payroll conflicts: ${report.payroll.conflicts.length}`);
  console.log(`Payslips can generate: ${report.payslips.canGenerate}`);
  console.log(`Bank conflicts: ${report.bank.conflicts.length}`);
  console.log(`Report: ${latestMd}`);
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# HR Data Migration — Dry-Run Report (corrected classifications)");
  lines.push("");
  lines.push(`Generated: ${report.meta.generatedAt}`);
  lines.push("");
  lines.push("**Mode: DRY_RUN — zero database writes.**");
  lines.push("");
  lines.push("## Decisions applied");
  lines.push("```json");
  lines.push(JSON.stringify(report.meta.decisions, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Person classification");
  lines.push(`- **ACTIVE_EMPLOYEE**: ${report.employees.classification.ACTIVE_EMPLOYEE.length}`);
  lines.push(`- **FORMER_EMPLOYEE**: ${report.employees.classification.FORMER_EMPLOYEE.length}`);
  lines.push(`- **EXECUTIVE**: ${report.employees.classification.EXECUTIVE.length}`);
  lines.push(`- **UNMATCHED**: ${report.employees.classification.UNMATCHED.length}`);
  lines.push("");
  lines.push("### ACTIVE EMPLOYEES");
  for (const e of report.employees.classification.ACTIVE_EMPLOYEE) {
    lines.push(`- ${e.sourceName} → ${e.employeeCode} (${e.status})`);
  }
  lines.push("");
  lines.push("### FORMER EMPLOYEES (excluded — no active create / payroll / payslip)");
  for (const e of report.employees.classification.FORMER_EMPLOYEE) {
    lines.push(
      `- **${e.name}** | sourceId=${e.sourceEmployeeId ?? "n/a"} | att=${e.affectedAttendanceRecords} | payroll=${e.affectedPayrollRecords} | payslip=${e.affectedPayslipRecords}`,
    );
    lines.push(`  - reason: ${e.reason}`);
    lines.push(`  - months: ${e.affectedMonths.join(", ") || "n/a"}`);
  }
  lines.push("");
  lines.push("### EXECUTIVES (preserve identity — no duplicate create / no role change)");
  for (const e of report.employees.classification.EXECUTIVE) {
    lines.push(
      `- **${e.name}** (${e.roleLabel ?? "executive"}) | linked=${e.linkedEmployeeCode ?? "NONE"} | importAttendance=${e.importAttendance} | att=${e.affectedAttendanceRecords} | payroll=${e.affectedPayrollRecords}`,
    );
    lines.push(`  - reason: ${e.reason}`);
    lines.push(`  - months: ${e.affectedMonths.join(", ") || "n/a"}`);
  }
  lines.push("");
  lines.push("### UNMATCHED / NEEDS REVIEW");
  if (!report.employees.classification.UNMATCHED.length) {
    lines.push("- (none)");
  } else {
    for (const e of report.employees.classification.UNMATCHED) {
      lines.push(
        `- **${e.name}** | att=${e.affectedAttendanceRecords} | payroll=${e.affectedPayrollRecords} | ${e.reason}`,
      );
    }
  }
  lines.push("");
  lines.push("## Employee directory actions (ACTIVE only)");
  lines.push(`- Directory total: **${report.employees.directoryTotal}**`);
  lines.push(`- Existing HRMS: **${report.employees.existingHrmsTotal}**`);
  lines.push(`- New to create: **${report.employees.newEmployeesToCreate.length}**`);
  lines.push(`- Already existing: **${report.employees.alreadyExisting.length}**`);
  lines.push("");
  lines.push("### New employees to create");
  for (const e of report.employees.newEmployeesToCreate) {
    lines.push(`- ${e.employeeCode} — ${e.fullName} (${e.email})`);
  }
  if (!report.employees.newEmployeesToCreate.length) lines.push("- (none)");
  lines.push("");
  lines.push("### Active seed check (Abhishek IF2026016 only — Fazil cancelled)");
  for (const s of report.employees.activeSeedChecks) {
    lines.push(
      `- ${s.employeeCode}: exists=${s.existsInDb} action=${s.action} name=${s.canonicalName ?? "n/a"}`,
    );
  }
  lines.push("");
  lines.push("## Attendance summary");
  for (const [month, data] of Object.entries(report.attendance.byMonth)) {
    lines.push(
      `- **${month}**: records=${data.records}, blanks=${data.blankCells}, employees=${data.employees}, empty=${data.empty}`,
    );
  }
  lines.push("");
  lines.push("### Status totals");
  lines.push("```json");
  lines.push(JSON.stringify(report.attendance.statusTotals, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("### Plan counts");
  lines.push("```json");
  lines.push(JSON.stringify(report.attendance.planCounts, null, 2));
  lines.push("```");
  lines.push("");
  lines.push(`Attendance conflicts: **${report.attendance.conflicts.length}**`);
  lines.push(
    `Leave informational conflicts (attendance leave w/o leave_request): **${report.attendance.leaveConflictCount}**`,
  );
  lines.push("");
  lines.push("## Payroll summary (Option 1 — Excel truth)");
  for (const [month, data] of Object.entries(report.payroll.byMonth)) {
    lines.push(`### ${month} (${data.employeeCount} employees)`);
    lines.push("| Code | Action | Salary | WD Salary | PT | Reimb | Final |");
    lines.push("|------|--------|--------|-----------|----|-------|-------|");
    for (const e of data.employees) {
      lines.push(
        `| ${e.employeeCode} | ${e.action} | ${e.salary ?? ""} | ${e.workingDaySalary ?? ""} | ${e.professionalTax ?? ""} | ${e.reimbursement ?? ""} | ${e.finalPayout ?? ""} |`,
      );
    }
    lines.push("");
  }
  lines.push(`Payroll conflicts: **${report.payroll.conflicts.length}**`);
  lines.push(`Payroll excluded source rows: **${report.payroll.excluded.length}**`);
  if (report.payroll.conflicts.length) {
    lines.push("```json");
    lines.push(JSON.stringify(report.payroll.conflicts, null, 2));
    lines.push("```");
  }
  lines.push("");
  lines.push("## Payslip summary");
  lines.push(`- Existing in scope: **${report.payslips.existingInScope.length}**`);
  lines.push(`- Can generate: **${report.payslips.canGenerate}**`);
  lines.push(`- Skip/review: **${report.payslips.skipOrReview}**`);
  lines.push(`- Blocked/defer: **${report.payslips.blocked}**`);
  lines.push("");
  lines.push("## Bank summary (no full account numbers)");
  lines.push("| Code | Exists | IFSC conflict | Account conflict | Action |");
  lines.push("|------|--------|---------------|------------------|--------|");
  for (const b of report.bank.plan) {
    lines.push(
      `| ${b.employeeCode} | ${b.bankRecordExists} | ${b.ifscConflict} | ${b.accountConflict} | ${b.actionRequired} |`,
    );
  }
  lines.push("");
  lines.push(`Bank conflicts: **${report.bank.conflicts.length}**`);
  if (report.bank.conflicts.length) {
    lines.push("```json");
    lines.push(JSON.stringify(report.bank.conflicts, null, 2));
    lines.push("```");
  }
  lines.push("");
  lines.push("## Proposed database changes");
  lines.push("```json");
  lines.push(JSON.stringify(report.proposedDatabaseChanges, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("---");
  lines.push("STOP — awaiting explicit approval before any database writes.");
  return lines.join("\n");
}

main().catch((error) => {
  console.error("Dry-run failed:", error.message);
  process.exit(1);
});
