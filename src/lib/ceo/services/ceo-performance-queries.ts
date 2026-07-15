import { differenceInCalendarDays, format, startOfQuarter, subMonths } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  MANAGER_COMPETENCY_FIELDS,
  parseReviewCommentsPayload,
} from "@/lib/manager/services/performance-competency-utils";
import {
  formatEmployeeName,
  fromHrms,
  unwrapRelation,
} from "@/lib/performance/services/performance-utils";
import { RATING_LABELS } from "@/lib/performance/constants";
import { ceoPerformanceListParamsSchema } from "@/lib/validations/ceo-performance";
import type { UserProfile } from "@/types/auth";
import type { PromotionStatus, ReviewStatus } from "@/types/performance";
import type {
  CeoPerformanceDepartmentRow,
  CeoPerformanceEmployeeDetail,
  CeoPerformanceEmployeeListResult,
  CeoPerformanceFilterLookups,
  CeoPerformanceInsights,
  CeoPerformanceKpis,
  CeoPerformanceListParams,
  CeoPerformanceLowPerformance,
  CeoPerformanceOverview,
  CeoPerformancePageData,
  CeoPerformancePromotionOverview,
  CeoPerformanceTopPerformers,
} from "@/types/ceo-performance";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

const HIGH_PERFORMER_RATING = 4;
const BELOW_TARGET_RATING = 2.5;
const REVIEW_PENDING_STATUSES: ReviewStatus[] = [
  "draft",
  "pending",
  "in_progress",
  "submitted",
];
const PROMOTION_PIPELINE: PromotionStatus[] = [
  "draft",
  "pending",
  "recommended",
  "approved",
  "rejected",
  "applied",
  "cancelled",
];

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  return unwrapRelation(value as T | T[] | null);
}

function parseParams(params: CeoPerformanceListParams) {
  return ceoPerformanceListParamsSchema.parse(params);
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function goalCompletion(goals: LooseRow[]) {
  if (goals.length === 0) return 0;
  const completed = goals.filter((goal) => goal.goal_status === "completed").length;
  if (completed > 0) return percent(completed, goals.length);
  return Math.round(avg(goals.map((goal) => Number(goal.current_progress ?? 0))));
}

function latestByEmployee(rows: LooseRow[], employeeKey = "employee_id") {
  const map = new Map<string, LooseRow>();
  for (const row of rows) {
    const key = row[employeeKey] as string;
    if (!map.has(key)) map.set(key, row);
  }
  return map;
}

function isOnPip(comments: string | null | undefined) {
  return Boolean(parseReviewCommentsPayload(comments).recommendPip);
}

async function loadScopedEmployees(
  supabase: AuthSupabaseClient,
  organizationId: string,
  filters: ReturnType<typeof parseParams>,
) {
  let query = supabase
    .schema("hrms")
    .from("employees")
    .select(
      `id, employee_code, first_name, last_name, email, department_id, designation_id,
      reporting_manager_id, employment_type_id, employment_status,
      departments:department_id(id, name, department_head_id),
      designations:designation_id(title),
      managers:reporting_manager_id(id, first_name, last_name),
      employee_profiles(profile_image_storage_path)`,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .neq("employment_status", "terminated");

  if (filters.departmentId) query = query.eq("department_id", filters.departmentId);
  if (filters.managerId) query = query.eq("reporting_manager_id", filters.managerId);
  if (filters.employmentTypeId) {
    query = query.eq("employment_type_id", filters.employmentTypeId);
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `employee_code.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`,
    );
  }

  const { data, error } = await query.order("first_name");
  if (error) throw new Error(error.message);
  return (data ?? []) as LooseRow[];
}

export async function getCeoPerformanceFilterLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<CeoPerformanceFilterLookups> {
  const [departments, managers, cycles, employmentTypes] = await Promise.all([
    fromHrms(supabase, "departments")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .schema("hrms")
      .from("employees")
      .select("id, first_name, last_name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .neq("employment_status", "terminated"),
    fromHrms(supabase, "performance_review_cycles")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("start_date", { ascending: false }),
    fromHrms(supabase, "employment_types")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
  ]);

  if (departments.error) throw new Error(departments.error.message);
  if (managers.error) throw new Error(managers.error.message);
  if (cycles.error) throw new Error(cycles.error.message);
  if (employmentTypes.error) throw new Error(employmentTypes.error.message);

  const managerIds = new Set<string>();
  const { data: reporting } = await supabase
    .schema("hrms")
    .from("employees")
    .select("reporting_manager_id")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .not("reporting_manager_id", "is", null);

  for (const row of (reporting ?? []) as LooseRow[]) {
    if (row.reporting_manager_id) managerIds.add(row.reporting_manager_id);
  }

  return {
    departments: ((departments.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
    managers: ((managers.data ?? []) as LooseRow[])
      .filter((row) => managerIds.has(row.id))
      .map((row) => ({
        id: row.id,
        label: formatEmployeeName(row.first_name, row.last_name),
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    cycles: ((cycles.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
    employmentTypes: ((employmentTypes.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
  };
}

export async function getCeoPerformanceKpis(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoPerformanceListParams = {},
): Promise<CeoPerformanceKpis> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams({ ...filters, page: 1, pageSize: 10 });
  const employees = await loadScopedEmployees(supabase, organizationId, parsed);
  const employeeIds = employees.map((row) => row.id as string);

  if (employeeIds.length === 0) {
    return {
      companyAverageRating: 0,
      completedReviews: 0,
      pendingReviews: 0,
      promotionRecommendations: 0,
      employeesOnPip: 0,
      highPerformers: 0,
      averageGoalCompletion: 0,
      performanceIndex: 0,
    };
  }

  const [reviewsRes, goalsRes, kpisRes, promotionsRes] = await Promise.all([
    fromHrms(supabase, "performance_reviews")
      .select("employee_id, review_status, overall_rating, comments, created_at, cycle_id")
      .eq("organization_id", organizationId)
      .in("employee_id", employeeIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    fromHrms(supabase, "performance_goals")
      .select("employee_id, goal_status, current_progress, cycle_id")
      .eq("organization_id", organizationId)
      .in("employee_id", employeeIds)
      .is("deleted_at", null),
    fromHrms(supabase, "performance_kpis")
      .select("employee_id, completion_percentage, cycle_id")
      .eq("organization_id", organizationId)
      .in("employee_id", employeeIds)
      .is("deleted_at", null),
    fromHrms(supabase, "performance_promotions")
      .select("id, promotion_status, employee_id")
      .eq("organization_id", organizationId)
      .in("employee_id", employeeIds)
      .is("deleted_at", null),
  ]);

  if (reviewsRes.error) throw new Error(reviewsRes.error.message);
  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (kpisRes.error) throw new Error(kpisRes.error.message);
  if (promotionsRes.error) throw new Error(promotionsRes.error.message);

  let reviews = (reviewsRes.data ?? []) as LooseRow[];
  let goals = (goalsRes.data ?? []) as LooseRow[];
  let kpis = (kpisRes.data ?? []) as LooseRow[];
  if (parsed.cycleId) {
    reviews = reviews.filter((row) => row.cycle_id === parsed.cycleId);
    goals = goals.filter((row) => !row.cycle_id || row.cycle_id === parsed.cycleId);
    kpis = kpis.filter((row) => !row.cycle_id || row.cycle_id === parsed.cycleId);
  }

  const latestReviews = latestByEmployee(reviews);
  const ratings = [...latestReviews.values()]
    .map((row) => row.overall_rating)
    .filter((value): value is number => value != null)
    .map(Number);

  const companyAverageRating = avg(ratings);
  const completedReviews = reviews.filter((row) => row.review_status === "approved").length;
  const pendingReviews = reviews.filter((row) =>
    REVIEW_PENDING_STATUSES.includes(row.review_status as ReviewStatus),
  ).length;

  const promotionRecommendations = ((promotionsRes.data ?? []) as LooseRow[]).filter((row) =>
    ["recommended", "pending"].includes(row.promotion_status),
  ).length;

  let employeesOnPip = 0;
  let highPerformers = 0;
  for (const review of latestReviews.values()) {
    if (isOnPip(review.comments)) employeesOnPip += 1;
    if (review.overall_rating != null && Number(review.overall_rating) >= HIGH_PERFORMER_RATING) {
      highPerformers += 1;
    }
  }

  const averageGoalCompletion = goalCompletion(goals);
  const averageKpi =
    kpis.length > 0
      ? Math.round(avg(kpis.map((row) => Number(row.completion_percentage ?? 0))))
      : 0;

  const performanceIndex = Math.round(
    (companyAverageRating / 5) * 40 + averageGoalCompletion * 0.3 + averageKpi * 0.3,
  );

  return {
    companyAverageRating,
    completedReviews,
    pendingReviews,
    promotionRecommendations,
    employeesOnPip,
    highPerformers,
    averageGoalCompletion,
    performanceIndex,
  };
}

export async function getCeoPerformanceOverview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoPerformanceListParams = {},
): Promise<CeoPerformanceOverview> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams({ ...filters, page: 1, pageSize: 10 });
  const employees = await loadScopedEmployees(supabase, organizationId, parsed);
  const employeeIds = employees.map((row) => row.id as string);

  if (employeeIds.length === 0) {
    return {
      overallCompanyRating: 0,
      quarterlyPerformanceScore: 0,
      yearlyTrend: [],
      averageKpiAchievement: 0,
      goalCompletionPercentage: 0,
    };
  }

  const quarterStart = format(startOfQuarter(new Date()), "yyyy-MM-dd");
  const months = Array.from({ length: 12 }, (_, index) => subMonths(new Date(), 11 - index));

  const [reviewsRes, goalsRes, kpisRes] = await Promise.all([
    fromHrms(supabase, "performance_reviews")
      .select(
        "employee_id, overall_rating, review_status, approved_at, submitted_at, created_at, cycle_id",
      )
      .eq("organization_id", organizationId)
      .in("employee_id", employeeIds)
      .is("deleted_at", null),
    fromHrms(supabase, "performance_goals")
      .select("goal_status, current_progress, cycle_id")
      .eq("organization_id", organizationId)
      .in("employee_id", employeeIds)
      .is("deleted_at", null),
    fromHrms(supabase, "performance_kpis")
      .select("completion_percentage, cycle_id")
      .eq("organization_id", organizationId)
      .in("employee_id", employeeIds)
      .is("deleted_at", null),
  ]);

  if (reviewsRes.error) throw new Error(reviewsRes.error.message);
  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (kpisRes.error) throw new Error(kpisRes.error.message);

  let reviews = (reviewsRes.data ?? []) as LooseRow[];
  let goals = (goalsRes.data ?? []) as LooseRow[];
  let kpis = (kpisRes.data ?? []) as LooseRow[];
  if (parsed.cycleId) {
    reviews = reviews.filter((row) => row.cycle_id === parsed.cycleId);
    goals = goals.filter((row) => !row.cycle_id || row.cycle_id === parsed.cycleId);
    kpis = kpis.filter((row) => !row.cycle_id || row.cycle_id === parsed.cycleId);
  }

  const approved = reviews.filter((row) => row.review_status === "approved" && row.overall_rating != null);
  const overallCompanyRating = avg(approved.map((row) => Number(row.overall_rating)));

  const quarterly = approved.filter((row) => {
    const stamp = String(row.approved_at ?? row.submitted_at ?? row.created_at).slice(0, 10);
    return stamp >= quarterStart;
  });
  const quarterlyPerformanceScore = avg(quarterly.map((row) => Number(row.overall_rating)));

  const yearlyTrend = months.map((monthDate) => {
    const key = format(monthDate, "yyyy-MM");
    const monthRatings = approved
      .filter((row) =>
        String(row.approved_at ?? row.submitted_at ?? row.created_at).startsWith(key),
      )
      .map((row) => Number(row.overall_rating));
    return {
      label: format(monthDate, "MMM yyyy"),
      value: avg(monthRatings),
    };
  });

  return {
    overallCompanyRating,
    quarterlyPerformanceScore,
    yearlyTrend,
    averageKpiAchievement:
      kpis.length > 0
        ? Math.round(avg(kpis.map((row) => Number(row.completion_percentage ?? 0))))
        : 0,
    goalCompletionPercentage: goalCompletion(goals),
  };
}

export async function listCeoPerformanceDepartments(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoPerformanceListParams = {},
): Promise<CeoPerformanceDepartmentRow[]> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams({ ...filters, page: 1, pageSize: 10 });
  const employees = await loadScopedEmployees(supabase, organizationId, parsed);
  const employeeIds = employees.map((row) => row.id as string);

  const { data: departments, error: departmentsError } = await fromHrms(supabase, "departments")
    .select(
      `id, name, department_head_id, department_head:department_head_id(first_name, last_name)`,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name");

  if (departmentsError) throw new Error(departmentsError.message);

  if (employeeIds.length === 0) {
    return ((departments.data ?? []) as LooseRow[])
      .filter((row) => !parsed.departmentId || row.id === parsed.departmentId)
      .map((row) => {
        const head = unwrap(row.department_head);
        return {
          id: row.id,
          name: row.name,
          headName: head ? formatEmployeeName(head.first_name, head.last_name) : null,
          employeeCount: 0,
          averageRating: null,
          goalCompletionPercent: 0,
          pendingReviews: 0,
          promotionEligible: 0,
          performanceTrend: "unknown" as const,
          trendDelta: null,
        };
      });
  }

  const [reviewsRes, goalsRes, promotionsRes] = await Promise.all([
    fromHrms(supabase, "performance_reviews")
      .select(
        "employee_id, overall_rating, review_status, comments, created_at, approved_at, cycle_id",
      )
      .eq("organization_id", organizationId)
      .in("employee_id", employeeIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    fromHrms(supabase, "performance_goals")
      .select("employee_id, goal_status, current_progress, cycle_id")
      .eq("organization_id", organizationId)
      .in("employee_id", employeeIds)
      .is("deleted_at", null),
    fromHrms(supabase, "performance_promotions")
      .select("employee_id, promotion_status")
      .eq("organization_id", organizationId)
      .in("employee_id", employeeIds)
      .is("deleted_at", null),
  ]);

  if (reviewsRes.error) throw new Error(reviewsRes.error.message);
  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (promotionsRes.error) throw new Error(promotionsRes.error.message);

  let reviews = (reviewsRes.data ?? []) as LooseRow[];
  let goals = (goalsRes.data ?? []) as LooseRow[];
  if (parsed.cycleId) {
    reviews = reviews.filter((row) => row.cycle_id === parsed.cycleId);
    goals = goals.filter((row) => !row.cycle_id || row.cycle_id === parsed.cycleId);
  }

  const latestReviews = latestByEmployee(reviews);
  const sixMonthsAgo = format(subMonths(new Date(), 6), "yyyy-MM-dd");
  const promotions = (promotionsRes.data ?? []) as LooseRow[];

  return ((departments.data ?? []) as LooseRow[])
    .filter((row) => !parsed.departmentId || row.id === parsed.departmentId)
    .map((row) => {
      const deptEmployees = employees.filter((emp) => emp.department_id === row.id);
      const deptIds = new Set(deptEmployees.map((emp) => emp.id as string));
      const ratings = [...latestReviews.values()]
        .filter((review) => deptIds.has(review.employee_id) && review.overall_rating != null)
        .map((review) => Number(review.overall_rating));
      const recentRatings = [...latestReviews.values()]
        .filter((review) => {
          if (!deptIds.has(review.employee_id) || review.overall_rating == null) return false;
          const stamp = String(review.approved_at ?? review.created_at).slice(0, 10);
          return stamp >= sixMonthsAgo;
        })
        .map((review) => Number(review.overall_rating));
      const olderRatings = ratings.filter((rating) => !recentRatings.includes(rating));
      const recentAvg = avg(recentRatings);
      const olderAvg = avg(olderRatings.length ? olderRatings : ratings);
      const delta =
        recentRatings.length && olderRatings.length
          ? Math.round((recentAvg - olderAvg) * 10) / 10
          : null;

      let performanceTrend: CeoPerformanceDepartmentRow["performanceTrend"] = "unknown";
      if (delta != null) {
        if (delta > 0.1) performanceTrend = "up";
        else if (delta < -0.1) performanceTrend = "down";
        else performanceTrend = "flat";
      }

      const head = unwrap(row.department_head);
      const pendingReviews = [...latestReviews.values()].filter(
        (review) =>
          deptIds.has(review.employee_id) &&
          REVIEW_PENDING_STATUSES.includes(review.review_status as ReviewStatus),
      ).length;

      return {
        id: row.id,
        name: row.name,
        headName: head ? formatEmployeeName(head.first_name, head.last_name) : null,
        employeeCount: deptEmployees.length,
        averageRating: ratings.length ? avg(ratings) : null,
        goalCompletionPercent: goalCompletion(
          goals.filter((goal) => deptIds.has(goal.employee_id)),
        ),
        pendingReviews,
        promotionEligible: promotions.filter(
          (promo) =>
            deptIds.has(promo.employee_id) &&
            ["recommended", "pending", "approved"].includes(promo.promotion_status),
        ).length,
        performanceTrend,
        trendDelta: delta,
      };
    })
    .filter((row) => row.employeeCount > 0 || !parsed.departmentId);
}

export async function listCeoPerformanceEmployees(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoPerformanceListParams,
): Promise<CeoPerformanceEmployeeListResult> {
  const parsed = parseParams(params);
  const organizationId = profile.employee.organizationId;
  const employees = await loadScopedEmployees(supabase, organizationId, parsed);
  const employeeIds = employees.map((row) => row.id as string);

  if (employeeIds.length === 0) {
    return { data: [], total: 0, page: parsed.page, pageSize: parsed.pageSize };
  }

  const [reviewsRes, goalsRes, promotionsRes] = await Promise.all([
    fromHrms(supabase, "performance_reviews")
      .select(
        "employee_id, overall_rating, review_status, comments, created_at, cycle_id",
      )
      .eq("organization_id", organizationId)
      .in("employee_id", employeeIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    fromHrms(supabase, "performance_goals")
      .select("employee_id, goal_status, current_progress, cycle_id")
      .eq("organization_id", organizationId)
      .in("employee_id", employeeIds)
      .is("deleted_at", null),
    fromHrms(supabase, "performance_promotions")
      .select("employee_id, promotion_status, created_at")
      .eq("organization_id", organizationId)
      .in("employee_id", employeeIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (reviewsRes.error) throw new Error(reviewsRes.error.message);
  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (promotionsRes.error) throw new Error(promotionsRes.error.message);

  let reviews = (reviewsRes.data ?? []) as LooseRow[];
  let goals = (goalsRes.data ?? []) as LooseRow[];
  if (parsed.cycleId) {
    reviews = reviews.filter((row) => row.cycle_id === parsed.cycleId);
    goals = goals.filter((row) => !row.cycle_id || row.cycle_id === parsed.cycleId);
  }

  const reviewsByEmployee = new Map<string, LooseRow[]>();
  for (const review of reviews) {
    const list = reviewsByEmployee.get(review.employee_id) ?? [];
    list.push(review);
    reviewsByEmployee.set(review.employee_id, list);
  }

  const latestPromotion = latestByEmployee(promotionsRes.data ?? []);

  let rows = employees.map((employee) => {
    const employeeReviews = reviewsByEmployee.get(employee.id) ?? [];
    const current = employeeReviews[0] ?? null;
    const previous =
      employeeReviews.find(
        (review, index) =>
          index > 0 &&
          review.overall_rating != null &&
          review.review_status === "approved",
      ) ?? null;
    const manager = unwrap(employee.managers);
    const department = unwrap(employee.departments);
    const profileRow = unwrap(employee.employee_profiles);
    const employeeGoals = goals.filter((goal) => goal.employee_id === employee.id);

    return {
      id: employee.id as string,
      employeeCode: employee.employee_code as string,
      firstName: employee.first_name as string,
      lastName: employee.last_name as string,
      fullName: formatEmployeeName(employee.first_name, employee.last_name),
      departmentId: employee.department_id ?? null,
      departmentName: department?.name ?? null,
      managerId: employee.reporting_manager_id ?? null,
      managerName: manager
        ? formatEmployeeName(manager.first_name, manager.last_name)
        : null,
      currentRating:
        current?.overall_rating != null ? Number(current.overall_rating) : null,
      previousRating:
        previous?.overall_rating != null ? Number(previous.overall_rating) : null,
      goalCompletionPercent: goalCompletion(employeeGoals),
      reviewStatus: (current?.review_status as ReviewStatus | undefined) ?? null,
      promotionStatus:
        (latestPromotion.get(employee.id)?.promotion_status as PromotionStatus | undefined) ??
        null,
      onPip: isOnPip(current?.comments),
      profileImagePath: profileRow?.profile_image_storage_path ?? null,
    };
  });

  if (parsed.rating) {
    rows = rows.filter((row) => row.currentRating === parsed.rating);
  }

  const total = rows.length;
  const from = (parsed.page - 1) * parsed.pageSize;
  const pageRows = rows.slice(from, from + parsed.pageSize);

  return {
    data: pageRows,
    total,
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
}

export async function getCeoPerformanceTopPerformers(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoPerformanceListParams = {},
): Promise<CeoPerformanceTopPerformers> {
  const employeesResult = await listCeoPerformanceEmployees(supabase, profile, {
    ...filters,
    page: 1,
    pageSize: 500,
  });
  const departments = await listCeoPerformanceDepartments(supabase, profile, filters);
  const employees = employeesResult.data;

  const topEmployees = [...employees]
    .filter((row) => row.currentRating != null)
    .sort((a, b) => (b.currentRating ?? 0) - (a.currentRating ?? 0))
    .slice(0, 10)
    .map((row) => ({
      id: row.id,
      label: row.fullName,
      value: row.currentRating ?? 0,
      meta: row.departmentName ?? "—",
    }));

  const managerMap = new Map<
    string,
    { id: string; label: string; ratings: number[]; count: number }
  >();
  for (const row of employees) {
    if (!row.managerId || !row.managerName || row.currentRating == null) continue;
    const existing = managerMap.get(row.managerId) ?? {
      id: row.managerId,
      label: row.managerName,
      ratings: [],
      count: 0,
    };
    existing.ratings.push(row.currentRating);
    existing.count += 1;
    managerMap.set(row.managerId, existing);
  }

  const topManagers = [...managerMap.values()]
    .map((item) => ({
      id: item.id,
      label: item.label,
      value: avg(item.ratings),
      meta: `${item.count} reports`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const topDepartments = [...departments]
    .filter((row) => row.averageRating != null)
    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
    .slice(0, 5)
    .map((row) => ({
      id: row.id,
      label: row.name,
      value: row.averageRating ?? 0,
    }));

  const highestGoalAchievement = [...employees]
    .sort((a, b) => b.goalCompletionPercent - a.goalCompletionPercent)
    .slice(0, 5)
    .map((row) => ({
      id: row.id,
      label: row.fullName,
      value: row.goalCompletionPercent,
    }));

  const highestRatedTeams = [...departments]
    .filter((row) => row.employeeCount > 0 && row.averageRating != null)
    .sort((a, b) => {
      const scoreA = (a.averageRating ?? 0) * Math.min(a.employeeCount, 20);
      const scoreB = (b.averageRating ?? 0) * Math.min(b.employeeCount, 20);
      return scoreB - scoreA;
    })
    .slice(0, 5)
    .map((row) => ({
      id: row.id,
      label: row.name,
      value: row.averageRating ?? 0,
    }));

  return {
    topEmployees,
    topManagers,
    topDepartments,
    highestGoalAchievement,
    highestRatedTeams,
  };
}

export async function getCeoPerformanceLowPerformance(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoPerformanceListParams = {},
): Promise<CeoPerformanceLowPerformance> {
  const organizationId = profile.employee.organizationId;
  const employeesResult = await listCeoPerformanceEmployees(supabase, profile, {
    ...filters,
    page: 1,
    pageSize: 500,
  });
  const departments = await listCeoPerformanceDepartments(supabase, profile, filters);
  const employees = employeesResult.data;

  const employeesOnPip = employees
    .filter((row) => row.onPip)
    .slice(0, 10)
    .map((row) => ({
      id: row.id,
      label: row.fullName,
      meta: row.departmentName ?? "—",
    }));

  const departmentsBelowTarget = departments
    .filter(
      (row) =>
        row.averageRating != null && row.averageRating < BELOW_TARGET_RATING,
    )
    .map((row) => ({
      id: row.id,
      label: row.name,
      value: row.averageRating ?? 0,
    }));

  const managerIssues = new Map<
    string,
    { id: string; label: string; lowCount: number; pending: number }
  >();
  for (const row of employees) {
    if (!row.managerId || !row.managerName) continue;
    const existing = managerIssues.get(row.managerId) ?? {
      id: row.managerId,
      label: row.managerName,
      lowCount: 0,
      pending: 0,
    };
    if (row.currentRating != null && row.currentRating <= 2) existing.lowCount += 1;
    if (row.reviewStatus && REVIEW_PENDING_STATUSES.includes(row.reviewStatus)) {
      existing.pending += 1;
    }
    managerIssues.set(row.managerId, existing);
  }

  const managersRequiringAttention = [...managerIssues.values()]
    .filter((item) => item.lowCount > 0 || item.pending >= 3)
    .map((item) => ({
      id: item.id,
      label: item.label,
      value: item.lowCount + item.pending,
      meta: `${item.lowCount} low · ${item.pending} pending`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const pendingReviews = employees
    .filter(
      (row) => row.reviewStatus && REVIEW_PENDING_STATUSES.includes(row.reviewStatus),
    )
    .slice(0, 10)
    .map((row) => ({
      id: row.id,
      label: row.fullName,
      meta: row.reviewStatus ?? "pending",
    }));

  const employeeIds = employees.map((row) => row.id);
  let reviewDelays: CeoPerformanceLowPerformance["reviewDelays"] = [];
  if (employeeIds.length > 0) {
    const { data, error } = await fromHrms(supabase, "performance_reviews")
      .select("employee_id, review_status, created_at, submitted_at")
      .eq("organization_id", organizationId)
      .in("employee_id", employeeIds)
      .in("review_status", REVIEW_PENDING_STATUSES)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) throw new Error(error.message);

    const byEmployee = new Map(employees.map((row) => [row.id, row]));
    reviewDelays = ((data ?? []) as LooseRow[])
      .map((row) => {
        const employee = byEmployee.get(row.employee_id);
        if (!employee) return null;
        const days = differenceInCalendarDays(new Date(), new Date(row.created_at));
        if (days < 14) return null;
        return {
          id: employee.id,
          label: employee.fullName,
          meta: `${days} days open`,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .slice(0, 10);
  }

  return {
    employeesOnPip,
    departmentsBelowTarget,
    managersRequiringAttention,
    pendingReviews,
    reviewDelays,
  };
}

export async function getCeoPerformanceInsights(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoPerformanceListParams = {},
): Promise<CeoPerformanceInsights> {
  const organizationId = profile.employee.organizationId;
  const employeesResult = await listCeoPerformanceEmployees(supabase, profile, {
    ...filters,
    page: 1,
    pageSize: 500,
  });
  const departments = await listCeoPerformanceDepartments(supabase, profile, filters);
  const employees = employeesResult.data;
  const employeeIds = employees.map((row) => row.id);

  const ratingBuckets = [1, 2, 3, 4, 5].map((rating) => ({
    label: `${rating} · ${RATING_LABELS[rating]}`,
    value: employees.filter((row) => row.currentRating === rating).length,
  }));

  const performanceDistribution = [
    {
      label: "High Performers",
      value: employees.filter(
        (row) => row.currentRating != null && row.currentRating >= HIGH_PERFORMER_RATING,
      ).length,
    },
    {
      label: "Meets Expectations",
      value: employees.filter((row) => row.currentRating === 3).length,
    },
    {
      label: "Needs Attention",
      value: employees.filter(
        (row) => row.currentRating != null && row.currentRating <= 2,
      ).length,
    },
    {
      label: "Unrated",
      value: employees.filter((row) => row.currentRating == null).length,
    },
  ];

  const managerMap = new Map<string, number[]>();
  for (const row of employees) {
    if (!row.managerName || row.currentRating == null) continue;
    const list = managerMap.get(row.managerName) ?? [];
    list.push(row.currentRating);
    managerMap.set(row.managerName, list);
  }

  let skillGapOverview: { label: string; value: number }[] = [];
  let trainingRequirementSummary: { label: string; value: number }[] = [];

  if (employeeIds.length > 0) {
    const { data, error } = await fromHrms(supabase, "performance_reviews")
      .select("employee_id, comments, created_at")
      .eq("organization_id", organizationId)
      .in("employee_id", employeeIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const latest = latestByEmployee((data ?? []) as LooseRow[]);
    const skillTotals = new Map<string, { sum: number; count: number }>();
    let trainingNeeded = 0;
    let pipRecommended = 0;
    let promotionRecommended = 0;

    for (const review of latest.values()) {
      const parsed = parseReviewCommentsPayload(review.comments);
      if (parsed.recommendTraining) trainingNeeded += 1;
      if (parsed.recommendPip) pipRecommended += 1;
      if (parsed.recommendPromotion) promotionRecommended += 1;
      if (parsed.competencies) {
        for (const field of MANAGER_COMPETENCY_FIELDS) {
          const value = parsed.competencies[field.key];
          if (typeof value !== "number" || value <= 0) continue;
          const existing = skillTotals.get(field.label) ?? { sum: 0, count: 0 };
          existing.sum += value;
          existing.count += 1;
          skillTotals.set(field.label, existing);
        }
      }
    }

    skillGapOverview = [...skillTotals.entries()]
      .map(([label, stats]) => ({
        label,
        value: Math.round((5 - stats.sum / stats.count) * 10) / 10,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    trainingRequirementSummary = [
      { label: "Training Recommended", value: trainingNeeded },
      { label: "PIP Recommended", value: pipRecommended },
      { label: "Promotion Recommended", value: promotionRecommended },
      { label: "No Flag", value: Math.max(0, latest.size - trainingNeeded - pipRecommended) },
    ];
  }

  const promotionReadiness = [
    {
      label: "Eligible (Rating ≥ 4)",
      value: employees.filter(
        (row) => row.currentRating != null && row.currentRating >= HIGH_PERFORMER_RATING,
      ).length,
    },
    {
      label: "In Promotion Pipeline",
      value: employees.filter((row) =>
        row.promotionStatus
          ? ["pending", "recommended", "approved"].includes(row.promotionStatus)
          : false,
      ).length,
    },
    {
      label: "No Active Case",
      value: employees.filter((row) => !row.promotionStatus).length,
    },
  ];

  return {
    performanceDistribution,
    ratingDistribution: ratingBuckets,
    departmentComparison: departments
      .filter((row) => row.averageRating != null)
      .map((row) => ({ label: row.name, value: row.averageRating ?? 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    managerComparison: [...managerMap.entries()]
      .map(([label, ratings]) => ({ label, value: avg(ratings) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    goalAchievement: [
      {
        label: "≥ 80%",
        value: employees.filter((row) => row.goalCompletionPercent >= 80).length,
      },
      {
        label: "50–79%",
        value: employees.filter(
          (row) => row.goalCompletionPercent >= 50 && row.goalCompletionPercent < 80,
        ).length,
      },
      {
        label: "< 50%",
        value: employees.filter((row) => row.goalCompletionPercent < 50).length,
      },
    ],
    promotionReadiness,
    trainingRequirementSummary,
    skillGapOverview,
  };
}

export async function getCeoPerformancePromotionOverview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoPerformanceListParams = {},
): Promise<CeoPerformancePromotionOverview> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams({ ...filters, page: 1, pageSize: 10 });
  const employees = await loadScopedEmployees(supabase, organizationId, parsed);
  const employeeIds = employees.map((row) => row.id as string);

  if (employeeIds.length === 0) {
    return {
      recommendations: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      pipeline: PROMOTION_PIPELINE.map((status) => ({ label: status, value: 0 })),
    };
  }

  const { data, error } = await fromHrms(supabase, "performance_promotions")
    .select("promotion_status")
    .eq("organization_id", organizationId)
    .in("employee_id", employeeIds)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as LooseRow[];
  const counts = new Map<PromotionStatus, number>();
  for (const status of PROMOTION_PIPELINE) counts.set(status, 0);
  for (const row of rows) {
    const status = row.promotion_status as PromotionStatus;
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  return {
    recommendations: (counts.get("recommended") ?? 0) + (counts.get("pending") ?? 0),
    approved: counts.get("approved") ?? 0,
    pending: counts.get("pending") ?? 0,
    rejected: counts.get("rejected") ?? 0,
    pipeline: PROMOTION_PIPELINE.map((status) => ({
      label: status,
      value: counts.get(status) ?? 0,
    })),
  };
}

export async function getCeoPerformanceEmployeeDetail(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
): Promise<CeoPerformanceEmployeeDetail | null> {
  const organizationId = profile.employee.organizationId;

  const { data: employee, error: employeeError } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      `id, employee_code, first_name, last_name, email, employment_status,
      departments:department_id(name),
      designations:designation_id(title),
      managers:reporting_manager_id(first_name, last_name),
      employee_profiles(profile_image_storage_path)`,
    )
    .eq("id", employeeId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);
  if (!employee) return null;

  const department = unwrap(employee.departments);
  const designation = unwrap(employee.designations);
  const manager = unwrap(employee.managers);
  const profileRow = unwrap(employee.employee_profiles);

  const [reviewsRes, goalsRes, feedbackRes, promotionsRes, bonusesRes] = await Promise.all([
    fromHrms(supabase, "performance_reviews")
      .select(
        `id, overall_rating, review_status, strengths, weaknesses, improvement_plan,
        comments, created_at, submitted_at, approved_at,
        performance_review_cycles:cycle_id(name, start_date, end_date)`,
      )
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    fromHrms(supabase, "performance_goals")
      .select("id, title, current_progress, goal_status, due_date, created_at")
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    fromHrms(supabase, "performance_feedback")
      .select(
        `id, message, feedback_type, created_at,
        from_employee:from_employee_id(first_name, last_name)`,
      )
      .eq("organization_id", organizationId)
      .eq("to_employee_id", employeeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    fromHrms(supabase, "performance_promotions")
      .select(
        `id, promotion_status, created_at,
        current_designation:current_designation_id(title),
        recommended_designation:recommended_designation_id(title)`,
      )
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    fromHrms(supabase, "employee_bonuses")
      .select("id, reason, amount, bonus_type, bonus_month, approved_at, created_at")
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .eq("bonus_type", "performance")
      .is("deleted_at", null)
      .order("bonus_month", { ascending: false })
      .limit(20),
  ]);

  if (reviewsRes.error) throw new Error(reviewsRes.error.message);
  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (feedbackRes.error) throw new Error(feedbackRes.error.message);
  if (promotionsRes.error) throw new Error(promotionsRes.error.message);
  if (bonusesRes.error) throw new Error(bonusesRes.error.message);

  const reviews = (reviewsRes.data ?? []) as LooseRow[];
  const latest = reviews[0] ?? null;
  const parsedComments = parseReviewCommentsPayload(latest?.comments);

  const quarterRatings = reviews.slice(0, 4).map((review, index) => {
    const cycle = unwrap(review.performance_review_cycles);
    return {
      label: cycle?.name ?? `Q${index + 1}`,
      value: review.overall_rating != null ? Number(review.overall_rating) : null,
    };
  });

  const yearlyMap = new Map<string, number[]>();
  for (const review of reviews) {
    if (review.overall_rating == null) continue;
    const year = String(review.approved_at ?? review.created_at).slice(0, 4);
    const list = yearlyMap.get(year) ?? [];
    list.push(Number(review.overall_rating));
    yearlyMap.set(year, list);
  }

  const skills = MANAGER_COMPETENCY_FIELDS.map((field) => ({
    label: field.label,
    value: parsedComments.competencies?.[field.key] ?? 0,
  })).filter((item) => item.value > 0);

  const timeline = [
    ...reviews.map((review) => {
      const cycle = unwrap(review.performance_review_cycles);
      return {
        id: `review-${review.id}`,
        title: `Review${cycle?.name ? ` · ${cycle.name}` : ""}`,
        description:
          review.overall_rating != null
            ? `Rating ${review.overall_rating}/5 · ${review.review_status}`
            : review.review_status,
        createdAt: review.submitted_at ?? review.approved_at ?? review.created_at,
      };
    }),
    ...((promotionsRes.data ?? []) as LooseRow[]).map((promo) => ({
      id: `promo-${promo.id}`,
      title: "Promotion case",
      description: promo.promotion_status,
      createdAt: promo.created_at,
    })),
  ]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 20);

  const trainingHistory = [
    ...((feedbackRes.data ?? []) as LooseRow[])
      .filter((row) => row.feedback_type === "coaching")
      .map((row) => ({
        id: `feedback-${row.id}`,
        title: "Coaching feedback",
        description: row.message,
        createdAt: row.created_at,
      })),
    ...(parsedComments.recommendTraining
      ? [
          {
            id: "training-flag",
            title: "Training recommended",
            description: "Latest review flagged training requirement.",
            createdAt: latest?.created_at ?? new Date().toISOString(),
          },
        ]
      : []),
  ];

  const awards = ((bonusesRes.data ?? []) as LooseRow[]).map((row) => ({
    id: row.id,
    title: row.reason?.trim() || "Performance bonus",
    amount: row.amount != null ? Number(row.amount) : null,
    awardedAt: row.approved_at ?? row.bonus_month ?? row.created_at,
  }));

  return {
    id: employee.id,
    employeeCode: employee.employee_code,
    firstName: employee.first_name,
    lastName: employee.last_name,
    fullName: formatEmployeeName(employee.first_name, employee.last_name),
    email: employee.email,
    departmentName: department?.name ?? null,
    designationTitle: designation?.title ?? null,
    managerName: manager
      ? formatEmployeeName(manager.first_name, manager.last_name)
      : null,
    profileImagePath: profileRow?.profile_image_storage_path ?? null,
    currentStatus: latest?.review_status
      ? String(latest.review_status)
      : employee.employment_status,
    currentRating: latest?.overall_rating != null ? Number(latest.overall_rating) : null,
    onPip: Boolean(parsedComments.recommendPip),
    timeline,
    quarterRatings,
    yearlyRatings: [...yearlyMap.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([label, values]) => ({ label, value: avg(values) })),
    goals: ((goalsRes.data ?? []) as LooseRow[]).map((goal) => ({
      id: goal.id,
      title: goal.title,
      progress: Number(goal.current_progress ?? 0),
      status: goal.goal_status,
      dueDate: goal.due_date,
    })),
    achievements: ((feedbackRes.data ?? []) as LooseRow[])
      .filter((row) => row.feedback_type === "appreciation")
      .map((row) => row.message as string)
      .filter((value) => Boolean(value?.trim())),
    skills,
    strengths: reviews
      .map((review) => review.strengths)
      .filter((value): value is string => Boolean(value?.trim())),
    improvementAreas: reviews
      .map((review) => review.weaknesses ?? review.improvement_plan)
      .filter((value): value is string => Boolean(value?.trim())),
    managerFeedback: ((feedbackRes.data ?? []) as LooseRow[]).map((row) => {
      const from = unwrap(row.from_employee);
      return {
        id: row.id,
        fromName: from ? formatEmployeeName(from.first_name, from.last_name) : "—",
        message: row.message,
        feedbackType: row.feedback_type,
        createdAt: row.created_at,
      };
    }),
    promotionHistory: ((promotionsRes.data ?? []) as LooseRow[]).map((row) => {
      const current = unwrap(row.current_designation);
      const recommended = unwrap(row.recommended_designation);
      return {
        id: row.id,
        fromTitle: current?.title ?? null,
        toTitle: recommended?.title ?? null,
        status: row.promotion_status as PromotionStatus,
        createdAt: row.created_at,
      };
    }),
    trainingHistory,
    awards,
  };
}

export async function getCeoPerformancePageData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoPerformanceListParams,
): Promise<CeoPerformancePageData> {
  const parsed = parseParams(params);
  const organizationId = profile.employee.organizationId;

  const [kpis, overview, departments, employees, lookups, promotions] = await Promise.all([
    getCeoPerformanceKpis(supabase, profile, parsed),
    getCeoPerformanceOverview(supabase, profile, parsed),
    listCeoPerformanceDepartments(supabase, profile, parsed),
    listCeoPerformanceEmployees(supabase, profile, parsed),
    getCeoPerformanceFilterLookups(supabase, organizationId),
    getCeoPerformancePromotionOverview(supabase, profile, parsed),
  ]);

  const [topPerformers, lowPerformance, insights] = await Promise.all([
    getCeoPerformanceTopPerformers(supabase, profile, parsed),
    getCeoPerformanceLowPerformance(supabase, profile, parsed),
    getCeoPerformanceInsights(supabase, profile, parsed),
  ]);

  return {
    kpis,
    overview,
    departments,
    employees,
    topPerformers,
    lowPerformance,
    insights,
    promotions,
    lookups,
  };
}
