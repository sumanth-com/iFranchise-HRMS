import { format, startOfMonth, subMonths } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getManagerRecruitmentContext } from "@/lib/manager/services/manager-recruitment-context";
import type { ManagerReportCategory } from "@/lib/manager/reports/manager-report-definitions";
import { getTeamAttendanceSummary } from "@/lib/manager/services/team-attendance-queries";
import { getTeamLeaveSummary } from "@/lib/manager/services/team-leave-queries";
import { getTeamPerformanceSummary, getTeamPerformanceTrends } from "@/lib/manager/services/team-performance-queries";
import { getTeamRecruitmentSummary } from "@/lib/manager/services/team-recruitment-queries";
import { getTeamFilterLookups, getTeamMemberOptions } from "@/lib/manager/services/team-queries";
import {
  defaultDateRange,
  fromHrms,
  type ReportRowLoose,
  unwrapRelation,
} from "@/lib/reports/services/reports-utils";
import type { UserProfile } from "@/types/auth";
import type {
  ManagerCategoryReportBundle,
  ManagerReportsListParams,
  ManagerReportsPageData,
  ManagerReportsSummary,
  ManagerReportsTrends,
  ManagerScopedReportContext,
  ManagerTeamReportSummary,
  ManagerTrainingReportSummary,
} from "@/types/manager-reports";
import type { ChartSeriesItem, ReportFilters, ReportsLookups } from "@/types/reports";

function emptySummary(): ManagerReportsSummary {
  return {
    teamHeadcount: 0,
    averageAttendancePercent: 0,
    leaveUtilizationPercent: 0,
    performanceScore: 0,
    openRecruitment: 0,
    attritionRisk: 0,
  };
}

export async function getManagerScopedReportContext(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
): Promise<ManagerScopedReportContext> {
  const recruitmentContext = await getManagerRecruitmentContext(supabase, profile);
  return {
    teamEmployeeIds: teamIds,
    recruitmentDepartmentIds: recruitmentContext.departmentIds,
  };
}

export function buildManagerScopedFilters(
  filters: ReportFilters,
  context: ManagerScopedReportContext,
): ReportFilters {
  return {
    ...filters,
    teamEmployeeIds: context.teamEmployeeIds,
    recruitmentDepartmentIds: context.recruitmentDepartmentIds,
  };
}

export async function getManagerReportsLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
  teamIds: string[],
): Promise<ReportsLookups> {
  const [teamLookups, employees] = await Promise.all([
    getTeamFilterLookups(supabase, organizationId, teamIds),
    getTeamMemberOptions(supabase, organizationId, teamIds),
  ]);

  return {
    departments: teamLookups.departments,
    designations: teamLookups.designations,
    employees,
  };
}

async function computeLeaveUtilization(
  supabase: AuthSupabaseClient,
  teamIds: string[],
): Promise<number> {
  if (!teamIds.length) return 0;

  const { data, error } = await fromHrms(supabase, "leave_balances")
    .select("allocated_days, used_days")
    .in("employee_id", teamIds)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  let allocated = 0;
  let used = 0;
  for (const row of (data ?? []) as ReportRowLoose[]) {
    allocated += Number(row.allocated_days ?? 0);
    used += Number(row.used_days ?? 0);
  }
  if (allocated <= 0) return 0;
  return Math.round((used / allocated) * 100);
}

async function computeAverageAttendancePercent(
  supabase: AuthSupabaseClient,
  organizationId: string,
  teamIds: string[],
  dateFrom: string,
  dateTo: string,
): Promise<number> {
  if (!teamIds.length) return 0;

  const { data, error } = await supabase
    .schema("hrms")
    .from("attendance")
    .select("attendance_status")
    .eq("organization_id", organizationId)
    .in("employee_id", teamIds)
    .gte("attendance_date", dateFrom)
    .lte("attendance_date", dateTo)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  if (!rows.length) return 0;

  const presentLike = rows.filter((row) =>
    ["present", "late", "half_day"].includes(String(row.attendance_status)),
  ).length;

  return Math.round((presentLike / rows.length) * 100);
}

async function computeAttritionRisk(
  supabase: AuthSupabaseClient,
  organizationId: string,
  teamIds: string[],
  performanceAttentionCount: number,
): Promise<number> {
  if (!teamIds.length) return 0;

  const [exitRes, probationRes] = await Promise.all([
    fromHrms(supabase, "exit_resignations")
      .select("employee_id")
      .eq("organization_id", organizationId)
      .in("employee_id", teamIds)
      .not("exit_status", "in", '("completed","rejected","withdrawn")')
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("employees")
      .select("id")
      .eq("organization_id", organizationId)
      .in("id", teamIds)
      .eq("employment_status", "probation")
      .is("deleted_at", null),
  ]);

  if (exitRes.error) throw new Error(exitRes.error.message);
  if (probationRes.error) throw new Error(probationRes.error.message);

  const riskIds = new Set<string>();
  for (const row of exitRes.data ?? []) riskIds.add(row.employee_id as string);
  for (const row of probationRes.data ?? []) riskIds.add(row.id as string);

  return Math.max(riskIds.size, performanceAttentionCount);
}

export async function getManagerReportsSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  filters: ReportFilters,
): Promise<ManagerReportsSummary> {
  if (!teamIds.length) return emptySummary();

  const { dateFrom, dateTo } = {
    ...defaultDateRange(30),
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };

  const recruitmentContext = await getManagerRecruitmentContext(supabase, profile);

  const [
    attendanceSummary,
    leaveSummary,
    performanceSummary,
    recruitmentSummary,
    leaveUtilizationPercent,
    averageAttendancePercent,
  ] = await Promise.all([
    getTeamAttendanceSummary(supabase, profile, teamIds, dateFrom, dateTo),
    getTeamLeaveSummary(supabase, profile, teamIds),
    getTeamPerformanceSummary(supabase, profile, teamIds),
    getTeamRecruitmentSummary(supabase, profile, recruitmentContext),
    computeLeaveUtilization(supabase, teamIds),
    computeAverageAttendancePercent(
      supabase,
      profile.employee.organizationId,
      teamIds,
      dateFrom ?? defaultDateRange(30).dateFrom,
      dateTo ?? defaultDateRange(30).dateTo,
    ),
  ]);

  const attritionRisk = await computeAttritionRisk(
    supabase,
    profile.employee.organizationId,
    teamIds,
    performanceSummary.employeesNeedingAttention,
  );

  return {
    teamHeadcount: teamIds.length,
    averageAttendancePercent,
    leaveUtilizationPercent,
    performanceScore: performanceSummary.teamAverageRating,
    openRecruitment: recruitmentSummary.openPositions,
    attritionRisk,
  };
}

async function buildMonthlySeries(
  map: Map<string, number>,
  months = 6,
): Promise<ChartSeriesItem[]> {
  const items: ChartSeriesItem[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const label = format(subMonths(new Date(), i), "yyyy-MM");
    items.push({ label, value: map.get(label) ?? 0 });
  }
  return items;
}

export async function getManagerReportsTrends(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
): Promise<ManagerReportsTrends> {
  const empty: ManagerReportsTrends = {
    attendanceTrend: [],
    leaveTrend: [],
    performanceTrend: [],
    hiringTrend: [],
    teamGrowthTrend: [],
  };

  if (!teamIds.length) return empty;

  const organizationId = profile.employee.organizationId;
  const monthStart = format(startOfMonth(subMonths(new Date(), 5)), "yyyy-MM-dd");

  const [attendanceRes, leaveRes, joinersRes, performanceTrends, recruitmentCandidatesRes] =
    await Promise.all([
      supabase
        .schema("hrms")
        .from("attendance")
        .select("attendance_date, attendance_status")
        .eq("organization_id", organizationId)
        .in("employee_id", teamIds)
        .gte("attendance_date", monthStart)
        .is("deleted_at", null),
      supabase
        .schema("hrms")
        .from("leave_requests")
        .select("start_date, total_days, leave_status")
        .in("employee_id", teamIds)
        .eq("leave_status", "approved")
        .gte("start_date", monthStart)
        .is("deleted_at", null),
      supabase
        .schema("hrms")
        .from("employees")
        .select("date_of_joining")
        .eq("organization_id", organizationId)
        .in("id", teamIds)
        .gte("date_of_joining", monthStart)
        .is("deleted_at", null),
      getTeamPerformanceTrends(supabase, profile, teamIds),
      getManagerRecruitmentContext(supabase, profile).then(async (context) => {
        if (!context.departmentIds.length) return [];
        const { data } = await fromHrms(supabase, "recruitment_candidates")
          .select("created_at, stage, job:job_opening_id!inner(department_id)")
          .eq("organization_id", organizationId)
          .in("job.department_id", context.departmentIds)
          .gte("created_at", monthStart)
          .is("deleted_at", null);
        return data ?? [];
      }),
    ]);

  if (attendanceRes.error) throw new Error(attendanceRes.error.message);
  if (leaveRes.error) throw new Error(leaveRes.error.message);
  if (joinersRes.error) throw new Error(joinersRes.error.message);

  const attendanceMap = new Map<string, number>();
  for (const row of attendanceRes.data ?? []) {
    if (!["present", "late", "half_day"].includes(String(row.attendance_status))) continue;
    const key = String(row.attendance_date).slice(0, 7);
    attendanceMap.set(key, (attendanceMap.get(key) ?? 0) + 1);
  }

  const leaveMap = new Map<string, number>();
  for (const row of leaveRes.data ?? []) {
    const key = String(row.start_date).slice(0, 7);
    leaveMap.set(key, (leaveMap.get(key) ?? 0) + Number(row.total_days ?? 0));
  }

  const growthMap = new Map<string, number>();
  for (const row of joinersRes.data ?? []) {
    if (!row.date_of_joining) continue;
    const key = String(row.date_of_joining).slice(0, 7);
    growthMap.set(key, (growthMap.get(key) ?? 0) + 1);
  }

  const hiringMap = new Map<string, number>();
  for (const row of recruitmentCandidatesRes as ReportRowLoose[]) {
    const key = String(row.created_at).slice(0, 7);
    hiringMap.set(key, (hiringMap.get(key) ?? 0) + 1);
  }

  return {
    attendanceTrend: await buildMonthlySeries(attendanceMap),
    leaveTrend: await buildMonthlySeries(leaveMap),
    performanceTrend: performanceTrends.map((point) => ({
      label: point.month,
      value: point.averageRating,
    })),
    hiringTrend: await buildMonthlySeries(hiringMap),
    teamGrowthTrend: await buildMonthlySeries(growthMap),
  };
}

export async function getManagerTrainingReportSummary(
  supabase: AuthSupabaseClient,
  organizationId: string,
  teamIds: string[],
): Promise<ManagerTrainingReportSummary> {
  if (!teamIds.length) {
    return {
      completedTrainings: 0,
      pendingTrainings: 0,
      mandatoryCompletionPercent: 0,
      certificationsOnFile: 0,
    };
  }

  const [reviewsRes, certificationsRes] = await Promise.all([
    fromHrms(supabase, "performance_reviews")
      .select("review_status, comments")
      .eq("organization_id", organizationId)
      .in("employee_id", teamIds)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("employee_documents")
      .select(
        `
        id, document_status,
        document_types:document_type_id(code, name)
      `,
      )
      .in("employee_id", teamIds)
      .is("deleted_at", null),
  ]);

  if (reviewsRes.error) throw new Error(reviewsRes.error.message);
  if (certificationsRes.error) throw new Error(certificationsRes.error.message);

  let pendingTrainings = 0;
  let completedTrainings = 0;

  for (const row of (reviewsRes.data ?? []) as ReportRowLoose[]) {
    if (!row.comments) continue;
    try {
      const parsed = JSON.parse(String(row.comments)) as { recommendTraining?: boolean };
      if (!parsed.recommendTraining) continue;
      if (["approved", "submitted"].includes(String(row.review_status))) {
        completedTrainings += 1;
      } else {
        pendingTrainings += 1;
      }
    } catch {
      // ignore non-json comments
    }
  }

  const certificationRows = (certificationsRes.data ?? []).filter((row) => {
    const docType = unwrapRelation(row.document_types as ReportRowLoose | ReportRowLoose[] | null);
    const code = String(docType?.code ?? "").toUpperCase();
    const name = String(docType?.name ?? "").toLowerCase();
    return code.includes("CERT") || name.includes("certification");
  });

  const verifiedCerts = certificationRows.filter(
    (row) => row.document_status === "verified",
  ).length;

  const mandatoryCompletionPercent =
    pendingTrainings + completedTrainings > 0
      ? Math.round((completedTrainings / (pendingTrainings + completedTrainings)) * 100)
      : certificationRows.length > 0
        ? Math.round((verifiedCerts / certificationRows.length) * 100)
        : 0;

  return {
    completedTrainings,
    pendingTrainings,
    mandatoryCompletionPercent,
    certificationsOnFile: certificationRows.length,
  };
}

export async function getManagerTeamReportSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
): Promise<ManagerTeamReportSummary> {
  if (!teamIds.length) {
    return {
      activeMembers: 0,
      onProbation: 0,
      onLeaveToday: 0,
      newJoinersThisMonth: 0,
      pendingApprovals: 0,
    };
  }

  const organizationId = profile.employee.organizationId;
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");

  const [employeesRes, leaveSummary, attendanceTodayRes] = await Promise.all([
    supabase
      .schema("hrms")
      .from("employees")
      .select("id, employment_status, date_of_joining")
      .eq("organization_id", organizationId)
      .in("id", teamIds)
      .is("deleted_at", null),
    getTeamLeaveSummary(supabase, profile, teamIds),
    supabase
      .schema("hrms")
      .from("attendance")
      .select("employee_id")
      .eq("organization_id", organizationId)
      .in("employee_id", teamIds)
      .eq("attendance_date", today)
      .eq("attendance_status", "on_leave")
      .is("deleted_at", null),
  ]);

  if (employeesRes.error) throw new Error(employeesRes.error.message);
  if (attendanceTodayRes.error) throw new Error(attendanceTodayRes.error.message);

  const employees = employeesRes.data ?? [];
  return {
    activeMembers: employees.filter((row) =>
      ["active", "probation", "on_leave"].includes(String(row.employment_status)),
    ).length,
    onProbation: employees.filter((row) => row.employment_status === "probation").length,
    onLeaveToday: attendanceTodayRes.data?.length ?? leaveSummary.employeesOnLeaveToday,
    newJoinersThisMonth: employees.filter(
      (row) => row.date_of_joining && String(row.date_of_joining) >= monthStart,
    ).length,
    pendingApprovals: leaveSummary.pendingRequests,
  };
}

export async function getManagerCategoryReportBundles(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  filters: ReportFilters,
): Promise<ManagerCategoryReportBundle[]> {
  const { dateFrom, dateTo } = {
    ...defaultDateRange(30),
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };

  const recruitmentContext = await getManagerRecruitmentContext(supabase, profile);

  const [
    attendanceSummary,
    leaveSummary,
    performanceSummary,
    recruitmentSummary,
    trainingSummary,
    teamSummary,
    leaveUtilizationPercent,
    averageAttendancePercent,
  ] = await Promise.all([
    getTeamAttendanceSummary(supabase, profile, teamIds, dateFrom, dateTo),
    getTeamLeaveSummary(supabase, profile, teamIds),
    getTeamPerformanceSummary(supabase, profile, teamIds),
    getTeamRecruitmentSummary(supabase, profile, recruitmentContext),
    getManagerTrainingReportSummary(supabase, profile.employee.organizationId, teamIds),
    getManagerTeamReportSummary(supabase, profile, teamIds),
    computeLeaveUtilization(supabase, teamIds),
    computeAverageAttendancePercent(
      supabase,
      profile.employee.organizationId,
      teamIds,
      dateFrom ?? defaultDateRange(30).dateFrom,
      dateTo ?? defaultDateRange(30).dateTo,
    ),
  ]);

  const totalAttendanceMarks =
    attendanceSummary.presentToday +
    attendanceSummary.absentToday +
    attendanceSummary.lateToday +
    attendanceSummary.halfDayToday +
    attendanceSummary.workFromHomeToday;

  const presentPercent =
    totalAttendanceMarks > 0
      ? Math.round((attendanceSummary.presentToday / totalAttendanceMarks) * 100)
      : 0;
  const latePercent =
    totalAttendanceMarks > 0
      ? Math.round((attendanceSummary.lateToday / totalAttendanceMarks) * 100)
      : 0;
  const absentPercent =
    totalAttendanceMarks > 0
      ? Math.round((attendanceSummary.absentToday / totalAttendanceMarks) * 100)
      : 0;
  const wfhPercent =
    totalAttendanceMarks > 0
      ? Math.round((attendanceSummary.workFromHomeToday / totalAttendanceMarks) * 100)
      : 0;

  return [
    {
      category: "attendance",
      metrics: [
        { label: "Present %", value: presentPercent, suffix: "%" },
        { label: "Late %", value: latePercent, suffix: "%" },
        { label: "Absent %", value: absentPercent, suffix: "%" },
        { label: "WFH %", value: wfhPercent, suffix: "%" },
        { label: "Average Attendance", value: averageAttendancePercent, suffix: "%" },
        { label: "Pending Regularizations", value: attendanceSummary.pendingRegularizations },
      ],
    },
    {
      category: "leave",
      metrics: [
        { label: "Leave Utilization", value: leaveUtilizationPercent, suffix: "%" },
        { label: "Pending Requests", value: leaveSummary.pendingRequests },
        { label: "Approved This Month", value: leaveSummary.approvedThisMonth },
        { label: "Rejected This Month", value: leaveSummary.rejectedThisMonth },
        { label: "On Leave Today", value: leaveSummary.employeesOnLeaveToday },
        { label: "Upcoming Planned", value: leaveSummary.upcomingPlannedLeaves },
      ],
    },
    {
      category: "performance",
      metrics: [
        { label: "Average Rating", value: performanceSummary.teamAverageRating.toFixed(1) },
        { label: "Reviews Pending", value: performanceSummary.reviewsPending },
        { label: "Reviews Completed", value: performanceSummary.reviewsCompleted },
        { label: "High Performers", value: performanceSummary.highPerformers },
        { label: "Needing Attention", value: performanceSummary.employeesNeedingAttention },
        { label: "Goals At Risk", value: performanceSummary.goalsAtRisk },
      ],
    },
    {
      category: "recruitment",
      metrics: [
        { label: "Open Positions", value: recruitmentSummary.openPositions },
        { label: "Candidates Assigned", value: recruitmentSummary.candidatesAssigned },
        { label: "Interviews Today", value: recruitmentSummary.interviewsToday },
        { label: "Pending Feedback", value: recruitmentSummary.pendingFeedback },
        { label: "Offers Awaiting Approval", value: recruitmentSummary.offersAwaitingApproval },
        { label: "Positions Filled", value: recruitmentSummary.positionsFilled },
      ],
    },
    {
      category: "training",
      metrics: [
        { label: "Completed Trainings", value: trainingSummary.completedTrainings },
        { label: "Pending Trainings", value: trainingSummary.pendingTrainings },
        {
          label: "Mandatory Completion",
          value: trainingSummary.mandatoryCompletionPercent,
          suffix: "%",
        },
        { label: "Certifications On File", value: trainingSummary.certificationsOnFile },
      ],
    },
    {
      category: "team",
      metrics: [
        { label: "Active Members", value: teamSummary.activeMembers },
        { label: "On Probation", value: teamSummary.onProbation },
        { label: "On Leave Today", value: teamSummary.onLeaveToday },
        { label: "New Joiners (Month)", value: teamSummary.newJoinersThisMonth },
        { label: "Pending Approvals", value: teamSummary.pendingApprovals },
        { label: "Team Headcount", value: teamIds.length },
      ],
    },
  ];
}

export async function getManagerTeamReportsPageData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  params: ManagerReportsListParams,
): Promise<ManagerReportsPageData> {
  const filters: ReportFilters = {
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    departmentId: params.departmentId,
    designationId: params.designationId,
    employeeId: params.employeeId,
    status: params.status,
    month: params.month,
    year: params.year,
  };

  const [summary, trends, categoryBundles, trainingSummary, teamSummary, lookups] =
    await Promise.all([
      getManagerReportsSummary(supabase, profile, teamIds, filters),
      getManagerReportsTrends(supabase, profile, teamIds),
      getManagerCategoryReportBundles(supabase, profile, teamIds, filters),
      getManagerTrainingReportSummary(supabase, profile.employee.organizationId, teamIds),
      getManagerTeamReportSummary(supabase, profile, teamIds),
      getManagerReportsLookups(supabase, profile.employee.organizationId, teamIds),
    ]);

  return {
    summary,
    trends,
    categoryBundles,
    trainingSummary,
    teamSummary,
    lookups,
    teamEmployeeIds: teamIds,
  };
}

export function categoryBundleFor(
  bundles: ManagerCategoryReportBundle[],
  category: ManagerReportCategory,
) {
  return bundles.find((bundle) => bundle.category === category);
}
