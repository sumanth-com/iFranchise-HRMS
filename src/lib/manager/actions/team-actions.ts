"use server";

import { revalidatePath } from "next/cache";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import {
  getManagerTeamScope,
  getTeamDesignationOptions,
  getTeamFilterLookups,
  getTeamMemberOptions,
  getTeamSummary,
  listTeamEmployees,
  buildManagerTeamTree,
} from "@/lib/manager/services/team-queries";
import {
  getTeamMemberDetailBundle,
  listTeamPendingCorrections,
  listTeamPendingLeaveApprovals,
} from "@/lib/manager/services/team-member-detail";
import { reviewTeamAttendanceCorrection } from "@/lib/manager/services/attendance-correction-service";
import {
  approveTeamLeaveRequest,
  rejectTeamLeaveRequest,
} from "@/lib/manager/services/team-leave-actions-service";
import { assertTeamMember } from "@/lib/manager/services/team-queries";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  requireServerAnyPermission,
  requireServerPermission,
} from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  teamListParamsSchema,
  teamMemberIdSchema,
} from "@/lib/validations/manager-team";
import {
  createFeedback,
  createOneOnOne,
  createPromotion,
} from "@/lib/performance/services/performance-mutations";
import {
  feedbackFormSchema,
  oneOnOneFormSchema,
  promotionFormSchema,
} from "@/lib/validations/performance";
import type {
  ManagerTeamPageData,
  TeamListParams,
  TeamListResult,
  TeamMemberDetailBundle,
  TeamPendingCorrection,
  TeamPendingLeaveApproval,
  TeamSummary,
} from "@/types/manager-team";

async function getAuthenticatedContext() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.manager,
    "employee.view",
  ]);
  const supabase = await createClient();
  const { teamIds, hierarchyEmployees } = await getManagerTeamScope(
    supabase,
    profile,
  );

  return { profile, supabase, teamIds, hierarchyEmployees };
}

function revalidateTeamPaths() {
  revalidatePath(MANAGER_ROUTES.team);
  revalidatePath(MANAGER_ROUTES.home);
  revalidatePath(MANAGER_ROUTES.attendance);
  revalidatePath(MANAGER_ROUTES.leave);
  revalidatePath(MANAGER_ROUTES.performance);
}

export async function fetchTeamEmployeesAction(
  params: TeamListParams,
): Promise<TeamListResult> {
  const parsed = teamListParamsSchema.parse(params);
  const { profile, supabase, teamIds } = await getAuthenticatedContext();
  return listTeamEmployees(supabase, profile, teamIds, parsed);
}

export async function fetchTeamSummaryAction(): Promise<TeamSummary> {
  const { profile, supabase, teamIds } = await getAuthenticatedContext();
  return getTeamSummary(supabase, profile, teamIds);
}

export async function fetchTeamMemberDetailAction(
  employeeId: string,
): Promise<TeamMemberDetailBundle | null> {
  const parsed = teamMemberIdSchema.parse({ employeeId });
  const { profile, supabase, teamIds } = await getAuthenticatedContext();

  return getTeamMemberDetailBundle(
    supabase,
    profile.employee.organizationId,
    teamIds,
    parsed.employeeId,
  );
}

export async function fetchTeamPendingApprovalsAction(): Promise<{
  leaveApprovals: TeamPendingLeaveApproval[];
  corrections: TeamPendingCorrection[];
}> {
  const { profile, supabase, teamIds } = await getAuthenticatedContext();
  const [leaveApprovals, corrections] = await Promise.all([
    listTeamPendingLeaveApprovals(supabase, profile.employee.id, teamIds),
    listTeamPendingCorrections(supabase, teamIds),
  ]);

  return { leaveApprovals, corrections };
}

export async function approveTeamLeaveAction(input: unknown) {
  try {
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    const result = await approveTeamLeaveRequest(
      supabase,
      profile,
      teamIds,
      input,
    );
    revalidateTeamPaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to approve leave.",
    };
  }
}

export async function rejectTeamLeaveAction(input: unknown) {
  try {
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    const result = await rejectTeamLeaveRequest(
      supabase,
      profile,
      teamIds,
      input,
    );
    revalidateTeamPaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to reject leave.",
    };
  }
}

export async function approveTeamCorrectionAction(input: unknown) {
  try {
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    await reviewTeamAttendanceCorrection(
      supabase,
      profile,
      teamIds,
      input,
      "approved",
    );
    revalidateTeamPaths();
    return { success: true as const, message: "Attendance regularization approved." };
  } catch (error) {
    return {
      success: false as const,
      message:
        error instanceof Error ? error.message : "Failed to approve correction.",
    };
  }
}

export async function rejectTeamCorrectionAction(input: unknown) {
  try {
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    await reviewTeamAttendanceCorrection(
      supabase,
      profile,
      teamIds,
      input,
      "rejected",
    );
    revalidateTeamPaths();
    return { success: true as const, message: "Attendance regularization rejected." };
  } catch (error) {
    return {
      success: false as const,
      message:
        error instanceof Error ? error.message : "Failed to reject correction.",
    };
  }
}

export async function createTeamFeedbackAction(input: unknown) {
  try {
    const parsed = feedbackFormSchema.parse(input);
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    if (!teamIds.includes(parsed.toEmployeeId)) {
      throw new Error("You can only send feedback to your team.");
    }
    await createFeedback(supabase, profile, parsed);
    revalidateTeamPaths();
    return { success: true as const, message: "Feedback submitted." };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to submit feedback.",
    };
  }
}

export async function createTeamOneOnOneAction(input: unknown) {
  try {
    const parsed = oneOnOneFormSchema.parse(input);
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    if (!teamIds.includes(parsed.employeeId)) {
      throw new Error("You can only schedule 1:1s with your team.");
    }
    await createOneOnOne(supabase, profile, parsed);
    revalidateTeamPaths();
    return { success: true as const, message: "1:1 scheduled." };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to schedule 1:1.",
    };
  }
}

export async function createTeamPromotionAction(input: unknown) {
  try {
    const parsed = promotionFormSchema.parse(input);
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    if (!teamIds.includes(parsed.employeeId)) {
      throw new Error("You can only recommend promotions for your team.");
    }
    await createPromotion(supabase, profile, parsed);
    revalidateTeamPaths();
    return { success: true as const, message: "Promotion recommended." };
  } catch (error) {
    return {
      success: false as const,
      message:
        error instanceof Error ? error.message : "Failed to recommend promotion.",
    };
  }
}

export async function removeTeamMemberAction(
  employeeId: string,
): Promise<{ success: true; message: string } | { success: false; message: string }> {
  try {
    const parsed = teamMemberIdSchema.parse({ employeeId });
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    assertTeamMember(teamIds, parsed.employeeId);

    const { data: employee, error } = await supabase
      .schema("hrms")
      .from("employees")
      .select("id, account_status, employment_status, first_name, last_name, employee_code")
      .eq("id", parsed.employeeId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!employee) throw new Error("Team member not found");

    const removableStatuses = ["draft", "invited", "invitation_pending"];
    if (!removableStatuses.includes(String(employee.account_status))) {
      return {
        success: false,
        message:
          "Active team members cannot be deleted from here. Contact HR to offboard this employee.",
      };
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { error: deleteError } = await admin
      .schema("hrms")
      .from("employees")
      .update({
        status: "inactive",
        employment_status: "terminated",
        deleted_at: now,
        updated_by: profile.userId,
      })
      .eq("id", parsed.employeeId)
      .is("deleted_at", null);

    if (deleteError) throw new Error(deleteError.message);

    revalidateTeamPaths();
    return {
      success: true,
      message: `${employee.first_name} ${employee.last_name} (${employee.employee_code}) was removed from your team.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to remove team member",
    };
  }
}

export async function getManagerTeamPageData(
  params: TeamListParams,
): Promise<ManagerTeamPageData> {
  await requireServerPermission(PORTAL_PERMISSIONS.manager);
  const parsed = teamListParamsSchema.parse(params);
  const supabase = await createClient();
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.manager,
    "employee.view",
  ]);

  const { teamIds, hierarchyEmployees } = await getManagerTeamScope(
    supabase,
    profile,
  );
  const organizationId = profile.employee.organizationId;

  const [summary, employees, lookups, teamMemberOptions, designationOptions] =
    await Promise.all([
      getTeamSummary(supabase, profile, teamIds),
      listTeamEmployees(supabase, profile, teamIds, parsed),
      getTeamFilterLookups(supabase, organizationId, teamIds),
      getTeamMemberOptions(supabase, organizationId, teamIds),
      getTeamDesignationOptions(supabase, organizationId),
    ]);

  const hierarchyRoot = buildManagerTeamTree(
    profile.employee.id,
    hierarchyEmployees,
    teamIds,
  );

  return {
    summary,
    employees,
    lookups,
    hierarchyRoot,
    teamMemberOptions,
    designationOptions,
  };
}

export type { TeamSummary };
