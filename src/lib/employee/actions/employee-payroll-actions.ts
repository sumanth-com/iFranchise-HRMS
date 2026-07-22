"use server";

import { siteConfig } from "@/config/site";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { emailPayslip, getPayslipById } from "@/lib/payroll/services/payroll-mutations";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type { PayslipDetail } from "@/types/payroll";

export type EmployeePayrollActionResult =
  | { success: true }
  | { success: false; message: string };

/**
 * Fetches a single payslip for the signed-in employee. RLS on `payslips` restricts a
 * standard employee to their own rows, so another employee's id resolves to null.
 */
export async function getEmployeePayslipDetailAction(
  payslipId: string,
): Promise<PayslipDetail | null> {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "payslip.view",
  ]);
  const supabase = await createClient();
  return getPayslipById(supabase, profile, payslipId);
}

/** Employee resends a published payslip to their registered email. */
export async function emailMyPayslipAction(
  payslipId: string,
): Promise<EmployeePayrollActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      PORTAL_PERMISSIONS.employee,
      "payslip.view",
    ]);
    const supabase = await createClient();
    const payslip = await getPayslipById(supabase, profile, payslipId);
    if (!payslip) {
      return { success: false, message: "Payslip not found." };
    }
    if (!payslip.canEmployeeAccess) {
      return {
        success: false,
        message: "This payslip is not yet available. Please wait until payroll is published.",
      };
    }
    await emailPayslip(supabase, profile, payslipId, siteConfig.url);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to email payslip",
    };
  }
}
