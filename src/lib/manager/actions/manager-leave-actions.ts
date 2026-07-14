"use server";

import { revalidatePath } from "next/cache";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import {
  approveTeamLeaveRequest,
  rejectTeamLeaveRequest,
  requestTeamLeaveInformation,
} from "@/lib/manager/services/team-leave-actions-service";
import { getTeamLeaveDetailBundle } from "@/lib/manager/services/team-leave-detail";
import {
  getManagerTeamLeavePageData as loadManagerTeamLeavePageData,
  getTeamLeaveCalendarData,
  getTeamLeaveSummary,
  listTeamLeaveRequests,
} from "@/lib/manager/services/team-leave-queries";
import { getManagerTeamScope } from "@/lib/manager/services/team-queries";
import {
  requireServerAnyPermission,
  requireServerPermission,
} from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  teamLeaveCalendarParamsSchema,
  teamLeaveIdSchema,
  teamLeaveInfoRequestSchema,
  teamLeaveListParamsSchema,
} from "@/lib/validations/manager-leave";
import {
  teamLeaveApprovalSchema,
  teamLeaveRejectSchema,
} from "@/lib/validations/manager-team";
import type {
  ManagerTeamLeavePageData,
  TeamLeaveDetailBundle,
  TeamLeaveListParams,
  TeamLeaveListResult,
  TeamLeaveSummary,
} from "@/types/manager-leave";
import type { LeaveCalendarEntry, LeaveHolidayEntry } from "@/types/leave";

async function getAuthenticatedContext() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.manager,
    "leave.view",
  ]);
  const supabase = await createClient();
  const { teamIds } = await getManagerTeamScope(supabase, profile);
  return { profile, supabase, teamIds };
}

function revalidateLeavePaths() {
  revalidatePath(MANAGER_ROUTES.leave);
  revalidatePath(MANAGER_ROUTES.team);
  revalidatePath(MANAGER_ROUTES.home);
}

export async function fetchTeamLeaveRequestsAction(
  params: TeamLeaveListParams,
): Promise<TeamLeaveListResult> {
  const parsed = teamLeaveListParamsSchema.parse(params);
  const { profile, supabase, teamIds } = await getAuthenticatedContext();
  return listTeamLeaveRequests(supabase, profile, teamIds, parsed);
}

export async function fetchTeamLeaveSummaryAction(): Promise<TeamLeaveSummary> {
  const { profile, supabase, teamIds } = await getAuthenticatedContext();
  return getTeamLeaveSummary(supabase, profile, teamIds);
}

export async function fetchTeamLeaveDetailAction(
  leaveRequestId: string,
): Promise<TeamLeaveDetailBundle | null> {
  const parsed = teamLeaveIdSchema.parse({ leaveRequestId });
  const { profile, supabase, teamIds } = await getAuthenticatedContext();
  return getTeamLeaveDetailBundle(
    supabase,
    profile,
    teamIds,
    parsed.leaveRequestId,
  );
}

export async function fetchTeamLeaveCalendarAction(input?: unknown): Promise<{
  leaves: LeaveCalendarEntry[];
  holidays: LeaveHolidayEntry[];
}> {
  const parsed = teamLeaveCalendarParamsSchema.parse(input ?? {});
  const now = new Date();
  const month = parsed.month ?? now.getMonth() + 1;
  const year = parsed.year ?? now.getFullYear();
  const { profile, supabase, teamIds } = await getAuthenticatedContext();
  return getTeamLeaveCalendarData(supabase, profile, teamIds, month, year);
}

export async function approveTeamLeaveRequestAction(input: unknown) {
  try {
    teamLeaveApprovalSchema.parse(input);
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    const result = await approveTeamLeaveRequest(
      supabase,
      profile,
      teamIds,
      input,
    );
    revalidateLeavePaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to approve leave.",
    };
  }
}

export async function rejectTeamLeaveRequestAction(input: unknown) {
  try {
    teamLeaveRejectSchema.parse(input);
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    const result = await rejectTeamLeaveRequest(
      supabase,
      profile,
      teamIds,
      input,
    );
    revalidateLeavePaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to reject leave.",
    };
  }
}

export async function requestTeamLeaveInfoAction(input: unknown) {
  try {
    teamLeaveInfoRequestSchema.parse(input);
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    const result = await requestTeamLeaveInformation(
      supabase,
      profile,
      teamIds,
      input,
    );
    revalidateLeavePaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message:
        error instanceof Error ? error.message : "Failed to request information.",
    };
  }
}

export async function getManagerTeamLeavePageData(
  params: TeamLeaveListParams,
): Promise<ManagerTeamLeavePageData> {
  await requireServerPermission(PORTAL_PERMISSIONS.manager);
  const parsed = teamLeaveListParamsSchema.parse(params);
  const supabase = await createClient();
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.manager,
    "leave.view",
  ]);
  const { teamIds } = await getManagerTeamScope(supabase, profile);
  return loadManagerTeamLeavePageData(supabase, profile, teamIds, parsed);
}
