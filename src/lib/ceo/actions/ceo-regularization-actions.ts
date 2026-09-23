"use server";

import { revalidatePath } from "next/cache";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import {
  listCeoProcessedRegularizations,
  listCeoRegularizationApprovalQueue,
} from "@/lib/ceo/services/ceo-regularization-queries";
import { reviewCeoAttendanceCorrection } from "@/lib/manager/services/attendance-correction-service";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type {
  CeoRegularizationActionResult,
  CeoRegularizationQueueItem,
} from "@/types/ceo-regularization";
import { ceoLeaveCalendarSchema } from "@/lib/validations/ceo-leave";
import {
  teamCorrectionBulkReviewSchema,
  teamCorrectionReviewSchema,
} from "@/lib/validations/manager-team";

const VIEW_PERMISSIONS = [PORTAL_PERMISSIONS.ceo, "attendance.view"];

export async function fetchCeoRegularizationQueueAction(
  rawFilters: { month?: number; year?: number } = {},
): Promise<
  CeoRegularizationActionResult<{
    queue: CeoRegularizationQueueItem[];
    processed: CeoRegularizationQueueItem[];
    month: number;
    year: number;
  }>
> {
  try {
    const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
    const supabase = await createClient();
    const now = new Date();
    const parsed = ceoLeaveCalendarSchema.parse({
      month: rawFilters.month ?? now.getMonth() + 1,
      year: rawFilters.year ?? now.getFullYear(),
    });
    const period = { month: parsed.month, year: parsed.year };

    const [queue, processed] = await Promise.all([
      listCeoRegularizationApprovalQueue(supabase, profile),
      listCeoProcessedRegularizations(supabase, profile, period).catch((error) => {
        console.error("[ceo-regularization] processed list failed", error);
        return [] as CeoRegularizationQueueItem[];
      }),
    ]);

    return { success: true, data: { queue, processed, ...period } };
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

export async function bulkApproveCeoRegularizationAction(
  input: unknown,
): Promise<
  CeoRegularizationActionResult<{
    succeeded: number;
    failed: number;
    errors: string[];
  }>
> {
  try {
    const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
    const parsed = teamCorrectionBulkReviewSchema.parse(input);
    const supabase = await createClient();

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const correctionId of parsed.correctionIds) {
      try {
        await reviewCeoAttendanceCorrection(
          supabase,
          profile,
          { correctionId, reviewNotes: parsed.reviewNotes },
          "approved",
        );
        succeeded += 1;
      } catch (error) {
        failed += 1;
        if (errors.length < 3) {
          errors.push(
            error instanceof Error ? error.message : "Approve failed",
          );
        }
      }
    }

    revalidatePath(CEO_ROUTES.approvalsRegularization);
    return { success: true, data: { succeeded, failed, errors } };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to bulk approve regularization requests",
    };
  }
}

export async function bulkRejectCeoRegularizationAction(
  input: unknown,
): Promise<
  CeoRegularizationActionResult<{
    succeeded: number;
    failed: number;
    errors: string[];
  }>
> {
  try {
    const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
    const parsed = teamCorrectionBulkReviewSchema.parse(input);
    const supabase = await createClient();

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const correctionId of parsed.correctionIds) {
      try {
        await reviewCeoAttendanceCorrection(
          supabase,
          profile,
          { correctionId, reviewNotes: parsed.reviewNotes },
          "rejected",
        );
        succeeded += 1;
      } catch (error) {
        failed += 1;
        if (errors.length < 3) {
          errors.push(
            error instanceof Error ? error.message : "Reject failed",
          );
        }
      }
    }

    revalidatePath(CEO_ROUTES.approvalsRegularization);
    return { success: true, data: { succeeded, failed, errors } };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to bulk reject regularization requests",
    };
  }
}
