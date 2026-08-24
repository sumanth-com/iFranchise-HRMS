import XLSX from "xlsx";

function cellToString(value) {
  if (value == null) return "";
  if (typeof value === "number") {
    // Excel may store phones/ids as numbers — keep integer text without scientific notation
    if (Number.isFinite(value) && Math.abs(value) >= 1e11) {
      return String(Math.trunc(value));
    }
    return String(value);
  }
  return String(value).trim();
}

function normalizeCode(value) {
  return cellToString(value).replace(/\s+/g, "").toUpperCase();
}

function normalizeEmail(value) {
  return cellToString(value).toLowerCase();
}

function excelSerialOrDateToIso(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Prefer calendar Y-M-D in local parts to avoid UTC day-shift for IST sheets
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel serial → UTC date components (Sheets store civil dates)
    const utcDays = Math.floor(value - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const text = cellToString(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  return text || null;
}

/**
 * Parse Employee Directory.xlsx — Emp.Details + Bank Details.
 * Bank account numbers are kept in memory for conflict hashing only;
 * reports must never print full account numbers.
 */
export function parseEmployeeDirectory(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const detailsSheet = workbook.Sheets["Emp.Details"];
  const bankSheet = workbook.Sheets["Bank Details"];
  if (!detailsSheet) throw new Error("Employee Directory missing sheet Emp.Details");
  if (!bankSheet) throw new Error("Employee Directory missing sheet Bank Details");

  const detailRows = XLSX.utils.sheet_to_json(detailsSheet, {
    header: 1,
    defval: null,
    raw: true,
  });
  const bankRows = XLSX.utils.sheet_to_json(bankSheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  const employees = [];
  for (let i = 1; i < detailRows.length; i += 1) {
    const row = detailRows[i];
    if (!row || !row[1]) continue;
    const employeeCode = normalizeCode(row[1]);
    if (!employeeCode.startsWith("IF")) continue;
    employees.push({
      sourceRow: i + 1,
      employeeCode,
      fullName: cellToString(row[2]),
      designation: cellToString(row[3]),
      mobile: cellToString(row[4]),
      email: normalizeEmail(row[5]),
      dateOfJoining: excelSerialOrDateToIso(row[6]),
      probationEnd: excelSerialOrDateToIso(row[7]),
      // Sensitive — not written to reports
      _aadhaarPresent: Boolean(cellToString(row[8])),
      _panPresent: Boolean(cellToString(row[9])),
      _dobPresent: Boolean(excelSerialOrDateToIso(row[10])),
      earnedLeave: row[11] == null || row[11] === "" ? null : Number(row[11]),
    });
  }

  const banksByCode = new Map();
  for (let i = 1; i < bankRows.length; i += 1) {
    const row = bankRows[i];
    if (!row || !row[2]) continue;
    const employeeCode = normalizeCode(row[2]);
    const accountRaw = cellToString(row[3]).replace(/\s+/g, "");
    const ifsc = cellToString(row[4]).replace(/\s+/g, "").toUpperCase();
    banksByCode.set(employeeCode, {
      employeeCode,
      fullName: cellToString(row[1]),
      accountNumber: accountRaw,
      ifscCode: ifsc,
      accountLast4: accountRaw ? accountRaw.slice(-4) : null,
    });
  }

  return {
    sheetNames: workbook.SheetNames,
    employees,
    banksByCode,
  };
}

export { cellToString, normalizeCode, normalizeEmail, excelSerialOrDateToIso };
