"use server";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  getCeoRecruitmentCandidateDetail,
  getCeoRecruitmentInsights,
  getCeoRecruitmentPageData,
  getCeoRecruitmentPipeline,
  listCeoRecruitmentCandidates,
  listCeoRecruitmentInterviews,
  listCeoRecruitmentJobs,
} from "@/lib/ceo/services/ceo-recruitment-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  ceoRecruitmentCandidateIdSchema,
  ceoRecruitmentListParamsSchema,
} from "@/lib/validations/ceo-recruitment";
import type {
  CeoRecruitmentCandidateDetail,
  CeoRecruitmentCandidateListResult,
  CeoRecruitmentInsights,
  CeoRecruitmentInterviewRow,
  CeoRecruitmentJobRow,
  CeoRecruitmentListParams,
  CeoRecruitmentPageData,
  CeoRecruitmentPipelineStage,
} from "@/types/ceo-recruitment";

export async function getCeoRecruitmentModuleData(
  params: CeoRecruitmentListParams,
): Promise<CeoRecruitmentPageData> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  const parsed = ceoRecruitmentListParamsSchema.parse(params);
  return getCeoRecruitmentPageData(supabase, profile, parsed);
}

export async function fetchCeoRecruitmentCandidatesAction(
  params: CeoRecruitmentListParams,
): Promise<CeoRecruitmentCandidateListResult> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  const parsed = ceoRecruitmentListParamsSchema.parse(params);
  return listCeoRecruitmentCandidates(supabase, profile, parsed);
}

export async function fetchCeoRecruitmentPipelineAction(
  params: CeoRecruitmentListParams,
): Promise<CeoRecruitmentPipelineStage[]> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  const parsed = ceoRecruitmentListParamsSchema.parse(params);
  return getCeoRecruitmentPipeline(supabase, profile, parsed);
}

export async function fetchCeoRecruitmentInterviewsAction(
  params: CeoRecruitmentListParams,
): Promise<CeoRecruitmentInterviewRow[]> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  const parsed = ceoRecruitmentListParamsSchema.parse(params);
  return listCeoRecruitmentInterviews(supabase, profile, parsed);
}

export async function fetchCeoRecruitmentJobsAction(
  params: CeoRecruitmentListParams,
): Promise<CeoRecruitmentJobRow[]> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  const parsed = ceoRecruitmentListParamsSchema.parse(params);
  return listCeoRecruitmentJobs(supabase, profile, parsed);
}

export async function fetchCeoRecruitmentInsightsAction(
  params: CeoRecruitmentListParams,
): Promise<CeoRecruitmentInsights> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  const parsed = ceoRecruitmentListParamsSchema.parse(params);
  return getCeoRecruitmentInsights(supabase, profile, parsed);
}

export async function fetchCeoRecruitmentCandidateDetailAction(
  candidateId: string,
): Promise<
  | { success: true; data: CeoRecruitmentCandidateDetail }
  | { success: false; message: string }
> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoRecruitmentCandidateIdSchema.parse({ candidateId });
    const data = await getCeoRecruitmentCandidateDetail(
      supabase,
      profile,
      parsed.candidateId,
    );
    if (!data) return { success: false, message: "Candidate not found." };
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to load candidate profile.",
    };
  }
}
