"use server";

import { revalidatePath } from "next/cache";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { createClient } from "@/lib/supabase/server";
import { PAYROLL_ROUTES } from "@/lib/payroll/constants";
import { getEmployeeSalaryStructure } from "@/lib/employees/services/employee-detail";
import { fromHrms } from "@/lib/performance/services/performance-utils";
import { ceoOrViewPermission } from "@/lib/ceo/read-only-permissions";
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
  deleteFeedback,
  deleteGoal,
  deleteKpi,
  deleteOneOnOne,
  deletePromotion,
  getGoalById,
  getOneOnOneById,
  getReviewById,
  submitReview,
  toggleGoalMilestone,
  updateGoal,
  updateGoalProgress,
  updateKpiProgress,
  updateOneOnOne,
  updatePromotion,
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
  feedbackDeleteSchema,
  feedbackFormSchema,
  goalCommentSchema,
  goalDeleteSchema,
  goalFormSchema,
  goalMilestoneToggleSchema,
  goalProgressSchema,
  goalUpdateSchema,
  kpiAssignPayloadSchema,
  kpiDeleteSchema,
  kpiProgressSchema,
  kpiTemplateFormSchema,
  oneOnOneDeleteSchema,
  oneOnOneFormSchema,
  oneOnOneUpdateSchema,
  performanceSettingsSchema,
  promotionApprovalSchema,
  promotionDeleteSchema,
  promotionFormSchema,
  promotionUpdateSchema,
  reviewApprovalSchema,
  reviewFormSchema,
  reviewSubmitSchema,
} from "@/lib/validations/performance";
import type {
  GoalDetail,
  GoalListResult,
  KpiListResult,
  OneOnOneDetail,
  PerformanceActionResult,
  PerformanceLookups,
  PerformanceSettingsRecord,
  PerformanceSummary,
  ReviewDetail,
} from "@/types/performance";

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

function revalidatePromotionPayrollPaths() {
  revalidatePath(PERFORMANCE_ROUTES.promotions);
  revalidatePath(EMPLOYEE_ROUTES.payroll);
  revalidatePath(EMPLOYEE_ROUTES.payrollHistory);
  revalidatePath(EMPLOYEE_ROUTES.profile);
  revalidatePath(PAYROLL_ROUTES.salaryStructures);
  revalidatePath(PAYROLL_ROUTES.revisions);
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
  const profile = await requireServerAnyPermission(ceoOrViewPermission("performance.view"));
  const supabase = await getAuthenticatedSupabase();
  return getGoalById(supabase, profile.employee.organizationId, goalId);
}

export async function fetchGoalsListAction(
  params: unknown,
): Promise<PerformanceActionResult<GoalListResult>> {
  try {
    const profile = await requireServerPermission("performance.view");
    const supabase = await getAuthenticatedSupabase();
    const data = await listGoals(supabase, profile, params);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load goals",
    };
  }
}

export async function updateGoalAction(
  input: unknown,
): Promise<PerformanceActionResult<void>> {
  try {
    const profile = await requireServerAnyPermission(["performance.edit", "performance.create"]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = goalUpdateSchema.parse(input);
    const { goalId, ...goalInput } = parsed;
    await updateGoal(supabase, profile, goalId, goalInput);
    revalidatePerformancePaths();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update goal",
    };
  }
}

export async function deleteGoalAction(
  input: unknown,
): Promise<PerformanceActionResult<void>> {
  try {
    const profile = await requireServerAnyPermission(["performance.edit", "performance.create"]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = goalDeleteSchema.parse(input);
    await deleteGoal(supabase, profile, parsed.goalId);
    revalidatePerformancePaths();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete goal",
    };
  }
}

export async function toggleGoalMilestoneAction(
  input: unknown,
): Promise<PerformanceActionResult<void>> {
  try {
    const profile = await requireServerAnyPermission(["performance.edit", "performance.create"]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = goalMilestoneToggleSchema.parse(input);
    await toggleGoalMilestone(
      supabase,
      profile,
      parsed.goalId,
      parsed.milestoneId,
      parsed.isCompleted,
    );
    revalidatePath(PERFORMANCE_ROUTES.goals);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update key result",
    };
  }
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

export async function fetchKpisListAction(
  params: unknown,
): Promise<PerformanceActionResult<KpiListResult>> {
  try {
    const profile = await requireServerPermission("performance.view");
    const supabase = await getAuthenticatedSupabase();
    const data = await listKpis(supabase, profile, params);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load KPIs",
    };
  }
}

export async function assignKpiAction(input: unknown): Promise<PerformanceActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission(["kpi.manage", "performance.create"]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = kpiAssignPayloadSchema.parse(input);
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

export async function deleteKpiAction(
  input: unknown,
): Promise<PerformanceActionResult<void>> {
  try {
    const profile = await requireServerAnyPermission([
      "kpi.manage",
      "performance.edit",
      "performance.create",
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = kpiDeleteSchema.parse(input);
    await deleteKpi(supabase, profile, parsed.kpiId);
    revalidatePerformancePaths();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete KPI",
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

export async function deleteFeedbackAction(
  input: unknown,
): Promise<PerformanceActionResult<void>> {
  try {
    const profile = await requireServerAnyPermission([
      "performance.feedback",
      "performance.edit",
      "performance.create",
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = feedbackDeleteSchema.parse(input);
    await deleteFeedback(supabase, profile, parsed.feedbackId);
    revalidatePerformancePaths();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete feedback",
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

export async function deleteOneOnOneAction(
  input: unknown,
): Promise<PerformanceActionResult<void>> {
  try {
    const profile = await requireServerAnyPermission(["performance.edit", "performance.create"]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = oneOnOneDeleteSchema.parse(input);
    await deleteOneOnOne(supabase, profile, parsed.meetingId);
    revalidatePerformancePaths();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete meeting",
    };
  }
}

export async function updateOneOnOneAction(
  input: unknown,
): Promise<PerformanceActionResult<void>> {
  try {
    const profile = await requireServerAnyPermission(["performance.edit", "performance.create"]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = oneOnOneUpdateSchema.parse(input);
    await updateOneOnOne(supabase, profile, parsed.meetingId, {
      agenda: parsed.agenda,
      meetingLink: parsed.meetingLink,
      followUpDate: parsed.followUpDate,
      meetingStatus: parsed.meetingStatus,
    });
    revalidatePath(PERFORMANCE_ROUTES.oneOnOnes);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update meeting",
    };
  }
}

export async function fetchOneOnOneDetailAction(meetingId: string): Promise<OneOnOneDetail | null> {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    PORTAL_PERMISSIONS.ceo,
    "performance.view",
  ]);
  const supabase = await getAuthenticatedSupabase();
  const detail = await getOneOnOneById(supabase, profile.employee.organizationId, meetingId);
  const canViewOrg =
    profile.permissionCodes.includes("performance.view") ||
    profile.permissionCodes.includes(PORTAL_PERMISSIONS.ceo);
  if (!canViewOrg && detail?.employeeId !== profile.employee.id) {
    return null;
  }
  return detail;
}

export async function createPromotionAction(
  input: unknown,
): Promise<PerformanceActionResult<string>> {
  try {
    const profile = await requireServerPermission("performance.create");
    const supabase = await getAuthenticatedSupabase();
    const parsed = promotionFormSchema.parse(input);
    const id = await createPromotion(supabase, profile, parsed);
    revalidatePromotionPayrollPaths();
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
    revalidatePromotionPayrollPaths();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to approve promotion",
    };
  }
}

export async function updatePromotionAction(
  input: unknown,
): Promise<PerformanceActionResult<void>> {
  try {
    const profile = await requireServerAnyPermission(["performance.edit", "performance.create"]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = promotionUpdateSchema.parse(input);
    await updatePromotion(supabase, profile, parsed);
    revalidatePromotionPayrollPaths();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update promotion",
    };
  }
}

export async function deletePromotionAction(
  input: unknown,
): Promise<PerformanceActionResult<void>> {
  try {
    const profile = await requireServerAnyPermission(["performance.edit", "performance.create"]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = promotionDeleteSchema.parse(input);
    await deletePromotion(supabase, parsed.promotionId);
    revalidatePath(PERFORMANCE_ROUTES.promotions);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete promotion",
    };
  }
}

export async function fetchPromotionEmployeeContextAction(
  employeeId: string,
): Promise<{ designationId: string | null; currentSalary: number | null } | null> {
  const profile = await requireServerPermission("performance.view");
  const supabase = await getAuthenticatedSupabase();

  const { data: employee, error } = await fromHrms(supabase, "employees")
    .select("designation_id")
    .eq("id", employeeId)
    .eq("organization_id", profile.employee.organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!employee) return null;

  const salaryStructure = await getEmployeeSalaryStructure(supabase, employeeId);

  return {
    designationId: employee.designation_id ?? null,
    currentSalary: salaryStructure?.grossSalary ?? null,
  };
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
    const profile = await requireServerAnyPermission(["performance.settings", "settings.edit"]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = performanceSettingsSchema.parse(input);
    const data = await savePerformanceSettings(supabase, profile, parsed);
    revalidatePath(PERFORMANCE_ROUTES.settings);
    revalidatePath("/dashboard/company-settings");
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save settings",
    };
  }
}
