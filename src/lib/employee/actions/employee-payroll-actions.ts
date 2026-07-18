"use server";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getPayslipById } from "@/lib/payroll/services/payroll-mutations";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type { PayslipDetail } from "@/types/payroll";

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
