"use server";

import { revalidatePath } from "next/cache";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { reviewTeamAttendanceCorrection, getTeamAttendanceDetailBundle } from "@/lib/manager/services/attendance-correction-service";
import { getManagerTeamScope } from "@/lib/manager/services/team-queries";
import {
  getManagerTeamAttendancePageData as loadManagerTeamAttendancePageData,
  getTeamAttendanceSummary,
  getTeamMonthlyAttendanceSummary,
  listTeamAttendance,
} from "@/lib/manager/services/team-attendance-queries";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import {
  requireServerAnyPermission,
  requireServerPermission,
} from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  teamAttendanceIdSchema,
  teamAttendanceListParamsSchema,
  teamAttendanceMonthSchema,
} from "@/lib/validations/manager-attendance";
import { teamCorrectionReviewSchema } from "@/lib/validations/manager-team";
import type {
  ManagerTeamAttendancePageData,
  TeamAttendanceDetailBundle,
  TeamAttendanceListParams,
  TeamAttendanceListResult,
  TeamAttendanceSummary,
  TeamMonthlyAttendanceRow,
} from "@/types/manager-attendance";

async function getAuthenticatedContext() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.manager,
    "attendance.view",
  ]);
  const supabase = await createClient();
  const { teamIds } = await getManagerTeamScope(supabase, profile);

  return { profile, supabase, teamIds };
}

function revalidateAttendancePaths() {
  revalidatePath(MANAGER_ROUTES.attendance);
  revalidatePath(MANAGER_ROUTES.team);
  revalidatePath(MANAGER_ROUTES.home);
}

export async function fetchTeamAttendanceAction(
  params: TeamAttendanceListParams,
): Promise<TeamAttendanceListResult> {
  const parsed = teamAttendanceListParamsSchema.parse(params);
  const { profile, supabase, teamIds } = await getAuthenticatedContext();
  return listTeamAttendance(supabase, profile, teamIds, parsed);
}

export async function fetchTeamAttendanceSummaryAction(
  dateFrom?: string,
  dateTo?: string,
): Promise<TeamAttendanceSummary> {
  const { profile, supabase, teamIds } = await getAuthenticatedContext();
  return getTeamAttendanceSummary(supabase, profile, teamIds, dateFrom, dateTo);
}

export async function fetchTeamAttendanceDetailAction(
  attendanceId: string,
): Promise<TeamAttendanceDetailBundle | null> {
  const parsed = teamAttendanceIdSchema.parse({ attendanceId });
  const { profile, supabase, teamIds } = await getAuthenticatedContext();
  return getTeamAttendanceDetailBundle(
    supabase,
    profile,
    teamIds,
    parsed.attendanceId,
  );
}

export async function fetchTeamMonthlyAttendanceAction(
  input?: unknown,
): Promise<TeamMonthlyAttendanceRow[]> {
  const parsed = teamAttendanceMonthSchema.parse(input ?? {});
  const { profile, supabase, teamIds } = await getAuthenticatedContext();
  return getTeamMonthlyAttendanceSummary(
    supabase,
    profile,
    teamIds,
    parsed.month,
    parsed.year,
  );
}

export async function approveTeamAttendanceCorrectionAction(input: unknown) {
  try {
    teamCorrectionReviewSchema.parse(input);
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    const result = await reviewTeamAttendanceCorrection(
      supabase,
      profile,
      teamIds,
      input,
      "approved",
    );
    revalidateAttendancePaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message:
        error instanceof Error ? error.message : "Failed to approve regularization.",
    };
  }
}

export async function rejectTeamAttendanceCorrectionAction(input: unknown) {
  try {
    teamCorrectionReviewSchema.parse(input);
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    const result = await reviewTeamAttendanceCorrection(
      supabase,
      profile,
      teamIds,
      input,
      "rejected",
    );
    revalidateAttendancePaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message:
        error instanceof Error ? error.message : "Failed to reject regularization.",
    };
  }
}

export async function getManagerTeamAttendancePageData(
  params: TeamAttendanceListParams,
): Promise<ManagerTeamAttendancePageData> {
  await requireServerPermission(PORTAL_PERMISSIONS.manager);
  const parsed = teamAttendanceListParamsSchema.parse(params);
  const supabase = await createClient();
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.manager,
    "attendance.view",
  ]);
  const { teamIds } = await getManagerTeamScope(supabase, profile);

  return loadManagerTeamAttendancePageData(supabase, profile, teamIds, parsed);
}
