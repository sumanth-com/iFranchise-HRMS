import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { PERFORMANCE_ROUTES } from "@/lib/performance/constants";
import { notifyEmployee } from "@/lib/notifications/services/notification-service";
import type { UserProfile } from "@/types/auth";

export async function notifyPerformanceReviewDue(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  managerEmployeeId: string,
  reviewId: string,
  employeeId: string,
  employeeName: string,
) {
  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId: managerEmployeeId,
    title: "Performance review due",
    message: `A performance review for ${employeeName} is pending your action.`,
    notificationType: "performance_review_due",
    module: "performance",
    priority: "high",
    actionUrl: `${MANAGER_ROUTES.performance}?employeeId=${employeeId}&tab=review`,
    sourceEventKey: `performance_review_due:${reviewId}:${managerEmployeeId}`,
    templateKey: "performance_review_due",
    createdBy: profile.userId,
  });
}

export async function notifyPerformanceReviewPublished(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
  reviewId: string,
) {
  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId,
    title: "Performance review published",
    message: "Your manager has submitted your performance review.",
    notificationType: "performance_review_published",
    module: "performance",
    priority: "medium",
    actionUrl: PERFORMANCE_ROUTES.reviewDetail(reviewId),
    sourceEventKey: `performance_review_published:${reviewId}:${employeeId}`,
    templateKey: "performance_review_published",
    createdBy: profile.userId,
  });
}

export async function notifyPerformanceGoalAssigned(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
  goalId: string,
  goalTitle: string,
) {
  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId,
    title: "New goal assigned",
    message: `Your manager assigned a new goal: ${goalTitle}.`,
    notificationType: "performance_goal_assigned",
    module: "performance",
    priority: "medium",
    actionUrl: PERFORMANCE_ROUTES.goals,
    sourceEventKey: `performance_goal_assigned:${goalId}:${employeeId}`,
    templateKey: "performance_goal_assigned",
    createdBy: profile.userId,
  });
}

export async function notifyPerformanceGoalOverdue(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  managerEmployeeId: string,
  goalId: string,
  employeeName: string,
  goalTitle: string,
) {
  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId: managerEmployeeId,
    title: "Team goal overdue",
    message: `${employeeName}'s goal "${goalTitle}" is overdue.`,
    notificationType: "performance_goal_overdue",
    module: "performance",
    priority: "high",
    actionUrl: MANAGER_ROUTES.performance,
    sourceEventKey: `performance_goal_overdue:${goalId}:${managerEmployeeId}`,
    templateKey: "performance_goal_overdue",
    createdBy: profile.userId,
  });
}

export async function notifyPerformanceFeedbackAdded(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
  feedbackId: string,
) {
  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId,
    title: "New performance feedback",
    message: "Your manager added new feedback for you.",
    notificationType: "performance_feedback_added",
    module: "performance",
    priority: "medium",
    actionUrl: PERFORMANCE_ROUTES.feedback,
    sourceEventKey: `performance_feedback_added:${feedbackId}:${employeeId}`,
    templateKey: "performance_feedback_added",
    createdBy: profile.userId,
  });
}

export async function notifyPerformanceOneOnOneScheduled(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
  meetingId: string,
  scheduledAt: string,
) {
  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId,
    title: "1:1 meeting scheduled",
    message: `Your manager scheduled a 1:1 meeting on ${new Date(scheduledAt).toLocaleString("en-IN")}.`,
    notificationType: "performance_one_on_one_scheduled",
    module: "performance",
    priority: "medium",
    actionUrl: PERFORMANCE_ROUTES.oneOnOnes,
    sourceEventKey: `performance_one_on_one_scheduled:${meetingId}:${employeeId}`,
    templateKey: "performance_one_on_one_scheduled",
    createdBy: profile.userId,
  });
}
