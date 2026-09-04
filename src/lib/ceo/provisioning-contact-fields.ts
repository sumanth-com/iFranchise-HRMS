import type { CeoProvisioningUser } from "@/types/ceo-user-provisioning";

export function provisioningContactFieldVisibility(user: CeoProvisioningUser) {
  const roleCode = user.roleCode.toLowerCase();
  const isManagerRole = roleCode === "manager";
  /** People who act as HR contacts for others — not assignable an HR contact themselves. */
  const isHrContactAssignee =
    roleCode === "hr_admin" || roleCode === "hr_executive";
  const isSuperAdminRole = roleCode === "super_admin";
  const isExecutiveRole =
    roleCode === "ceo" || roleCode === "co_founder" || roleCode === "founder";

  return {
    showReportingManager:
      !isManagerRole &&
      !isHrContactAssignee &&
      !isSuperAdminRole &&
      !isExecutiveRole,
    /** Super Admins are employees with HR portal access and still get an HR contact. */
    showAssignedHr: !isHrContactAssignee && !isExecutiveRole,
  };
}
