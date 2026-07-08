"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  requireServerAnyPermission,
  requireServerPermission,
} from "@/lib/permissions/server";
import { PERFORMANCE_ROUTES } from "@/lib/performance/constants";
import {
  addGoalComment,
  approvePromotionStep,
  approveReviewStep,
  assignKpi,
  createFeedback,
  createGoal,
  createKpiTemplate,
  createOneOnOne,
  createPromotion,
  createReview,
  getGoalById,
  getReviewById,
  submitReview,
  updateGoalProgress,
  updateKpiProgress,
} from "@/lib/performance/services/performance-mutations";
import {
  getPerformanceLookups,
  getPerformanceSummary,
  listFeedback,
  listGoals,
  listKpis,
  listKpiTemplates,
  listOneOnOnes,
  listPerformanceHistory,
  listPromotions,
  listReviews,
} from "@/lib/performance/services/performance-queries";
import {
  getPerformanceSettings,
  savePerformanceSettings,
} from "@/lib/performance/services/performance-settings";
import {
  feedbackFormSchema,
  goalCommentSchema,
  goalFormSchema,
  goalProgressSchema,
  kpiAssignFormSchema,
  kpiProgressSchema,
  kpiTemplateFormSchema,
  oneOnOneFormSchema,
  performanceSettingsSchema,
  promotionApprovalSchema,
  promotionFormSchema,
  reviewApprovalSchema,
  reviewFormSchema,
  reviewSubmitSchema,
} from "@/lib/validations/performance";
import type {
  FeedbackListResult,
  GoalDetail,
  GoalListResult,
  HistoryListResult,
  KpiListResult,
  OneOnOneListResult,
  PerformanceActionResult,
  PerformanceLookups,
  PerformanceSettingsRecord,
  PerformanceSummary,
  PromotionListResult,
  ReviewDetail,
  ReviewListResult,
} from "@/types/performance";
import type { KpiTemplateItem } from "@/types/performance";

async function getAuthenticatedSupabase() {
  return createClient();
}

function revalidatePerformancePaths() {
  revalidatePath(PERFORMANCE_ROUTES.dashboard);
  revalidatePath(PERFORMANCE_ROUTES.goals);
  revalidatePath(PERFORMANCE_ROUTES.kpis);
  revalidatePath(PERFORMANCE_ROUTES.reviews);
  revalidatePath(PERFORMANCE_ROUTES.feedback);
  revalidatePath(PERFORMANCE_ROUTES.oneOnOnes);
  revalidatePath(PERFORMANCE_ROUTES.promotions);
  revalidatePath(PERFORMANCE_ROUTES.history);
  revalidatePath(PERFORMANCE_ROUTES.settings);
}

export async function fetchPerformanceSummaryAction(): Promise<PerformanceSummary> {
  const profile = await requireServerPermission("performance.view");
  const supabase = await getAuthenticatedSupabase();
  return getPerformanceSummary(supabase, profile);
}

export async function fetchPerformanceLookupsAction(): Promise<PerformanceLookups> {
  const profile = await requireServerPermission("performance.view");
  const supabase = await getAuthenticatedSupabase();
  return getPerformanceLookups(supabase, profile.employee.organizationId);
}

export async function createGoalAction(input: unknown): Promise<PerformanceActionResult<string>> {
  try {
    const profile = await requireServerPermission("performance.create");
    const supabase = await getAuthenticatedSupabase();
    goalFormSchema.parse(input);
    const id = await createGoal(supabase, profile, input);
    revalidatePerformancePaths();
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create goal",
    };
  }
}

export async function addGoalCommentAction(
  input: unknown,
): Promise<PerformanceActionResult<void>> {
  try {
    const profile = await requireServerAnyPermission(["performance.create", "performance.edit"]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = goalCommentSchema.parse(input);
    await addGoalComment(supabase, profile, parsed.goalId, parsed.comment);
    revalidatePath(PERFORMANCE_ROUTES.goals);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to add comment",
    };
  }
}

export async function updateGoalProgressAction(
  input: unknown,
): Promise<PerformanceActionResult<void>> {
  try {
    const profile = await requireServerPermission("performance.edit");
    const supabase = await getAuthenticatedSupabase();
    const parsed = goalProgressSchema.parse(input);
    await updateGoalProgress(
      supabase,
      profile,
      parsed.goalId,
      parsed.currentProgress,
      parsed.goalStatus,
    );
    revalidatePerformancePaths();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update progress",
    };
  }
}

export async function fetchGoalDetailAction(goalId: string): Promise<GoalDetail | null> {
  const profile = await requireServerPermission("performance.view");
  const supabase = await getAuthenticatedSupabase();
  return getGoalById(supabase, profile.employee.organizationId, goalId);
}

export async function createKpiTemplateAction(
  input: unknown,
): Promise<PerformanceActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission([
      "kpi.manage",
      "performance.settings",
      "performance.create",
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = kpiTemplateFormSchema.parse(input);
    const id = await createKpiTemplate(supabase, profile, parsed);
    revalidatePath(PERFORMANCE_ROUTES.kpis);
    revalidatePath(PERFORMANCE_ROUTES.dashboard);
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create KPI template",
    };
  }
}

export async function assignKpiAction(input: unknown): Promise<PerformanceActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission(["kpi.manage", "performance.create"]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = kpiAssignFormSchema.parse(input);
    const id = await assignKpi(supabase, profile, parsed);
    revalidatePath(PERFORMANCE_ROUTES.kpis);
    revalidatePath(PERFORMANCE_ROUTES.dashboard);
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to assign KPI",
    };
  }
}

export async function updateKpiProgressAction(
  input: unknown,
): Promise<PerformanceActionResult<void>> {
  try {
    const profile = await requireServerAnyPermission([
      "kpi.progress",
      "kpi.manage",
      "performance.edit",
      "performance.review",
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = kpiProgressSchema.parse(input);
    await updateKpiProgress(supabase, profile, parsed);
    revalidatePath(PERFORMANCE_ROUTES.kpis);
    revalidatePath(PERFORMANCE_ROUTES.dashboard);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update KPI",
    };
  }
}

export async function createReviewAction(
  input: unknown,
): Promise<PerformanceActionResult<string>> {
  try {
    const profile = await requireServerPermission("performance.review");
    const supabase = await getAuthenticatedSupabase();
    reviewFormSchema.parse(input);
    const id = await createReview(supabase, profile, input);
    revalidatePath(PERFORMANCE_ROUTES.reviews);
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create review",
    };
  }
}

export async function submitReviewAction(
  input: unknown,
): Promise<PerformanceActionResult<void>> {
  try {
    const profile = await requireServerPermission("performance.review");
    const supabase = await getAuthenticatedSupabase();
    const parsed = reviewSubmitSchema.parse(input);
    await submitReview(supabase, profile, parsed.reviewId, parsed);
    revalidatePath(PERFORMANCE_ROUTES.reviews);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to submit review",
    };
  }
}

export async function approveReviewAction(
  input: unknown,
): Promise<PerformanceActionResult<void>> {
  try {
    const profile = await requireServerPermission("performance.approve");
    const supabase = await getAuthenticatedSupabase();
    const parsed = reviewApprovalSchema.parse(input);
    await approveReviewStep(supabase, profile, parsed.reviewId, parsed.comments);
    revalidatePath(PERFORMANCE_ROUTES.reviews);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to approve review",
    };
  }
}

export async function fetchReviewDetailAction(reviewId: string): Promise<ReviewDetail | null> {
  const profile = await requireServerPermission("performance.view");
  const supabase = await getAuthenticatedSupabase();
  return getReviewById(supabase, profile.employee.organizationId, reviewId);
}

export async function createFeedbackAction(
  input: unknown,
): Promise<PerformanceActionResult<string>> {
  try {
    const profile = await requireServerPermission("performance.feedback");
    const supabase = await getAuthenticatedSupabase();
    const parsed = feedbackFormSchema.parse(input);
    const id = await createFeedback(supabase, profile, parsed);
    revalidatePath(PERFORMANCE_ROUTES.feedback);
    revalidatePath(PERFORMANCE_ROUTES.history);
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send feedback",
    };
  }
}

export async function createOneOnOneAction(
  input: unknown,
): Promise<PerformanceActionResult<string>> {
  try {
    const profile = await requireServerPermission("performance.create");
    const supabase = await getAuthenticatedSupabase();
    const parsed = oneOnOneFormSchema.parse(input);
    const id = await createOneOnOne(supabase, profile, parsed);
    revalidatePath(PERFORMANCE_ROUTES.oneOnOnes);
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to schedule meeting",
    };
  }
}

export async function createPromotionAction(
  input: unknown,
): Promise<PerformanceActionResult<string>> {
  try {
    const profile = await requireServerPermission("performance.create");
    const supabase = await getAuthenticatedSupabase();
    const parsed = promotionFormSchema.parse(input);
    const id = await createPromotion(supabase, profile, parsed);
    revalidatePath(PERFORMANCE_ROUTES.promotions);
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create promotion",
    };
  }
}

export async function approvePromotionAction(
  input: unknown,
): Promise<PerformanceActionResult<void>> {
  try {
    const profile = await requireServerPermission("performance.approve");
    const supabase = await getAuthenticatedSupabase();
    const parsed = promotionApprovalSchema.parse(input);
    await approvePromotionStep(supabase, profile, parsed.promotionId, parsed.comments);
    revalidatePath(PERFORMANCE_ROUTES.promotions);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to approve promotion",
    };
  }
}

export async function fetchPerformanceSettingsAction(): Promise<PerformanceSettingsRecord> {
  const profile = await requireServerPermission("performance.view");
  const supabase = await getAuthenticatedSupabase();
  return getPerformanceSettings(supabase, profile.employee.organizationId);
}

export async function savePerformanceSettingsAction(
  input: unknown,
): Promise<PerformanceActionResult<PerformanceSettingsRecord>> {
  try {
    const profile = await requireServerPermission("performance.settings");
    const supabase = await getAuthenticatedSupabase();
    const parsed = performanceSettingsSchema.parse(input);
    const data = await savePerformanceSettings(supabase, profile, parsed);
    revalidatePath(PERFORMANCE_ROUTES.settings);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save settings",
    };
  }
}

export type {
  GoalListResult,
  KpiListResult,
  ReviewListResult,
  FeedbackListResult,
  OneOnOneListResult,
  PromotionListResult,
  HistoryListResult,
  KpiTemplateItem,
};

export {
  listGoals,
  listKpis,
  listKpiTemplates,
  listReviews,
  listFeedback,
  listOneOnOnes,
  listPromotions,
  listPerformanceHistory,
};
