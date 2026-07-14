import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  createFeedback,
  createGoal,
  createOneOnOne,
  createPromotion,
  createReview,
  saveReviewDraft,
  submitReview,
  updateGoal,
  updateGoalProgress,
  updateOneOnOne,
} from "@/lib/performance/services/performance-mutations";
import {
  notifyPerformanceFeedbackAdded,
  notifyPerformanceGoalAssigned,
  notifyPerformanceOneOnOneScheduled,
  notifyPerformanceReviewDue,
  notifyPerformanceReviewPublished,
} from "@/lib/performance/services/performance-notifications";
import { serializeReviewCommentsPayload } from "@/lib/manager/services/performance-competency-utils";
import { assertTeamMember } from "@/lib/manager/services/team-queries";
import {
  teamPerformanceGoalUpdateSchema,
  teamPerformanceReviewDraftSchema,
  teamPerformanceReviewStartSchema,
  teamPerformanceReviewSubmitSchema,
} from "@/lib/validations/manager-performance";
import {
  feedbackFormSchema,
  goalFormSchema,
  goalProgressSchema,
  oneOnOneFormSchema,
  promotionFormSchema,
} from "@/lib/validations/performance";
import type { UserProfile } from "@/types/auth";

async function assertTeamReview(
  supabase: AuthSupabaseClient,
  teamIds: string[],
  reviewId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("performance_reviews")
    .select("employee_id")
    .eq("id", reviewId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Review not found.");
  assertTeamMember(teamIds, data.employee_id);
  return data;
}

async function assertTeamGoal(
  supabase: AuthSupabaseClient,
  teamIds: string[],
  goalId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("performance_goals")
    .select("employee_id, title")
    .eq("id", goalId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Goal not found.");
  assertTeamMember(teamIds, data.employee_id);
  return data;
}

export async function createTeamPerformanceGoal(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  input: unknown,
) {
  const parsed = goalFormSchema.parse(input);
  assertTeamMember(teamIds, parsed.employeeId);
  const goalId = await createGoal(supabase, profile, parsed);
  await notifyPerformanceGoalAssigned(
    supabase,
    profile,
    parsed.employeeId,
    goalId,
    parsed.title,
  );
  return { success: true as const, message: "Goal created.", data: goalId };
}

export async function updateTeamPerformanceGoal(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  input: unknown,
) {
  const parsed = teamPerformanceGoalUpdateSchema.parse(input);
  await assertTeamGoal(supabase, teamIds, parsed.goalId);
  assertTeamMember(teamIds, parsed.employeeId);
  const { goalId, ...goalInput } = parsed;
  await updateGoal(supabase, profile, goalId, goalInput);
  return { success: true as const, message: "Goal updated." };
}

export async function updateTeamGoalProgress(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  input: unknown,
) {
  const parsed = goalProgressSchema.parse(input);
  await assertTeamGoal(supabase, teamIds, parsed.goalId);
  await updateGoalProgress(
    supabase,
    profile,
    parsed.goalId,
    parsed.currentProgress,
    parsed.goalStatus,
  );
  return { success: true as const, message: "Goal progress updated." };
}

export async function startTeamPerformanceReview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  input: unknown,
) {
  const parsed = teamPerformanceReviewStartSchema.parse(input);
  assertTeamMember(teamIds, parsed.employeeId);

  const reviewId = await createReview(supabase, profile, {
    employeeId: parsed.employeeId,
    cycleId: parsed.cycleId ?? null,
    reviewStage: "manager",
    overallRating: null,
  });

  const { data: employee } = await supabase
    .schema("hrms")
    .from("employees")
    .select("first_name, last_name")
    .eq("id", parsed.employeeId)
    .maybeSingle();

  const employeeName = employee
    ? `${employee.first_name} ${employee.last_name}`
    : "team member";

  await notifyPerformanceReviewDue(
    supabase,
    profile,
    profile.employee.id,
    reviewId,
    parsed.employeeId,
    employeeName,
  );

  return { success: true as const, message: "Review started.", data: reviewId };
}

function buildReviewPayload(parsed: {
  competencies?: Record<string, number | undefined>;
  managerNotes?: string;
  recommendPromotion?: boolean;
  recommendTraining?: boolean;
  recommendPip?: boolean;
  strengths?: string;
  weaknesses?: string;
  improvementPlan?: string;
  overallRating?: number;
}) {
  const comments = serializeReviewCommentsPayload({
    competencies: parsed.competencies,
    managerNotes: parsed.managerNotes ?? null,
    recommendPromotion: parsed.recommendPromotion,
    recommendTraining: parsed.recommendTraining,
    recommendPip: parsed.recommendPip,
  });

  return {
    overallRating: parsed.overallRating,
    comments,
    strengths: parsed.strengths,
    weaknesses: parsed.weaknesses,
    improvementPlan: parsed.improvementPlan,
  };
}

export async function saveTeamPerformanceReviewDraft(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  input: unknown,
) {
  const parsed = teamPerformanceReviewDraftSchema.parse(input);
  const review = await assertTeamReview(supabase, teamIds, parsed.reviewId);
  await saveReviewDraft(supabase, profile, parsed.reviewId, buildReviewPayload(parsed));
  return { success: true as const, message: "Review draft saved.", employeeId: review.employee_id };
}

export async function submitTeamPerformanceReview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  input: unknown,
) {
  const parsed = teamPerformanceReviewSubmitSchema.parse(input);
  const review = await assertTeamReview(supabase, teamIds, parsed.reviewId);
  const payload = buildReviewPayload(parsed);
  await saveReviewDraft(supabase, profile, parsed.reviewId, payload);
  await submitReview(supabase, profile, parsed.reviewId, payload);
  await notifyPerformanceReviewPublished(
    supabase,
    profile,
    review.employee_id,
    parsed.reviewId,
  );
  return { success: true as const, message: "Review submitted." };
}

export async function createTeamPerformanceFeedback(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  input: unknown,
) {
  const parsed = feedbackFormSchema.parse(input);
  assertTeamMember(teamIds, parsed.toEmployeeId);
  const feedbackId = await createFeedback(supabase, profile, parsed);
  await notifyPerformanceFeedbackAdded(
    supabase,
    profile,
    parsed.toEmployeeId,
    feedbackId,
  );
  return { success: true as const, message: "Feedback added.", data: feedbackId };
}

export async function createTeamPerformanceOneOnOne(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  input: unknown,
) {
  const parsed = oneOnOneFormSchema.parse(input);
  assertTeamMember(teamIds, parsed.employeeId);
  const meetingId = await createOneOnOne(supabase, profile, parsed);
  await notifyPerformanceOneOnOneScheduled(
    supabase,
    profile,
    parsed.employeeId,
    meetingId,
    parsed.scheduledAt,
  );
  return { success: true as const, message: "1:1 scheduled.", data: meetingId };
}

export async function updateTeamPerformanceOneOnOne(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  meetingId: string,
  input: {
    notes?: string;
    agenda?: string;
    followUpDate?: string | null;
    meetingStatus?: string;
  },
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("performance_one_on_ones")
    .select("employee_id")
    .eq("id", meetingId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Meeting not found.");
  assertTeamMember(teamIds, data.employee_id);
  await updateOneOnOne(supabase, profile, meetingId, input);
  return { success: true as const, message: "Meeting updated." };
}

export async function createTeamPerformancePromotion(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  input: unknown,
) {
  const parsed = promotionFormSchema.parse(input);
  assertTeamMember(teamIds, parsed.employeeId);
  const promotionId = await createPromotion(supabase, profile, parsed);
  return { success: true as const, message: "Promotion recommended.", data: promotionId };
}
