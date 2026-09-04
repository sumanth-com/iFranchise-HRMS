import { isHiddenFromPeopleFilters, normalizeEmployeeCode } from "@/lib/employee/directory-listing";
import {
  DIRECTORY_INCLUDED_EMPLOYEE_CODES,
  DIRECTORY_INCLUDED_EMPLOYEE_EMAILS,
} from "@/lib/employee/directory-listing";
import {
  isEmployeeAppVisible,
  normalizeEmployeeEmail,
} from "@/lib/employees/app-hidden";

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
    employeeCode: row.employeeCode ?? row.employee_code ?? null,
    firstName: row.firstName ?? row.first_name ?? null,
    lastName: row.lastName ?? row.last_name ?? null,
    designationTitle: row.designationTitle ?? null,
  };
}

/** IT system account: keep in Employees module, exclude from User Provisioning UI. */
export function isItSystemProvisioningAccount(email: string | null | undefined) {
  return normalizeEmployeeEmail(email) === "it@ifranchise.in";
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
/** HR contact selectors: HR portal roles only — not super_admin system accounts. */
const HR_CONTACT_ROLE_CODES = new Set(["hr_admin", "hr_executive"]);

export function isSuperAdminProvisioningRole(roleCode: string | null | undefined) {
  return String(roleCode ?? "").toLowerCase() === "super_admin";
}

export function isProvisioningManagerRole(roleCode: string | null | undefined) {
  return String(roleCode ?? "").toLowerCase() === MANAGER_ROLE;
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
