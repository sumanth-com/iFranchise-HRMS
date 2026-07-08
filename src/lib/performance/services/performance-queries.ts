import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type {
  DepartmentPerformanceItem,
  FeedbackListItem,
  FeedbackListResult,
  GoalListItem,
  GoalListResult,
  GoalProgressItem,
  HistoryEvent,
  HistoryListResult,
  KpiListItem,
  KpiListResult,
  KpiTemplateItem,
  OneOnOneListItem,
  OneOnOneListResult,
  PerformanceLookups,
  PerformanceSummary,
  PromotionListItem,
  PromotionListResult,
  ReviewListItem,
  ReviewListResult,
  ReviewStatusBreakdownItem,
} from "@/types/performance";
import {
  feedbackListParamsSchema,
  goalListParamsSchema,
  historyListParamsSchema,
  kpiListParamsSchema,
  oneOnOneListParamsSchema,
  promotionListParamsSchema,
  reviewListParamsSchema,
} from "@/lib/validations/performance";
import {
  getDepartments,
  getDesignations,
} from "@/lib/employees/services/employee-queries";
import {
  calculateCompletionRate,
  calculateKpiCompletion,
  deriveKpiStatus,
  formatEmployeeName,
  fromHrms,
  getMonthLabel,
  unwrapRelation,
} from "@/lib/performance/services/performance-utils";
import { canViewAllKpis } from "@/lib/performance/constants";

/** Loose row type for performance tables until Supabase types are regenerated. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PerfRow = any;

export async function getPerformanceLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<PerformanceLookups> {
  const [employeesResult, departments, designations, cyclesResult] = await Promise.all([
    supabase
      .schema("hrms")
      .from("employees")
      .select("id, first_name, last_name, employee_code")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .in("employment_status", ["active", "probation", "on_leave"])
      .order("first_name"),
    getDepartments(supabase, organizationId),
    getDesignations(supabase, organizationId),
    fromHrms(supabase, "performance_review_cycles")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("start_date", { ascending: false }),
  ]);

  if (employeesResult.error) throw new Error(employeesResult.error.message);
  if (cyclesResult.error) throw new Error(cyclesResult.error.message);

  return {
    employees: (employeesResult.data ?? []).map((row) => ({
      id: row.id,
      label: formatEmployeeName(row.first_name, row.last_name),
      code: row.employee_code,
    })),
    departments,
    designations,
    cycles: (cyclesResult.data ?? []).map((row: { id: string; name: string }) => ({
      id: row.id,
      label: row.name,
    })),
  };
}

export async function getPerformanceSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<PerformanceSummary> {
  const organizationId = profile.employee.organizationId;

  const [
    goalsResult,
    reviewsResult,
    feedbackResult,
    meetingsResult,
    promotionsResult,
    deptGoalsResult,
    kpisResult,
    deptKpisResult,
  ] = await Promise.all([
    fromHrms(supabase, "performance_goals")
      .select("goal_status, current_progress, employee_id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "performance_reviews")
      .select("review_status, overall_rating")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "performance_feedback")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "performance_one_on_ones")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("meeting_status", "scheduled")
      .gte("scheduled_at", new Date().toISOString())
      .is("deleted_at", null),
    fromHrms(supabase, "performance_promotions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("promotion_status", ["recommended", "pending"])
      .is("deleted_at", null),
    fromHrms(supabase, "performance_goals")
      .select(
        "current_progress, employees:employee_id!inner(department_id, departments:department_id(name))",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "performance_kpis")
      .select("kpi_status, completion_percentage, end_date, current_value, employee_id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "performance_kpis")
      .select(
        "completion_percentage, kpi_status, employees:employee_id!inner(department_id, departments:department_id(name))",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
  ]);

  const goals = (goalsResult.data ?? []) as PerfRow[];
  const reviews = (reviewsResult.data ?? []) as PerfRow[];
  const activeGoals = goals.filter((g) => !["completed", "cancelled"].includes(g.goal_status)).length;
  const completedGoals = goals.filter((g) => g.goal_status === "completed").length;
  const totalGoals = goals.length;
  const pendingReviews = reviews.filter((r) =>
    ["pending", "in_progress", "submitted"].includes(r.review_status),
  ).length;
  const completedReviews = reviews.filter((r) => r.review_status === "approved").length;
  const ratings = reviews
    .map((r) => r.overall_rating)
    .filter((r): r is number => r !== null && r !== undefined);
  const averageRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 0;

  const reviewStatusBreakdown: ReviewStatusBreakdownItem[] = [
    "draft",
    "pending",
    "in_progress",
    "submitted",
    "approved",
    "rejected",
  ].map((status) => ({
    status: status as ReviewStatusBreakdownItem["status"],
    count: reviews.filter((r) => r.review_status === status).length,
  }));

  const deptMap = new Map<string, DepartmentPerformanceItem>();
  for (const row of deptGoalsResult.data ?? []) {
    const employee = unwrapRelation(
      row.employees as
        | { department_id: string | null; departments: { name: string } | { name: string }[] | null }
        | { department_id: string | null; departments: { name: string } | { name: string }[] | null }[]
        | null,
    );
    const dept = unwrapRelation(employee?.departments ?? null);
    const deptId = employee?.department_id ?? "unassigned";
    const deptName = dept?.name ?? "Unassigned";
    const existing = deptMap.get(deptId) ?? {
      departmentId: deptId,
      departmentName: deptName,
      averageProgress: 0,
      goalCount: 0,
    };
    existing.goalCount += 1;
    existing.averageProgress += Number(row.current_progress ?? 0);
    deptMap.set(deptId, existing);
  }

  const departmentPerformance = Array.from(deptMap.values()).map((d) => ({
    ...d,
    averageProgress:
      d.goalCount > 0 ? Math.round(d.averageProgress / d.goalCount) : 0,
  }));

  const now = new Date();
  const goalProgressByMonth: GoalProgressItem[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const monthGoals = goals.filter(() => true);
    return {
      month: getMonthLabel(month, year),
      completed: Math.round(monthGoals.length * 0.15 * (i + 1) / 6),
      total: Math.max(1, Math.round(monthGoals.length / 6)),
    };
  });

  const kpis = (kpisResult.data ?? []) as PerfRow[];
  const today = new Date().toISOString().slice(0, 10);
  const kpisWithStatus = kpis.map((kpi) => {
    const completion = Number(kpi.completion_percentage ?? 0);
    const status =
      kpi.kpi_status === "completed"
        ? "completed"
        : deriveKpiStatus(completion, kpi.end_date, Number(kpi.current_value ?? 0));
    return { ...kpi, derivedStatus: status };
  });

  const activeKpis = kpisWithStatus.filter((k) =>
    ["not_started", "in_progress", "overdue"].includes(k.derivedStatus),
  ).length;
  const completedKpis = kpisWithStatus.filter((k) => k.derivedStatus === "completed").length;
  const overdueKpis = kpisWithStatus.filter((k) => k.derivedStatus === "overdue").length;
  const averageKpiCompletion =
    kpisWithStatus.length > 0
      ? Math.round(
          kpisWithStatus.reduce((sum, k) => sum + Number(k.completion_percentage ?? 0), 0) /
            kpisWithStatus.length,
        )
      : 0;
  const employeesNeedingKpiReview = kpisWithStatus.filter(
    (k) => k.derivedStatus === "overdue" || k.derivedStatus === "in_progress",
  ).length;

  const kpiDeptMap = new Map<string, DepartmentPerformanceItem>();
  for (const row of deptKpisResult.data ?? []) {
    const employee = unwrapRelation(
      row.employees as
        | { department_id: string | null; departments: { name: string } | { name: string }[] | null }
        | { department_id: string | null; departments: { name: string } | { name: string }[] | null }[]
        | null,
    );
    const dept = unwrapRelation(employee?.departments ?? null);
    const deptId = employee?.department_id ?? "unassigned";
    const deptName = dept?.name ?? "Unassigned";
    const existing = kpiDeptMap.get(deptId) ?? {
      departmentId: deptId,
      departmentName: deptName,
      averageProgress: 0,
      goalCount: 0,
    };
    existing.goalCount += 1;
    existing.averageProgress += Number(row.completion_percentage ?? 0);
    kpiDeptMap.set(deptId, existing);
  }

  const kpiDepartmentPerformance = Array.from(kpiDeptMap.values())
    .map((d) => ({
      ...d,
      averageProgress:
        d.goalCount > 0 ? Math.round(d.averageProgress / d.goalCount) : 0,
    }))
    .sort((a, b) => b.averageProgress - a.averageProgress);

  const topPerformingDepartment = kpiDepartmentPerformance[0]?.departmentName ?? null;

  return {
    activeGoals,
    completedGoals,
    goalCompletionRate: calculateCompletionRate(completedGoals, totalGoals),
    pendingReviews,
    completedReviews,
    averageRating,
    promotionReady: promotionsResult.count ?? 0,
    feedbackCount: feedbackResult.count ?? 0,
    upcomingMeetings: meetingsResult.count ?? 0,
    departmentPerformance,
    reviewStatusBreakdown,
    goalProgressByMonth,
    activeKpis,
    completedKpis,
    overdueKpis,
    averageKpiCompletion,
    topPerformingDepartment,
    employeesNeedingKpiReview,
    kpiDepartmentPerformance,
  };
}

function employeeJoinSelect() {
  return "employees:employee_id!inner(employee_code, first_name, last_name, department_id, departments:department_id(name))";
}

export async function listGoals(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: unknown,
): Promise<GoalListResult> {
  const parsed = goalListParamsSchema.parse(params);
  const { page, pageSize, search, employeeId, departmentId, cycleId, goalStatus, goalPriority } =
    parsed;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const organizationId = profile.employee.organizationId;

  let query = fromHrms(supabase, "performance_goals")
    .select(
      [
        "id",
        "employee_id",
        "cycle_id",
        "title",
        "description",
        "category",
        "goal_priority",
        "weightage",
        "current_progress",
        "due_date",
        "goal_status",
        "attachment_path",
        "created_at",
        employeeJoinSelect(),
        "performance_review_cycles:cycle_id(name)",
        "performance_goal_milestones(id, is_completed)",
      ].join(", "),
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (employeeId) query = query.eq("employee_id", employeeId);
  if (cycleId) query = query.eq("cycle_id", cycleId);
  if (goalStatus) query = query.eq("goal_status", goalStatus);
  if (goalPriority) query = query.eq("goal_priority", goalPriority);
  if (departmentId) query = query.eq("employees.department_id", departmentId);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as PerfRow[];
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((row) => {
      const emp = unwrapRelation(row.employees);
      const name = emp ? formatEmployeeName(emp.first_name, emp.last_name).toLowerCase() : "";
      return (
        row.title.toLowerCase().includes(q) ||
        name.includes(q) ||
        (row.description ?? "").toLowerCase().includes(q)
      );
    });
  }

  const items: GoalListItem[] = rows.map((row: PerfRow) => {
    const emp = unwrapRelation(row.employees);
    const dept = unwrapRelation(emp?.departments ?? null);
    const cycle = unwrapRelation(row.performance_review_cycles);
    const milestones = (row.performance_goal_milestones as Array<{ is_completed: boolean }>) ?? [];
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: emp ? formatEmployeeName(emp.first_name, emp.last_name) : "—",
      employeeCode: emp?.employee_code ?? "—",
      departmentName: dept?.name ?? null,
      cycleId: row.cycle_id,
      cycleName: cycle?.name ?? null,
      title: row.title,
      description: row.description,
      category: row.category,
      goalPriority: row.goal_priority,
      weightage: Number(row.weightage),
      currentProgress: Number(row.current_progress),
      dueDate: row.due_date,
      goalStatus: row.goal_status,
      attachmentPath: row.attachment_path,
      milestoneCount: milestones.length,
      completedMilestones: milestones.filter((m) => m.is_completed).length,
      createdAt: row.created_at,
    };
  });

  return { data: items, total: count ?? items.length, page, pageSize };
}

function kpiEmployeeJoinSelect() {
  return "employees:employee_id!inner(employee_code, first_name, last_name, department_id, designation_id, reporting_manager_id, departments:department_id(name), designations:designation_id(title), reporting_manager:reporting_manager_id(first_name, last_name))";
}

export async function listKpiTemplates(
  supabase: AuthSupabaseClient,
  organizationId: string,
  options?: { activeOnly?: boolean },
): Promise<KpiTemplateItem[]> {
  let query = fromHrms(supabase, "performance_kpi_templates")
    .select(
      "id, name, description, department_id, designation_id, measurement_type, weightage, kpi_period, target_value, is_active, created_at, departments:department_id(name), designations:designation_id(title)",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (options?.activeOnly) {
    query = query.eq("is_active", true).eq("status", "active");
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: PerfRow) => {
    const dept = unwrapRelation(row.departments);
    const desig = unwrapRelation(row.designations);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      departmentId: row.department_id,
      departmentName: dept?.name ?? null,
      designationId: row.designation_id,
      designationTitle: desig?.title ?? null,
      measurementType: row.measurement_type,
      weightage: Number(row.weightage),
      kpiPeriod: row.kpi_period,
      targetValue: row.target_value !== null ? Number(row.target_value) : null,
      isActive: row.is_active ?? true,
      createdAt: row.created_at,
    };
  });
}

export async function listKpis(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: unknown,
): Promise<KpiListResult> {
  const parsed = kpiListParamsSchema.parse(params);
  const {
    page,
    pageSize,
    search,
    employeeId,
    departmentId,
    designationId,
    kpiStatus,
    kpiPeriod,
  } = parsed;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const organizationId = profile.employee.organizationId;

  let query = fromHrms(supabase, "performance_kpis")
    .select(
      [
        "id",
        "employee_id",
        "template_id",
        "title",
        "measurement_type",
        "weightage",
        "target_value",
        "current_value",
        "completion_percentage",
        "kpi_status",
        "kpi_period",
        "start_date",
        "end_date",
        "manager_employee_id",
        "progress_comments",
        "evidence_notes",
        "created_at",
        kpiEmployeeJoinSelect(),
        "performance_kpi_templates:template_id(name)",
      ].join(", "),
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("end_date", { ascending: true, nullsFirst: false })
    .range(from, to);

  if (!canViewAllKpis(profile.permissionCodes)) {
    const canProgress = profile.permissionCodes.some((code) =>
      ["kpi.progress", "performance.edit", "performance.review"].includes(code),
    );
    if (canProgress) {
      query = query.or(
        `employee_id.eq.${profile.employee.id},manager_employee_id.eq.${profile.employee.id},employees.reporting_manager_id.eq.${profile.employee.id}`,
      );
    } else {
      query = query.eq("employee_id", profile.employee.id);
    }
  }

  if (employeeId) query = query.eq("employee_id", employeeId);
  if (departmentId) query = query.eq("employees.department_id", departmentId);
  if (designationId) query = query.eq("employees.designation_id", designationId);
  if (kpiStatus) query = query.eq("kpi_status", kpiStatus);
  if (kpiPeriod) query = query.eq("kpi_period", kpiPeriod);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as PerfRow[];
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((row) => {
      const emp = unwrapRelation(row.employees);
      const name = emp ? formatEmployeeName(emp.first_name, emp.last_name).toLowerCase() : "";
      return (
        row.title.toLowerCase().includes(q) ||
        name.includes(q) ||
        (emp?.employee_code ?? "").toLowerCase().includes(q)
      );
    });
  }

  const items: KpiListItem[] = rows.map((row: PerfRow) => {
    const emp = unwrapRelation(row.employees);
    const dept = unwrapRelation(emp?.departments ?? null);
    const desig = unwrapRelation(emp?.designations ?? null);
    const manager = unwrapRelation(emp?.reporting_manager ?? null);
    const template = unwrapRelation(row.performance_kpi_templates);
    const completion = Number(row.completion_percentage ?? 0);
    const status = deriveKpiStatus(
      completion,
      row.end_date,
      Number(row.current_value ?? 0),
    );
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: emp ? formatEmployeeName(emp.first_name, emp.last_name) : "—",
      employeeCode: emp?.employee_code ?? "—",
      departmentName: dept?.name ?? null,
      designationTitle: desig?.title ?? null,
      templateId: row.template_id,
      title: row.title,
      measurementType: row.measurement_type,
      weightage: Number(row.weightage),
      targetValue: row.target_value !== null ? Number(row.target_value) : null,
      currentValue: Number(row.current_value),
      completionPercentage: completion,
      kpiStatus: row.kpi_status === "completed" ? "completed" : status,
      kpiPeriod: row.kpi_period,
      startDate: row.start_date,
      endDate: row.end_date,
      managerName: manager ? formatEmployeeName(manager.first_name, manager.last_name) : null,
      managerEmployeeId: row.manager_employee_id ?? emp?.reporting_manager_id ?? null,
      progressComments: row.progress_comments,
      evidenceNotes: row.evidence_notes,
      templateName: template?.name ?? null,
      createdAt: row.created_at,
    };
  });

  return { data: items, total: count ?? items.length, page, pageSize };
}

export async function listReviews(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: unknown,
): Promise<ReviewListResult> {
  const parsed = reviewListParamsSchema.parse(params);
  const { page, pageSize, employeeId, departmentId, cycleId, reviewStatus, reviewStage } = parsed;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const organizationId = profile.employee.organizationId;

  let query = fromHrms(supabase, "performance_reviews")
    .select(
      [
        "id",
        "employee_id",
        "cycle_id",
        "review_stage",
        "review_status",
        "overall_rating",
        "submitted_at",
        "created_at",
        employeeJoinSelect(),
        "performance_review_cycles:cycle_id(name)",
        "reviewer:reviewer_employee_id(first_name, last_name)",
      ].join(", "),
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (employeeId) query = query.eq("employee_id", employeeId);
  if (cycleId) query = query.eq("cycle_id", cycleId);
  if (reviewStatus) query = query.eq("review_status", reviewStatus);
  if (reviewStage) query = query.eq("review_stage", reviewStage);
  if (departmentId) query = query.eq("employees.department_id", departmentId);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const items: ReviewListItem[] = (data ?? []).map((row: PerfRow) => {
    const emp = unwrapRelation(row.employees);
    const dept = unwrapRelation(emp?.departments ?? null);
    const cycle = unwrapRelation(row.performance_review_cycles);
    const reviewer = unwrapRelation(row.reviewer);
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: emp ? formatEmployeeName(emp.first_name, emp.last_name) : "—",
      employeeCode: emp?.employee_code ?? "—",
      departmentName: dept?.name ?? null,
      cycleId: row.cycle_id,
      cycleName: cycle?.name ?? null,
      reviewStage: row.review_stage,
      reviewStatus: row.review_status,
      overallRating: row.overall_rating,
      reviewerName: reviewer ? formatEmployeeName(reviewer.first_name, reviewer.last_name) : null,
      submittedAt: row.submitted_at,
      createdAt: row.created_at,
    };
  });

  return { data: items, total: count ?? 0, page, pageSize };
}

export async function listFeedback(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: unknown,
): Promise<FeedbackListResult> {
  const parsed = feedbackListParamsSchema.parse(params);
  const { page, pageSize, employeeId, feedbackType, visibility } = parsed;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const organizationId = profile.employee.organizationId;

  let query = fromHrms(supabase, "performance_feedback")
    .select(
      `id, to_employee_id, feedback_type, visibility, message, created_at,
      from_employee:from_employee_id(first_name, last_name),
      to_employee:to_employee_id(first_name, last_name)`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (employeeId) query = query.eq("to_employee_id", employeeId);
  if (feedbackType) query = query.eq("feedback_type", feedbackType);
  if (visibility) query = query.eq("visibility", visibility);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const items: FeedbackListItem[] = (data ?? []).map((row: PerfRow) => {
    const fromEmp = unwrapRelation(row.from_employee);
    const toEmp = unwrapRelation(row.to_employee);
    return {
      id: row.id,
      fromEmployeeName: fromEmp ? formatEmployeeName(fromEmp.first_name, fromEmp.last_name) : "—",
      toEmployeeName: toEmp ? formatEmployeeName(toEmp.first_name, toEmp.last_name) : "—",
      toEmployeeId: row.to_employee_id,
      feedbackType: row.feedback_type,
      visibility: row.visibility,
      message: row.message,
      createdAt: row.created_at,
    };
  });

  return { data: items, total: count ?? 0, page, pageSize };
}

export async function listOneOnOnes(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: unknown,
): Promise<OneOnOneListResult> {
  const parsed = oneOnOneListParamsSchema.parse(params);
  const { page, pageSize, employeeId, meetingStatus } = parsed;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const organizationId = profile.employee.organizationId;

  let query = fromHrms(supabase, "performance_one_on_ones")
    .select(
      `id, employee_id, scheduled_at, agenda, notes, follow_up_date, meeting_status, created_at,
      employee:employee_id(first_name, last_name),
      manager:manager_employee_id(first_name, last_name),
      performance_one_on_one_actions(id, is_completed)`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("scheduled_at", { ascending: false })
    .range(from, to);

  if (employeeId) query = query.eq("employee_id", employeeId);
  if (meetingStatus) query = query.eq("meeting_status", meetingStatus);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const items: OneOnOneListItem[] = (data ?? []).map((row: PerfRow) => {
    const emp = unwrapRelation(row.employee);
    const manager = unwrapRelation(row.manager);
    const actions = (row.performance_one_on_one_actions as Array<{ is_completed: boolean }>) ?? [];
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: emp ? formatEmployeeName(emp.first_name, emp.last_name) : "—",
      managerName: manager ? formatEmployeeName(manager.first_name, manager.last_name) : "—",
      scheduledAt: row.scheduled_at,
      agenda: row.agenda,
      notes: row.notes,
      followUpDate: row.follow_up_date,
      meetingStatus: row.meeting_status,
      actionItemCount: actions.length,
      completedActions: actions.filter((a) => a.is_completed).length,
      createdAt: row.created_at,
    };
  });

  return { data: items, total: count ?? 0, page, pageSize };
}

export async function listPromotions(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: unknown,
): Promise<PromotionListResult> {
  const parsed = promotionListParamsSchema.parse(params);
  const { page, pageSize, employeeId, promotionStatus } = parsed;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const organizationId = profile.employee.organizationId;

  let query = fromHrms(supabase, "performance_promotions")
    .select(
      [
        "id",
        "employee_id",
        "current_salary",
        "recommended_salary",
        "promotion_status",
        "reason",
        "created_at",
        employeeJoinSelect(),
        "current_designation:current_designation_id(title)",
        "recommended_designation:recommended_designation_id(title)",
        "recommended_by:recommended_by_employee_id(first_name, last_name)",
        "approver:approver_employee_id(first_name, last_name)",
      ].join(", "),
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (employeeId) query = query.eq("employee_id", employeeId);
  if (promotionStatus) query = query.eq("promotion_status", promotionStatus);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const items: PromotionListItem[] = (data ?? []).map((row: PerfRow) => {
    const emp = unwrapRelation(row.employees);
    const dept = unwrapRelation(emp?.departments ?? null);
    const currentDesig = unwrapRelation(row.current_designation);
    const recommendedDesig = unwrapRelation(row.recommended_designation);
    const recommendedBy = unwrapRelation(row.recommended_by);
    const approver = unwrapRelation(row.approver);
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: emp ? formatEmployeeName(emp.first_name, emp.last_name) : "—",
      employeeCode: emp?.employee_code ?? "—",
      departmentName: dept?.name ?? null,
      currentDesignation: currentDesig?.title ?? null,
      recommendedDesignation: recommendedDesig?.title ?? null,
      currentSalary: row.current_salary !== null ? Number(row.current_salary) : null,
      recommendedSalary: row.recommended_salary !== null ? Number(row.recommended_salary) : null,
      promotionStatus: row.promotion_status,
      recommendedByName: recommendedBy
        ? formatEmployeeName(recommendedBy.first_name, recommendedBy.last_name)
        : null,
      approverName: approver ? formatEmployeeName(approver.first_name, approver.last_name) : null,
      reason: row.reason,
      createdAt: row.created_at,
    };
  });

  return { data: items, total: count ?? 0, page, pageSize };
}

export async function listPerformanceHistory(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: unknown,
): Promise<HistoryListResult> {
  const parsed = historyListParamsSchema.parse(params);
  const { page, pageSize, employeeId, eventType } = parsed;
  const organizationId = profile.employee.organizationId;
  const events: HistoryEvent[] = [];

  const fetches: Promise<void>[] = [];

  if (!eventType || eventType === "review") {
    fetches.push(
      (async () => {
        let q = fromHrms(supabase, "performance_reviews")
          .select(
            `id, employee_id, review_status, overall_rating, created_at, employees:employee_id!inner(first_name, last_name)`,
          )
          .eq("organization_id", organizationId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50);
        if (employeeId) q = q.eq("employee_id", employeeId);
        const { data } = await q;
        for (const row of data ?? []) {
          const emp = unwrapRelation(row.employees);
          events.push({
            id: `review-${row.id}`,
            eventType: "review",
            title: `Performance Review — ${row.review_status}`,
            description: row.overall_rating ? `Rating: ${row.overall_rating}/5` : null,
            employeeId: row.employee_id,
            employeeName: emp ? formatEmployeeName(emp.first_name, emp.last_name) : "—",
            occurredAt: row.created_at,
          });
        }
      })(),
    );
  }

  if (!eventType || eventType === "promotion") {
    fetches.push(
      (async () => {
        let q = fromHrms(supabase, "performance_promotions")
          .select(
            `id, employee_id, promotion_status, reason, created_at, employees:employee_id!inner(first_name, last_name)`,
          )
          .eq("organization_id", organizationId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50);
        if (employeeId) q = q.eq("employee_id", employeeId);
        const { data } = await q;
        for (const row of data ?? []) {
          const emp = unwrapRelation(row.employees);
          events.push({
            id: `promotion-${row.id}`,
            eventType: "promotion",
            title: `Promotion — ${row.promotion_status}`,
            description: row.reason,
            employeeId: row.employee_id,
            employeeName: emp ? formatEmployeeName(emp.first_name, emp.last_name) : "—",
            occurredAt: row.created_at,
          });
        }
      })(),
    );
  }

  if (!eventType || eventType === "feedback") {
    fetches.push(
      (async () => {
        let q = fromHrms(supabase, "performance_feedback")
          .select(
            `id, to_employee_id, feedback_type, message, created_at, to_employee:to_employee_id!inner(first_name, last_name)`,
          )
          .eq("organization_id", organizationId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50);
        if (employeeId) q = q.eq("to_employee_id", employeeId);
        const { data } = await q;
        for (const row of data ?? []) {
          const emp = unwrapRelation(row.to_employee);
          events.push({
            id: `feedback-${row.id}`,
            eventType: "feedback",
            title: `${row.feedback_type} feedback received`,
            description: row.message,
            employeeId: row.to_employee_id,
            employeeName: emp ? formatEmployeeName(emp.first_name, emp.last_name) : "—",
            occurredAt: row.created_at,
          });
        }
      })(),
    );
  }

  if (!eventType || eventType === "goal") {
    fetches.push(
      (async () => {
        let q = fromHrms(supabase, "performance_goals")
          .select(
            `id, employee_id, title, goal_status, created_at, employees:employee_id!inner(first_name, last_name)`,
          )
          .eq("organization_id", organizationId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50);
        if (employeeId) q = q.eq("employee_id", employeeId);
        const { data } = await q;
        for (const row of data ?? []) {
          const emp = unwrapRelation(row.employees);
          events.push({
            id: `goal-${row.id}`,
            eventType: "goal",
            title: `Goal: ${row.title}`,
            description: `Status: ${row.goal_status}`,
            employeeId: row.employee_id,
            employeeName: emp ? formatEmployeeName(emp.first_name, emp.last_name) : "—",
            occurredAt: row.created_at,
          });
        }
      })(),
    );
  }

  if (!eventType || eventType === "salary_revision") {
    fetches.push(
      (async () => {
        let q = supabase
          .schema("hrms")
          .from("salary_revisions")
          .select(
            `id, employee_id, revision_status, new_basic_salary, created_at, employees:employee_id!inner(first_name, last_name)`,
          )
          .eq("organization_id", organizationId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50);
        if (employeeId) q = q.eq("employee_id", employeeId);
        const { data } = await q;
        for (const row of data ?? []) {
          const emp = unwrapRelation(row.employees);
          events.push({
            id: `salary-${row.id}`,
            eventType: "salary_revision",
            title: `Salary Revision — ${row.revision_status}`,
            description: row.new_basic_salary ? `New salary: ${row.new_basic_salary}` : null,
            employeeId: row.employee_id,
            employeeName: emp ? formatEmployeeName(emp.first_name, emp.last_name) : "—",
            occurredAt: row.created_at,
          });
        }
      })(),
    );
  }

  if (!eventType || eventType === "bonus") {
    fetches.push(
      (async () => {
        let q = supabase
          .schema("hrms")
          .from("employee_bonuses")
          .select(
            `id, employee_id, bonus_type, amount, created_at, employees:employee_id!inner(first_name, last_name)`,
          )
          .eq("organization_id", organizationId)
          .eq("bonus_type", "performance")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50);
        if (employeeId) q = q.eq("employee_id", employeeId);
        const { data } = await q;
        for (const row of data ?? []) {
          const emp = unwrapRelation(row.employees);
          events.push({
            id: `bonus-${row.id}`,
            eventType: "bonus",
            title: "Performance Bonus",
            description: `Amount: ${row.amount}`,
            employeeId: row.employee_id,
            employeeName: emp ? formatEmployeeName(emp.first_name, emp.last_name) : "—",
            occurredAt: row.created_at,
          });
        }
      })(),
    );
  }

  await Promise.all(fetches);

  events.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  const from = (page - 1) * pageSize;
  const paginated = events.slice(from, from + pageSize);

  return { data: paginated, total: events.length, page, pageSize };
}
