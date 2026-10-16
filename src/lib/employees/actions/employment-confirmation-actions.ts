"use server";

import { revalidatePath } from "next/cache";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { PERFORMANCE_ROUTES } from "@/lib/performance/constants";
import {
  requireServerAnyPermission,
} from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { toUserFriendlyError } from "@/lib/errors/user-messages";
import {
  canManageEmploymentConfirmations,
  getEmploymentConfirmationDetail,
  listProbationCandidates,
} from "@/lib/employees/services/employment-confirmation-queries";
import {
  cancelEmploymentConfirmationDraft,
  confirmEmploymentToFullTime,
  saveEmploymentConfirmationDraft,
} from "@/lib/employees/services/employment-confirmation-mutations";
import type {
  EmploymentConfirmationDetail,
  ProbationCandidate,
} from "@/types/employment-confirmation";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

const VIEW_PERMISSIONS = [
  "employee.view",
  "employee.edit",
  "performance.view",
  "payroll.view",
  PORTAL_PERMISSIONS.ceo,
  "system.admin.access",
] as const;

function revalidateConfirmationViews() {
  revalidatePath(PERFORMANCE_ROUTES.probation);
  revalidatePath(`${CEO_ROUTES.performance}/probation`);
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/payroll");
  revalidatePath("/dashboard/payroll/team/probation");
  revalidatePath("/dashboard/payroll/team/run");
  revalidatePath("/dashboard/payroll/team/salary-structures");
  revalidatePath("/dashboard/payroll/team/payslips");
  revalidatePath("/ceo/employees");
  revalidatePath("/ceo/payroll/probation");
  revalidatePath("/ceo/payroll/run");
  revalidatePath("/ceo/payroll/salary-structures");
  revalidatePath("/ceo/user-provisioning");
}

export async function fetchProbationCandidatesAction(): Promise<
  ActionResult<ProbationCandidate[]>
> {
  try {
    const profile = await requireServerAnyPermission([...VIEW_PERMISSIONS]);
    const supabase = await createClient();
    const data = await listProbationCandidates(supabase, profile);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to load probation candidates"),
    };
  }
}

export async function fetchEmploymentConfirmationDetailAction(
  confirmationId: string,
): Promise<ActionResult<EmploymentConfirmationDetail | null>> {
  try {
    const profile = await requireServerAnyPermission([...VIEW_PERMISSIONS]);
    const supabase = await createClient();
    const data = await getEmploymentConfirmationDetail(
      supabase,
      profile,
      confirmationId,
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to load confirmation detail"),
    };
  }
}

export async function saveEmploymentConfirmationDraftAction(
  input: unknown,
): Promise<ActionResult<{ confirmationId: string }>> {
  try {
    const profile = await requireServerAnyPermission([...VIEW_PERMISSIONS]);
    if (!canManageEmploymentConfirmations(profile.permissionCodes)) {
      return { success: false, message: "You do not have permission to edit confirmations." };
    }
    const supabase = await createClient();
    const data = await saveEmploymentConfirmationDraft(supabase, profile, input);
    revalidateConfirmationViews();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to save confirmation draft"),
    };
  }
}

export async function confirmEmploymentToFullTimeAction(
  input: unknown,
): Promise<ActionResult<{ confirmationId: string; salaryRevisionId: string }>> {
  try {
    const profile = await requireServerAnyPermission([...VIEW_PERMISSIONS]);
    if (!canManageEmploymentConfirmations(profile.permissionCodes)) {
      return { success: false, message: "You do not have permission to confirm employees." };
    }
    const supabase = await createClient();
    const data = await confirmEmploymentToFullTime(supabase, profile, input);
    revalidateConfirmationViews();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to confirm employee"),
    };
  }
}

export async function cancelEmploymentConfirmationDraftAction(
  confirmationId: string,
): Promise<ActionResult> {
  try {
    const profile = await requireServerAnyPermission([...VIEW_PERMISSIONS]);
    if (!canManageEmploymentConfirmations(profile.permissionCodes)) {
      return { success: false, message: "You do not have permission to cancel confirmations." };
    }
    const supabase = await createClient();
    await cancelEmploymentConfirmationDraft(supabase, profile, confirmationId);
    revalidateConfirmationViews();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to cancel confirmation"),
    };
  }
}
