/** Pure role helpers — safe for client bundles (no Supabase/admin imports). */

export const HR_LEAVE_APPLICANT_ROLE_CODES = [
  "hr_admin",
  "hr_executive",
  "super_admin",
] as const;

export function isHrLeaveApplicant(roleCodes: string[]): boolean {
  return roleCodes.some((code) =>
    (HR_LEAVE_APPLICANT_ROLE_CODES as readonly string[]).includes(code),
  );
}
