import { isHiddenFromPeopleFilters, normalizeEmployeeCode } from "@/lib/employee/directory-listing";
import {
  DIRECTORY_INCLUDED_EMPLOYEE_CODES,
  DIRECTORY_INCLUDED_EMPLOYEE_EMAILS,
} from "@/lib/employee/directory-listing";
import {
  isAppHiddenEmployeeEmail,
  isEmployeeAppVisible,
  normalizeEmployeeEmail,
} from "@/lib/employees/app-hidden";
import {
  IT_SYSTEM_ACCOUNT_EMAIL,
  isItSystemAccount,
} from "@/lib/employees/it-system-account";

type ProvisioningDirectoryPerson = {
  email?: string | null;
  employeeCode?: string | null;
  employee_code?: string | null;
  firstName?: string | null;
  first_name?: string | null;
  lastName?: string | null;
  last_name?: string | null;
  designationTitle?: string | null;
  app_hidden_at?: string | null;
  deleted_at?: string | null;
};

function personFromRow(row: ProvisioningDirectoryPerson) {
  return {
    email: row.email ?? null,
    employeeCode: row.employeeCode ?? row.employee_code ?? null,
    firstName: row.firstName ?? row.first_name ?? null,
    lastName: row.lastName ?? row.last_name ?? null,
    designationTitle: row.designationTitle ?? null,
  };
}

/** IT system account: keep login/portal switching; exclude from workforce UIs. */
export function isItSystemProvisioningAccount(email: string | null | undefined) {
  return isItSystemAccount({ email });
}

export function isDirectoryIncludedProvisioningEmployee(
  row: ProvisioningDirectoryPerson,
): boolean {
  const code = normalizeEmployeeCode(row.employeeCode ?? row.employee_code);
  if (DIRECTORY_INCLUDED_EMPLOYEE_CODES.includes(code as (typeof DIRECTORY_INCLUDED_EMPLOYEE_CODES)[number])) {
    return true;
  }
  const email = normalizeEmployeeEmail(row.email);
  return (DIRECTORY_INCLUDED_EMPLOYEE_EMAILS as readonly string[]).includes(email);
}

export function isUpcomingProvisioningEmployee(row: ProvisioningDirectoryPerson): boolean {
  const code = normalizeEmployeeCode(row.employeeCode ?? row.employee_code);
  return code.startsWith("IF-PENDING");
}

export function shouldIncludeInUserProvisioningList(
  row: ProvisioningDirectoryPerson,
): boolean {
  if (
    !isEmployeeAppVisible({
      email: row.email,
      app_hidden_at: row.app_hidden_at,
      deleted_at: row.deleted_at,
    })
  ) {
    return false;
  }

  if (isDirectoryIncludedProvisioningEmployee(row)) {
    return true;
  }

  if (isUpcomingProvisioningEmployee(row)) {
    return true;
  }

  return !isHiddenFromPeopleFilters(
    row.employeeCode ?? row.employee_code,
    personFromRow(row),
  );
}

export function isProvisioningDirectoryRoleCode(
  roleCode: string | null | undefined,
  directoryRoleCodes: Set<string>,
): boolean {
  const code = String(roleCode ?? "").toLowerCase();
  if (isSuperAdminProvisioningRole(code)) return true;
  return directoryRoleCodes.has(code);
}

const MANAGER_ROLE = "manager";
/** High-level roles that may also be selected as reporting managers in User Provisioning. */
const PROVISIONING_MANAGER_LOOKUP_ROLE_CODES = new Set([
  MANAGER_ROLE,
  "ceo",
  "co_founder",
  "founder",
]);
/** HR contact selectors: HR portal roles only — not super_admin system accounts. */
const HR_CONTACT_ROLE_CODES = new Set(["hr_admin", "hr_executive"]);

export function isSuperAdminProvisioningRole(roleCode: string | null | undefined) {
  return String(roleCode ?? "").toLowerCase() === "super_admin";
}

/** Roles eligible in the User Provisioning Manager dropdown (managers + CEO/executives). */
export function isProvisioningManagerRole(roleCode: string | null | undefined) {
  return PROVISIONING_MANAGER_LOOKUP_ROLE_CODES.has(String(roleCode ?? "").toLowerCase());
}

/** System / shell accounts that must never appear as selectable reporting managers.
 * Real people (e.g. HR admins who also manage staff) are eligible from role/report data.
 */
const MANAGER_LOOKUP_EXCLUDED_EMAILS = new Set([
  IT_SYSTEM_ACCOUNT_EMAIL,
  "ifranchisehr@gmail.com",
  "ifranchiseemployee@gmail.com",
]);

/**
 * True when this person must be hidden from the User Provisioning Manager dropdown
 * and must not be shown as someone’s Manager on provisioning cards.
 * Does not change roles, HR-contact lookups, or Manager Portal team logic.
 */
export function isExcludedFromProvisioningManagerLookup(person: {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  employeeCode?: string | null;
}): boolean {
  if (isItSystemProvisioningAccount(person.email)) return true;
  if (isAppHiddenEmployeeEmail(person.email)) return true;

  const email = normalizeEmployeeEmail(person.email);
  if (email && MANAGER_LOOKUP_EXCLUDED_EMAILS.has(email)) return true;

  const fullName = `${person.firstName ?? ""} ${person.lastName ?? ""}`
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  const compactName = fullName.replace(/\s+/g, "");
  if (
    fullName === "it team" ||
    compactName === "itteam" ||
    fullName === "ifranchise hr" ||
    fullName === "ifranchisehr" ||
    fullName === "ifranchisehr employee" ||
    compactName === "ifranchisehremployee" ||
    fullName.includes("ifranchise hr") ||
    compactName.includes("ifranchisehr")
  ) {
    return true;
  }

  return false;
}

/**
 * Manager dropdown eligibility from live employee/role data:
 * - classic manager/executive roles, or
 * - people who currently have at least one direct report.
 * Shell/IT accounts stay excluded. HR contact list is unchanged.
 */
export function isProvisioningManagerLookupCandidate(input: {
  roleCode: string | null | undefined;
  employeeId: string;
  managerIdsWithReports: ReadonlySet<string>;
}): boolean {
  if (isProvisioningManagerRole(input.roleCode)) return true;
  return input.managerIdsWithReports.has(input.employeeId);
}

export function isProvisioningHrRole(roleCode: string | null | undefined) {
  return HR_CONTACT_ROLE_CODES.has(String(roleCode ?? "").toLowerCase());
}

export function isHrPortalProvisioningRole(roleCode: string | null | undefined) {
  const code = String(roleCode ?? "").toLowerCase();
  return code === "super_admin" || isProvisioningHrRole(code);
}

/** Shell / seed profiles (e.g. Marketing Manager) and app-hidden duplicates must not
 * appear in User Provisioning lists or manager/HR contact selectors.
 */
export function isExcludedFromUserProvisioningDirectory(
  row: ProvisioningDirectoryPerson,
): boolean {
  if (
    !isEmployeeAppVisible({
      email: row.email,
      app_hidden_at: row.app_hidden_at,
      deleted_at: row.deleted_at,
    })
  ) {
    return true;
  }

  if (isItSystemProvisioningAccount(row.email)) {
    return true;
  }

  return isHiddenFromPeopleFilters(
    row.employeeCode ?? row.employee_code,
    personFromRow(row),
  );
}

export function compareProvisioningPeopleByName<
  T extends { firstName: string; lastName: string },
>(a: T, b: T) {
  const byFirst = a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
  if (byFirst !== 0) return byFirst;
  return a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
}
