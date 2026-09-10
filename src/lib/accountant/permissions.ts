import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerPermission } from "@/lib/permissions/server";
import { hasAnyPermission, hasPermission } from "@/lib/permissions/utils";

/** Finance/payroll capabilities granted to the Accountant role (permission codes). */
export const ACCOUNTANT_FINANCE_PERMISSIONS = [
  "portal.accountant.access",
  "portal.employee.access",
  "payroll.view",
  "payroll.view_all",
  "payroll.create",
  "payroll.generate",
  "payroll.run",
  "payroll.process",
  "payroll.edit",
  "payroll.approve",
  "payroll.pay",
  "payroll.download",
  "payroll.export",
  "payslip.view",
  "payslip.generate",
  "payslips.view",
  "payslips.download",
  "salary.view",
  "salary_structure.view",
  "bonus.view",
  "reimbursement.view",
  "reimbursements.view",
  "reimbursements.view_attachments",
  "bank_account.view",
  "reports.view",
  "reports.export",
  "payroll_reports.view",
  "payroll_reports.export",
  "audit.view",
  "payroll_audit.view",
] as const;

/** Explicitly denied — HR / IAM / system administration. */
export const ACCOUNTANT_DENIED_PERMISSIONS = [
  "reimbursement.approve",
  "salary.edit",
  "salary_structure.create",
  "salary_structure.edit",
  "salary_structure.delete",
  "bonus.create",
  "bonus.approve",
  "bank_account.create",
  "bank_account.edit",
  "employee.create",
  "employee.edit",
  "employee.delete",
  "recruitment.view",
  "recruitment.create",
  "recruitment.edit",
  "roles.manage",
  "permissions.manage",
  "organization.edit",
  "organization.manage",
  "user_provisioning.view",
  "user_provisioning.manage",
  "system.admin.access",
  "settings.edit",
  "settings.manage",
  "portal.hr.access",
  "portal.ceo.access",
  "portal.manager.access",
] as const;

export async function requireAccountantPortal() {
  return requireServerPermission(PORTAL_PERMISSIONS.accountant);
}

/** View loaders/actions used by Accountant finance UIs. */
export function accountantOrViewPermission(viewCode: string) {
  return [viewCode, PORTAL_PERMISSIONS.accountant];
}

/** Accountant may open org reimbursement receipts without HR approve authority. */
export function canViewReimbursementAttachments(codes: string[]) {
  return hasAnyPermission(codes, [
    "reimbursements.view_attachments",
    "reimbursement.approve",
    PORTAL_PERMISSIONS.ceo,
    PORTAL_PERMISSIONS.hr,
    PORTAL_PERMISSIONS.accountant,
  ]);
}

export function isAccountantIsolatedFromHrAdmin(codes: string[]) {
  return (
    hasPermission(codes, PORTAL_PERMISSIONS.accountant) &&
    !hasPermission(codes, PORTAL_PERMISSIONS.hr) &&
    !hasPermission(codes, PORTAL_PERMISSIONS.ceo) &&
    !hasPermission(codes, "system.admin.access")
  );
}
