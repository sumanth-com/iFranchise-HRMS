/** System role codes that must not be deleted, disabled, or structurally rewritten. */
export const PROTECTED_SYSTEM_ROLE_CODES = [
  "super_admin",
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

/** Only Super Admin itself is undeletable — other system roles may be deleted with confirmation. */
export function canDeleteRoleRecord(role: { isSystemRole?: boolean; code: string }) {
  return role.code !== "super_admin";
}

export function canDisableRoleRecord(role: { isSystemRole: boolean; code: string }) {
  return !role.isSystemRole && role.code !== "super_admin";
}

export function canRemoveRoleAssignment(role: { isSystemRole: boolean; code: string }) {
  return !role.isSystemRole && role.code !== "super_admin";
}
