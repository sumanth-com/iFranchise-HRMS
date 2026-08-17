import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { GoalDetail, OneOnOneDetail, ReviewDetail } from "@/types/performance";
import {
  goalFormSchema,
  reviewFormSchema,
} from "@/lib/validations/performance";
import {
  agendaWithEmbeddedMeetingLink,
  extractMeetingLinkFromAgenda,
  isMissingMeetingLinkColumnError,
} from "@/lib/performance/services/performance-meeting-link";
import {
  calculateKpiCompletion,
  deriveKpiStatus,
  formatEmployeeName,
  fromHrms,
  unwrapRelation,
} from "@/lib/performance/services/performance-utils";
import { PERFORMANCE_ROUTES } from "@/lib/performance/constants";
import { emitHrmsWebhook } from "@/lib/public-api/emit";
import { notifyPerformanceGoalAssigned } from "@/lib/performance/services/performance-notifications";
import { notifyEmployee } from "@/lib/notifications/services/notification-service";
import { getEmployeeSalaryStructure } from "@/lib/employees/services/employee-detail";
import {
  applyPromotionCompensation,
  applyPromotionSalary,
} from "@/lib/performance/services/performance-promotion-apply";
import { assertManagerTeamEmployee } from "@/lib/manager/portal-scope";
import type { z } from "zod";

const REVIEW_STAGES = ["self", "manager", "hr", "final"] as const;

export async function createGoal(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: unknown,
): Promise<string> {
  const parsed = goalFormSchema.parse(input);
  const organizationId = profile.employee.organizationId;
  await assertManagerTeamEmployee(supabase, profile, parsed.employeeId);

  const { data, error } = await fromHrms(supabase, "performance_goals")
    .insert({
      organization_id: organizationId,
      employee_id: parsed.employeeId,
      cycle_id: parsed.cycleId ?? null,
      title: parsed.title,
      description: parsed.description ?? null,
      category: parsed.category ?? null,
      goal_priority: parsed.goalPriority,
      weightage: parsed.weightage,
      target_value: parsed.targetValue ?? null,
      current_progress: parsed.currentProgress,
      due_date: parsed.dueDate ?? null,
      goal_status: parsed.goalStatus,
      attachment_path: parsed.attachmentPath ?? null,
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (parsed.milestones?.length) {
    const { error: milestoneError } = await fromHrms(supabase, "performance_goal_milestones")
      .insert(
        parsed.milestones.map((m) => ({
          goal_id: data.id,
          title: m.title,
          due_date: m.dueDate ?? null,
          created_by: profile.userId,
          updated_by: profile.userId,
        })),
      );
    if (milestoneError) throw new Error(milestoneError.message);
  }

  try {
    await notifyPerformanceGoalAssigned(
      supabase,
      profile,
      parsed.employeeId,
      data.id,
      parsed.title,
    );
  } catch (notifyError) {
    console.error("[createGoal] goal assigned notification failed:", notifyError);
  }

  return data.id;
}

export async function addGoalComment(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  goalId: string,
  comment: string,
): Promise<void> {
  const { error } = await fromHrms(supabase, "performance_goal_comments").insert({
    goal_id: goalId,
    author_employee_id: profile.employee.id,
    comment,
    created_by: profile.userId,
    updated_by: profile.userId,
  });
  if (error) throw new Error(error.message);
}

export async function updateGoalProgress(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  goalId: string,
  currentProgress: number,
  goalStatus?: string,
): Promise<void> {
  const { error } = await fromHrms(supabase, "performance_goals")
    .update({
      current_progress: currentProgress,
      ...(goalStatus ? { goal_status: goalStatus } : {}),
      updated_by: profile.userId,
    })
    .eq("id", goalId)
    .eq("organization_id", profile.employee.organizationId);

  if (error) throw new Error(error.message);
}

export async function toggleGoalMilestone(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  goalId: string,
  milestoneId: string,
  isCompleted: boolean,
): Promise<void> {
  const { data: goal, error: goalError } = await fromHrms(supabase, "performance_goals")
    .select("id")
    .eq("id", goalId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (goalError) throw new Error(goalError.message);
  if (!goal) throw new Error("Goal not found");

  const { error } = await fromHrms(supabase, "performance_goal_milestones")
    .update({
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq("id", milestoneId)
    .eq("goal_id", goalId);

  if (error) throw new Error(error.message);
}

export async function updateGoal(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  goalId: string,
  input: z.infer<typeof goalFormSchema>,
): Promise<void> {
  const parsed = goalFormSchema.parse(input);
  await assertManagerTeamEmployee(supabase, profile, parsed.employeeId);

  const { error } = await fromHrms(supabase, "performance_goals")
    .update({
      employee_id: parsed.employeeId,
      cycle_id: parsed.cycleId ?? null,
      title: parsed.title,
      description: parsed.description ?? null,
      category: parsed.category ?? null,
      goal_priority: parsed.goalPriority,
      weightage: parsed.weightage,
      target_value: parsed.targetValue ?? null,
      current_progress: parsed.currentProgress,
      due_date: parsed.dueDate ?? null,
      goal_status: parsed.goalStatus,
      attachment_path: parsed.attachmentPath ?? null,
      updated_by: profile.userId,
    })
    .eq("id", goalId)
    .eq("organization_id", profile.employee.organizationId);

  if (error) throw new Error(error.message);
}

export async function deleteGoal(
  supabase: AuthSupabaseClient,
  _profile: UserProfile,
  goalId: string,
): Promise<void> {
  const { data, error } = await supabase.schema("hrms").rpc("soft_delete_performance_goal", {
    p_goal_id: goalId,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Goal not found or already deleted.");
}

export async function saveReviewDraft(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  reviewId: string,
  input: {
    overallRating?: number;
    comments?: string;
    strengths?: string;
    weaknesses?: string;
    improvementPlan?: string;
  },
): Promise<void> {
  const { error } = await fromHrms(supabase, "performance_reviews")
    .update({
      overall_rating: input.overallRating ?? null,
      comments: input.comments ?? null,
      strengths: input.strengths ?? null,
      weaknesses: input.weaknesses ?? null,
      improvement_plan: input.improvementPlan ?? null,
      review_status: "in_progress",
      updated_by: profile.userId,
    })
    .eq("id", reviewId)
    .eq("organization_id", profile.employee.organizationId);

  if (error) throw new Error(error.message);
}

export async function updateOneOnOne(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  meetingId: string,
  input: {
    agenda?: string;
    meetingLink?: string | null;
    followUpDate?: string | null;
    meetingStatus?: string;
  },
): Promise<void> {
  const { error } = await fromHrms(supabase, "performance_one_on_ones")
    .update({
      agenda: input.agenda ?? null,
      meeting_link: input.meetingLink ?? null,
      follow_up_date: input.followUpDate ?? null,
      ...(input.meetingStatus ? { meeting_status: input.meetingStatus } : {}),
      updated_by: profile.userId,
    })
    .eq("id", meetingId)
    .eq("organization_id", profile.employee.organizationId);

  if (error && isMissingMeetingLinkColumnError(error.message)) {
    const agenda = agendaWithEmbeddedMeetingLink(input.agenda, input.meetingLink);
    const { error: retryError } = await fromHrms(supabase, "performance_one_on_ones")
      .update({
        agenda,
        follow_up_date: input.followUpDate ?? null,
        ...(input.meetingStatus ? { meeting_status: input.meetingStatus } : {}),
        updated_by: profile.userId,
      })
      .eq("id", meetingId)
      .eq("organization_id", profile.employee.organizationId);
    if (retryError) throw new Error(retryError.message);
    return;
  }

  if (error) throw new Error(error.message);
}

export async function createKpiTemplate(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof import("@/lib/validations/performance").kpiTemplateFormSchema>,
): Promise<string> {
  const { data, error } = await fromHrms(supabase, "performance_kpi_templates")
    .insert({
      organization_id: profile.employee.organizationId,
      department_id: input.departmentId ?? null,
      designation_id: input.designationId ?? null,
      name: input.name,
      description: input.description ?? null,
      measurement_type: input.measurementType,
      weightage: input.weightage,
      kpi_period: input.kpiPeriod,
      target_value: input.targetValue ?? null,
      is_active: input.isActive,
      status: input.isActive ? "active" : "inactive",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function assignKpi(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof import("@/lib/validations/performance").kpiAssignPayloadSchema>,
): Promise<string> {
  await assertManagerTeamEmployee(supabase, profile, input.employeeId);
  const { data: template, error: templateError } = await fromHrms(supabase, "performance_kpi_templates")
    .select(
      "id, name, description, weightage, kpi_period, target_value, measurement_type, is_active, status",
    )
    .eq("id", input.templateId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (templateError) throw new Error(templateError.message);
  if (!template) throw new Error("KPI template not found");
  if (!template.is_active || template.status === "inactive") {
    throw new Error("Selected KPI template is inactive");
  }

  const { data: employee, error: employeeError } = await supabase
    .schema("hrms")
    .from("employees")
    .select("id, reporting_manager_id")
    .eq("id", input.employeeId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);
  if (!employee) throw new Error("Employee not found");

  const { data, error } = await fromHrms(supabase, "performance_kpis")
    .insert({
      organization_id: profile.employee.organizationId,
      employee_id: input.employeeId,
      template_id: template.id,
      title: template.name,
      description: template.description,
      measurement_type: template.measurement_type,
      weightage: template.weightage,
      target_value: template.target_value,
      current_value: 0,
      completion_percentage: 0,
      kpi_period: template.kpi_period,
      kpi_status: "not_started",
      start_date: input.startDate,
      end_date: input.endDate,
      manager_employee_id: employee.reporting_manager_id,
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteKpi(
  supabase: AuthSupabaseClient,
  _profile: UserProfile,
  kpiId: string,
): Promise<void> {
  const { data, error } = await supabase.schema("hrms").rpc("soft_delete_performance_kpi", {
    p_kpi_id: kpiId,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("KPI not found or already deleted.");
}

export async function updateKpiProgress(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof import("@/lib/validations/performance").kpiProgressSchema>,
): Promise<void> {
  const { data: kpi, error: fetchError } = await fromHrms(supabase, "performance_kpis")
    .select(
      "id, employee_id, target_value, measurement_type, end_date, manager_employee_id, employees:employee_id(reporting_manager_id)",
    )
    .eq("id", input.kpiId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!kpi) throw new Error("KPI assignment not found");

  const employee = unwrapRelation(kpi.employees as { reporting_manager_id: string | null } | null);
  const canManage = profile.permissionCodes.some((code) =>
    ["kpi.manage", "performance.create", "performance.settings"].includes(code),
  );
  const isManager =
    kpi.manager_employee_id === profile.employee.id ||
    employee?.reporting_manager_id === profile.employee.id;
  const isSelf = kpi.employee_id === profile.employee.id;

  if (!canManage && !isManager && !isSelf) {
    throw new Error("You do not have permission to update this KPI");
  }
  if (isSelf && !canManage && !isManager) {
    throw new Error("Employees can view KPIs but cannot update progress");
  }

  const completion = calculateKpiCompletion(
    input.currentValue,
    kpi.target_value !== null ? Number(kpi.target_value) : null,
    kpi.measurement_type,
  );
  const kpiStatus = deriveKpiStatus(
    completion,
    kpi.end_date,
    input.currentValue,
  );

  const { error } = await fromHrms(supabase, "performance_kpis")
    .update({
      current_value: input.currentValue,
      completion_percentage: completion,
      kpi_status: kpiStatus,
      progress_comments: input.progressComments ?? null,
      evidence_notes: input.evidenceNotes ?? null,
      last_progress_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", input.kpiId)
    .eq("organization_id", profile.employee.organizationId);

  if (error) throw new Error(error.message);
}

export async function createReview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: unknown,
): Promise<string> {
  const parsed = reviewFormSchema.parse(input);
  const organizationId = profile.employee.organizationId;
  await assertManagerTeamEmployee(supabase, profile, parsed.employeeId);

  const { data, error } = await fromHrms(supabase, "performance_reviews")
    .insert({
      organization_id: organizationId,
      employee_id: parsed.employeeId,
      cycle_id: parsed.cycleId ?? null,
      reviewer_employee_id: profile.employee.id,
      review_stage: parsed.reviewStage,
      review_status: "pending",
      overall_rating: parsed.overallRating ?? null,
      comments: parsed.comments ?? null,
      strengths: parsed.strengths ?? null,
      weaknesses: parsed.weaknesses ?? null,
      improvement_plan: parsed.improvementPlan ?? null,
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const approvalRows = REVIEW_STAGES.map((stage, index) => ({
    review_id: data.id,
    approver_employee_id: profile.employee.id,
    approval_level: index + 1,
    review_stage: stage,
    approval_status: index === 0 ? "pending" : "pending",
    created_by: profile.userId,
    updated_by: profile.userId,
  }));

  const { error: approvalError } = await fromHrms(supabase, "performance_review_approvals")
    .insert(approvalRows);

  if (approvalError) throw new Error(approvalError.message);
  return data.id;
}

export async function submitReview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  reviewId: string,
  input: {
    overallRating?: number;
    comments?: string;
    strengths?: string;
    weaknesses?: string;
    improvementPlan?: string;
  },
): Promise<void> {
  const { error } = await fromHrms(supabase, "performance_reviews")
    .update({
      overall_rating: input.overallRating,
      comments: input.comments ?? null,
      strengths: input.strengths ?? null,
      weaknesses: input.weaknesses ?? null,
      improvement_plan: input.improvementPlan ?? null,
      review_status: "submitted",
      submitted_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", reviewId)
    .eq("organization_id", profile.employee.organizationId);

  if (error) throw new Error(error.message);
}

export async function approveReviewStep(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  reviewId: string,
  comments?: string,
): Promise<void> {
  const { data: pending, error: pendingError } = await fromHrms(supabase, "performance_review_approvals")
    .select("id, approval_level")
    .eq("review_id", reviewId)
    .eq("approval_status", "pending")
    .is("deleted_at", null)
    .order("approval_level")
    .limit(1)
    .maybeSingle();

  if (pendingError) throw new Error(pendingError.message);

  if (pending) {
    const { error } = await fromHrms(supabase, "performance_review_approvals")
      .update({
        approval_status: "approved",
        approver_employee_id: profile.employee.id,
        comments: comments ?? null,
        acted_at: new Date().toISOString(),
        updated_by: profile.userId,
      })
      .eq("id", pending.id);

    if (error) throw new Error(error.message);

    const { data: nextPending } = await fromHrms(supabase, "performance_review_approvals")
      .select("id, review_stage")
      .eq("review_id", reviewId)
      .eq("approval_status", "pending")
      .is("deleted_at", null)
      .order("approval_level")
      .limit(1)
      .maybeSingle();

    if (nextPending) {
      await fromHrms(supabase, "performance_reviews")
        .update({
          review_stage: nextPending.review_stage,
          review_status: "in_progress",
          updated_by: profile.userId,
        })
        .eq("id", reviewId);
    } else {
      await fromHrms(supabase, "performance_reviews")
        .update({
          review_status: "approved",
          review_stage: "final",
          approved_at: new Date().toISOString(),
          updated_by: profile.userId,
        })
        .eq("id", reviewId);
      emitHrmsWebhook(profile.employee.organizationId, "performance.review_completed", {
        id: reviewId,
      });
    }
  } else {
    await fromHrms(supabase, "performance_reviews")
      .update({
        review_status: "approved",
        approved_at: new Date().toISOString(),
        updated_by: profile.userId,
      })
      .eq("id", reviewId);
    emitHrmsWebhook(profile.employee.organizationId, "performance.review_completed", {
      id: reviewId,
    });
  }
}

export async function createFeedback(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof import("@/lib/validations/performance").feedbackFormSchema>,
): Promise<string> {
  await assertManagerTeamEmployee(supabase, profile, input.toEmployeeId);
  const { data, error } = await fromHrms(supabase, "performance_feedback")
    .insert({
      organization_id: profile.employee.organizationId,
      from_employee_id: profile.employee.id,
      to_employee_id: input.toEmployeeId,
      feedback_type: input.feedbackType,
      visibility: "private",
      message: input.message,
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteFeedback(
  supabase: AuthSupabaseClient,
  _profile: UserProfile,
  feedbackId: string,
): Promise<void> {
  const { data, error } = await supabase.schema("hrms").rpc("soft_delete_performance_feedback", {
    p_feedback_id: feedbackId,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Feedback not found or already deleted.");
}

export async function createOneOnOne(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof import("@/lib/validations/performance").oneOnOneFormSchema>,
): Promise<string> {
  await assertManagerTeamEmployee(supabase, profile, input.employeeId);
  const insertPayload = {
    organization_id: profile.employee.organizationId,
    employee_id: input.employeeId,
    manager_employee_id: input.managerEmployeeId,
    scheduled_at: input.scheduledAt,
    agenda: input.agenda ?? null,
    meeting_link: input.meetingLink ?? null,
    follow_up_date: input.followUpDate ?? null,
    meeting_status: input.meetingStatus,
    created_by: profile.userId,
    updated_by: profile.userId,
  };

  let { data, error } = await fromHrms(supabase, "performance_one_on_ones")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error && isMissingMeetingLinkColumnError(error.message)) {
    const fallback = await fromHrms(supabase, "performance_one_on_ones")
      .insert({
        organization_id: profile.employee.organizationId,
        employee_id: input.employeeId,
        manager_employee_id: input.managerEmployeeId,
        scheduled_at: input.scheduledAt,
        agenda: agendaWithEmbeddedMeetingLink(input.agenda, input.meetingLink),
        follow_up_date: input.followUpDate ?? null,
        meeting_status: input.meetingStatus,
        created_by: profile.userId,
        updated_by: profile.userId,
      })
      .select("id")
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw new Error(error.message);

  if (input.actionItems?.length) {
    const { error: actionError } = await fromHrms(supabase, "performance_one_on_one_actions")
      .insert(
        input.actionItems.map((item) => ({
          meeting_id: data.id,
          title: item.title,
          assigned_to_employee_id: item.assignedToEmployeeId ?? null,
          due_date: item.dueDate ?? null,
          created_by: profile.userId,
          updated_by: profile.userId,
        })),
      );
    if (actionError) throw new Error(actionError.message);
  }

  return data.id;
}

export async function deleteOneOnOne(
  supabase: AuthSupabaseClient,
  _profile: UserProfile,
  meetingId: string,
): Promise<void> {
  const { data, error } = await supabase.schema("hrms").rpc("soft_delete_performance_one_on_one", {
    p_meeting_id: meetingId,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Meeting not found or already deleted.");
}

export async function createPromotion(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof import("@/lib/validations/performance").promotionFormSchema>,
): Promise<string> {
  await assertManagerTeamEmployee(supabase, profile, input.employeeId);
  const { data: employee, error: employeeError } = await fromHrms(supabase, "employees")
    .select("designation_id")
    .eq("id", input.employeeId)
    .eq("organization_id", profile.employee.organizationId)
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);

  const salaryStructure = await getEmployeeSalaryStructure(supabase, input.employeeId);
  const currentSalary = input.currentSalary ?? salaryStructure?.grossSalary ?? null;
  const currentDesignationId = input.currentDesignationId ?? employee?.designation_id ?? null;

  const { data, error } = await fromHrms(supabase, "performance_promotions")
    .insert({
      organization_id: profile.employee.organizationId,
      employee_id: input.employeeId,
      recommended_by_employee_id: profile.employee.id,
      current_designation_id: currentDesignationId,
      recommended_designation_id: input.recommendedDesignationId ?? null,
      current_salary: currentSalary,
      recommended_salary: input.recommendedSalary ?? null,
      promotion_status: "pending",
      reason: input.reason ?? null,
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const approvalLevels = [
    { level: 1, role: "manager" },
    { level: 2, role: "hr" },
    { level: 3, role: "final" },
  ];

  const { error: approvalError } = await fromHrms(supabase, "performance_promotion_approvals")
    .insert(
      approvalLevels.map((a) => ({
        promotion_id: data.id,
        approver_employee_id: profile.employee.id,
        approval_level: a.level,
        approval_status: a.level === 1 ? "pending" : "pending",
        created_by: profile.userId,
        updated_by: profile.userId,
      })),
    );

  if (approvalError) throw new Error(approvalError.message);

  return data.id;
}

export async function updatePromotion(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof import("@/lib/validations/performance").promotionUpdateSchema>,
): Promise<void> {
  const { data: existing, error: fetchError } = await fromHrms(supabase, "performance_promotions")
    .select(
      "id, employee_id, promotion_status, recommended_salary, recommended_designation_id, reason",
    )
    .eq("id", input.promotionId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error("Promotion not found or already deleted.");

  if (["rejected", "cancelled"].includes(existing.promotion_status)) {
    throw new Error("Rejected or cancelled promotions cannot be edited.");
  }

  const recommendedSalary =
    input.recommendedSalary !== undefined
      ? input.recommendedSalary
      : existing.recommended_salary !== null
        ? Number(existing.recommended_salary)
        : null;
  const recommendedDesignationId =
    input.recommendedDesignationId !== undefined
      ? input.recommendedDesignationId
      : existing.recommended_designation_id;
  const reason =
    input.reason !== undefined ? input.reason : existing.reason;

  const updates: Record<string, unknown> = {
    updated_by: profile.userId,
  };

  if (input.recommendedDesignationId !== undefined) {
    updates.recommended_designation_id = input.recommendedDesignationId;
  }
  if (input.currentSalary !== undefined) {
    updates.current_salary = input.currentSalary;
  }
  if (input.recommendedSalary !== undefined) {
    updates.recommended_salary = input.recommendedSalary;
  }
  if (input.reason !== undefined) {
    updates.reason = input.reason;
  }

  const { error } = await fromHrms(supabase, "performance_promotions")
    .update(updates)
    .eq("id", input.promotionId);

  if (error) throw new Error(error.message);

  const salaryChanged =
    input.recommendedSalary !== undefined &&
    (existing.recommended_salary === null ||
      roundMoney(Number(existing.recommended_salary)) !== roundMoney(Number(input.recommendedSalary)));

  if (
    salaryChanged &&
    recommendedSalary != null &&
    recommendedSalary > 0 &&
    ["approved", "applied"].includes(existing.promotion_status)
  ) {
    await applyPromotionSalary(
      supabase,
      profile,
      existing.employee_id,
      recommendedSalary,
      reason?.trim() || "Salary revision from updated promotion recommendation",
    );
  }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export async function deletePromotion(
  supabase: AuthSupabaseClient,
  promotionId: string,
): Promise<void> {
  const { data, error } = await supabase.schema("hrms").rpc("soft_delete_performance_promotion", {
    p_promotion_id: promotionId,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Promotion not found or already deleted.");
}

export async function approvePromotionStep(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  promotionId: string,
  comments?: string,
): Promise<void> {
  const { data: pending, error: pendingError } = await fromHrms(supabase, "performance_promotion_approvals")
    .select("id, approval_level")
    .eq("promotion_id", promotionId)
    .eq("approval_status", "pending")
    .is("deleted_at", null)
    .order("approval_level")
    .limit(1)
    .maybeSingle();

  if (pendingError) throw new Error(pendingError.message);

  if (pending) {
    const { error } = await fromHrms(supabase, "performance_promotion_approvals")
      .update({
        approval_status: "approved",
        approver_employee_id: profile.employee.id,
        comments: comments ?? null,
        acted_at: new Date().toISOString(),
        updated_by: profile.userId,
      })
      .eq("id", pending.id);

    if (error) throw new Error(error.message);

    const { data: nextPending } = await fromHrms(supabase, "performance_promotion_approvals")
      .select("id")
      .eq("promotion_id", promotionId)
      .eq("approval_status", "pending")
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    const nextStatus = nextPending ? "recommended" : "approved";
    await fromHrms(supabase, "performance_promotions")
      .update({
        promotion_status: nextStatus,
        approver_employee_id: profile.employee.id,
        approved_at: nextPending ? null : new Date().toISOString(),
        updated_by: profile.userId,
      })
      .eq("id", promotionId);

    if (!nextPending) {
      const { data: promotion } = await fromHrms(supabase, "performance_promotions")
        .select("employee_id, recommended_salary, recommended_designation_id, reason")
        .eq("id", promotionId)
        .maybeSingle();

      if (promotion?.employee_id) {
        await applyPromotionCompensation(supabase, profile, {
          promotionId,
          employeeId: promotion.employee_id,
          recommendedDesignationId: promotion.recommended_designation_id,
          recommendedSalary:
            promotion.recommended_salary != null ? Number(promotion.recommended_salary) : null,
          reason: promotion.reason,
          applyDesignation: true,
          applySalary: true,
        });

        const { autoGenerateLetterForEmployee } = await import(
          "@/lib/documents/services/document-mutations"
        );
        await autoGenerateLetterForEmployee(supabase, profile, {
          employeeId: promotion.employee_id,
          letterType: "promotion_letter",
          salaryOverride:
            promotion.recommended_salary != null
              ? new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                }).format(Number(promotion.recommended_salary))
              : null,
          sourceModule: "performance",
          sourceRecordId: promotionId,
          publishNow: true,
        });

        let designationLabel = "new role";
        if (promotion.recommended_designation_id) {
          const { data: designation } = await fromHrms(supabase, "designations")
            .select("title")
            .eq("id", promotion.recommended_designation_id)
            .maybeSingle();
          if (designation?.title) designationLabel = designation.title;
        }

        await notifyEmployee(supabase, {
          organizationId: profile.employee.organizationId,
          employeeId: promotion.employee_id,
          title: "Promotion approved",
          message: `Your promotion to ${designationLabel} has been approved.`,
          notificationType: "promotion_approved",
          module: "performance",
          priority: "high",
          actionUrl: PERFORMANCE_ROUTES.promotions,
          sourceEventKey: `promotion_approved:${promotionId}`,
          templateKey: "promotion_approved",
          templateVariables: { designation: designationLabel },
          createdBy: profile.userId,
        });
      }
    }
  }
}

export async function approvePromotionFully(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  promotionId: string,
  comments?: string,
): Promise<void> {
  const maxSteps = 10;
  for (let step = 0; step < maxSteps; step += 1) {
    const { data: pending, error } = await fromHrms(supabase, "performance_promotion_approvals")
      .select("id")
      .eq("promotion_id", promotionId)
      .eq("approval_status", "pending")
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!pending) break;

    await approvePromotionStep(supabase, profile, promotionId, comments);
  }
}

export async function getGoalById(
  supabase: AuthSupabaseClient,
  organizationId: string,
  goalId: string,
): Promise<GoalDetail | null> {
  const { data, error } = await fromHrms(supabase, "performance_goals")
    .select(
      `*, employees:employee_id!inner(employee_code, first_name, last_name, department_id, departments:department_id(name)),
      performance_review_cycles:cycle_id(name),
      performance_goal_milestones(id, title, due_date, is_completed, completed_at),
      performance_goal_comments(id, comment, created_at, author:author_employee_id(first_name, last_name))`,
    )
    .eq("id", goalId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const emp = unwrapRelation(data.employees);
  const dept = unwrapRelation(emp?.departments ?? null);
  const cycle = unwrapRelation(data.performance_review_cycles);
  const milestones = (data.performance_goal_milestones ?? []) as Array<{
    id: string;
    title: string;
    due_date: string | null;
    is_completed: boolean;
    completed_at: string | null;
  }>;
  const comments = (data.performance_goal_comments ?? []) as Array<{
    id: string;
    comment: string;
    created_at: string;
    author: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  }>;

  return {
    id: data.id,
    employeeId: data.employee_id,
    employeeName: emp ? formatEmployeeName(emp.first_name, emp.last_name) : "—",
    employeeCode: emp?.employee_code ?? "—",
    departmentName: dept?.name ?? null,
    cycleId: data.cycle_id,
    cycleName: cycle?.name ?? null,
    title: data.title,
    description: data.description,
    category: data.category,
    goalPriority: data.goal_priority,
    weightage: Number(data.weightage),
    currentProgress: Number(data.current_progress),
    dueDate: data.due_date,
    goalStatus: data.goal_status,
    attachmentPath: data.attachment_path,
    milestoneCount: milestones.length,
    completedMilestones: milestones.filter((m) => m.is_completed).length,
    createdAt: data.created_at,
    milestones: milestones.map((m) => ({
      id: m.id,
      title: m.title,
      dueDate: m.due_date,
      isCompleted: m.is_completed,
      completedAt: m.completed_at,
    })),
    comments: comments.map((c) => {
      const author = unwrapRelation(c.author);
      return {
        id: c.id,
        authorName: author ? formatEmployeeName(author.first_name, author.last_name) : "—",
        comment: c.comment,
        createdAt: c.created_at,
      };
    }),
  };
}

export async function getReviewById(
  supabase: AuthSupabaseClient,
  organizationId: string,
  reviewId: string,
): Promise<ReviewDetail | null> {
  const { data, error } = await fromHrms(supabase, "performance_reviews")
    .select(
      `*, employees:employee_id!inner(employee_code, first_name, last_name, department_id, departments:department_id(name)),
      performance_review_cycles:cycle_id(name),
      reviewer:reviewer_employee_id(first_name, last_name),
      performance_review_approvals(id, approval_level, review_stage, approval_status, comments, acted_at, approver:approver_employee_id(first_name, last_name))`,
    )
    .eq("id", reviewId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const emp = unwrapRelation(data.employees);
  const dept = unwrapRelation(emp?.departments ?? null);
  const cycle = unwrapRelation(data.performance_review_cycles);
  const reviewer = unwrapRelation(data.reviewer);
  const approvals = (data.performance_review_approvals ?? []) as Array<{
    id: string;
    approval_level: number;
    review_stage: string;
    approval_status: string;
    comments: string | null;
    acted_at: string | null;
    approver: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  }>;

  return {
    id: data.id,
    employeeId: data.employee_id,
    employeeName: emp ? formatEmployeeName(emp.first_name, emp.last_name) : "—",
    employeeCode: emp?.employee_code ?? "—",
    departmentName: dept?.name ?? null,
    cycleId: data.cycle_id,
    cycleName: cycle?.name ?? null,
    reviewStage: data.review_stage,
    reviewStatus: data.review_status,
    overallRating: data.overall_rating,
    reviewerName: reviewer ? formatEmployeeName(reviewer.first_name, reviewer.last_name) : null,
    submittedAt: data.submitted_at,
    createdAt: data.created_at,
    comments: data.comments,
    strengths: data.strengths,
    weaknesses: data.weaknesses,
    improvementPlan: data.improvement_plan,
    approvals: approvals.map((a) => {
      const approver = unwrapRelation(a.approver);
      return {
        id: a.id,
        approvalLevel: a.approval_level,
        reviewStage: a.review_stage as ReviewDetail["reviewStage"],
        approvalStatus: a.approval_status as ReviewDetail["approvals"][0]["approvalStatus"],
        approverName: approver ? formatEmployeeName(approver.first_name, approver.last_name) : "—",
        comments: a.comments,
        actedAt: a.acted_at,
      };
    }),
  };
}

export async function getOneOnOneById(
  supabase: AuthSupabaseClient,
  organizationId: string,
  meetingId: string,
): Promise<OneOnOneDetail | null> {
  const { data, error } = await fromHrms(supabase, "performance_one_on_ones")
    .select(
      `*, employee:employee_id(first_name, last_name),
      manager:manager_employee_id(first_name, last_name),
      performance_one_on_one_actions(id, title, due_date, is_completed, assignee:assigned_to_employee_id(first_name, last_name))`,
    )
    .eq("id", meetingId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const employee = unwrapRelation(data.employee);
  const manager = unwrapRelation(data.manager);
  const actions = (data.performance_one_on_one_actions ?? []) as Array<{
    id: string;
    title: string;
    due_date: string | null;
    is_completed: boolean;
    assignee: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  }>;

  const completedActions = actions.filter((a) => a.is_completed).length;
  const parsedAgenda = extractMeetingLinkFromAgenda(
    data.agenda,
    (data as { meeting_link?: string | null }).meeting_link,
  );

  return {
    id: data.id,
    employeeId: data.employee_id,
    employeeName: employee ? formatEmployeeName(employee.first_name, employee.last_name) : "—",
    managerName: manager ? formatEmployeeName(manager.first_name, manager.last_name) : "—",
    scheduledAt: data.scheduled_at,
    agenda: parsedAgenda.agenda,
    meetingLink: parsedAgenda.meetingLink,
    notes: data.notes,
    followUpDate: data.follow_up_date,
    meetingStatus: data.meeting_status,
    actionItemCount: actions.length,
    completedActions,
    createdAt: data.created_at,
    actions: actions.map((a) => {
      const assignee = unwrapRelation(a.assignee);
      return {
        id: a.id,
        title: a.title,
        dueDate: a.due_date,
        isCompleted: a.is_completed,
        assignedToName: assignee ? formatEmployeeName(assignee.first_name, assignee.last_name) : null,
      };
    }),
  };
}
