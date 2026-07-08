import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { GoalDetail, ReviewDetail } from "@/types/performance";
import {
  goalFormSchema,
  reviewFormSchema,
} from "@/lib/validations/performance";
import {
  calculateKpiCompletion,
  deriveKpiStatus,
  formatEmployeeName,
  fromHrms,
  unwrapRelation,
} from "@/lib/performance/services/performance-utils";
import type { z } from "zod";

const REVIEW_STAGES = ["self", "manager", "hr", "final"] as const;

export async function createGoal(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: unknown,
): Promise<string> {
  const parsed = goalFormSchema.parse(input);
  const organizationId = profile.employee.organizationId;

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
  input: z.infer<typeof import("@/lib/validations/performance").kpiAssignFormSchema>,
): Promise<string> {
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
    }
  } else {
    await fromHrms(supabase, "performance_reviews")
      .update({
        review_status: "approved",
        approved_at: new Date().toISOString(),
        updated_by: profile.userId,
      })
      .eq("id", reviewId);
  }
}

export async function createFeedback(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof import("@/lib/validations/performance").feedbackFormSchema>,
): Promise<string> {
  const { data, error } = await fromHrms(supabase, "performance_feedback")
    .insert({
      organization_id: profile.employee.organizationId,
      from_employee_id: profile.employee.id,
      to_employee_id: input.toEmployeeId,
      feedback_type: input.feedbackType,
      visibility: input.visibility,
      message: input.message,
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function createOneOnOne(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof import("@/lib/validations/performance").oneOnOneFormSchema>,
): Promise<string> {
  const { data, error } = await fromHrms(supabase, "performance_one_on_ones")
    .insert({
      organization_id: profile.employee.organizationId,
      employee_id: input.employeeId,
      manager_employee_id: input.managerEmployeeId,
      scheduled_at: input.scheduledAt,
      agenda: input.agenda ?? null,
      notes: input.notes ?? null,
      follow_up_date: input.followUpDate ?? null,
      meeting_status: input.meetingStatus,
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

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

export async function createPromotion(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof import("@/lib/validations/performance").promotionFormSchema>,
): Promise<string> {
  const { data, error } = await fromHrms(supabase, "performance_promotions")
    .insert({
      organization_id: profile.employee.organizationId,
      employee_id: input.employeeId,
      recommended_by_employee_id: profile.employee.id,
      current_designation_id: input.currentDesignationId ?? null,
      recommended_designation_id: input.recommendedDesignationId ?? null,
      current_salary: input.currentSalary ?? null,
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
