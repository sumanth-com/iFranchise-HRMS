/**
 * Draft employee holding an open invitation: may authenticate to set a password
 * and complete first login, but is not yet part of the active workforce.
 */
export function isPendingInviteSetupEmployee(employee: {
  employmentStatus?: string | null;
  accountStatus?: string | null;
}): boolean {
  return (
    employee.employmentStatus === "draft" &&
    (employee.accountStatus === "invited" ||
      employee.accountStatus === "invitation_pending" ||
      employee.accountStatus === "invitation_accepted")
  );
}
