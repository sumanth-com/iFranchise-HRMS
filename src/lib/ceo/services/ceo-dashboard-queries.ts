import { format } from "date-fns";
import { cache } from "react";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getAttendanceSummary } from "@/lib/attendance/services/attendance-queries";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import {
  CEO_APPROVALS_SOURCE,
  CEO_PENDING_APPROVAL_STATUSES,
  PROMOTION_APPROVAL_TYPE,
} from "@/lib/ceo/executive-approvals-constants";
import { deriveCeoAttendanceKpis } from "@/lib/ceo/services/ceo-dashboard-kpi-utils";
import { getCeoDashboardPayrollCost } from "@/lib/ceo/services/ceo-dashboard-payroll-cost";
import { syncExecutiveApprovalsFromDomain } from "@/lib/ceo/services/ceo-approvals-sync";
import { listCeoApprovalQueue } from "@/lib/ceo/services/ceo-leave-queries";
import { getRecruitmentSummary } from "@/lib/recruitment/services/recruitment-queries";
import { loadUpcomingCelebrations } from "@/lib/employee/services/employee-dashboard-queries";
import { canManageDashboardAnnouncements } from "@/lib/dashboard/dashboard-announcement-permissions";
import { fromHrms } from "@/lib/reports/services/reports-utils";
import type { UserProfile } from "@/types/auth";
import type { CeoActivityItem, CeoDashboardData } from "@/types/ceo-dashboard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

const EMPTY_CHARTS: CeoDashboardData["charts"] = {
  employeeGrowth: [],
  hiringTrend: [],
  attendanceTrend: [],
  attritionTrend: [],
  payrollTrend: [],
  departmentGrowth: [],
};

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
      return CEO_ROUTES.analytics;
    case "recruitment":
      return CEO_ROUTES.recruitment;
    case "performance":
      return CEO_ROUTES.performance;
    default:
      return CEO_ROUTES.analytics;
  }
}

/**
 * Lean CEO home loader: only data the home UI renders
 * (KPIs, today's attendance, upcoming holidays).
 *
 * Attendance / headcount / today's workforce share getAttendanceSummary
 * (same active roster + leave/holiday rules as HR Team Attendance).
 * Payroll Cost uses Team Payroll Final Payable (same calculator + population).
 */
export const getCeoDashboardData = cache(async function getCeoDashboardData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoDashboardData> {
  const organizationId = profile.employee.organizationId;
  const today = getTodayDateString();
  const now = new Date();
  const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
  const startedAt = performance.now();

  // Kick off domain sync in background without blocking dashboard load.
  void syncExecutiveApprovalsFromDomain(supabase, profile).catch((error) => {
    console.error("[ceo-dashboard] executive approval sync failed", error);
  });

  const [
    pendingLeaveQueue,
    attendanceSummary,
    payrollCost,
    exitingRes,
    pendingApprovalsRes,
    holidaysResult,
    recruitmentSummary,
  ] = await Promise.all([
    // Same queue as Approvals → Leave (not all org-wide pending leave_requests).
    listCeoApprovalQueue(supabase, profile).catch((error) => {
      console.error("[ceo-dashboard] leave approval queue failed", error);
      return [] as Awaited<ReturnType<typeof listCeoApprovalQueue>>;
    }),
    getAttendanceSummary(supabase, profile),
    getCeoDashboardPayrollCost(supabase, profile).catch((error) => {
      console.error("[ceo-dashboard] payroll cost failed", error);
      return 0;
    }),
    fromHrms(supabase, "employees")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("employment_status", ["resigned", "terminated"])
      .gte("date_of_leaving", monthStart)
      .is("deleted_at", null),
    // Match Approvals → Executive (promotion-scoped queue), not all request types.
    fromHrms(supabase, "executive_approval_requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("source_module", CEO_APPROVALS_SOURCE.performancePromotion)
      .eq("approval_type", PROMOTION_APPROVAL_TYPE)
      .not("source_record_id", "is", null)
      .in("request_status", CEO_PENDING_APPROVAL_STATUSES)
      .is("deleted_at", null),
    loadUpcomingCelebrations(supabase, organizationId, today).catch((error) => {
      console.error("[ceo-dashboard] upcoming celebrations query failed", error);
      return [] as Awaited<ReturnType<typeof loadUpcomingCelebrations>>;
    }),
    getRecruitmentSummary(supabase, profile).catch((error) => {
      console.error("[ceo-dashboard] recruitment summary failed", error);
      return null;
    }),
  ]);

  if (exitingRes.error) {
    console.error("[ceo-dashboard] exiting count failed", exitingRes.error.message);
  }
  if (pendingApprovalsRes.error) {
    console.error("[ceo-dashboard] approvals count failed", pendingApprovalsRes.error.message);
  }

  const attendanceKpis = deriveCeoAttendanceKpis(attendanceSummary);
  const {
    totalEmployees,
    presentCount,
    presentToday,
    lateToday,
    absentToday,
    onLeaveToday,
    attendancePercent,
  } = attendanceKpis;

  const employeesExiting = exitingRes.count ?? 0;
  const openPositions = recruitmentSummary?.openPositions ?? 0;
  const pendingApprovals = pendingApprovalsRes.count ?? 0;
  const attritionBase = totalEmployees + employeesExiting;
  const attritionRate =
    attritionBase > 0 ? Math.round((employeesExiting / attritionBase) * 1000) / 10 : 0;

  const upcomingCelebrations = Array.isArray(holidaysResult) ? holidaysResult : [];

  if (process.env.NODE_ENV === "development") {
    console.info("[perf]", {
      area: "ceo",
      label: "getCeoDashboardData",
      atMs: Math.round(performance.now() - startedAt),
      note: "KPIs via getAttendanceSummary + getCeoDashboardPayrollCost + recruitment (parallel)",
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      totalEmployees,
      activeEmployees: totalEmployees,
      newJoiners: 0,
      employeesExiting,
      departments: 0,
      managers: 0,
      openPositions,
      recruitmentPipeline: recruitmentSummary?.activeCandidates ?? 0,
      pendingApprovals,
      pendingLeaveApprovals: pendingLeaveQueue.length,
      attendancePercent,
      leavePercent: 0,
      averageProductivity: 0,
      payrollCost,
      monthlyRevenue: null,
      attritionRate,
      employeeSatisfaction: null,
      trainingCompletion: 0,
    },
    insights: [],
    organization: {
      departmentDistribution: [],
      managerDistribution: [],
      hierarchyDepth: 0,
      totalDepartments: 0,
      totalManagers: 0,
      reportingCoveragePercent: 0,
    },
    recruitment: {
      openJobs: openPositions,
      candidates: recruitmentSummary?.activeCandidates ?? 0,
      interviewsToday: recruitmentSummary?.interviewsToday ?? 0,
      offersPending: recruitmentSummary?.offersPending ?? 0,
      hiringThisMonth: recruitmentSummary?.hiresThisMonth ?? 0,
      timeToHireDays: recruitmentSummary?.averageHiringTimeDays ?? 0,
      funnel: (recruitmentSummary?.candidatesByStage ?? []).map((row) => ({
        label: row.stage,
        value: row.count,
      })),
    },
    performance: {
      companyAverageRating: 0,
      topPerformingDepartments: [],
      lowPerformingTeams: [],
      pendingReviews: 0,
      promotionRecommendations: 0,
    },
    payroll: {
      status: "Not started",
      completed: false,
      pending: false,
      salaryCost: payrollCost,
      benefitsCost: 0,
      upcomingPayrollDate: null,
      monthlyTrend: [],
    },
    attendance: {
      presentPercent:
        totalEmployees > 0
          ? Math.round((presentToday / totalEmployees) * 10000) / 100
          : 0,
      absentPercent:
        totalEmployees > 0
          ? Math.round((absentToday / totalEmployees) * 10000) / 100
          : 0,
      latePercent:
        totalEmployees > 0
          ? Math.round((lateToday / totalEmployees) * 10000) / 100
          : 0,
      workFromHome: 0,
      officeAttendance: presentCount,
      presentToday,
      absentToday,
      lateToday,
      onLeaveToday,
    },
    upcomingHolidays: upcomingCelebrations,
    canManageAnnouncements: canManageDashboardAnnouncements(profile.permissionCodes),
    activities: [],
    approvals: [],
    charts: EMPTY_CHARTS,
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
