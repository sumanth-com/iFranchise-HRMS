import XLSX from "xlsx";
import {
  cellToString,
  excelSerialOrDateToIso,
} from "./excel-directory.mjs";

export const ATTENDANCE_STATUS_MAP = {
  P: "present",
  A: "absent",
  LOP: "absent",
  CL: "on_leave",
  PL: "on_leave",
  EL: "on_leave",
  SL: "on_leave",
  ML: "on_leave",
  CO: "on_leave",
  WO: "week_off",
  WOFF: "week_off",
  HD: "holiday",
  NH: "holiday",
  HO: "holiday",
  H: "week_off",
};

export const MONTH_SHEETS = [
  "APR-2026",
  "MAY-2026",
  "JUNE-2026",
  "JULY-2026",
  "AUG-2026",
  "SEPT-2026",
];

const MONTH_META = {
  "APR-2026": { year: 2026, month: 4, key: "2026-04-01" },
  "MAY-2026": { year: 2026, month: 5, key: "2026-05-01" },
  "JUNE-2026": { year: 2026, month: 6, key: "2026-06-01" },
  "JULY-2026": { year: 2026, month: 7, key: "2026-07-01" },
  "AUG-2026": { year: 2026, month: 8, key: "2026-08-01" },
  "SEPT-2026": { year: 2026, month: 9, key: "2026-09-01" },
};

function normalizeName(value) {
  return cellToString(value).toLowerCase().replace(/\s+/g, " ");
}

function findHeaderRow(rows) {
  for (let index = 0; index < Math.min(rows.length, 15); index += 1) {
    const first = cellToString(rows[index]?.[0]).toLowerCase().replace(/\s+/g, "");
    if (first === "sl.no." || first === "sl.no") return index;
  }
  return -1;
}

function isSummaryLabel(value) {
  const label = cellToString(value).toLowerCase();
  return [
    "present",
    "absent",
    "holiday",
    "cl",
    "pl",
    "el",
    "lop",
    "cl /pl",
    "total working days",
    "salary",
    "working day salary",
    "professional tax",
    "amount after pt",
    "reimbursement",
    "reimbursement ",
    "final payout",
    "per day",
    "per day ",
  ].includes(label);
}

function normalizeSummaryKey(label) {
  const raw = cellToString(label).toLowerCase().replace(/\s+/g, " ").trim();
  const map = {
    present: "present",
    absent: "absent",
    holiday: "holiday",
    cl: "cl",
    pl: "pl",
    el: "el",
    lop: "lop",
    "cl /pl": "cl_pl",
    "total working days": "totalWorkingDays",
    salary: "salary",
    "working day salary": "workingDaySalary",
    "professional tax": "professionalTax",
    "amount after pt": "amountAfterPt",
    reimbursement: "reimbursement",
    "final payout": "finalPayout",
    "per day": "perDay",
  };
  return map[raw] ?? null;
}

function weekdayFromIso(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function mapAttendanceCode(raw, isoDate) {
  const sourceCode = cellToString(raw).toUpperCase().replace(/\s+/g, "");
  if (!sourceCode) return { sourceCode: "", mappedStatus: null, unknown: false, skip: true };
  if (/^\d+(\.\d+)?$/.test(sourceCode)) {
    return { sourceCode, mappedStatus: null, unknown: false, skip: true };
  }
  if (sourceCode === "H") {
    const mappedStatus = weekdayFromIso(isoDate) === 0 ? "week_off" : "holiday";
    return { sourceCode, mappedStatus, unknown: false, skip: false };
  }
  const mappedStatus = ATTENDANCE_STATUS_MAP[sourceCode] ?? null;
  return {
    sourceCode,
    mappedStatus,
    unknown: !mappedStatus,
    skip: false,
  };
}

function canonicalMonthSheetName(sheetName) {
  const normalized = cellToString(sheetName).toUpperCase().replace(/\s+/g, "");
  const aliases = {
    "APR-2026": "APR-2026",
    "APRIL-2026": "APR-2026",
    "MAY-2026": "MAY-2026",
    "JUN-2026": "JUNE-2026",
    "JUNE-2026": "JUNE-2026",
    "JUL-2026": "JULY-2026",
    "JULY-2026": "JULY-2026",
    "AUG-2026": "AUG-2026",
    "AUGUST-2026": "AUG-2026",
    "SEP-2026": "SEPT-2026",
    "SEPT-2026": "SEPT-2026",
    "SEPTEMBER-2026": "SEPT-2026",
  };
  return aliases[normalized] ?? null;
}

function parseSerial(value) {
  const n = typeof value === "number" ? value : Number(cellToString(value));
  return Number.isFinite(n) ? n : NaN;
}

function parseEmployeeRows(sheetName, rows) {
  const headerIndex = findHeaderRow(rows);
  if (headerIndex < 0) {
    return {
      sheetName,
      empty: true,
      employees: [],
      attendanceRecords: [],
      payrollRecords: [],
      blankCells: 0,
      dayCells: 0,
      statusCounts: {},
      dateRange: null,
    };
  }

  const header = rows[headerIndex];
  const dateColumns = [];
  const summaryColumns = [];

  for (let col = 3; col < header.length; col += 1) {
    const iso = excelSerialOrDateToIso(header[col]);
    if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      dateColumns.push({ col, date: iso });
      continue;
    }
    if (isSummaryLabel(header[col])) {
      const key = normalizeSummaryKey(header[col]);
      if (key) summaryColumns.push({ col, key });
    }
  }

  const employees = [];
  const attendanceRecords = [];
  const payrollRecords = [];
  const statusCounts = {};
  let blankCells = 0;
  let dayCells = 0;

  for (let rowIndex = headerIndex + 2; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!Array.isArray(row)) continue;

    const serial = parseSerial(row[0]);
    const nameText = cellToString(row[1]);
    if (nameText.toUpperCase().includes("PAY ROLL")) break;
    if (!Number.isFinite(serial) || serial < 1 || serial > 100) continue;
    if (!nameText || /^\d+(\.\d+)?$/.test(nameText)) continue;

    const designation = cellToString(row[2]);
    const sourceName = nameText;
    const normalized = normalizeName(sourceName);

    const dayStatuses = [];
    for (const { col, date } of dateColumns) {
      dayCells += 1;
      const raw = row[col];
      if (raw == null || cellToString(raw) === "") {
        blankCells += 1;
        continue;
      }
      const mapped = mapAttendanceCode(raw, date);
      if (mapped.skip) continue;
      statusCounts[mapped.sourceCode] = (statusCounts[mapped.sourceCode] ?? 0) + 1;
      dayStatuses.push({
        date,
        sourceCode: mapped.sourceCode,
        mappedStatus: mapped.mappedStatus,
        unknown: mapped.unknown,
      });
      attendanceRecords.push({
        sheetName,
        sourceName,
        normalizedName: normalized,
        designation,
        date,
        sourceCode: mapped.sourceCode,
        mappedStatus: mapped.mappedStatus,
        notes: mapped.mappedStatus
          ? `src:${mapped.sourceCode}`
          : `src:UNKNOWN:${mapped.sourceCode}`,
        unknown: mapped.unknown,
      });
    }

    const summary = {};
    for (const { col, key } of summaryColumns) {
      const value = row[col];
      if (value == null || cellToString(value) === "") {
        summary[key] = null;
      } else if (typeof value === "number") {
        summary[key] = value;
      } else {
        const num = Number(cellToString(value).replace(/,/g, ""));
        summary[key] = Number.isFinite(num) ? num : cellToString(value);
      }
    }

    employees.push({
      sheetName,
      sl: serial,
      sourceName,
      normalizedName: normalized,
      designation,
      dayStatuses,
      summary,
    });

    const hasPayrollSignal =
      summary.salary != null ||
      summary.workingDaySalary != null ||
      summary.finalPayout != null ||
      summary.professionalTax != null;

    if (hasPayrollSignal) {
      payrollRecords.push({
        sheetName,
        payrollMonth: MONTH_META[sheetName]?.key ?? null,
        sourceName,
        normalizedName: normalized,
        designation,
        present: summary.present ?? null,
        absent: summary.absent ?? null,
        holiday: summary.holiday ?? null,
        cl: summary.cl ?? summary.cl_pl ?? null,
        pl: summary.pl ?? null,
        el: summary.el ?? null,
        lop: summary.lop ?? null,
        totalWorkingDays: summary.totalWorkingDays ?? null,
        salary: summary.salary ?? null,
        workingDaySalary: summary.workingDaySalary ?? null,
        professionalTax: summary.professionalTax ?? null,
        amountAfterPt: summary.amountAfterPt ?? null,
        reimbursement: summary.reimbursement ?? null,
        finalPayout: summary.finalPayout ?? null,
        perDay: summary.perDay ?? null,
        source: "row_columns",
      });
    }
  }

  return {
    sheetName,
    empty: false,
    employees,
    attendanceRecords,
    payrollRecords,
    blankCells,
    dayCells,
    statusCounts,
    dateRange:
      dateColumns.length > 0
        ? { from: dateColumns[0].date, to: dateColumns.at(-1).date, days: dateColumns.length }
        : null,
    summaryColumnKeys: summaryColumns.map((c) => c.key),
  };
}

function parseAprilPayrollBlock(rows) {
  const records = [];
  let inBlock = false;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const a = cellToString(row[0]).toUpperCase();
    if (a.includes("PAY ROLL")) {
      inBlock = true;
      continue;
    }
    if (!inBlock) continue;

    // Pattern: col0 label, col1 value OR col2 name, col3 payout
    const name = cellToString(row[2]);
    const payout = row[3];
    if (name && !name.toUpperCase().includes("PAY") && payout != null && payout !== "") {
      const amount = typeof payout === "number" ? payout : Number(cellToString(payout));
      if (Number.isFinite(amount)) {
        records.push({
          sheetName: "APR-2026",
          payrollMonth: "2026-04-01",
          sourceName: name,
          normalizedName: normalizeName(name),
          designation: null,
          present: null,
          absent: null,
          holiday: null,
          cl: null,
          pl: null,
          el: null,
          lop: null,
          totalWorkingDays: null,
          salary: null,
          workingDaySalary: null,
          professionalTax: null,
          amountAfterPt: null,
          reimbursement: null,
          finalPayout: amount,
          perDay: null,
          source: "april_pay_roll_block",
        });
      }
    }
  }
  return records;
}

export function parseAttendanceWorkbook(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheets = {};
  const allAttendance = [];
  const allPayroll = [];
  const allEmployeesByMonth = {};

  const sheetNameByCanonical = new Map();
  for (const actualName of workbook.SheetNames) {
    const canonical = canonicalMonthSheetName(actualName);
    if (canonical) sheetNameByCanonical.set(canonical, actualName);
  }

  for (const sheetName of MONTH_SHEETS) {
    const actualName = sheetNameByCanonical.get(sheetName) ?? sheetName;
    const sheet = workbook.Sheets[actualName];
    if (!sheet) {
      sheets[sheetName] = { sheetName, empty: true, missing: true };
      continue;
    }
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
    const parsed = parseEmployeeRows(sheetName, rows);
    sheets[sheetName] = parsed;
    allAttendance.push(...parsed.attendanceRecords);
    allPayroll.push(...parsed.payrollRecords);
    allEmployeesByMonth[sheetName] = parsed.employees;

    if (sheetName === "APR-2026") {
      const aprilBlock = parseAprilPayrollBlock(rows);
      allPayroll.push(...aprilBlock);
      sheets[sheetName].aprilPayrollBlock = aprilBlock;
    }
  }

  return {
    sheetNames: workbook.SheetNames,
    monthSheets: MONTH_SHEETS,
    sheets,
    attendanceRecords: allAttendance,
    payrollRecords: allPayroll,
    employeesByMonth: allEmployeesByMonth,
    monthMeta: MONTH_META,
  };
}

export { normalizeName, MONTH_META };
