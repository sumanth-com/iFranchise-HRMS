import { format, startOfMonth, subMonths } from "date-fns";
import { cache } from "react";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getAttendanceSummary } from "@/lib/attendance/services/attendance-queries";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import {
  CEO_PENDING_APPROVAL_STATUSES,
  EXECUTIVE_APPROVAL_TYPE_LABELS,
} from "@/lib/ceo/executive-approvals-constants";
import { syncExecutiveApprovalsFromDomain } from "@/lib/ceo/services/ceo-approvals-sync";
import { isWorkFromHomeBranch } from "@/lib/manager/services/attendance-correction-service";
import { getExitSummary } from "@/lib/exit/services/exit-queries";
import { getLeaveSummary } from "@/lib/leave/services/leave-queries";
import { PAYROLL_STATUS_LABELS } from "@/lib/payroll/constants";
import { getPayrollSummary } from "@/lib/payroll/services/payroll-queries";
import { getPerformanceSummary } from "@/lib/performance/services/performance-queries";
import { getRecruitmentSummary } from "@/lib/recruitment/services/recruitment-queries";
import {
  fromHrms,
  unwrapRelation,
} from "@/lib/reports/services/reports-utils";
import type { UserProfile } from "@/types/auth";
import type {
  CeoActivityItem,
  CeoApprovalItem,
  CeoDashboardData,
  CeoInsight,
} from "@/types/ceo-dashboard";
import type { PayrollStatus } from "@/types/payroll";
import type { ExecutiveApprovalType } from "@/types/ceo-approvals";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

function mapExecutiveKind(
  type: ExecutiveApprovalType,
): CeoApprovalItem["kind"] {
  switch (type) {
    case "senior_hiring":
    case "strategic_recruitment":
      return "senior_hiring";
    case "budget_approval":
    case "salary_revision":
      return "payroll";
    case "executive_promotion":
      return "promotion";
    case "organization_policy":
      return "policy";
    case "department_creation":
    case "department_closure":
    case "organization_structure":
      return "department";
    case "new_branch":
    case "asset_purchase":
      return "manager_creation";
    default:
      return "department";
  }
}

const ACTIVE_STATUSES = new Set(["active", "probation", "on_leave"]);

function preferredActivityTitle(action: string | null, module: string | null, table: string | null) {
  const key = `${module ?? ""}:${action ?? ""}:${table ?? ""}`.toLowerCase();
  if (key.includes("employee") && key.includes("insert")) return "Employee Joined";
  if (key.includes("promotion")) return "Promotion";
  if (key.includes("leave") && key.includes("approv")) return "Leave Approved";
  if (key.includes("payroll")) return "Payroll Processed";
  if (key.includes("interview")) return "Interview Scheduled";
  if (key.includes("offer")) return "Offer Accepted";
  if (key.includes("manager") || key.includes("reporting")) return "Manager Assigned";
  if (key.includes("department") && key.includes("insert")) return "Department Created";
  if (action) return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return module ? `${module} update` : "Company activity";
}

function activityHref(module: string | null): string | null {
  switch (module) {
    case "employees":
    case "organization":
      return CEO_ROUTES.organization;
    case "attendance":
      return CEO_ROUTES.attendance;
    case "leave":
      return CEO_ROUTES.approvals;
    case "payroll":
      return CEO_ROUTES.payroll;
    case "recruitment":
      return CEO_ROUTES.recruitment;
    case "performance":
      return CEO_ROUTES.performance;
    default:
      return CEO_ROUTES.analytics;
  }
}

function buildInsights(input: {
  attritionRate: number;
  attendancePercent: number;
  prevAttendancePercent: number;
  payrollPending: boolean;
  payrollCompleted: boolean;
  recruitmentDelayed: boolean;
  pendingReviews: number;
  pendingApprovals: number;
  newJoiners: number;
  openPositions: number;
}): CeoInsight[] {
  const insights: CeoInsight[] = [];

  if (input.attritionRate >= 5) {
    insights.push({
      id: "attrition-up",
      title: "Attrition increased this month",
      description: `Company attrition is at ${input.attritionRate.toFixed(1)}%. Review exit reasons and retention risk.`,
      priority: input.attritionRate >= 10 ? "high" : "medium",
      href: CEO_ROUTES.organization,
    });
  }

  if (input.attendancePercent > input.prevAttendancePercent + 1) {
    insights.push({
      id: "attendance-improved",
      title: "Attendance improved",
      description: `Present rate is ${input.attendancePercent.toFixed(1)}%, up from ${input.prevAttendancePercent.toFixed(1)}%.`,
      priority: "low",
      href: CEO_ROUTES.attendance,
    });
  } else if (input.attendancePercent < 85) {
    insights.push({
      id: "attendance-low",
      title: "Attendance below target",
      description: `Company attendance is ${input.attendancePercent.toFixed(1)}%. Investigate absenteeism hotspots.`,
      priority: "high",
      href: CEO_ROUTES.attendance,
    });
  }

  if (input.payrollCompleted) {
    insights.push({
      id: "payroll-ready",
      title: "Payroll ready",
      description: "Current month payroll has been completed successfully.",
      priority: "low",
      href: CEO_ROUTES.payroll,
    });
  } else if (input.payrollPending) {
    insights.push({
      id: "payroll-pending",
      title: "Payroll pending review",
      description: "Payroll is awaiting completion or executive acknowledgment.",
      priority: "high",
      href: CEO_ROUTES.payroll,
    });
  }

  if (input.recruitmentDelayed) {
    insights.push({
      id: "recruitment-delayed",
      title: "Recruitment delayed",
      description: `${input.openPositions} open position(s) with candidates waiting in the pipeline.`,
      priority: "medium",
      href: CEO_ROUTES.recruitment,
    });
  }

  if (input.pendingReviews > 0) {
    insights.push({
      id: "performance-pending",
      title: "Performance review pending",
      description: `${input.pendingReviews} company reviews still need completion.`,
      priority: input.pendingReviews > 10 ? "high" : "medium",
      href: CEO_ROUTES.performance,
    });
  }

  if (input.pendingApprovals > 0) {
    insights.push({
      id: "approvals-waiting",
      title: "Executive approvals waiting",
      description: `${input.pendingApprovals} high-level request(s) need CEO attention.`,
      priority: "high",
      href: CEO_ROUTES.approvals,
    });
  }

  if (input.newJoiners > 0) {
    insights.push({
      id: "new-joiners",
      title: "New joiners this month",
      description: `${input.newJoiners} employee(s) joined the organization this month.`,
      priority: "low",
      href: CEO_ROUTES.organization,
    });
  }

  return insights.slice(0, 8);
}

export const getCeoDashboardData = cache(async function getCeoDashboardData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoDashboardData> {
  const organizationId = profile.employee.organizationId;
  const today = getTodayDateString();
  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const yesterday = format(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1), "yyyy-MM-dd");

  await syncExecutiveApprovalsFromDomain(supabase, profile);

  const [
    yesterdayAttendance,
    leave,
    payroll,
    performance,
    recruitment,
    exitSummary,
    employeesRes,
    departmentsRes,
    managersRes,
    attendanceTodayRes,
    attendanceTrendRes,
    executiveApprovalsRes,
    auditRes,
    kpiCompletionRes,
  ] = await Promise.all([
    getAttendanceSummary(supabase, profile, yesterday, yesterday),
    getLeaveSummary(supabase, profile),
    getPayrollSummary(supabase, profile),
    getPerformanceSummary(supabase, profile),
    getRecruitmentSummary(supabase, profile),
    getExitSummary(supabase, profile),
    fromHrms(supabase, "employees")
      .select(
        "id, employment_status, date_of_joining, date_of_leaving, department_id, reporting_manager_id, departments:department_id(id, name)",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .limit(5000),
    fromHrms(supabase, "departments")
      .select("id, name, status")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "user_roles")
      .select("id, roles:role_id!inner(code), employees:employee_id(id, department_id, departments:department_id(name), employment_status)")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .is("deleted_at", null)
      .eq("roles.code", "manager"),
    fromHrms(supabase, "attendance")
      .select(
        "id, attendance_status, notes, branches:branch_id(name)",
      )
      .eq("organization_id", organizationId)
      .eq("attendance_date", today)
      .is("deleted_at", null),
    fromHrms(supabase, "attendance")
      .select("attendance_date, attendance_status")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .gte("attendance_date", format(subMonths(now, 5), "yyyy-MM-01"))
      .order("attendance_date"),
    fromHrms(supabase, "executive_approval_requests")
      .select(
        "id, request_code, approval_type, title, summary, priority, request_status, due_at, submitted_at",
      )
      .eq("organization_id", organizationId)
      .in("request_status", CEO_PENDING_APPROVAL_STATUSES)
      .is("deleted_at", null)
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(20),
    fromHrms(supabase, "audit_logs")
      .select("id, action, module, table_name, description, occurred_at, user_id")
      .eq("organization_id", organizationId)
      .order("occurred_at", { ascending: false })
      .limit(30),
    fromHrms(supabase, "performance_kpis")
      .select("completion_percentage, kpi_status")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .limit(3000),
  ]);

  if (employeesRes.error) throw new Error(employeesRes.error.message);
  if (departmentsRes.error) throw new Error(departmentsRes.error.message);

  const empRows = (employeesRes.data ?? []) as LooseRow[];
  const deptRows = (departmentsRes.data ?? []) as LooseRow[];
  const activeEmployees = empRows.filter((e) => ACTIVE_STATUSES.has(e.employment_status));
  const totalEmployees = activeEmployees.length;
  const newJoiners = empRows.filter(
    (e) => e.date_of_joining && String(e.date_of_joining) >= monthStart,
  ).length;
  const employeesExiting = empRows.filter(
    (e) =>
      ["resigned", "terminated"].includes(e.employment_status) &&
      e.date_of_leaving &&
      String(e.date_of_leaving) >= monthStart,
  ).length;

  const activeDepartments = deptRows.filter((d) => d.status === "active" || !d.status);
  const managerRows = (managersRes.data ?? []) as LooseRow[];
  const activeManagers = managerRows.filter((row) => {
    const employee = unwrapRelation(row.employees);
    return employee && ACTIVE_STATUSES.has(employee.employment_status);
  });

  const deptMap = new Map<string, number>();
  for (const e of activeEmployees) {
    const dept = unwrapRelation(e.departments)?.name ?? "Unassigned";
    deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);
  }

  const managerDeptMap = new Map<string, number>();
  for (const row of activeManagers) {
    const employee = unwrapRelation(row.employees);
    const dept = unwrapRelation(employee?.departments)?.name ?? "Unassigned";
    managerDeptMap.set(dept, (managerDeptMap.get(dept) ?? 0) + 1);
  }

  const withManager = activeEmployees.filter((e) => e.reporting_manager_id).length;
  const reportingCoveragePercent =
    totalEmployees > 0 ? Math.round((withManager / totalEmployees) * 1000) / 10 : 0;

  const attendanceRows = (attendanceTodayRes.data ?? []) as LooseRow[];
  const attendance = {
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    halfDayToday: 0,
    onLeaveToday: 0,
  };
  let workFromHome = 0;
  for (const row of attendanceRows) {
    switch (row.attendance_status) {
      case "present":
        attendance.presentToday += 1;
        break;
      case "absent":
        attendance.absentToday += 1;
        break;
      case "late":
        attendance.lateToday += 1;
        break;
      case "half_day":
        attendance.halfDayToday += 1;
        break;
      case "on_leave":
        attendance.onLeaveToday += 1;
        break;
      default:
        break;
    }
    const branch = unwrapRelation(row.branches);
    if (
      ["present", "late", "half_day"].includes(row.attendance_status) &&
      isWorkFromHomeBranch(branch?.name, row.notes)
    ) {
      workFromHome += 1;
    }
  }

  const presentCount =
    attendance.presentToday + attendance.lateToday + attendance.halfDayToday;
  const attendancePercent =
    totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 1000) / 10 : 0;
  const yesterdayPresent =
    yesterdayAttendance.presentToday +
    yesterdayAttendance.lateToday +
    yesterdayAttendance.halfDayToday;
  const prevAttendancePercent =
    yesterdayAttendance.totalEmployees > 0
      ? Math.round((yesterdayPresent / yesterdayAttendance.totalEmployees) * 1000) / 10
      : attendancePercent;

  const leavePercent = leave.balanceUtilizationPercent ?? 0;
  const attritionBase = totalEmployees + employeesExiting;
  const attritionRate =
    attritionBase > 0 ? Math.round((employeesExiting / attritionBase) * 1000) / 10 : 0;

  const kpiRows = (kpiCompletionRes.data ?? []) as LooseRow[];
  const trainingCompletion =
    kpiRows.length > 0
      ? Math.round(
          (kpiRows.reduce((sum, row) => sum + Number(row.completion_percentage ?? 0), 0) /
            kpiRows.length) *
            10,
        ) / 10
      : performance.averageKpiCompletion ?? 0;

  const averageProductivity =
    performance.goalCompletionRate > 0
      ? performance.goalCompletionRate
      : performance.averageKpiCompletion ?? 0;

  const officeAttendance = Math.max(0, presentCount - workFromHome);

  const presentPercent =
    totalEmployees > 0 ? Math.round((attendance.presentToday / totalEmployees) * 1000) / 10 : 0;
  const absentPercent =
    totalEmployees > 0 ? Math.round((attendance.absentToday / totalEmployees) * 1000) / 10 : 0;
  const latePercent =
    totalEmployees > 0 ? Math.round((attendance.lateToday / totalEmployees) * 1000) / 10 : 0;

  const currentPayroll = payroll.monthlyOverview.find(
    (m) => m.month === format(now, "yyyy-MM"),
  );
  const payrollStatus = currentPayroll?.status
    ? PAYROLL_STATUS_LABELS[currentPayroll.status as PayrollStatus] ?? currentPayroll.status
    : payroll.pendingPayroll > 0
      ? "Pending"
      : "Not started";
  const payrollCompleted = ["paid", "approved"].includes(currentPayroll?.status ?? "");
  const payrollPending =
    payroll.pendingPayroll > 0 ||
    ["draft", "processing", "processed"].includes(currentPayroll?.status ?? "");

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const upcomingPayrollDate = format(nextMonth, "yyyy-MM-dd");

  const benefitsCost = Math.round((payroll.totalDeductions || 0) * 100) / 100;

  if (executiveApprovalsRes.error) {
    throw new Error(executiveApprovalsRes.error.message);
  }

  const approvals: CeoApprovalItem[] = (
    (executiveApprovalsRes.data ?? []) as LooseRow[]
  ).map((row) => {
    const approvalType = row.approval_type as ExecutiveApprovalType;
    const priority =
      row.priority === "critical" || row.priority === "high"
        ? "high"
        : row.priority === "medium"
          ? "medium"
          : "low";
    return {
      id: row.id,
      kind: mapExecutiveKind(approvalType),
      title: row.title,
      subtitle: row.summary || row.request_code,
      meta: EXECUTIVE_APPROVAL_TYPE_LABELS[approvalType] ?? approvalType,
      priority,
      href: CEO_ROUTES.approvals,
    };
  });

  const activities: CeoActivityItem[] = ((auditRes.data ?? []) as LooseRow[])
    .slice(0, 20)
    .map((row) => ({
      id: row.id,
      title: preferredActivityTitle(row.action, row.module, row.table_name),
      description: row.description || `${row.module ?? "system"} · ${row.action ?? "update"}`,
      module: row.module ?? "system",
      occurredAt: row.occurred_at,
      href: activityHref(row.module),
    }));

  if (activities.length === 0) {
    for (const item of recruitment.recentActivity.slice(0, 5)) {
      activities.push({
        id: `recruit-${item.id}`,
        title: item.title || "Recruitment update",
        description: item.description || "Pipeline activity",
        module: "recruitment",
        occurredAt: item.createdAt,
        href: CEO_ROUTES.recruitment,
      });
    }
  }

  const deptPerformance = [...(performance.departmentPerformance ?? [])].sort(
    (a, b) => b.averageProgress - a.averageProgress,
  );
  const topPerformingDepartments = deptPerformance.slice(0, 5).map((d) => ({
    label: d.departmentName,
    value: Math.round(d.averageProgress * 10) / 10,
  }));
  const lowPerformingTeams = [...deptPerformance]
    .reverse()
    .slice(0, 5)
    .map((d) => ({
      label: d.departmentName,
      value: Math.round(d.averageProgress * 10) / 10,
    }));

  const insights = buildInsights({
    attritionRate,
    attendancePercent,
    prevAttendancePercent,
    payrollPending,
    payrollCompleted,
    recruitmentDelayed: recruitment.openPositions > 0 && recruitment.averageHiringTimeDays > 30,
    pendingReviews: performance.pendingReviews,
    pendingApprovals: approvals.length,
    newJoiners,
    openPositions: recruitment.openPositions,
  });

  const growthMap = new Map<string, number>();
  const hiringMap = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const key = format(subMonths(now, i), "yyyy-MM");
    growthMap.set(key, 0);
    if (i <= 5) hiringMap.set(key, 0);
  }
  for (const e of empRows) {
    if (!e.date_of_joining) continue;
    const key = String(e.date_of_joining).slice(0, 7);
    if (growthMap.has(key)) growthMap.set(key, (growthMap.get(key) ?? 0) + 1);
    if (hiringMap.has(key)) hiringMap.set(key, (hiringMap.get(key) ?? 0) + 1);
  }

  const attendanceTrendMap = new Map<string, number>();
  for (const row of (attendanceTrendRes.data ?? []) as LooseRow[]) {
    if (!["present", "late", "half_day"].includes(row.attendance_status)) continue;
    const key = String(row.attendance_date).slice(0, 7);
    attendanceTrendMap.set(key, (attendanceTrendMap.get(key) ?? 0) + 1);
  }

  const departmentGrowthMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    departmentGrowthMap.set(format(subMonths(now, i), "yyyy-MM"), 0);
  }
  for (const e of empRows) {
    if (!e.date_of_joining) continue;
    const key = String(e.date_of_joining).slice(0, 7);
    if (departmentGrowthMap.has(key)) {
      departmentGrowthMap.set(key, (departmentGrowthMap.get(key) ?? 0) + 1);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      totalEmployees,
      activeEmployees: totalEmployees,
      newJoiners,
      employeesExiting,
      departments: activeDepartments.length,
      managers: activeManagers.length,
      openPositions: recruitment.openPositions,
      recruitmentPipeline: recruitment.activeCandidates,
      pendingApprovals: approvals.length,
      attendancePercent,
      leavePercent,
      averageProductivity,
      payrollCost: payroll.netPayroll || payroll.grossPayroll || 0,
      monthlyRevenue: null,
      attritionRate,
      employeeSatisfaction:
        performance.averageRating > 0 ? performance.averageRating : null,
      trainingCompletion,
    },
    insights,
    organization: {
      departmentDistribution: Array.from(deptMap.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
      managerDistribution: Array.from(managerDeptMap.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
      hierarchyDepth: withManager > 0 ? 2 : 1,
      totalDepartments: activeDepartments.length,
      totalManagers: activeManagers.length,
      reportingCoveragePercent,
    },
    recruitment: {
      openJobs: recruitment.openPositions,
      candidates: recruitment.activeCandidates,
      interviewsToday: recruitment.interviewsToday,
      offersPending: recruitment.offersPending,
      hiringThisMonth: recruitment.hiresThisMonth,
      timeToHireDays: recruitment.averageHiringTimeDays,
      funnel: (recruitment.candidatesByStage ?? []).map((f) => ({
        label: f.stage,
        value: f.count,
      })),
    },
    performance: {
      companyAverageRating: performance.averageRating,
      topPerformingDepartments,
      lowPerformingTeams,
      pendingReviews: performance.pendingReviews,
      promotionRecommendations: performance.promotionReady,
    },
    payroll: {
      status: payrollStatus,
      completed: payrollCompleted,
      pending: payrollPending,
      salaryCost: payroll.netPayroll || payroll.grossPayroll || 0,
      benefitsCost,
      upcomingPayrollDate,
      monthlyTrend: payroll.monthlyOverview.map((m) => ({
        label: m.label,
        value: m.net,
      })),
    },
    attendance: {
      presentPercent,
      absentPercent,
      latePercent,
      workFromHome,
      officeAttendance,
      presentToday: attendance.presentToday,
      absentToday: attendance.absentToday,
      lateToday: attendance.lateToday,
      onLeaveToday: attendance.onLeaveToday || leave.employeesOnLeaveToday || 0,
    },
    activities,
    approvals,
    charts: {
      employeeGrowth: Array.from(growthMap.entries()).map(([label, value]) => ({
        label,
        value,
      })),
      hiringTrend: Array.from(hiringMap.entries()).map(([label, value]) => ({
        label,
        value,
      })),
      attendanceTrend: Array.from(attendanceTrendMap.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([label, value]) => ({ label, value })),
      attritionTrend: exitSummary.monthlyAttrition.map((m) => ({
        label: m.month,
        value: m.count,
      })),
      payrollTrend: payroll.monthlyOverview.map((m) => ({
        label: m.label,
        value: m.net,
      })),
      departmentGrowth: Array.from(departmentGrowthMap.entries()).map(([label, value]) => ({
        label,
        value,
      })),
    },
  };
});

export async function getCeoDashboardActivities(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoActivityItem[]> {
  const organizationId = profile.employee.organizationId;
  const { data, error } = await fromHrms(supabase, "audit_logs")
    .select("id, action, module, table_name, description, occurred_at, user_id")
    .eq("organization_id", organizationId)
    .order("occurred_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  const activities: CeoActivityItem[] = ((data ?? []) as LooseRow[]).map((row) => ({
    id: row.id,
    title: preferredActivityTitle(row.action, row.module, row.table_name),
    description: row.description || `${row.module ?? "system"} · ${row.action ?? "update"}`,
    module: row.module ?? "system",
    occurredAt: row.occurred_at,
    href: activityHref(row.module),
  }));

  if (activities.length > 0) return activities;

  const recruitment = await getRecruitmentSummary(supabase, profile);
  return recruitment.recentActivity.slice(0, 5).map((item) => ({
    id: `recruit-${item.id}`,
    title: item.title || "Recruitment update",
    description: item.description || "Pipeline activity",
    module: "recruitment",
    occurredAt: item.createdAt,
    href: CEO_ROUTES.recruitment,
  }));
}
