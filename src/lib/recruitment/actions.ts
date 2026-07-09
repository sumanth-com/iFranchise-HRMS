"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  requireServerAnyPermission,
  requireServerPermission,
} from "@/lib/permissions/server";
import { RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";
import {
  cancelInterview,
  closeJobOpening,
  completeInterview,
  createCandidate,
  createJobOpening,
  createOffer,
  duplicateJobOpening,
  moveCandidateStage,
  scheduleInterview,
  updateJobOpening,
  updateOfferStatus,
} from "@/lib/recruitment/services/recruitment-mutations";
import { updateRecruitmentSettings } from "@/lib/recruitment/services/recruitment-settings";
import type { RecruitmentSettings } from "@/types/recruitment";
import {
  candidateFormSchema,
  interviewCompleteSchema,
  interviewFormSchema,
  jobFormSchema,
  moveStageSchema,
  offerFormSchema,
  offerStatusSchema,
  recruitmentSettingsSchema,
} from "@/lib/validations/recruitment";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; message: string };

async function getAuthenticatedSupabase() {
  return createClient();
}

function revalidateRecruitment() {
  revalidatePath(RECRUITMENT_ROUTES.dashboard);
  revalidatePath(RECRUITMENT_ROUTES.jobs);
  revalidatePath(RECRUITMENT_ROUTES.candidates);
  revalidatePath(RECRUITMENT_ROUTES.interviews);
  revalidatePath(RECRUITMENT_ROUTES.offers);
  revalidatePath(RECRUITMENT_ROUTES.analytics);
  revalidatePath("/dashboard/employees");
}

export async function createJobOpeningAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const profile = await requireServerPermission("recruitment.create");
    const supabase = await getAuthenticatedSupabase();
    const parsed = jobFormSchema.parse(input);
    const id = await createJobOpening(supabase, profile, parsed);
    revalidateRecruitment();
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create job opening",
    };
  }
}

export async function updateJobOpeningAction(
  id: string,
  input: unknown,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireServerPermission("recruitment.edit");
    const supabase = await getAuthenticatedSupabase();
    const parsed = jobFormSchema.parse(input);
    await updateJobOpening(supabase, profile, id, parsed);
    revalidateRecruitment();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update job opening",
    };
  }
}

export async function duplicateJobOpeningAction(id: string): Promise<ActionResult<string>> {
  try {
    const profile = await requireServerPermission("recruitment.create");
    const supabase = await getAuthenticatedSupabase();
    const newId = await duplicateJobOpening(supabase, profile, id);
    revalidateRecruitment();
    return { success: true, data: newId };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to duplicate job",
    };
  }
}

export async function closeJobOpeningAction(id: string): Promise<ActionResult<void>> {
  try {
    const profile = await requireServerPermission("recruitment.edit");
    const supabase = await getAuthenticatedSupabase();
    await closeJobOpening(supabase, profile, id);
    revalidateRecruitment();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to close job",
    };
  }
}

export async function createCandidateAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const profile = await requireServerPermission("recruitment.create");
    const supabase = await getAuthenticatedSupabase();
    const parsed = candidateFormSchema.parse(input);
    const id = await createCandidate(supabase, profile, parsed);
    revalidateRecruitment();
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create candidate",
    };
  }
}

export async function moveCandidateStageAction(input: unknown): Promise<ActionResult<void>> {
  try {
    const profile = await requireServerAnyPermission([
      "recruitment.edit",
      "recruitment.interview",
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = moveStageSchema.parse(input);
    await moveCandidateStage(supabase, profile, parsed);
    revalidateRecruitment();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to move stage",
    };
  }
}

export async function scheduleInterviewAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const profile = await requireServerPermission("recruitment.interview");
    const supabase = await getAuthenticatedSupabase();
    const parsed = interviewFormSchema.parse(input);
    const id = await scheduleInterview(supabase, profile, parsed);
    revalidateRecruitment();
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to schedule interview",
    };
  }
}

export async function completeInterviewAction(input: unknown): Promise<ActionResult<void>> {
  try {
    const profile = await requireServerPermission("recruitment.interview");
    const supabase = await getAuthenticatedSupabase();
    const parsed = interviewCompleteSchema.parse(input);
    await completeInterview(supabase, profile, parsed);
    revalidateRecruitment();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to complete interview",
    };
  }
}

export async function cancelInterviewAction(id: string): Promise<ActionResult<void>> {
  try {
    const profile = await requireServerPermission("recruitment.interview");
    const supabase = await getAuthenticatedSupabase();
    await cancelInterview(supabase, profile, id);
    revalidateRecruitment();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to cancel interview",
    };
  }
}

export async function createOfferAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const profile = await requireServerPermission("recruitment.offer");
    const supabase = await getAuthenticatedSupabase();
    const parsed = offerFormSchema.parse(input);
    const id = await createOffer(supabase, profile, parsed);
    revalidateRecruitment();
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create offer",
    };
  }
}

export async function updateOfferStatusAction(
  input: unknown,
): Promise<ActionResult<{ employeeId?: string }>> {
  try {
    const profile = await requireServerPermission("recruitment.offer");
    const supabase = await getAuthenticatedSupabase();
    const parsed = offerStatusSchema.parse(input);
    const result = await updateOfferStatus(supabase, profile, parsed);
    revalidateRecruitment();
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update offer status",
    };
  }
}

export async function updateRecruitmentSettingsAction(
  input: unknown,
): Promise<ActionResult<RecruitmentSettings>> {
  try {
    const profile = await requireServerAnyPermission(["recruitment.edit", "settings.edit"]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = recruitmentSettingsSchema.parse(input);
    const settings = await updateRecruitmentSettings(
      supabase,
      profile.employee.organizationId,
      parsed,
    );
    revalidatePath(RECRUITMENT_ROUTES.settings);
    revalidatePath("/dashboard/company-settings");
    revalidateRecruitment();
    return { success: true, data: settings };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save settings",
    };
  }
}
