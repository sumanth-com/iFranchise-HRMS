"use server";

import { revalidatePath } from "next/cache";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { getManagerRecruitmentContext } from "@/lib/manager/services/manager-recruitment-context";
import {
  cancelTeamRecruitmentInterview,
  recommendTeamCandidate,
  rejectTeamCandidate,
  rescheduleTeamRecruitmentInterview,
  saveTeamInterviewEvaluation,
  scheduleTeamRecruitmentInterview,
  submitTeamInterviewEvaluation,
  submitTeamManagerFeedback,
  submitTeamOfferRecommendation,
} from "@/lib/manager/services/team-recruitment-actions-service";
import { getTeamCandidateRecruitmentProfile } from "@/lib/manager/services/team-recruitment-detail";
import {
  getManagerTeamRecruitmentPageData as loadManagerTeamRecruitmentPageData,
  getTeamRecruitmentAnalytics,
  getTeamRecruitmentSummary,
  listTeamRecruitmentCandidates,
  listTeamRecruitmentJobs,
} from "@/lib/manager/services/team-recruitment-queries";
import {
  requireServerAnyPermission,
  requireServerPermission,
} from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  teamRecruitmentCandidateIdSchema,
  teamRecruitmentListParamsSchema,
} from "@/lib/validations/manager-recruitment";
import type {
  ManagerTeamRecruitmentPageData,
  TeamCandidateRecruitmentProfile,
  TeamRecruitmentAnalytics,
  TeamRecruitmentCandidateListResult,
  TeamRecruitmentJobListResult,
  TeamRecruitmentListParams,
  TeamRecruitmentSummary,
} from "@/types/manager-recruitment";

async function getAuthenticatedContext() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.manager,
    "recruitment.view",
  ]);
  const supabase = await createClient();
  const context = await getManagerRecruitmentContext(supabase, profile);
  return { profile, supabase, context };
}

function revalidateRecruitmentPaths() {
  revalidatePath(MANAGER_ROUTES.recruitment);
  revalidatePath(MANAGER_ROUTES.home);
}

export async function fetchTeamRecruitmentSummaryAction(): Promise<TeamRecruitmentSummary> {
  const { profile, supabase, context } = await getAuthenticatedContext();
  return getTeamRecruitmentSummary(supabase, profile, context);
}

export async function fetchTeamRecruitmentJobsAction(
  params: TeamRecruitmentListParams,
): Promise<TeamRecruitmentJobListResult> {
  const parsed = teamRecruitmentListParamsSchema.parse(params);
  const { profile, supabase, context } = await getAuthenticatedContext();
  return listTeamRecruitmentJobs(supabase, profile, context, parsed);
}

export async function fetchTeamRecruitmentCandidatesAction(
  params: TeamRecruitmentListParams,
): Promise<TeamRecruitmentCandidateListResult> {
  const parsed = teamRecruitmentListParamsSchema.parse(params);
  const { profile, supabase, context } = await getAuthenticatedContext();
  return listTeamRecruitmentCandidates(supabase, profile, context, parsed);
}

export async function fetchTeamRecruitmentAnalyticsAction(): Promise<TeamRecruitmentAnalytics> {
  const { profile, supabase, context } = await getAuthenticatedContext();
  return getTeamRecruitmentAnalytics(supabase, profile, context);
}

export async function fetchTeamCandidateRecruitmentProfileAction(
  candidateId: string,
): Promise<TeamCandidateRecruitmentProfile | null> {
  const parsed = teamRecruitmentCandidateIdSchema.parse({ candidateId });
  const { profile, supabase, context } = await getAuthenticatedContext();
  return getTeamCandidateRecruitmentProfile(
    supabase,
    profile,
    context,
    parsed.candidateId,
  );
}

export async function scheduleTeamRecruitmentInterviewAction(input: unknown) {
  try {
    const { profile, supabase, context } = await getAuthenticatedContext();
    const result = await scheduleTeamRecruitmentInterview(
      supabase,
      profile,
      context,
      input,
    );
    revalidateRecruitmentPaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to schedule interview.",
    };
  }
}

export async function rescheduleTeamRecruitmentInterviewAction(input: unknown) {
  try {
    const { profile, supabase, context } = await getAuthenticatedContext();
    const result = await rescheduleTeamRecruitmentInterview(
      supabase,
      profile,
      context,
      input,
    );
    revalidateRecruitmentPaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to reschedule interview.",
    };
  }
}

export async function cancelTeamRecruitmentInterviewAction(interviewId: string) {
  try {
    const { profile, supabase, context } = await getAuthenticatedContext();
    const result = await cancelTeamRecruitmentInterview(
      supabase,
      profile,
      context,
      interviewId,
    );
    revalidateRecruitmentPaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to cancel interview.",
    };
  }
}

export async function saveTeamInterviewEvaluationAction(input: unknown) {
  try {
    const { profile, supabase, context } = await getAuthenticatedContext();
    const result = await saveTeamInterviewEvaluation(supabase, profile, context, input);
    revalidateRecruitmentPaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to save evaluation draft.",
    };
  }
}

export async function submitTeamInterviewEvaluationAction(input: unknown) {
  try {
    const { profile, supabase, context } = await getAuthenticatedContext();
    const result = await submitTeamInterviewEvaluation(supabase, profile, context, input);
    revalidateRecruitmentPaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to submit evaluation.",
    };
  }
}

export async function submitTeamManagerFeedbackAction(input: unknown) {
  try {
    const { profile, supabase, context } = await getAuthenticatedContext();
    const result = await submitTeamManagerFeedback(supabase, profile, context, input);
    revalidateRecruitmentPaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to submit feedback.",
    };
  }
}

export async function recommendTeamCandidateAction(input: unknown) {
  try {
    const { profile, supabase, context } = await getAuthenticatedContext();
    const result = await recommendTeamCandidate(supabase, profile, context, input);
    revalidateRecruitmentPaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to record recommendation.",
    };
  }
}

export async function rejectTeamCandidateAction(input: unknown) {
  try {
    const { profile, supabase, context } = await getAuthenticatedContext();
    const result = await rejectTeamCandidate(supabase, profile, context, input);
    revalidateRecruitmentPaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to reject candidate.",
    };
  }
}

export async function submitTeamOfferRecommendationAction(input: unknown) {
  try {
    const { profile, supabase, context } = await getAuthenticatedContext();
    const result = await submitTeamOfferRecommendation(supabase, profile, context, input);
    revalidateRecruitmentPaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to submit offer recommendation.",
    };
  }
}

export async function getManagerTeamRecruitmentPageData(
  params: TeamRecruitmentListParams,
): Promise<ManagerTeamRecruitmentPageData> {
  await requireServerPermission(PORTAL_PERMISSIONS.manager);
  const parsed = teamRecruitmentListParamsSchema.parse(params);
  const supabase = await createClient();
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.manager,
    "recruitment.view",
  ]);
  const context = await getManagerRecruitmentContext(supabase, profile);
  return loadManagerTeamRecruitmentPageData(supabase, profile, context, parsed);
}
