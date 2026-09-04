export const DIRECTORY_HIDDEN_EMPLOYEE_CODES = new Set([
  "IF2026000",
  "IF-MGR-001",
  "IF2026016",
]);

export const DIRECTORY_INCLUDED_EMPLOYEE_CODES = ["IF2026009", "IF-PENDING-SA"] as const;
export const DIRECTORY_INCLUDED_EMPLOYEE_EMAILS = ["sumanth.reddy@ifranchise.in"] as const;

import {
  formatDesignationDisplay,
  normalizeEmployeeCode,
} from "@/lib/employees/designation-display";

export { normalizeEmployeeCode };

const DIRECTORY_TECHNOLOGY_DEPARTMENT = "Technology";

type DirectoryPersonName = {
  employeeCode?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  designationTitle?: string | null;
};

function directoryFullName(person?: DirectoryPersonName): string {
  return `${person?.firstName ?? ""} ${person?.lastName ?? ""}`.trim().toLowerCase();
}

function isDirectorySumanth(person?: DirectoryPersonName): boolean {
  const code = normalizeEmployeeCode(person?.employeeCode);
  if (code === "IF2026009" || code.startsWith("IF-PENDING-SA")) return true;

  const fullName = directoryFullName(person);
  return fullName.includes("sumanth") && fullName.includes("reddy");
}

export function isHiddenFromEmployeeDirectory(
  employeeCode: string | null | undefined,
  person?: DirectoryPersonName,
): boolean {
  if (DIRECTORY_HIDDEN_EMPLOYEE_CODES.has(normalizeEmployeeCode(employeeCode))) {
    return true;
  }

  const fullName = directoryFullName(person);
  if (!fullName) return false;

  if (
    fullName === "it team" ||
    fullName === "itteam" ||
    fullName.startsWith("it team")
  ) {
    return true;
  }

  if (fullName === "marketing manager") {
    return true;
  }

  const isGore = fullName.includes("gore");
  const isAbhisek =
    fullName.includes("abhisek") ||
    fullName.includes("abhishake") ||
    fullName.includes("abhishek");

  return isGore && isAbhisek;
}

/** Hidden from employee/department filter dropdowns across HRMS modules. */
export function isHiddenFromPeopleFilters(
  employeeCode: string | null | undefined,
  person?: DirectoryPersonName,
): boolean {
  if (isHiddenFromEmployeeDirectory(employeeCode, person)) return true;
  const designation = (person?.designationTitle ?? "").trim().toLowerCase();
  return designation === "marketing manager";
}

export function isExcludedFromTeamPayslips(
  employeeCode: string | null | undefined,
  person?: DirectoryPersonName,
): boolean {
  if (isHiddenFromEmployeeDirectory(employeeCode, person)) return true;

  const fullName = directoryFullName(person);
  const designation = (person?.designationTitle ?? "").trim().toLowerCase();
  if (designation === "marketing manager") return true;
  if (fullName.includes("abrar")) return true;
  if (fullName.includes("abdul") && (fullName.includes("khader") || fullName.includes("khadir"))) {
    return true;
  }
  return false;
}

export function directoryDesignationDisplay(
  title: string | null | undefined,
  code?: string | null,
  person?: DirectoryPersonName,
): string | null {
  const formatted = formatDesignationDisplay(title, { code, person });
  return formatted === "Team Member" && !(title ?? "").trim() ? null : formatted;
}

/** Directory-only: show Sumanth under Technology. */
export function directoryDepartmentOverride(
  person?: DirectoryPersonName,
): { name: string } | null {
  if (!isDirectorySumanth(person)) return null;
  return { name: DIRECTORY_TECHNOLOGY_DEPARTMENT };
}

/** Directory-only labels (does not rename departments in HR data). */
export function directoryDepartmentLabel(name: string | null | undefined): string | null {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return name ?? null;
  if (trimmed.toLowerCase() === "administration") return "C Suite";
  return trimmed;
}
