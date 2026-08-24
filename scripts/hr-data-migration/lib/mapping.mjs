import { normalizeName } from "./excel-attendance.mjs";

/**
 * Person classification for migration:
 * A ACTIVE_EMPLOYEE | B FORMER_EMPLOYEE | C EXECUTIVE | D UNMATCHED
 */

export const PERSON_CLASS = {
  ACTIVE: "ACTIVE_EMPLOYEE",
  FORMER: "FORMER_EMPLOYEE",
  EXECUTIVE: "EXECUTIVE",
  UNMATCHED: "UNMATCHED",
};

/** Former employees — exclude from active create / payroll / payslip import. */
export const FORMER_EMPLOYEES = {
  fazil: {
    category: PERSON_CLASS.FORMER,
    sourceEmployeeId: "IF2026008",
    displayName: "Fazil",
    reason:
      "Former employee — do not create IF2026008; do not import attendance/payroll/payslips as active records",
  },
  ehtesham: {
    category: PERSON_CLASS.FORMER,
    sourceEmployeeId: null,
    displayName: "Ehtesham",
    reason:
      "Former employee — do not create active employee; exclude attendance/payroll/payslips from import",
  },
};

/**
 * Executives — never create from Excel directory.
 * Link attendance only if an existing HRMS identity is verified.
 */
export const EXECUTIVES = {
  abdul: {
    category: PERSON_CLASS.EXECUTIVE,
    roleLabel: "CEO",
    sourceEmployeeId: null,
    displayName: "Abdul",
    /** Prefer match by email / known employee_code in live DB */
    matchHints: {
      emails: ["abdul@ifranchise.in"],
      employeeCodes: ["EMP-2026020"],
      nameIncludes: ["abdul"],
    },
    reason:
      "CEO / executive — preserve existing identity; never create duplicate from Excel; never change role/permissions",
  },
  abrar: {
    category: PERSON_CLASS.EXECUTIVE,
    roleLabel: "Co-founder",
    sourceEmployeeId: null,
    displayName: "Abrar",
    matchHints: {
      emails: [],
      employeeCodes: [],
      nameIncludes: ["abrar"],
    },
    reason:
      "Co-founder / executive — preserve existing identity if present; never create duplicate; never change role/permissions",
  },
};

/**
 * Approved attendance short-name → employee_code for ACTIVE employees only.
 * Fazil deliberately omitted (former). Executives resolved separately.
 */
export const APPROVED_ACTIVE_ALIASES = {
  om: "IF2025002",
  himani: "IF2026002",
  ekta: "IF2026001",
  akshita: "IF2026012",
  diksha: "IF2026011",
  dikhsha: "IF2026011",
  swetha: "IF2026010",
  sumanth: "IF2026009",
  "sneha mahajan": "IF2026014",
  sneha: "IF2026014",
  "prajjwal negi": "IF2026015",
  prajjwal: "IF2026015",
  "samit ali": "IF2026017",
  "syed samit ali": "IF2026017",
  "abhishek gore": "IF2026016",
  "abhisek gore": "IF2026016",
  abhishek: "IF2026016",
  "vivek rawat": "IF2026018",
  vivek: "IF2026018",
  "venupusa hemavathi": "IF2026019",
  "vennapusa hemavathi": "IF2026019",
  "shakshay gupta": "IF2026021",
  "shiwali singh": "IF2026020",
  "anmol prasad": "IF2026022",
};

function buildDirectoryIndex(directoryEmployees) {
  const byCode = new Map();
  const byEmail = new Map();
  for (const emp of directoryEmployees) {
    byCode.set(emp.employeeCode, emp);
    if (emp.email) byEmail.set(emp.email, emp);
  }
  return { byCode, byEmail };
}

function findExecutiveInDb(hints, dbEmployees) {
  if (!hints || !dbEmployees?.length) return null;

  for (const emp of dbEmployees) {
    const code = String(emp.employee_code ?? "").toUpperCase();
    const email = String(emp.email ?? "").toLowerCase();
    const full = `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.toLowerCase();

    if (hints.employeeCodes?.some((c) => c.toUpperCase() === code)) return emp;
    if (hints.emails?.some((e) => e.toLowerCase() === email)) return emp;
    if (hints.nameIncludes?.some((n) => full.includes(n.toLowerCase()))) return emp;
  }
  return null;
}

/**
 * Resolve a spreadsheet person to a migration classification + optional HRMS link.
 */
export function resolvePersonIdentity(sourceName, directoryEmployees, dbEmployees = []) {
  const normalized = normalizeName(sourceName);
  const first = normalized.split(" ")[0];

  const former =
    FORMER_EMPLOYEES[normalized] ?? FORMER_EMPLOYEES[first] ?? null;
  if (former) {
    return {
      category: PERSON_CLASS.FORMER,
      status: "EXCLUDED_FORMER",
      sourceName,
      normalizedName: normalized,
      employeeCode: former.sourceEmployeeId,
      importAttendance: false,
      importPayroll: false,
      importPayslip: false,
      createEmployee: false,
      reason: former.reason,
      displayName: former.displayName,
    };
  }

  const executive =
    EXECUTIVES[normalized] ?? EXECUTIVES[first] ?? null;
  if (executive) {
    const existing = findExecutiveInDb(executive.matchHints, dbEmployees);
    return {
      category: PERSON_CLASS.EXECUTIVE,
      status: existing ? "EXECUTIVE_LINKED" : "EXECUTIVE_NO_HRMS_IDENTITY",
      sourceName,
      normalizedName: normalized,
      employeeCode: existing ? String(existing.employee_code).toUpperCase() : null,
      employeeId: existing?.id ?? null,
      roleLabel: executive.roleLabel,
      canonicalName: existing
        ? `${existing.first_name} ${existing.last_name}`.trim()
        : null,
      importAttendance: Boolean(existing),
      importPayroll: false,
      importPayslip: false,
      createEmployee: false,
      preserveRole: true,
      reason: existing
        ? `${executive.reason}. Linked to existing ${executive.roleLabel} identity ${existing.employee_code} (roles/permissions untouched).`
        : `${executive.reason}. No existing HRMS employee found — attendance/payroll excluded (do not create).`,
      displayName: executive.displayName,
    };
  }

  const aliasCode =
    APPROVED_ACTIVE_ALIASES[normalized] ??
    APPROVED_ACTIVE_ALIASES[first] ??
    null;

  const index = buildDirectoryIndex(directoryEmployees);

  if (aliasCode) {
    const dir = index.byCode.get(aliasCode) ?? null;
    return {
      category: PERSON_CLASS.ACTIVE,
      status: "MATCHED_ACTIVE",
      sourceName,
      normalizedName: normalized,
      employeeCode: aliasCode,
      directoryEmployee: dir,
      importAttendance: true,
      importPayroll: true,
      importPayslip: true,
      createEmployee: !dir ? false : undefined, // decided later vs DB
      matchMethod: dir ? "approved_alias+directory" : "approved_alias",
      reason: dir
        ? `Active employee alias ${aliasCode} verified in Employee Directory`
        : `Active employee alias ${aliasCode} (verify against HRMS)`,
      displayName: sourceName,
    };
  }

  const exact = directoryEmployees.filter(
    (e) => normalizeName(e.fullName) === normalized,
  );
  if (exact.length === 1) {
    return {
      category: PERSON_CLASS.ACTIVE,
      status: "MATCHED_ACTIVE",
      sourceName,
      normalizedName: normalized,
      employeeCode: exact[0].employeeCode,
      directoryEmployee: exact[0],
      importAttendance: true,
      importPayroll: true,
      importPayslip: true,
      matchMethod: "directory_exact_name",
      reason: "Exact unique full-name match in Directory (active candidate)",
      displayName: exact[0].fullName,
    };
  }
  if (exact.length > 1) {
    return {
      category: PERSON_CLASS.UNMATCHED,
      status: "AMBIGUOUS",
      sourceName,
      normalizedName: normalized,
      employeeCode: null,
      candidates: exact.map((e) => e.employeeCode),
      importAttendance: false,
      importPayroll: false,
      importPayslip: false,
      createEmployee: false,
      reason: "Multiple directory employees share this exact name — needs review",
      displayName: sourceName,
    };
  }

  return {
    category: PERSON_CLASS.UNMATCHED,
    status: "UNMATCHED",
    sourceName,
    normalizedName: normalized,
    employeeCode: null,
    importAttendance: false,
    importPayroll: false,
    importPayslip: false,
    createEmployee: false,
    reason: "No approved active alias and no unique directory name match",
    displayName: sourceName,
  };
}

/** @deprecated use resolvePersonIdentity */
export function resolveAttendanceIdentity(sourceName, directoryEmployees, dbEmployees = []) {
  return resolvePersonIdentity(sourceName, directoryEmployees, dbEmployees);
}

/**
 * Directory create list — ACTIVE employees only (never former/executive).
 */
export function classifyDirectoryEmployees(
  directoryEmployees,
  dbEmployeesByCode,
  dbEmployeesByEmail,
) {
  const toCreate = [];
  const alreadyExisting = [];
  const ambiguous = [];

  for (const emp of directoryEmployees) {
    const byCode = dbEmployeesByCode.get(emp.employeeCode) ?? null;
    const byEmail = emp.email ? dbEmployeesByEmail.get(emp.email) ?? null : null;

    if (byCode) {
      alreadyExisting.push({
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        dbId: byCode.id,
        category: PERSON_CLASS.ACTIVE,
        action: "SKIP_CREATE",
        note: "Exists by employee_code — do not overwrite",
      });
      continue;
    }

    if (byEmail && byEmail.employee_code !== emp.employeeCode) {
      ambiguous.push({
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        email: emp.email,
        conflictCode: byEmail.employee_code,
        dbId: byEmail.id,
        category: PERSON_CLASS.UNMATCHED,
        action: "REVIEW",
        note: "Email exists on a different employee_code — do not auto-create",
      });
      continue;
    }

    if (byEmail && byEmail.employee_code === emp.employeeCode) {
      alreadyExisting.push({
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        dbId: byEmail.id,
        category: PERSON_CLASS.ACTIVE,
        action: "SKIP_CREATE",
        note: "Exists by email with matching code",
      });
      continue;
    }

    toCreate.push({
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      email: emp.email,
      designation: emp.designation,
      dateOfJoining: emp.dateOfJoining,
      category: PERSON_CLASS.ACTIVE,
      action: "CREATE",
      note: "Missing from HRMS — create as ACTIVE employee from Directory",
    });
  }

  return { toCreate, alreadyExisting, ambiguous };
}

export function accountsEqual(a, b) {
  const na = String(a ?? "").replace(/\s+/g, "");
  const nb = String(b ?? "").replace(/\s+/g, "");
  return na === nb;
}

export function ifscEqual(a, b) {
  return (
    String(a ?? "").replace(/\s+/g, "").toUpperCase() ===
    String(b ?? "").replace(/\s+/g, "").toUpperCase()
  );
}

export function isPlaceholderAccount(accountNumber) {
  const n = String(accountNumber ?? "");
  return n.startsWith("PENDING-") || n.length === 0;
}
