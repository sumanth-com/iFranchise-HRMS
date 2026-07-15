"use server";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  addExecutiveApprovalComment,
  approveExecutiveRequest,
  forwardExecutiveRequest,
  rejectExecutiveRequest,
  requestClarificationOnExecutiveRequest,
  sendBackExecutiveRequestForRevision,
} from "@/lib/ceo/services/ceo-approvals-mutations";
import {
  getCeoApprovalsCategories,
  getCeoApprovalsDetail,
  getCeoApprovalsInsights,
  getCeoApprovalsKpis,
  getCeoApprovalsPageData,
  listCeoApprovalsQueue,
} from "@/lib/ceo/services/ceo-approvals-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  ceoApprovalsClarificationSchema,
  ceoApprovalsCommentSchema,
  ceoApprovalsDecisionSchema,
  ceoApprovalsForwardSchema,
  ceoApprovalsListParamsSchema,
  ceoApprovalsRejectSchema,
  ceoApprovalsRequestIdSchema,
  ceoApprovalsRevisionSchema,
} from "@/lib/validations/ceo-approvals";
import type {
  CeoApprovalsActionResult,
  CeoApprovalsCategoryCount,
  CeoApprovalsDetail,
  CeoApprovalsInsights,
  CeoApprovalsKpis,
  CeoApprovalsListParams,
  CeoApprovalsPageData,
  CeoApprovalsQueueResult,
} from "@/types/ceo-approvals";

export async function getCeoApprovalsModuleData(
  params: CeoApprovalsListParams,
): Promise<CeoApprovalsPageData> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoApprovalsPageData(
    supabase,
    profile,
    ceoApprovalsListParamsSchema.parse(params),
  );
}

export async function fetchCeoApprovalsKpisAction(
  params: CeoApprovalsListParams,
): Promise<CeoApprovalsKpis> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoApprovalsKpis(
    supabase,
    profile,
    ceoApprovalsListParamsSchema.parse(params),
  );
}

export async function fetchCeoApprovalsCategoriesAction(
  params: CeoApprovalsListParams,
): Promise<CeoApprovalsCategoryCount[]> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoApprovalsCategories(
    supabase,
    profile,
    ceoApprovalsListParamsSchema.parse(params),
  );
}

export async function fetchCeoApprovalsQueueAction(
  params: CeoApprovalsListParams,
): Promise<CeoApprovalsQueueResult> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return listCeoApprovalsQueue(
    supabase,
    profile,
    ceoApprovalsListParamsSchema.parse(params),
  );
}

export async function fetchCeoApprovalsInsightsAction(
  params: CeoApprovalsListParams,
): Promise<CeoApprovalsInsights> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoApprovalsInsights(
    supabase,
    profile,
    ceoApprovalsListParamsSchema.parse(params),
  );
}

export async function fetchCeoApprovalsDetailAction(input: {
  requestId: string;
}): Promise<{ success: true; data: CeoApprovalsDetail } | { success: false; message: string }> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoApprovalsRequestIdSchema.parse(input);
    const data = await getCeoApprovalsDetail(supabase, profile, parsed.requestId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load approval details.",
    };
  }
}

async function runDecision(
  runner: () => Promise<void>,
  successMessage: string,
): Promise<CeoApprovalsActionResult> {
  try {
    await runner();
    return { success: true, message: successMessage };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Action failed.",
    };
  }
}

export async function approveCeoApprovalAction(input: {
  requestId: string;
  remarks?: string;
}): Promise<CeoApprovalsActionResult> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  const parsed = ceoApprovalsDecisionSchema.parse(input);
  return runDecision(
    () => approveExecutiveRequest(supabase, profile, parsed),
    "Approval recorded.",
  );
}

export async function rejectCeoApprovalAction(input: {
  requestId: string;
  reason: string;
  remarks?: string;
}): Promise<CeoApprovalsActionResult> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  const parsed = ceoApprovalsRejectSchema.parse(input);
  return runDecision(
    () => rejectExecutiveRequest(supabase, profile, parsed),
    "Rejection recorded.",
  );
}

export async function clarifyCeoApprovalAction(input: {
  requestId: string;
  reason: string;
  remarks?: string;
}): Promise<CeoApprovalsActionResult> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  const parsed = ceoApprovalsClarificationSchema.parse(input);
  return runDecision(
    () => requestClarificationOnExecutiveRequest(supabase, profile, parsed),
    "Clarification requested.",
  );
}

export async function reviseCeoApprovalAction(input: {
  requestId: string;
  reason: string;
  remarks?: string;
}): Promise<CeoApprovalsActionResult> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  const parsed = ceoApprovalsRevisionSchema.parse(input);
  return runDecision(
    () => sendBackExecutiveRequestForRevision(supabase, profile, parsed),
    "Sent back for revision.",
  );
}

export async function commentCeoApprovalAction(input: {
  requestId: string;
  comment: string;
  isExecutiveRemark?: boolean;
}): Promise<CeoApprovalsActionResult> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  const parsed = ceoApprovalsCommentSchema.parse(input);
  return runDecision(
    () => addExecutiveApprovalComment(supabase, profile, parsed),
    "Comment added.",
  );
}

export async function forwardCeoApprovalAction(input: {
  requestId: string;
  forwardToEmployeeId: string;
  remarks?: string;
}): Promise<CeoApprovalsActionResult> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  const parsed = ceoApprovalsForwardSchema.parse(input);
  return runDecision(
    () => forwardExecutiveRequest(supabase, profile, parsed),
    "Request forwarded.",
  );
}
