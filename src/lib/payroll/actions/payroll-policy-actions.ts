"use server";

import { revalidatePath } from "next/cache";

import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { PAYROLL_ROUTES, SELF_PAYROLL_ROUTES } from "@/lib/payroll/constants";
import { canEditPayrollPolicy } from "@/lib/payroll/payroll-policy-permissions";
import { savePayrollPolicyDocument } from "@/lib/payroll/services/payroll-policy-mutations";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { payrollPolicyDocumentSchema } from "@/lib/validations/payroll-policy";
import type { PayrollPolicyActionResult } from "@/types/payroll-policy";

function revalidatePayrollPolicyPaths() {
  revalidatePath(EMPLOYEE_ROUTES.payrollPolicy);
  revalidatePath(PAYROLL_ROUTES.policy);
  revalidatePath(EMPLOYEE_ROUTES.payroll);
  revalidatePath(SELF_PAYROLL_ROUTES.list);
}

export async function savePayrollPolicyDocumentAction(
  input: unknown,
): Promise<PayrollPolicyActionResult> {
  try {
    const profile = await requireServerAnyPermission(["payroll.view", "payslip.view"]);
    if (!canEditPayrollPolicy(profile)) {
      return { success: false, message: "You do not have permission to edit the payroll policy." };
    }

    const supabase = await createClient();
    const parsed = payrollPolicyDocumentSchema.parse(input);
    await savePayrollPolicyDocument(supabase, profile, parsed);
    revalidatePayrollPolicyPaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update payroll policy",
    };
  }
}
