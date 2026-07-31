"use server";

import { revalidatePath } from "next/cache";

import { ONBOARDING_PERMISSIONS } from "@/lib/onboarding/constants";
import {
  loadOnboardingCaseDetail,
  loadOnboardingModuleData,
  type OnboardingModuleData,
} from "@/lib/onboarding/loaders/hr-onboarding-loaders";
import { getOnboardingLookups } from "@/lib/onboarding/services/onboarding-queries";
import {
  archiveOnboardingCase,
  cancelOnboardingCase,
  createOnboardingCase,
  createOrUpdateOnboardingCaseForInvite,
  processOnboardingReview,
  reviewOnboardingDocument,
  sendOnboardingInvitation,
} from "@/lib/onboarding/services/onboarding-mutations";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type { OnboardingCaseDetail } from "@/types/onboarding";
import {
  createOnboardingCaseFormSchema,
  onboardingDocumentReviewSchema,
  onboardingReviewSchema,
} from "@/lib/validations/onboarding";

const MANAGE_PERMISSIONS = [ONBOARDING_PERMISSIONS.manage];
const REVIEW_PERMISSIONS = [ONBOARDING_PERMISSIONS.review, ONBOARDING_PERMISSIONS.activate];
const VIEW_PERMISSIONS = [
  ONBOARDING_PERMISSIONS.view,
  ONBOARDING_PERMISSIONS.manage,
  ONBOARDING_PERMISSIONS.review,
  ONBOARDING_PERMISSIONS.activate,
];

function revalidateOnboarding() {
  revalidatePath("/dashboard/onboarding");
}

type ActionResult =
  | { success: true; message: string; caseId?: string }
  | { success: false; message: string };

export async function fetchOnboardingLookupsAction() {
  const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
  const supabase = await createClient();
  return getOnboardingLookups(supabase, profile.employee.organizationId);
}

export async function fetchOnboardingModuleAction(
  params: { page?: number; pageSize?: number; search?: string; status?: string },
): Promise<OnboardingModuleData> {
  return loadOnboardingModuleData(params);
}

export async function fetchOnboardingDetailAction(caseId: string): Promise<OnboardingCaseDetail> {
  return loadOnboardingCaseDetail(caseId);
}

export async function createOnboardingCaseAction(
  input: unknown,
): Promise<ActionResult & { caseId?: string }> {
  try {
    const profile = await requireServerAnyPermission(MANAGE_PERMISSIONS);
    const supabase = await createClient();
    const parsed = createOnboardingCaseFormSchema.parse(input);
    const caseId = await createOnboardingCase(supabase, profile, parsed);
    revalidateOnboarding();
    return { success: true, message: "New hire created", caseId };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to create" };
  }
}

export async function sendOnboardingInvitationAction(caseId: string): Promise<ActionResult> {
  try {
    const profile = await requireServerAnyPermission(MANAGE_PERMISSIONS);
    const supabase = await createClient();
    await sendOnboardingInvitation(supabase, profile, caseId);
    revalidateOnboarding();
    return { success: true, message: "Onboarding invitation sent" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to send invitation" };
  }
}

export async function createAndInviteOnboardingAction(input: unknown): Promise<ActionResult> {
  try {
    const profile = await requireServerAnyPermission(MANAGE_PERMISSIONS);
    const supabase = await createClient();
    const parsed = createOnboardingCaseFormSchema.parse(input);
    const { caseId, resent } = await createOrUpdateOnboardingCaseForInvite(supabase, profile, parsed);
    await sendOnboardingInvitation(supabase, profile, caseId);
    revalidateOnboarding();
    return {
      success: true,
      message: resent ? "Invitation updated and resent successfully" : "Invitation sent successfully",
      caseId,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to send invitation" };
  }
}

export async function reviewDocumentAction(input: unknown): Promise<ActionResult> {
  try {
    const profile = await requireServerAnyPermission(REVIEW_PERMISSIONS);
    const supabase = await createClient();
    const parsed = onboardingDocumentReviewSchema.parse(input);
    await reviewOnboardingDocument(supabase, profile, parsed.documentId, parsed.reviewStatus, parsed.hrComment);
    revalidateOnboarding();
    return { success: true, message: "Document review saved" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Review failed" };
  }
}

export async function processOnboardingReviewAction(input: unknown): Promise<ActionResult> {
  try {
    const profile = await requireServerAnyPermission(REVIEW_PERMISSIONS);
    const supabase = await createClient();
    const parsed = onboardingReviewSchema.parse(input);
    await processOnboardingReview(
      supabase,
      profile,
      parsed.caseId,
      parsed.action,
      parsed.hrComments,
      parsed.correctionNotes,
      parsed.intendedRoleId,
    );
    revalidateOnboarding();
    return { success: true, message: "Onboarding review processed" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Review failed" };
  }
}

export async function cancelOnboardingAction(caseId: string): Promise<ActionResult> {
  try {
    const profile = await requireServerAnyPermission(MANAGE_PERMISSIONS);
    const supabase = await createClient();
    await cancelOnboardingCase(supabase, profile, caseId);
    revalidateOnboarding();
    return { success: true, message: "Onboarding cancelled" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Cancel failed" };
  }
}

export async function archiveOnboardingAction(caseId: string): Promise<ActionResult> {
  try {
    const profile = await requireServerAnyPermission(MANAGE_PERMISSIONS);
    const supabase = await createClient();
    await archiveOnboardingCase(supabase, profile, caseId);
    revalidateOnboarding();
    return { success: true, message: "Onboarding archived" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Archive failed" };
  }
}

export async function resendOnboardingInvitationAction(caseId: string): Promise<ActionResult> {
  return sendOnboardingInvitationAction(caseId);
}
