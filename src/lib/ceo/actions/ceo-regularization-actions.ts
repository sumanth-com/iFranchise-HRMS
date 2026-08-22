"use server";

import { revalidatePath } from "next/cache";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { listCeoRegularizationApprovalQueue } from "@/lib/ceo/services/ceo-regularization-queries";
import { reviewCeoAttendanceCorrection } from "@/lib/manager/services/attendance-correction-service";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type {
  CeoRegularizationActionResult,
  CeoRegularizationQueueItem,
} from "@/types/ceo-regularization";
import { teamCorrectionReviewSchema } from "@/lib/validations/manager-team";

const VIEW_PERMISSIONS = [PORTAL_PERMISSIONS.ceo, "attendance.view"];

export async function fetchCeoRegularizationQueueAction(): Promise<
  CeoRegularizationActionResult<CeoRegularizationQueueItem[]>
> {
  try {
    const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
    const supabase = await createClient();
    const data = await listCeoRegularizationApprovalQueue(supabase, profile);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to load regularization approval queue",
    };
  }
}

export async function approveCeoRegularizationAction(
  input: unknown,
): Promise<CeoRegularizationActionResult> {
  try {
    const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
    const parsed = teamCorrectionReviewSchema.parse(input);
    const supabase = await createClient();

    await reviewCeoAttendanceCorrection(supabase, profile, parsed, "approved");

    revalidatePath(CEO_ROUTES.approvalsRegularization);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to approve regularization request",
    };
  }
}

export async function rejectCeoRegularizationAction(
  input: unknown,
): Promise<CeoRegularizationActionResult> {
  try {
    const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
    const parsed = teamCorrectionReviewSchema.parse(input);
    const supabase = await createClient();

    await reviewCeoAttendanceCorrection(supabase, profile, parsed, "rejected");

    revalidatePath(CEO_ROUTES.approvalsRegularization);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to reject regularization request",
    };
  }
}
