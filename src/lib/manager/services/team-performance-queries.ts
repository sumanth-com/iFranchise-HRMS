import { format, subMonths } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  formatEmployeeName,
  fromHrms,
  unwrapRelation,
} from "@/lib/performance/services/performance-utils";
import { getTeamFilterLookups } from "@/lib/manager/services/team-queries";
import { teamPerformanceListParamsSchema } from "@/lib/validations/manager-performance";
import type { UserProfile } from "@/types/auth";
import type { ReviewStatus } from "@/types/performance";
import type {
  ManagerTeamPerformancePageData,
  TeamPerformanceListParams,
  TeamPerformanceListResult,
  TeamPerformanceSummary,
  TeamPerformanceTrendPoint,
} from "@/types/manager-performance";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

const REVIEW_PENDING_STATUSES: ReviewStatus[] = [
  "draft",
  "pending",
  "in_progress",
  "submitted",
];
const HIGH_PERFORMER_RATING = 4;
const ATTENTION_RATING = 2;

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  return unwrapRelation(value as T | T[] | null);
}

function parseParams(params: TeamPerformanceListParams) {
  return teamPerformanceListParamsSchema.parse(params);
}

function isGoalOverdue(dueDate: string | null, goalStatus: string) {
  if (!dueDate || goalStatus === "completed" || goalStatus === "cancelled") return false;
  return dueDate < format(new Date(), "yyyy-MM-dd");
}

export async function getTeamPerformanceSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
): Promise<TeamPerformanceSummary> {
  if (teamIds.length === 0) {
    return {
      teamAverageRating: 0,
      reviewsPending: 0,
      reviewsCompleted: 0,
      goalsAtRisk: 0,
      highPerformers: 0,
      employeesNeedingAttention: 0,
    };
  }

  const organizationId = profile.employee.organizationId;
  const managerId = profile.employee.id;

  const [reviewsResult, goalsResult, employeesResult] = await Promise.all([
    fromHrms(supabase, "performance_reviews")
      .select("employee_id, review_status, overall_rating, reviewer_employee_id, created_at")
      .eq("organization_id", organizationId)
      .in("employee_id", teamIds)
      .is("deleted_at", null),
    fromHrms(supabase, "performance_goals")
      .select("employee_id, goal_status, due_date")
      .eq("organization_id", organizationId)
      .in("employee_id", teamIds)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("employees")
      .select("id")
      .eq("organization_id", organizationId)
      .in("id", teamIds)
      .is("deleted_at", null),
  ]);

  if (reviewsResult.error) throw new Error(reviewsResult.error.message);
  if (goalsResult.error) throw new Error(goalsResult.error.message);
  if (employeesResult.error) throw new Error(employeesResult.error.message);

  const reviews = (reviewsResult.data ?? []) as LooseRow[];
  const goals = (goalsResult.data ?? []) as LooseRow[];

  const latestReviewByEmployee = new Map<string, LooseRow>();
  for (const review of reviews) {
    const existing = latestReviewByEmployee.get(review.employee_id);
    if (!existing || String(review.created_at ?? "") > String(existing.created_at ?? "")) {
      latestReviewByEmployee.set(review.employee_id, review);
    }
  }

  const ratings = reviews
    .filter((review) => review.review_status === "approved")
    .map((review) => review.overall_rating)
    .filter((rating): rating is number => rating !== null && rating !== undefined);

  const teamAverageRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((sum, rating) => sum + Number(rating), 0) / ratings.length) * 10) / 10
      : 0;

  const reviewsPending = reviews.filter(
    (review) =>
      REVIEW_PENDING_STATUSES.includes(review.review_status as ReviewStatus) &&
      review.reviewer_employee_id === managerId,
  ).length;

  const reviewsCompleted = reviews.filter((review) => review.review_status === "approved").length;

  const goalsAtRisk = goals.filter(
    (goal) =>
      goal.goal_status === "at_risk" ||
      isGoalOverdue(goal.due_date, goal.goal_status),
  ).length;

  let highPerformers = 0;
  let employeesNeedingAttention = 0;

  for (const employeeId of teamIds) {
    const latestReview = latestReviewByEmployee.get(employeeId);
    const rating = latestReview?.overall_rating ? Number(latestReview.overall_rating) : null;
    const employeeGoals = goals.filter((goal) => goal.employee_id === employeeId);
    const hasAtRiskGoal = employeeGoals.some(
      (goal) =>
        goal.goal_status === "at_risk" ||
        isGoalOverdue(goal.due_date, goal.goal_status),
    );
    const pendingReview =
      latestReview &&
      REVIEW_PENDING_STATUSES.includes(latestReview.review_status as ReviewStatus);

    if (rating !== null && rating >= HIGH_PERFORMER_RATING) {
      highPerformers += 1;
    }

    if (
      (rating !== null && rating <= ATTENTION_RATING) ||
      hasAtRiskGoal ||
      pendingReview
    ) {
      employeesNeedingAttention += 1;
    }
  }

  return {
    teamAverageRating,
    reviewsPending,
    reviewsCompleted,
    goalsAtRisk,
    highPerformers,
    employeesNeedingAttention,
  };
}

export async function getTeamPerformanceTrends(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
): Promise<TeamPerformanceTrendPoint[]> {
  if (teamIds.length === 0) return [];

  const organizationId = profile.employee.organizationId;
  const months = Array.from({ length: 6 }, (_, index) =>
    subMonths(new Date(), 5 - index),
  );

  const [reviewsResult, goalsResult] = await Promise.all([
    fromHrms(supabase, "performance_reviews")
      .select("employee_id, review_status, overall_rating, submitted_at, approved_at, created_at")
      .eq("organization_id", organizationId)
      .in("employee_id", teamIds)
      .is("deleted_at", null),
    fromHrms(supabase, "performance_goals")
      .select("employee_id, goal_status, updated_at, created_at")
      .eq("organization_id", organizationId)
      .in("employee_id", teamIds)
      .is("deleted_at", null),
  ]);

  if (reviewsResult.error) throw new Error(reviewsResult.error.message);
  if (goalsResult.error) throw new Error(goalsResult.error.message);

  const reviews = (reviewsResult.data ?? []) as LooseRow[];
  const goals = (goalsResult.data ?? []) as LooseRow[];

  return months.map((monthDate) => {
    const monthKey = format(monthDate, "yyyy-MM");
    const monthReviews = reviews.filter((review) => {
      const stamp = review.submitted_at ?? review.approved_at ?? review.created_at;
      return stamp?.startsWith(monthKey);
    });
    const monthGoals = goals.filter((goal) => {
      const stamp = goal.updated_at ?? goal.created_at;
      return stamp?.startsWith(monthKey);
    });

    const ratings = monthReviews
      .map((review) => review.overall_rating)
      .filter((rating): rating is number => rating !== null && rating !== undefined)
      .map(Number);

    const completedGoals = monthGoals.filter((goal) => goal.goal_status === "completed").length;
    const totalGoals = monthGoals.length;

    return {
      month: format(monthDate, "MMM yyyy"),
      averageRating:
        ratings.length > 0
          ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10
          : 0,
      goalCompletionRate:
        totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
      reviewsCompleted: monthReviews.filter((review) => review.review_status === "approved").length,
    };
  });
}

export async function listTeamPerformanceOverview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  params: TeamPerformanceListParams,
): Promise<TeamPerformanceListResult> {
  const parsed = parseParams(params);

  if (teamIds.length === 0) {
    return { data: [], total: 0, page: parsed.page, pageSize: parsed.pageSize };
  }

  const organizationId = profile.employee.organizationId;
  const from = (parsed.page - 1) * parsed.pageSize;
  const to = from + parsed.pageSize - 1;

  let employeeQuery = supabase
    .schema("hrms")
    .from("employees")
    .select(
      `
        id,
        employee_code,
        first_name,
        last_name,
        date_of_joining,
        department_id,
        designation_id,
        departments:department_id (name),
        designations:designation_id (title)
      `,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .in("id", teamIds)
    .is("deleted_at", null);

  if (parsed.departmentId) {
    employeeQuery = employeeQuery.eq("department_id", parsed.departmentId);
  }

  if (parsed.employeeId) {
    employeeQuery = employeeQuery.eq("id", parsed.employeeId);
  }

  if (parsed.search) {
    const term = `%${parsed.search}%`;
    employeeQuery = employeeQuery.or(
      `employee_code.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`,
    );
  }

  employeeQuery = employeeQuery.order("first_name").range(from, to);

  const { data: employees, error: employeesError, count } = await employeeQuery;
  if (employeesError) throw new Error(employeesError.message);

  const pageEmployeeIds = (employees ?? []).map((row) => row.id);
  if (pageEmployeeIds.length === 0) {
    return { data: [], total: count ?? 0, page: parsed.page, pageSize: parsed.pageSize };
  }

  const [reviewsResult, goalsResult, cyclesResult] = await Promise.all([
    fromHrms(supabase, "performance_reviews")
      .select("id, employee_id, review_status, overall_rating, submitted_at, approved_at, created_at, cycle_id")
      .eq("organization_id", organizationId)
      .in("employee_id", pageEmployeeIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    fromHrms(supabase, "performance_goals")
      .select("employee_id, goal_status, due_date")
      .eq("organization_id", organizationId)
      .in("employee_id", pageEmployeeIds)
      .is("deleted_at", null),
    parsed.cycleId
      ? fromHrms(supabase, "performance_review_cycles")
          .select("id, end_date")
          .eq("id", parsed.cycleId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (reviewsResult.error) throw new Error(reviewsResult.error.message);
  if (goalsResult.error) throw new Error(goalsResult.error.message);
  if (cyclesResult.error) throw new Error(cyclesResult.error.message);

  const reviews = (reviewsResult.data ?? []) as LooseRow[];
  const goals = (goalsResult.data ?? []) as LooseRow[];
  const cycleEndDate = cyclesResult.data?.end_date ?? null;

  const latestReviewByEmployee = new Map<string, LooseRow>();
  for (const review of reviews) {
    if (parsed.cycleId && review.cycle_id !== parsed.cycleId) continue;
    if (!latestReviewByEmployee.has(review.employee_id)) {
      latestReviewByEmployee.set(review.employee_id, review);
    }
  }

  let rows = (employees ?? []).map((employee) => {
    const department = unwrap(employee.departments);
    const designation = unwrap(employee.designations);
    const latestReview = latestReviewByEmployee.get(employee.id);
    const employeeGoals = goals.filter((goal) => goal.employee_id === employee.id);
    const goalsCompleted = employeeGoals.filter((goal) => goal.goal_status === "completed").length;
    const pendingGoals = employeeGoals.filter(
      (goal) => !["completed", "cancelled"].includes(goal.goal_status),
    ).length;
    const goalsAtRisk = employeeGoals.filter(
      (goal) =>
        goal.goal_status === "at_risk" ||
        isGoalOverdue(goal.due_date, goal.goal_status),
    ).length;
    const currentRating = latestReview?.overall_rating
      ? Number(latestReview.overall_rating)
      : null;
    const reviewStatus = (latestReview?.review_status as ReviewStatus | undefined) ?? null;
    const lastReviewDate =
      latestReview?.submitted_at ??
      latestReview?.approved_at ??
      latestReview?.created_at ??
      null;
    const pendingReview =
      reviewStatus && REVIEW_PENDING_STATUSES.includes(reviewStatus);

    return {
      employeeId: employee.id,
      employeeCode: employee.employee_code,
      employeeName: formatEmployeeName(employee.first_name, employee.last_name),
      designationTitle: designation?.title ?? null,
      departmentName: department?.name ?? null,
      currentRating,
      goalsCompleted,
      pendingGoals,
      goalsAtRisk,
      reviewStatus,
      reviewId: latestReview?.id ?? null,
      lastReviewDate,
      nextReviewDate: cycleEndDate,
      needsAttention:
        (currentRating !== null && currentRating <= ATTENTION_RATING) ||
        goalsAtRisk > 0 ||
        Boolean(pendingReview),
      isHighPerformer: currentRating !== null && currentRating >= HIGH_PERFORMER_RATING,
    };
  });

  if (parsed.reviewStatus) {
    rows = rows.filter((row) => row.reviewStatus === parsed.reviewStatus);
  }
  if (parsed.minRating) {
    rows = rows.filter(
      (row) => row.currentRating !== null && row.currentRating >= parsed.minRating!,
    );
  }

  if (parsed.sortBy === "current_rating") {
    rows.sort((a, b) => (a.currentRating ?? 0) - (b.currentRating ?? 0));
    if (parsed.sortOrder === "desc") rows.reverse();
  } else if (parsed.sortBy === "last_review") {
    rows.sort((a, b) =>
      String(a.lastReviewDate ?? "").localeCompare(String(b.lastReviewDate ?? "")),
    );
    if (parsed.sortOrder === "desc") rows.reverse();
  }

  return {
    data: rows,
    total: count ?? 0,
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
}

export async function getTeamPerformanceFilterLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
  teamIds: string[],
) {
  const [teamLookups, cyclesResult, employeesResult] = await Promise.all([
    getTeamFilterLookups(supabase, organizationId, teamIds),
    fromHrms(supabase, "performance_review_cycles")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("start_date", { ascending: false }),
    teamIds.length
      ? supabase
          .schema("hrms")
          .from("employees")
          .select("id, first_name, last_name, employee_code")
          .eq("organization_id", organizationId)
          .in("id", teamIds)
          .is("deleted_at", null)
          .order("first_name")
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (cyclesResult.error) throw new Error(cyclesResult.error.message);
  if (employeesResult.error) throw new Error(employeesResult.error.message);

  return {
    departments: teamLookups.departments,
    designations: teamLookups.designations,
    cycles: (cyclesResult.data ?? []).map((row: { id: string; name: string }) => ({
      id: row.id,
      label: row.name,
    })),
    employees: (employeesResult.data ?? []).map((row) => ({
      id: row.id,
      label: formatEmployeeName(row.first_name, row.last_name),
      code: row.employee_code,
    })),
  };
}

export async function getManagerTeamPerformancePageData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  params: TeamPerformanceListParams,
): Promise<ManagerTeamPerformancePageData> {
  const parsed = parseParams(params);
  const organizationId = profile.employee.organizationId;

  const [summary, records, lookups, trends] = await Promise.all([
    getTeamPerformanceSummary(supabase, profile, teamIds),
    listTeamPerformanceOverview(supabase, profile, teamIds, parsed),
    getTeamPerformanceFilterLookups(supabase, organizationId, teamIds),
    getTeamPerformanceTrends(supabase, profile, teamIds),
  ]);

  return { summary, records, lookups, trends };
}
