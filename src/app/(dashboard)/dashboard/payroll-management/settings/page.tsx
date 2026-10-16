import { redirect } from "next/navigation";

import {
  payrollHubUrl,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { isSuperAdmin } from "@/lib/system-admin/is-super-admin";

/**
 * Legacy URL. Settings belong in Super Admin portal only — never HR Team Payroll.
 */
export default async function PayrollSettingsPage() {
  const profile = await requireServerAnyPermission(["payroll.view", "payslip.view"]);
  if (isSuperAdmin(profile)) {
    redirect(`${SYSTEM_ADMIN_ROUTES.payroll}/settings`);
  }
  redirect(payrollHubUrl({ tab: "team", section: TEAM_PAYROLL_SECTIONS.run }));
}
