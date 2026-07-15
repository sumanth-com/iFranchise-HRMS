import {
  differenceInMonths,
  differenceInYears,
  eachMonthOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subMonths,
  subQuarters,
  subYears,
} from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  getTodayDateString,
} from "@/lib/attendance/services/attendance-utils";
import { isWorkFromHomeBranch } from "@/lib/manager/services/attendance-correction-service";
import { parseReviewCommentsPayload } from "@/lib/manager/services/performance-competency-utils";
import {
  formatEmployeeName,
  fromHrms,
  unwrapRelation,
} from "@/lib/reports/services/reports-utils";
import { ceoAnalyticsListParamsSchema } from "@/lib/validations/ceo-analytics";
import type { UserProfile } from "@/types/auth";
import type { AttendanceStatus } from "@/types/attendance";
import type {
  CeoAnalyticsAttendance,
  CeoAnalyticsChartItem,
  CeoAnalyticsComparison,
  CeoAnalyticsFilterLookups,
  CeoAnalyticsHiring,
  CeoAnalyticsInsight,
  CeoAnalyticsKpis,
  CeoAnalyticsListParams,
  CeoAnalyticsPageData,
  CeoAnalyticsPayroll,
  CeoAnalyticsPerformance,
  CeoAnalyticsWorkforce,
} from "@/types/ceo-analytics";
import type { ReportResult } from "@/types/reports";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

const ACTIVE_STATUSES = new Set(["active", "probation", "on_leave"]);
const WORKING: AttendanceStatus[] = ["present", "late", "half_day"];
const FUNNEL_STAGES = [
  "applied",
  "screening",
  "technical",
  "hr",
  "ceo",
  "offer",
  "joined",
] as const;

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  return unwrapRelation(value as T | T[] | null);
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function deltaPercent(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function mapToSortedChart(map: Map<string, number>, limit = 12): CeoAnalyticsChartItem[] {
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function parseParams(params: CeoAnalyticsListParams) {
  const parsed = ceoAnalyticsListParamsSchema.parse(params);
  const today = getTodayDateString();
  const now = parseISO(today);
  const dateTo = parsed.dateTo ?? format(endOfMonth(now), "yyyy-MM-dd");
  const dateFrom = parsed.dateFrom ?? format(startOfMonth(now), "yyyy-MM-dd");

  let compareMode = parsed.compareMode ?? "none";
  if (parsed.comparePreviousPeriod && compareMode === "none") {
    compareMode = "previous_month";
  }

  return {
    ...parsed,
    dateFrom,
    dateTo,
    compareMode,
  };
}

function previousRange(
  dateFrom: string,
  dateTo: string,
  mode: ReturnType<typeof parseParams>["compareMode"],
) {
  const from = parseISO(dateFrom);
  const to = parseISO(dateTo);

  if (mode === "previous_quarter") {
    return {
      dateFrom: format(subQuarters(from, 1), "yyyy-MM-dd"),
      dateTo: format(subQuarters(to, 1), "yyyy-MM-dd"),
      label: "Previous quarter",
    };
  }
  if (mode === "previous_year") {
    return {
      dateFrom: format(subYears(from, 1), "yyyy-MM-dd"),
      dateTo: format(subYears(to, 1), "yyyy-MM-dd"),
      label: "Previous year",
    };
  }
  // previous_month / previous_period default
  return {
    dateFrom: format(subMonths(from, 1), "yyyy-MM-dd"),
    dateTo: format(subMonths(to, 1), "yyyy-MM-dd"),
    label: "Previous period",
  };
}

function monthKeys(dateFrom: string, dateTo: string) {
  const start = startOfMonth(parseISO(dateFrom));
  const end = startOfMonth(parseISO(dateTo));
  const months = eachMonthOfInterval({ start, end });
  return months.slice(-12);
}

function tenureYears(dateOfJoining: string | null | undefined) {
  if (!dateOfJoining) return null;
  const months = differenceInMonths(new Date(), parseISO(dateOfJoining));
  if (months < 0) return 0;
  return Math.round((months / 12) * 10) / 10;
}

function ageYears(dob: string | null | undefined) {
  if (!dob) return null;
  return differenceInYears(new Date(), parseISO(dob));
}

function ageBucket(age: number) {
  if (age < 25) return "< 25";
  if (age < 35) return "25–34";
  if (age < 45) return "35–44";
  if (age < 55) return "45–54";
  return "55+";
}

function isOnPip(comments: string | null | undefined) {
  return Boolean(parseReviewCommentsPayload(comments).recommendPip);
}

async function loadEmployees(
  supabase: AuthSupabaseClient,
  organizationId: string,
  filters: ReturnType<typeof parseParams>,
  departmentOverride?: string,
) {
  let query = fromHrms(supabase, "employees")
    .select(
      `id, first_name, last_name, employment_status, date_of_joining, date_of_leaving,
       department_id, branch_id, employment_type_id, reporting_manager_id,
       departments:department_id(id, name),
       branches:branch_id(id, name),
       employment_types:employment_type_id(id, name),
       employee_profiles(gender, date_of_birth)`,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .limit(5000);

  const departmentId = departmentOverride ?? filters.departmentId;
  if (departmentId) query = query.eq("department_id", departmentId);
  if (filters.branchId) query = query.eq("branch_id", filters.branchId);
  if (filters.managerId) query = query.eq("reporting_manager_id", filters.managerId);
  if (filters.employmentTypeId) {
    query = query.eq("employment_type_id", filters.employmentTypeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as LooseRow[];
}

export async function getCeoAnalyticsFilterLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<CeoAnalyticsFilterLookups> {
  const [departments, branches, employmentTypes, reporting, employees] = await Promise.all([
    fromHrms(supabase, "departments")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
    fromHrms(supabase, "branches")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
    fromHrms(supabase, "employment_types")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
    fromHrms(supabase, "employees")
      .select("reporting_manager_id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .not("reporting_manager_id", "is", null),
    fromHrms(supabase, "employees")
      .select("id, first_name, last_name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .in("employment_status", ["active", "probation", "on_leave"]),
  ]);

  if (departments.error) throw new Error(departments.error.message);
  if (branches.error) throw new Error(branches.error.message);
  if (employmentTypes.error) throw new Error(employmentTypes.error.message);
  if (reporting.error) throw new Error(reporting.error.message);
  if (employees.error) throw new Error(employees.error.message);

  const managerIds = new Set(
    ((reporting.data ?? []) as LooseRow[])
      .map((row) => row.reporting_manager_id as string)
      .filter(Boolean),
  );

  return {
    departments: ((departments.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
    branches: ((branches.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
    employmentTypes: ((employmentTypes.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
    managers: ((employees.data ?? []) as LooseRow[])
      .filter((row) => managerIds.has(row.id))
      .map((row) => ({
        id: row.id,
        label: formatEmployeeName(row.first_name, row.last_name),
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

async function buildWorkforce(
  employees: LooseRow[],
  dateFrom: string,
  dateTo: string,
): Promise<CeoAnalyticsWorkforce> {
  const active = employees.filter((row) => ACTIVE_STATUSES.has(row.employment_status));
  const months = monthKeys(dateFrom, dateTo);

  const headcountGrowth = months.map((date) => {
    const cutoff = format(endOfMonth(date), "yyyy-MM-dd");
    const count = employees.filter((row) => {
      if (!row.date_of_joining || String(row.date_of_joining) > cutoff) return false;
      if (row.date_of_leaving && String(row.date_of_leaving) <= cutoff) return false;
      return true;
    }).length;
    return { label: format(date, "MMM yyyy"), value: count };
  });

  const departmentMap = new Map<string, number>();
  const managerMap = new Map<string, number>();
  const employmentTypeMap = new Map<string, number>();

  const managerNames = new Map(
    employees.map((row) => [
      row.id as string,
      formatEmployeeName(row.first_name, row.last_name),
    ]),
  );

  for (const row of active) {
    const dept = unwrap(row.departments)?.name ?? "Unassigned";
    departmentMap.set(dept, (departmentMap.get(dept) ?? 0) + 1);

    const type = unwrap(row.employment_types)?.name ?? "Unassigned";
    employmentTypeMap.set(type, (employmentTypeMap.get(type) ?? 0) + 1);

    if (row.reporting_manager_id) {
      const label = managerNames.get(row.reporting_manager_id) ?? "Unassigned";
      managerMap.set(label, (managerMap.get(label) ?? 0) + 1);
    }
  }

  const departmentGrowth = mapToSortedChart(departmentMap);
  const managerDistribution = mapToSortedChart(managerMap, 10);
  const employmentTypeDistribution = mapToSortedChart(employmentTypeMap);

  const tenures = active
    .map((row) => tenureYears(row.date_of_joining))
    .filter((value): value is number => value != null);

  const genderMap = new Map<string, number>();
  const ageMap = new Map<string, number>();
  for (const row of active) {
    const profile = unwrap(row.employee_profiles);
    const gender = String(profile?.gender ?? "prefer_not_to_say")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
    genderMap.set(gender, (genderMap.get(gender) ?? 0) + 1);
    const age = ageYears(profile?.date_of_birth);
    if (age != null) {
      const bucket = ageBucket(age);
      ageMap.set(bucket, (ageMap.get(bucket) ?? 0) + 1);
    }
  }

  const joiningTrend = months.map((date) => {
    const key = format(date, "yyyy-MM");
    return {
      label: format(date, "MMM yyyy"),
      value: employees.filter(
        (row) => row.date_of_joining && String(row.date_of_joining).startsWith(key),
      ).length,
    };
  });

  const exitTrend = months.map((date) => {
    const key = format(date, "yyyy-MM");
    return {
      label: format(date, "MMM yyyy"),
      value: employees.filter(
        (row) => row.date_of_leaving && String(row.date_of_leaving).startsWith(key),
      ).length,
    };
  });

  return {
    headcountGrowth,
    departmentGrowth,
    managerDistribution,
    employmentTypeDistribution,
    averageTenureYears: avg(tenures),
    genderDistribution: mapToSortedChart(genderMap),
    ageDistribution: ["< 25", "25–34", "35–44", "45–54", "55+"]
      .filter((label) => ageMap.has(label))
      .map((label) => ({ label, value: ageMap.get(label) ?? 0 })),
    joiningTrend,
    exitTrend,
  };
}

async function buildHiring(
  supabase: AuthSupabaseClient,
  organizationId: string,
  employees: LooseRow[],
  dateFrom: string,
  dateTo: string,
): Promise<CeoAnalyticsHiring> {
  const employeeIds = new Set(employees.map((row) => row.id as string));
  const departmentIds = new Set(
    employees.map((row) => row.department_id as string | null).filter(Boolean),
  );

  const [jobsRes, candidatesRes, offersRes, userRolesRes] = await Promise.all([
    fromHrms(supabase, "recruitment_job_openings")
      .select("id, title, job_status, open_positions, department_id, created_at")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "recruitment_candidates")
      .select(
        "id, stage, created_at, joined_at, created_by, job_opening_id, job:job_opening_id(department_id, title)",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .is("archived_at", null),
    fromHrms(supabase, "recruitment_offers")
      .select("id, offer_status, created_at")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "user_roles")
      .select("user_id, employees:employee_id(id, first_name, last_name)")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .is("deleted_at", null),
  ]);

  if (jobsRes.error) throw new Error(jobsRes.error.message);
  if (candidatesRes.error) throw new Error(candidatesRes.error.message);
  if (offersRes.error) throw new Error(offersRes.error.message);
  if (userRolesRes.error) throw new Error(userRolesRes.error.message);

  const jobs = ((jobsRes.data ?? []) as LooseRow[]).filter((row) => {
    if (departmentIds.size === 0) return true;
    if (!row.department_id) return true;
    return departmentIds.has(row.department_id);
  });
  const candidates = ((candidatesRes.data ?? []) as LooseRow[]).filter((row) => {
    const job = unwrap(row.job);
    if (departmentIds.size === 0) return true;
    if (!job?.department_id) return true;
    return departmentIds.has(job.department_id);
  });
  const offers = (offersRes.data ?? []) as LooseRow[];

  const months = monthKeys(dateFrom, dateTo);
  const hiringTrend = months.map((date) => {
    const key = format(date, "yyyy-MM");
    return {
      label: format(date, "MMM yyyy"),
      value: candidates.filter(
        (row) =>
          row.stage === "joined" &&
          row.joined_at &&
          String(row.joined_at).slice(0, 7) === key,
      ).length,
    };
  });

  const recruitmentFunnel = FUNNEL_STAGES.map((stage) => ({
    label: stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    value: candidates.filter((row) => row.stage === stage).length,
  }));

  const decidedOffers = offers.filter((row) =>
    ["accepted", "rejected", "expired"].includes(row.offer_status),
  );
  const accepted = offers.filter((row) => row.offer_status === "accepted").length;

  const joined = candidates.filter(
    (row) => row.stage === "joined" && row.joined_at && row.created_at,
  );
  const timeToHireDays =
    joined.length > 0
      ? Math.round(
          joined.reduce((sum, row) => {
            const start = new Date(row.created_at).getTime();
            const end = new Date(row.joined_at).getTime();
            return sum + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
          }, 0) / joined.length,
        )
      : 0;

  const openPositions = jobs
    .filter((row) => row.job_status === "open")
    .reduce((sum, row) => sum + Number(row.open_positions ?? 0), 0);
  const filledPositions = candidates.filter(
    (row) =>
      row.stage === "joined" &&
      row.joined_at &&
      String(row.joined_at).slice(0, 10) >= dateFrom &&
      String(row.joined_at).slice(0, 10) <= dateTo,
  ).length;

  const deptNameById = new Map(
    employees.map((row) => [
      row.department_id as string,
      (unwrap(row.departments)?.name as string) ?? "Unassigned",
    ]),
  );
  const byDept = new Map<string, number>();
  for (const row of candidates.filter((item) => item.stage === "joined")) {
    const job = unwrap(row.job);
    const label = deptNameById.get(job?.department_id) ?? "Unassigned";
    byDept.set(label, (byDept.get(label) ?? 0) + 1);
  }

  const userToName = new Map<string, string>();
  for (const row of (userRolesRes.data ?? []) as LooseRow[]) {
    const employee = unwrap(row.employees);
    if (!employee?.id || !employeeIds.has(employee.id)) {
      if (!employee) continue;
    }
    if (row.user_id && employee) {
      userToName.set(
        row.user_id,
        formatEmployeeName(employee.first_name, employee.last_name),
      );
    }
  }

  const recruiterMap = new Map<string, number>();
  for (const row of joined) {
    const label = row.created_by
      ? userToName.get(row.created_by) ?? "Unknown recruiter"
      : "Unassigned";
    recruiterMap.set(label, (recruiterMap.get(label) ?? 0) + 1);
  }

  return {
    hiringTrend,
    recruitmentFunnel,
    offerAcceptanceRate: percent(accepted, decidedOffers.length || 1),
    timeToHireDays,
    openPositions,
    filledPositions,
    recruitmentByDepartment: mapToSortedChart(byDept),
    recruiterPerformance: mapToSortedChart(recruiterMap, 8),
  };
}

async function buildPerformance(
  supabase: AuthSupabaseClient,
  organizationId: string,
  employees: LooseRow[],
): Promise<CeoAnalyticsPerformance> {
  const employeeIds = employees.map((row) => row.id as string);
  if (employeeIds.length === 0) {
    return {
      averageRating: 0,
      departmentComparison: [],
      managerComparison: [],
      goalCompletion: [],
      promotionPipeline: [],
      employeesOnPip: 0,
      topDepartments: [],
      lowPerformingDepartments: [],
    };
  }

  const [reviewsRes, goalsRes, promotionsRes] = await Promise.all([
    fromHrms(supabase, "performance_reviews")
      .select("id, employee_id, overall_rating, comments, created_at")
      .eq("organization_id", organizationId)
      .in("employee_id", employeeIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5000),
    fromHrms(supabase, "performance_goals")
      .select("id, employee_id, goal_status, current_progress")
      .eq("organization_id", organizationId)
      .in("employee_id", employeeIds)
      .is("deleted_at", null),
    fromHrms(supabase, "performance_promotions")
      .select("id, promotion_status")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
  ]);

  if (reviewsRes.error) throw new Error(reviewsRes.error.message);
  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (promotionsRes.error) throw new Error(promotionsRes.error.message);

  const latestReview = new Map<string, LooseRow>();
  for (const row of (reviewsRes.data ?? []) as LooseRow[]) {
    if (!latestReview.has(row.employee_id)) latestReview.set(row.employee_id, row);
  }

  const ratings = [...latestReview.values()]
    .map((row) => Number(row.overall_rating ?? 0))
    .filter((value) => value > 0);

  const empById = new Map(employees.map((row) => [row.id as string, row]));
  const deptRatings = new Map<string, number[]>();
  const managerRatings = new Map<string, number[]>();
  let pipCount = 0;

  for (const [employeeId, review] of latestReview) {
    const employee = empById.get(employeeId);
    if (!employee) continue;
    const rating = Number(review.overall_rating ?? 0);
    if (isOnPip(review.comments)) pipCount += 1;
    if (rating <= 0) continue;
    const dept = unwrap(employee.departments)?.name ?? "Unassigned";
    deptRatings.set(dept, [...(deptRatings.get(dept) ?? []), rating]);
    if (employee.reporting_manager_id) {
      const manager = empById.get(employee.reporting_manager_id);
      const label = manager
        ? formatEmployeeName(manager.first_name, manager.last_name)
        : "Unassigned";
      managerRatings.set(label, [...(managerRatings.get(label) ?? []), rating]);
    }
  }

  const departmentComparison = [...deptRatings.entries()]
    .map(([label, values]) => ({ label, value: avg(values) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const managerComparison = [...managerRatings.entries()]
    .map(([label, values]) => ({ label, value: avg(values) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const goalsByDept = new Map<string, LooseRow[]>();
  for (const goal of (goalsRes.data ?? []) as LooseRow[]) {
    const employee = empById.get(goal.employee_id);
    const dept = unwrap(employee?.departments)?.name ?? "Unassigned";
    goalsByDept.set(dept, [...(goalsByDept.get(dept) ?? []), goal]);
  }
  const goalCompletion = [...goalsByDept.entries()]
    .map(([label, goals]) => {
      const completed = goals.filter((goal) => goal.goal_status === "completed").length;
      const value =
        completed > 0
          ? percent(completed, goals.length)
          : avg(goals.map((goal) => Number(goal.current_progress ?? 0)));
      return { label, value };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const promoCounts = new Map<string, number>();
  for (const row of (promotionsRes.data ?? []) as LooseRow[]) {
    const status = String(row.promotion_status);
    promoCounts.set(status, (promoCounts.get(status) ?? 0) + 1);
  }

  return {
    averageRating: avg(ratings),
    departmentComparison,
    managerComparison,
    goalCompletion,
    promotionPipeline: [...promoCounts.entries()].map(([label, value]) => ({
      label: label.replace(/_/g, " "),
      value,
    })),
    employeesOnPip: pipCount,
    topDepartments: departmentComparison.slice(0, 5),
    lowPerformingDepartments: [...departmentComparison].reverse().slice(0, 5),
  };
}

async function buildAttendance(
  supabase: AuthSupabaseClient,
  organizationId: string,
  employees: LooseRow[],
  dateFrom: string,
  dateTo: string,
): Promise<CeoAnalyticsAttendance> {
  const employeeIds = employees.map((row) => row.id as string);
  if (employeeIds.length === 0) {
    return {
      attendancePercent: 0,
      latePercent: 0,
      wfhPercent: 0,
      leavePercent: 0,
      averageWorkingHours: 0,
      departmentAttendance: [],
      attendanceHeatmap: [],
      monthlyAttendanceTrend: [],
    };
  }

  const { data, error } = await fromHrms(supabase, "attendance")
    .select(
      "id, employee_id, attendance_date, attendance_status, work_hours, notes, branches:branch_id(name)",
    )
    .eq("organization_id", organizationId)
    .in("employee_id", employeeIds)
    .gte("attendance_date", dateFrom)
    .lte("attendance_date", dateTo)
    .is("deleted_at", null)
    .limit(20000);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as LooseRow[];

  const working = rows.filter((row) => WORKING.includes(row.attendance_status));
  const late = rows.filter((row) => row.attendance_status === "late");
  const leave = rows.filter((row) => row.attendance_status === "on_leave");
  const wfh = working.filter((row) =>
    isWorkFromHomeBranch(unwrap(row.branches)?.name, row.notes),
  );

  const empById = new Map(employees.map((row) => [row.id as string, row]));
  const deptMap = new Map<string, { working: number; total: number }>();
  for (const row of rows) {
    const employee = empById.get(row.employee_id);
    const label = unwrap(employee?.departments)?.name ?? "Unassigned";
    const current = deptMap.get(label) ?? { working: 0, total: 0 };
    current.total += 1;
    if (WORKING.includes(row.attendance_status)) current.working += 1;
    deptMap.set(label, current);
  }

  const heatmap = new Map<string, { working: number; total: number }>();
  for (const row of rows) {
    const day = String(row.attendance_date).slice(8, 10);
    const current = heatmap.get(day) ?? { working: 0, total: 0 };
    current.total += 1;
    if (WORKING.includes(row.attendance_status)) current.working += 1;
    heatmap.set(day, current);
  }

  const months = monthKeys(dateFrom, dateTo);
  const monthlyAttendanceTrend = months.map((date) => {
    const key = format(date, "yyyy-MM");
    const monthRows = rows.filter((row) => String(row.attendance_date).startsWith(key));
    const monthWorking = monthRows.filter((row) => WORKING.includes(row.attendance_status));
    return {
      label: format(date, "MMM yyyy"),
      value: percent(monthWorking.length, monthRows.length || 1),
    };
  });

  return {
    attendancePercent: percent(working.length, rows.length || 1),
    latePercent: percent(late.length, rows.length || 1),
    wfhPercent: percent(wfh.length, working.length || 1),
    leavePercent: percent(leave.length, rows.length || 1),
    averageWorkingHours: avg(
      rows.map((row) => Number(row.work_hours ?? 0)).filter((value) => value > 0),
    ),
    departmentAttendance: [...deptMap.entries()]
      .map(([label, stats]) => ({
        label,
        value: percent(stats.working, stats.total || 1),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    attendanceHeatmap: [...heatmap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, stats]) => ({
        label: `Day ${Number(label)}`,
        value: percent(stats.working, stats.total || 1),
      })),
    monthlyAttendanceTrend,
  };
}

async function buildPayroll(
  supabase: AuthSupabaseClient,
  organizationId: string,
  employees: LooseRow[],
  dateFrom: string,
  dateTo: string,
): Promise<CeoAnalyticsPayroll> {
  const months = monthKeys(dateFrom, dateTo);
  const rangeStart = format(months[0] ?? parseISO(dateFrom), "yyyy-MM-01");
  const rangeEnd = format(endOfMonth(parseISO(dateTo)), "yyyy-MM-dd");

  const [payrollsRes, bonusesRes, reimbursementsRes] = await Promise.all([
    fromHrms(supabase, "payrolls")
      .select("id, payroll_month, total_net, total_gross, payroll_status")
      .eq("organization_id", organizationId)
      .gte("payroll_month", rangeStart)
      .lte("payroll_month", rangeEnd)
      .is("deleted_at", null)
      .order("payroll_month"),
    fromHrms(supabase, "employee_bonuses")
      .select("amount, bonus_month, bonus_status, employee_id")
      .eq("organization_id", organizationId)
      .gte("bonus_month", rangeStart)
      .lte("bonus_month", rangeEnd)
      .in("bonus_status", ["approved", "paid"])
      .is("deleted_at", null),
    fromHrms(supabase, "employee_reimbursements")
      .select("amount, expense_date, reimbursement_status, employee_id")
      .eq("organization_id", organizationId)
      .gte("expense_date", dateFrom)
      .lte("expense_date", dateTo)
      .in("reimbursement_status", ["approved", "paid"])
      .is("deleted_at", null),
  ]);

  if (payrollsRes.error) throw new Error(payrollsRes.error.message);
  if (bonusesRes.error) throw new Error(bonusesRes.error.message);
  if (reimbursementsRes.error) throw new Error(reimbursementsRes.error.message);

  const payrollRows = (payrollsRes.data ?? []) as LooseRow[];
  const netByMonth = new Map(
    payrollRows.map((row) => [String(row.payroll_month).slice(0, 7), Number(row.total_net ?? 0)]),
  );

  const payrollCostTrend = months.map((date) => {
    const key = format(date, "yyyy-MM");
    return { label: format(date, "MMM yyyy"), value: netByMonth.get(key) ?? 0 };
  });

  const payrollGrowth = payrollCostTrend.map((item, index) => {
    if (index === 0) return { label: item.label, value: 0 };
    const prev = payrollCostTrend[index - 1]?.value ?? 0;
    return { label: item.label, value: deltaPercent(item.value, prev) };
  });

  const latestPayroll = [...payrollRows].reverse()[0];
  let departmentPayroll: CeoAnalyticsChartItem[] = [];
  let averageSalary = 0;
  let salaryDistribution: CeoAnalyticsChartItem[] = [];

  if (latestPayroll?.id) {
    const employeeIds = new Set(employees.map((row) => row.id as string));
    const { data: items, error } = await fromHrms(supabase, "payroll_items")
      .select("employee_id, net_salary, gross_salary")
      .eq("payroll_id", latestPayroll.id)
      .is("deleted_at", null)
      .limit(5000);
    if (error) throw new Error(error.message);

    const scoped = ((items ?? []) as LooseRow[]).filter((row) =>
      employeeIds.has(row.employee_id),
    );
    const empById = new Map(employees.map((row) => [row.id as string, row]));
    const deptTotals = new Map<string, number>();
    const buckets = new Map<string, number>([
      ["< 25k", 0],
      ["25–50k", 0],
      ["50–100k", 0],
      ["100k+", 0],
    ]);

    for (const item of scoped) {
      const employee = empById.get(item.employee_id);
      const dept = unwrap(employee?.departments)?.name ?? "Unassigned";
      const net = Number(item.net_salary ?? 0);
      deptTotals.set(dept, (deptTotals.get(dept) ?? 0) + net);
      if (net < 25000) buckets.set("< 25k", (buckets.get("< 25k") ?? 0) + 1);
      else if (net < 50000) buckets.set("25–50k", (buckets.get("25–50k") ?? 0) + 1);
      else if (net < 100000) buckets.set("50–100k", (buckets.get("50–100k") ?? 0) + 1);
      else buckets.set("100k+", (buckets.get("100k+") ?? 0) + 1);
    }

    departmentPayroll = mapToSortedChart(deptTotals);
    averageSalary = avg(scoped.map((row) => Number(row.net_salary ?? 0)));
    salaryDistribution = [...buckets.entries()].map(([label, value]) => ({ label, value }));
  }

  const bonusTrend = months.map((date) => {
    const key = format(date, "yyyy-MM");
    const amount = ((bonusesRes.data ?? []) as LooseRow[])
      .filter((row) => String(row.bonus_month).startsWith(key))
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    return { label: format(date, "MMM yyyy"), value: Math.round(amount) };
  });

  const benefitsCost = ((reimbursementsRes.data ?? []) as LooseRow[]).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );

  return {
    payrollCostTrend,
    departmentPayroll,
    averageSalary,
    salaryDistribution,
    benefitsCost: Math.round(benefitsCost),
    bonusTrend,
    payrollGrowth,
  };
}

async function buildSatisfaction(
  supabase: AuthSupabaseClient,
  organizationId: string,
  dateFrom: string,
  dateTo: string,
) {
  const { data, error } = await fromHrms(supabase, "exit_interviews")
    .select("overall_rating, created_at")
    .eq("organization_id", organizationId)
    .gte("created_at", `${dateFrom}T00:00:00.000Z`)
    .lte("created_at", `${dateTo}T23:59:59.999Z`)
    .is("deleted_at", null)
    .not("overall_rating", "is", null);

  if (error) {
    // Table may be empty / inaccessible — treat as no data
    return null;
  }

  const ratings = ((data ?? []) as LooseRow[])
    .map((row) => Number(row.overall_rating ?? 0))
    .filter((value) => value > 0);
  if (ratings.length === 0) return null;
  // Normalize 1–5 scale to 0–100 for KPI card consistency
  return Math.round(avg(ratings) * 20 * 10) / 10;
}

function buildKpis(input: {
  employees: LooseRow[];
  dateFrom: string;
  dateTo: string;
  hiring: CeoAnalyticsHiring;
  performance: CeoAnalyticsPerformance;
  attendance: CeoAnalyticsAttendance;
  payroll: CeoAnalyticsPayroll;
  satisfaction: number | null;
}): CeoAnalyticsKpis {
  const { employees, dateFrom, dateTo, hiring, performance, attendance, payroll, satisfaction } =
    input;

  const activeNow = employees.filter((row) => ACTIVE_STATUSES.has(row.employment_status)).length;
  const joinedInRange = employees.filter(
    (row) =>
      row.date_of_joining &&
      String(row.date_of_joining) >= dateFrom &&
      String(row.date_of_joining) <= dateTo,
  ).length;
  const exitedInRange = employees.filter(
    (row) =>
      row.date_of_leaving &&
      String(row.date_of_leaving) >= dateFrom &&
      String(row.date_of_leaving) <= dateTo,
  ).length;

  const startHeadcount = Math.max(activeNow - joinedInRange + exitedInRange, 1);
  const workforceGrowthPercent = percent(activeNow - startHeadcount, startHeadcount);
  const attritionRate = percent(exitedInRange, startHeadcount);
  const employeeRetentionRate = Math.max(0, Math.round((100 - attritionRate) * 10) / 10);

  const decidedOffersProxy = Math.max(hiring.filledPositions + hiring.openPositions, 1);
  const hiringSuccessRate =
    hiring.offerAcceptanceRate || percent(hiring.filledPositions, decidedOffersProxy);

  const latestPayroll = payroll.payrollCostTrend.at(-1)?.value ?? 0;
  const previousPayroll = payroll.payrollCostTrend.at(-2)?.value ?? 0;
  const payrollGrowthPercent = deltaPercent(latestPayroll, previousPayroll);

  const goalAchievementPercent =
    performance.goalCompletion.length > 0
      ? avg(performance.goalCompletion.map((item) => item.value))
      : 0;

  const performanceIndex = Math.round(performance.averageRating * 20 * 10) / 10;
  const attendanceCompliancePercent = Math.max(
    0,
    Math.round((attendance.attendancePercent - attendance.latePercent) * 10) / 10,
  );

  const companyHealthScore = Math.round(
    avg([
      employeeRetentionRate,
      attendanceCompliancePercent,
      performanceIndex || attendanceCompliancePercent,
      hiringSuccessRate || employeeRetentionRate,
      Math.max(0, 100 - Math.min(Math.abs(payrollGrowthPercent), 40)),
    ]),
  );

  return {
    companyHealthScore,
    workforceGrowthPercent,
    employeeRetentionRate,
    attritionRate,
    hiringSuccessRate,
    attendanceCompliancePercent,
    performanceIndex,
    payrollGrowthPercent,
    goalAchievementPercent,
    employeeSatisfaction: satisfaction,
  };
}

function buildInsights(input: {
  kpis: CeoAnalyticsKpis;
  workforce: CeoAnalyticsWorkforce;
  hiring: CeoAnalyticsHiring;
  performance: CeoAnalyticsPerformance;
  attendance: CeoAnalyticsAttendance;
  payroll: CeoAnalyticsPayroll;
}): CeoAnalyticsInsight[] {
  const insights: CeoAnalyticsInsight[] = [];
  const topDept = input.workforce.departmentGrowth[0];
  if (topDept) {
    insights.push({
      id: "dept-size",
      title: `${topDept.label} leads headcount`,
      description: `${topDept.label} currently has the largest workforce share (${topDept.value} employees).`,
      priority: "medium",
    });
  }

  if (input.kpis.attritionRate >= 8) {
    insights.push({
      id: "attrition-high",
      title: "Attrition elevated",
      description: `Attrition rate is ${input.kpis.attritionRate}% in the selected period.`,
      priority: "high",
    });
  } else if (input.kpis.employeeRetentionRate >= 90) {
    insights.push({
      id: "retention-strong",
      title: "Retention remains strong",
      description: `Employee retention is ${input.kpis.employeeRetentionRate}% for the selected period.`,
      priority: "low",
    });
  }

  const hiringPrev = input.hiring.hiringTrend.at(-2)?.value ?? 0;
  const hiringCurr = input.hiring.hiringTrend.at(-1)?.value ?? 0;
  if (hiringCurr < hiringPrev) {
    insights.push({
      id: "hiring-slow",
      title: "Hiring slowed versus last month",
      description: `Joined hires moved from ${hiringPrev} to ${hiringCurr}.`,
      priority: "medium",
    });
  }

  if (input.kpis.payrollGrowthPercent >= 5) {
    insights.push({
      id: "payroll-up",
      title: "Payroll cost increased",
      description: `Payroll grew ${input.kpis.payrollGrowthPercent}% versus the previous month.`,
      priority: "high",
    });
  }

  const topPerf = input.performance.topDepartments[0];
  if (topPerf) {
    insights.push({
      id: "top-kpi",
      title: `${topPerf.label} achieved highest performance`,
      description: `${topPerf.label} leads with an average rating of ${topPerf.value}.`,
      priority: "low",
    });
  }

  const lowAtt = [...input.attendance.departmentAttendance].sort(
    (a, b) => a.value - b.value,
  )[0];
  if (lowAtt && lowAtt.value < 85) {
    insights.push({
      id: "attendance-low",
      title: `${lowAtt.label} attendance below target`,
      description: `${lowAtt.label} attendance is ${lowAtt.value}%, below the 85% target.`,
      priority: "high",
    });
  }

  if (input.performance.employeesOnPip > 0) {
    insights.push({
      id: "pip",
      title: "Employees on PIP",
      description: `${input.performance.employeesOnPip} employee(s) currently flagged for performance improvement.`,
      priority: "medium",
    });
  }

  return insights.slice(0, 8);
}

function buildComparison(input: {
  mode: ReturnType<typeof parseParams>["compareMode"];
  currentLabel: string;
  previousLabel: string;
  currentKpis: CeoAnalyticsKpis;
  previousKpis: CeoAnalyticsKpis | null;
  leftWorkforce?: CeoAnalyticsWorkforce | null;
  rightWorkforce?: CeoAnalyticsWorkforce | null;
  leftLabel?: string;
  rightLabel?: string;
}): CeoAnalyticsComparison {
  const previous = input.previousKpis;
  const metrics = [
    {
      label: "Company Health Score",
      current: input.currentKpis.companyHealthScore,
      previous: previous?.companyHealthScore ?? 0,
    },
    {
      label: "Workforce Growth %",
      current: input.currentKpis.workforceGrowthPercent,
      previous: previous?.workforceGrowthPercent ?? 0,
    },
    {
      label: "Retention Rate",
      current: input.currentKpis.employeeRetentionRate,
      previous: previous?.employeeRetentionRate ?? 0,
    },
    {
      label: "Attrition Rate",
      current: input.currentKpis.attritionRate,
      previous: previous?.attritionRate ?? 0,
    },
    {
      label: "Attendance Compliance",
      current: input.currentKpis.attendanceCompliancePercent,
      previous: previous?.attendanceCompliancePercent ?? 0,
    },
    {
      label: "Payroll Growth %",
      current: input.currentKpis.payrollGrowthPercent,
      previous: previous?.payrollGrowthPercent ?? 0,
    },
  ].map((item) => ({
    ...item,
    deltaPercent: deltaPercent(item.current, item.previous),
  }));

  let departmentComparison: CeoAnalyticsComparison["departmentComparison"] = null;
  if (
    input.mode === "department" &&
    input.leftWorkforce &&
    input.rightWorkforce &&
    input.leftLabel &&
    input.rightLabel
  ) {
    const labels = new Set([
      ...input.leftWorkforce.employmentTypeDistribution.map((item) => item.label),
      ...input.rightWorkforce.employmentTypeDistribution.map((item) => item.label),
    ]);
    departmentComparison = {
      leftLabel: input.leftLabel,
      rightLabel: input.rightLabel,
      series: [...labels].map((label) => ({
        label,
        left:
          input.leftWorkforce!.employmentTypeDistribution.find((item) => item.label === label)
            ?.value ?? 0,
        right:
          input.rightWorkforce!.employmentTypeDistribution.find((item) => item.label === label)
            ?.value ?? 0,
      })),
    };
  }

  return {
    mode: input.mode,
    currentLabel: input.currentLabel,
    previousLabel: input.previousLabel,
    metrics,
    departmentComparison,
  };
}

async function computeSlice(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: ReturnType<typeof parseParams>,
  departmentOverride?: string,
) {
  const organizationId = profile.employee.organizationId;
  const employees = await loadEmployees(
    supabase,
    organizationId,
    filters,
    departmentOverride,
  );

  const [workforce, hiring, performance, attendance, payroll, satisfaction] =
    await Promise.all([
      buildWorkforce(employees, filters.dateFrom, filters.dateTo),
      buildHiring(supabase, organizationId, employees, filters.dateFrom, filters.dateTo),
      buildPerformance(supabase, organizationId, employees),
      buildAttendance(
        supabase,
        organizationId,
        employees,
        filters.dateFrom,
        filters.dateTo,
      ),
      buildPayroll(supabase, organizationId, employees, filters.dateFrom, filters.dateTo),
      buildSatisfaction(supabase, organizationId, filters.dateFrom, filters.dateTo),
    ]);

  const kpis = buildKpis({
    employees,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    hiring,
    performance,
    attendance,
    payroll,
    satisfaction,
  });

  return { employees, workforce, hiring, performance, attendance, payroll, kpis };
}

export async function getCeoAnalyticsPageData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoAnalyticsListParams,
): Promise<CeoAnalyticsPageData> {
  const filters = parseParams(params);
  const organizationId = profile.employee.organizationId;

  const current = await computeSlice(supabase, profile, filters);
  let previousKpis: CeoAnalyticsKpis | null = null;
  let previousLabel = "Previous period";
  let leftWorkforce: CeoAnalyticsWorkforce | null = null;
  let rightWorkforce: CeoAnalyticsWorkforce | null = null;
  let leftLabel = "";
  let rightLabel = "";

  if (
    filters.compareMode === "previous_month" ||
    filters.compareMode === "previous_quarter" ||
    filters.compareMode === "previous_year"
  ) {
    const prev = previousRange(filters.dateFrom, filters.dateTo, filters.compareMode);
    previousLabel = prev.label;
    const previous = await computeSlice(supabase, profile, {
      ...filters,
      dateFrom: prev.dateFrom,
      dateTo: prev.dateTo,
    });
    previousKpis = previous.kpis;
  }

  if (filters.compareMode === "department" && filters.compareDepartmentId) {
    const left = await computeSlice(
      supabase,
      profile,
      { ...filters, departmentId: filters.departmentId },
      filters.departmentId,
    );
    const right = await computeSlice(
      supabase,
      profile,
      filters,
      filters.compareDepartmentId,
    );
    leftWorkforce = left.workforce;
    rightWorkforce = right.workforce;
    const lookups = await getCeoAnalyticsFilterLookups(supabase, organizationId);
    leftLabel =
      lookups.departments.find((item) => item.id === filters.departmentId)?.label ??
      "Selected department";
    rightLabel =
      lookups.departments.find((item) => item.id === filters.compareDepartmentId)?.label ??
      "Compare department";
  }

  const insights = buildInsights(current);
  const lookups = await getCeoAnalyticsFilterLookups(supabase, organizationId);
  const comparison = buildComparison({
    mode: filters.compareMode,
    currentLabel: `${filters.dateFrom} → ${filters.dateTo}`,
    previousLabel,
    currentKpis: current.kpis,
    previousKpis,
    leftWorkforce,
    rightWorkforce,
    leftLabel,
    rightLabel,
  });

  return {
    kpis: {
      ...current.kpis,
      previous: previousKpis ?? undefined,
    },
    workforce: current.workforce,
    hiring: current.hiring,
    performance: current.performance,
    attendance: current.attendance,
    payroll: current.payroll,
    insights,
    comparison,
    lookups,
    generatedAt: new Date().toISOString(),
  };
}

export function buildCeoAnalyticsExportResult(
  data: CeoAnalyticsPageData,
): ReportResult {
  const rows = [
    ...Object.entries({
      "Company Health Score": data.kpis.companyHealthScore,
      "Workforce Growth %": data.kpis.workforceGrowthPercent,
      "Retention Rate %": data.kpis.employeeRetentionRate,
      "Attrition Rate %": data.kpis.attritionRate,
      "Hiring Success Rate %": data.kpis.hiringSuccessRate,
      "Attendance Compliance %": data.kpis.attendanceCompliancePercent,
      "Performance Index": data.kpis.performanceIndex,
      "Payroll Growth %": data.kpis.payrollGrowthPercent,
      "Goal Achievement %": data.kpis.goalAchievementPercent,
      "Employee Satisfaction": data.kpis.employeeSatisfaction ?? "N/A",
    }).map(([metric, value]) => ({ section: "KPI", metric, value })),
    ...data.insights.map((insight) => ({
      section: "Insight",
      metric: `${insight.priority.toUpperCase()}: ${insight.title}`,
      value: insight.description,
    })),
    ...data.workforce.departmentGrowth.map((item) => ({
      section: "Workforce · Department",
      metric: item.label,
      value: item.value,
    })),
    ...data.hiring.recruitmentFunnel.map((item) => ({
      section: "Hiring · Funnel",
      metric: item.label,
      value: item.value,
    })),
    ...data.attendance.departmentAttendance.map((item) => ({
      section: "Attendance · Department %",
      metric: item.label,
      value: item.value,
    })),
    ...data.payroll.departmentPayroll.map((item) => ({
      section: "Payroll · Department",
      metric: item.label,
      value: item.value,
    })),
  ];

  return {
    key: "hr_department",
    title: "Executive Analytics Export",
    generatedAt: data.generatedAt,
    columns: [
      { key: "section", header: "Section" },
      { key: "metric", header: "Metric" },
      { key: "value", header: "Value" },
    ],
    rows,
    total: rows.length,
  };
}

export async function buildCeoAnalyticsSummaryPdf(
  data: CeoAnalyticsPageData,
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  const margin = 48;
  let y = page.getHeight() - margin;

  const write = (text: string, size = 11, useBold = false) => {
    if (y < margin + 40) {
      page = pdf.addPage([595, 842]);
      y = page.getHeight() - margin;
    }
    page.drawText(text.slice(0, 90), {
      x: margin,
      y,
      size,
      font: useBold ? bold : font,
      color: rgb(0.12, 0.12, 0.14),
    });
    y -= size + 8;
  };

  write("Executive Analytics Summary", 18, true);
  write(`Generated ${format(parseISO(data.generatedAt), "dd MMM yyyy HH:mm")}`, 10);
  y -= 6;
  write("Key Performance Indicators", 13, true);
  write(`Company Health Score: ${data.kpis.companyHealthScore}`);
  write(`Workforce Growth: ${data.kpis.workforceGrowthPercent}%`);
  write(`Retention: ${data.kpis.employeeRetentionRate}% · Attrition: ${data.kpis.attritionRate}%`);
  write(
    `Attendance Compliance: ${data.kpis.attendanceCompliancePercent}% · Performance Index: ${data.kpis.performanceIndex}`,
  );
  write(
    `Hiring Success: ${data.kpis.hiringSuccessRate}% · Payroll Growth: ${data.kpis.payrollGrowthPercent}%`,
  );
  write(`Goal Achievement: ${data.kpis.goalAchievementPercent}%`);
  if (data.kpis.employeeSatisfaction != null) {
    write(`Employee Satisfaction (exit interviews): ${data.kpis.employeeSatisfaction}`);
  }
  y -= 4;
  write("Executive Insights", 13, true);
  for (const insight of data.insights) {
    write(`[${insight.priority.toUpperCase()}] ${insight.title}`, 11, true);
    write(insight.description, 10);
  }

  return pdf.save();
}
