import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXCEL_PATH = path.join(ROOT, "src/assets/Attendence Sheet 2026.xlsx");
const OUTPUT_PATH = path.join(
  ROOT,
  "supabase/migrations/20260704170000_seed_attendance_from_excel_2026.sql",
);

const ORG_ID = "a0000000-0000-4000-8000-000000000001";

const EMPLOYEE_MAP = new Map(
  Object.entries({
    om: "e1000000-0000-4000-8000-000000000002",
    himani: "e1000000-0000-4000-8000-000000000003",
    fazil: "e1000000-0000-4000-8000-000000000004",
    ekta: "e1000000-0000-4000-8000-000000000001",
    swetha: "e1000000-0000-4000-8000-000000000005",
    sumanth: "e1000000-0000-4000-8000-000000000007",
    akshita: "e1000000-0000-4000-8000-000000000008",
    sneha: "e1000000-0000-4000-8000-000000000009",
    "sneha mahajan": "e1000000-0000-4000-8000-000000000009",
    prajjwal: "e1000000-0000-4000-8000-000000000010",
    "prajjwal negi": "e1000000-0000-4000-8000-000000000010",
  }),
);

function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function resolveEmployeeId(name) {
  const normalized = normalizeName(name);
  if (!normalized) return null;

  if (EMPLOYEE_MAP.has(normalized)) {
    return EMPLOYEE_MAP.get(normalized);
  }

  const firstToken = normalized.split(" ")[0];
  if (EMPLOYEE_MAP.has(firstToken)) {
    return EMPLOYEE_MAP.get(firstToken);
  }

  for (const [key, id] of EMPLOYEE_MAP.entries()) {
    if (normalized.includes(key) || key.includes(firstToken)) {
      return id;
    }
  }

  return null;
}

function excelSerialToIso(serial) {
  if (typeof serial !== "number" || Number.isNaN(serial)) return null;
  const utcDays = Math.floor(serial - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  return date.toISOString().slice(0, 10);
}

function mapStatus(code) {
  const value = String(code ?? "").trim().toUpperCase();
  if (!value) return null;

  switch (value) {
    case "P":
      return "present";
    case "H":
      return "week_off";
    case "CL":
    case "PL":
      return "on_leave";
    case "LOP":
    case "A":
      return "absent";
    default:
      return null;
  }
}

function findHeaderRow(rows) {
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!Array.isArray(row)) continue;
    const firstCell = String(row[0] ?? "").trim().toLowerCase();
    if (firstCell === "sl.no." || firstCell === "sl.no") {
      return index;
    }
  }
  return -1;
}

function parseSheet(sheetName, rows) {
  const headerIndex = findHeaderRow(rows);
  if (headerIndex < 0) return [];

  const header = rows[headerIndex];
  const dateColumns = [];

  for (let col = 3; col < header.length; col += 1) {
    const serial = header[col];
    const isoDate = excelSerialToIso(serial);
    if (isoDate) {
      dateColumns.push({ col, date: isoDate });
    }
  }

  const records = [];
  const skippedNames = new Set();

  for (let rowIndex = headerIndex + 2; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!Array.isArray(row)) continue;

    const serial = row[0];
    const name = row[1];
    const nameText = String(name ?? "").trim();

    if (typeof serial !== "number" || serial < 1 || serial > 100) continue;
    if (!nameText) continue;
    if (/^\d+(\.\d+)?$/.test(nameText)) continue;
    if (nameText.toUpperCase().includes("PAY ROLL")) break;

    const employeeId = resolveEmployeeId(name);
    if (!employeeId) {
      skippedNames.add(String(name).trim());
      continue;
    }

    for (const { col, date } of dateColumns) {
      const status = mapStatus(row[col]);
      if (!status) continue;

      records.push({ employeeId, date, status });
    }
  }

  return { records, skippedNames };
}

function sqlValue(record) {
  const { employeeId, date, status } = record;
  const isPresent = status === "present";

  const checkIn = isPresent
    ? `((DATE '${date}' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz`
    : "NULL::timestamptz";
  const checkOut = isPresent
    ? `((DATE '${date}' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz`
    : "NULL::timestamptz";
  const workHours = isPresent ? "9" : "0";

  return `(
  '${ORG_ID}'::uuid,
  '${employeeId}'::uuid,
  DATE '${date}',
  ${checkIn},
  ${checkOut},
  '${status}'::hrms.attendance_status,
  ${workHours},
  'active'::hrms.record_status
)`;
}

const workbook = XLSX.readFile(EXCEL_PATH);
const allRecords = [];
const allSkipped = new Set();

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const parsed = parseSheet(sheetName, rows);

  if (Array.isArray(parsed)) continue;

  allRecords.push(...parsed.records);
  parsed.skippedNames.forEach((name) => allSkipped.add(name));
}

const uniqueKey = (record) =>
  `${record.employeeId}|${record.date}`;
const deduped = new Map();

for (const record of allRecords) {
  deduped.set(uniqueKey(record), record);
}

const finalRecords = [...deduped.values()].sort((a, b) => {
  if (a.date === b.date) return a.employeeId.localeCompare(b.employeeId);
  return a.date.localeCompare(b.date);
});

const chunks = [];
const chunkSize = 100;

for (let index = 0; index < finalRecords.length; index += chunkSize) {
  chunks.push(finalRecords.slice(index, index + chunkSize));
}

let sql = `-- Seed attendance from legacy Excel sheet (Apr–Jul 2026)
-- Source: src/assets/Attendence Sheet 2026.xlsx
-- Idempotent: safe to re-run
-- Skipped employees not in HRMS: ${[...allSkipped].join(", ") || "none"}

`;

for (const chunk of chunks) {
  sql += `INSERT INTO hrms.attendance (
  organization_id,
  branch_id,
  employee_id,
  attendance_date,
  check_in_at,
  check_out_at,
  attendance_status,
  work_hours,
  status
)
SELECT
  v.organization_id,
  e.branch_id,
  v.employee_id,
  v.attendance_date,
  v.check_in_at,
  v.check_out_at,
  v.attendance_status,
  v.work_hours,
  v.status
FROM (
  VALUES
${chunk.map((record) => sqlValue(record)).join(",\n")}
) AS v (
  organization_id,
  employee_id,
  attendance_date,
  check_in_at,
  check_out_at,
  attendance_status,
  work_hours,
  status
)
JOIN hrms.employees e ON e.id = v.employee_id
ON CONFLICT (employee_id, attendance_date) DO UPDATE
SET
  check_in_at = EXCLUDED.check_in_at,
  check_out_at = EXCLUDED.check_out_at,
  attendance_status = EXCLUDED.attendance_status,
  work_hours = EXCLUDED.work_hours,
  status = EXCLUDED.status,
  deleted_at = NULL,
  updated_at = public.utc_now();

`;
}

fs.writeFileSync(OUTPUT_PATH, sql, "utf8");

console.log(`Generated ${finalRecords.length} attendance rows -> ${OUTPUT_PATH}`);
if (allSkipped.size > 0) {
  console.log(`Skipped unknown employees: ${[...allSkipped].join(", ")}`);
}
