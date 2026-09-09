/** System role codes that must not be deleted, disabled, or structurally rewritten. */
export const PROTECTED_SYSTEM_ROLE_CODES = [
  "super_admin",
  "it_multi_portal_access",
  "ceo",
  "founder",
  "co_founder",
  "hr_admin",
  "hr_executive",
  "manager",
  "employee",
] as const;

export type ProtectedSystemRoleCode = (typeof PROTECTED_SYSTEM_ROLE_CODES)[number];

export function isProtectedSystemRoleCode(code: string) {
  return (PROTECTED_SYSTEM_ROLE_CODES as readonly string[]).includes(code);
}

/** Super Admin and IT multi-portal grant roles are undeletable. */
export function canDeleteRoleRecord(role: { isSystemRole?: boolean; code: string }) {
  return role.code !== "super_admin" && role.code !== "it_multi_portal_access";
}

export function canDisableRoleRecord(role: { isSystemRole: boolean; code: string }) {
  return (
    !role.isSystemRole &&
    role.code !== "super_admin" &&
    role.code !== "it_multi_portal_access"
  );
}

export function canRemoveRoleAssignment(role: { isSystemRole: boolean; code: string }) {
  return (
    !role.isSystemRole &&
    role.code !== "super_admin" &&
    role.code !== "it_multi_portal_access"
  );
}
