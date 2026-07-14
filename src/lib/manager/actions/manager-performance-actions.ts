"use server";

import { revalidatePath } from "next/cache";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import {
  createTeamPerformanceFeedback,
  createTeamPerformanceGoal,
  createTeamPerformanceOneOnOne,
  createTeamPerformancePromotion,
  saveTeamPerformanceReviewDraft,
  startTeamPerformanceReview,
  submitTeamPerformanceReview,
  updateTeamGoalProgress,
  updateTeamPerformanceGoal,
  updateTeamPerformanceOneOnOne,
} from "@/lib/manager/services/team-performance-actions-service";
import { getTeamEmployeePerformanceProfile } from "@/lib/manager/services/team-performance-detail";
import {
  getManagerTeamPerformancePageData as loadManagerTeamPerformancePageData,
  getTeamPerformanceSummary,
  getTeamPerformanceTrends,
  listTeamPerformanceOverview,
} from "@/lib/manager/services/team-performance-queries";
import { getManagerTeamScope } from "@/lib/manager/services/team-queries";
import {
  requireServerAnyPermission,
  requireServerPermission,
} from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  teamPerformanceEmployeeIdSchema,
  teamPerformanceListParamsSchema,
} from "@/lib/validations/manager-performance";
import type {
  ManagerTeamPerformancePageData,
  TeamEmployeePerformanceProfile,
  TeamPerformanceListParams,
  TeamPerformanceListResult,
  TeamPerformanceSummary,
  TeamPerformanceTrendPoint,
} from "@/types/manager-performance";

async function getAuthenticatedContext() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.manager,
    "performance.view",
  ]);
  const supabase = await createClient();
  const { teamIds } = await getManagerTeamScope(supabase, profile);
  return { profile, supabase, teamIds };
}

function revalidatePerformancePaths() {
  revalidatePath(MANAGER_ROUTES.performance);
  revalidatePath(MANAGER_ROUTES.team);
  revalidatePath(MANAGER_ROUTES.home);
}

export async function fetchTeamPerformanceOverviewAction(
  params: TeamPerformanceListParams,
): Promise<TeamPerformanceListResult> {
  const parsed = teamPerformanceListParamsSchema.parse(params);
  const { profile, supabase, teamIds } = await getAuthenticatedContext();
  return listTeamPerformanceOverview(supabase, profile, teamIds, parsed);
}

export async function fetchTeamPerformanceSummaryAction(): Promise<TeamPerformanceSummary> {
  const { profile, supabase, teamIds } = await getAuthenticatedContext();
  return getTeamPerformanceSummary(supabase, profile, teamIds);
}

export async function fetchTeamPerformanceTrendsAction(): Promise<TeamPerformanceTrendPoint[]> {
  const { profile, supabase, teamIds } = await getAuthenticatedContext();
  return getTeamPerformanceTrends(supabase, profile, teamIds);
}

export async function fetchTeamEmployeePerformanceProfileAction(
  employeeId: string,
): Promise<TeamEmployeePerformanceProfile | null> {
  try {
    const parsed = teamPerformanceEmployeeIdSchema.parse({ employeeId });
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    return await getTeamEmployeePerformanceProfile(
      supabase,
      profile,
      teamIds,
      parsed.employeeId,
    );
  } catch {
    return null;
  }
}

export async function createTeamPerformanceGoalAction(input: unknown) {
  try {
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    const result = await createTeamPerformanceGoal(supabase, profile, teamIds, input);
    revalidatePerformancePaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to create goal.",
    };
  }
}

export async function uploadTeamPerformanceGoalAttachmentAction(
  formData: FormData,
): Promise<{ success: true; data: string } | { success: false; message: string }> {
  try {
    const { profile, supabase } = await getAuthenticatedContext();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return { success: false, message: "No file provided." };
    }

    if (file.type !== "application/pdf") {
      return { success: false, message: "Only PDF files are allowed." };
    }

    if (file.size > 15 * 1024 * 1024) {
      return { success: false, message: "PDF must be under 15 MB." };
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${profile.employee.organizationId}/performance-goals/${crypto.randomUUID()}-${sanitizedName}`;

    const { error } = await supabase.storage
      .from("employee-documents")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) throw new Error(error.message);

    return { success: true, data: storagePath };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to upload PDF.",
    };
  }
}

export async function updateTeamPerformanceGoalAction(input: unknown) {
  try {
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    const result = await updateTeamPerformanceGoal(supabase, profile, teamIds, input);
    revalidatePerformancePaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update goal.",
    };
  }
}

export async function updateTeamGoalProgressAction(input: unknown) {
  try {
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    const result = await updateTeamGoalProgress(supabase, profile, teamIds, input);
    revalidatePerformancePaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update goal progress.",
    };
  }
}

export async function startTeamPerformanceReviewAction(input: unknown) {
  try {
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    const result = await startTeamPerformanceReview(supabase, profile, teamIds, input);
    revalidatePerformancePaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to start review.",
    };
  }
}

export async function saveTeamPerformanceReviewDraftAction(input: unknown) {
  try {
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    const result = await saveTeamPerformanceReviewDraft(supabase, profile, teamIds, input);
    revalidatePerformancePaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to save review draft.",
    };
  }
}

export async function submitTeamPerformanceReviewAction(input: unknown) {
  try {
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    const result = await submitTeamPerformanceReview(supabase, profile, teamIds, input);
    revalidatePerformancePaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to submit review.",
    };
  }
}

export async function createTeamPerformanceFeedbackAction(input: unknown) {
  try {
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    const result = await createTeamPerformanceFeedback(supabase, profile, teamIds, input);
    revalidatePerformancePaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to add feedback.",
    };
  }
}

export async function createTeamPerformanceOneOnOneAction(input: unknown) {
  try {
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    const result = await createTeamPerformanceOneOnOne(supabase, profile, teamIds, input);
    revalidatePerformancePaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to schedule 1:1.",
    };
  }
}

export async function updateTeamPerformanceOneOnOneAction(
  meetingId: string,
  input: unknown,
) {
  try {
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    const result = await updateTeamPerformanceOneOnOne(
      supabase,
      profile,
      teamIds,
      meetingId,
      input as {
        notes?: string;
        agenda?: string;
        followUpDate?: string | null;
        meetingStatus?: string;
      },
    );
    revalidatePerformancePaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update meeting.",
    };
  }
}

export async function createTeamPerformancePromotionAction(input: unknown) {
  try {
    const { profile, supabase, teamIds } = await getAuthenticatedContext();
    const result = await createTeamPerformancePromotion(supabase, profile, teamIds, input);
    revalidatePerformancePaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to recommend promotion.",
    };
  }
}

export async function getManagerTeamPerformancePageData(
  params: TeamPerformanceListParams,
): Promise<ManagerTeamPerformancePageData> {
  await requireServerPermission(PORTAL_PERMISSIONS.manager);
  const parsed = teamPerformanceListParamsSchema.parse(params);
  const supabase = await createClient();
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.manager,
    "performance.view",
  ]);
  const { teamIds } = await getManagerTeamScope(supabase, profile);
  return loadManagerTeamPerformancePageData(supabase, profile, teamIds, parsed);
}
