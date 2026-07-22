"use server";

import { revalidatePath } from "next/cache";

import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { LEAVE_ROUTES } from "@/lib/leave/constants";
import { canEditLeavePolicy } from "@/lib/leave/leave-policy-permissions";
import { saveLeavePolicyDocument } from "@/lib/leave/services/leave-policy-mutations";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { leavePolicyDocumentSchema } from "@/lib/validations/leave-policy";
import type { LeavePolicyActionResult } from "@/types/leave-policy";

function revalidateLeavePolicyPaths() {
  revalidatePath(EMPLOYEE_ROUTES.leavePolicy);
  revalidatePath(LEAVE_ROUTES.policy);
  revalidatePath(EMPLOYEE_ROUTES.leave);
  revalidatePath(LEAVE_ROUTES.list);
}

export async function saveLeavePolicyDocumentAction(
  input: unknown,
): Promise<LeavePolicyActionResult> {
  try {
    const profile = await requireServerAnyPermission(["leave.view"]);
    if (!canEditLeavePolicy(profile)) {
      return { success: false, message: "You do not have permission to edit the leave policy." };
    }

    const supabase = await createClient();
    const parsed = leavePolicyDocumentSchema.parse(input);
    await saveLeavePolicyDocument(supabase, profile, parsed);
    revalidateLeavePolicyPaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update leave policy",
    };
  }
}
