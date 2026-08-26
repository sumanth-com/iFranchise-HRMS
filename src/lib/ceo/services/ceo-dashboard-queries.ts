import { format } from "date-fns";
import { cache } from "react";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { CEO_PENDING_APPROVAL_STATUSES } from "@/lib/ceo/executive-approvals-constants";
import { syncExecutiveApprovalsFromDomain } from "@/lib/ceo/services/ceo-approvals-sync";
import { listCeoApprovalQueue } from "@/lib/ceo/services/ceo-leave-queries";
import { getRecruitmentSummary } from "@/lib/recruitment/services/recruitment-queries";
import { listHolidays } from "@/lib/organization/services/org-queries";
import { getPayrollMonthDate } from "@/lib/payroll/services/payroll-utils";
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
 */
export const getCeoDashboardData = cache(async function getCeoDashboardData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoDashboardData> {
  const organizationId = profile.employee.organizationId;
  const today = getTodayDateString();
  const now = new Date();
  const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
  const payrollMonthDate = getPayrollMonthDate(now.getMonth() + 1, now.getFullYear());
  const startedAt = performance.now();

  // Kick off domain sync without blocking non-approval KPI queries.
  const syncPromise = syncExecutiveApprovalsFromDomain(supabase, profile).catch((error) => {
    console.error("[ceo-dashboard] executive approval sync failed", error);
  });

  const attendanceStatusCount = (status: string) =>
    fromHrms(supabase, "attendance")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("attendance_date", today)
      .eq("attendance_status", status)
      .is("deleted_at", null);

  const [
    leaveApprovalQueue,
    activeEmployeesRes,
    exitingRes,
    presentTodayRes,
    absentTodayRes,
    lateTodayRes,
    halfDayTodayRes,
    onLeaveTodayRes,
    openJobsRes,
    payrollRes,
    pendingApprovalsRes,
    holidaysResult,
  ] = await Promise.all([
    syncPromise.then(() =>
      listCeoApprovalQueue(supabase, profile).catch((error) => {
        console.error("[ceo-dashboard] leave approval queue failed", error);
        return [] as Awaited<ReturnType<typeof listCeoApprovalQueue>>;
      }),
    ),
    fromHrms(supabase, "employees")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("employment_status", ["active", "probation", "on_leave"])
      .is("deleted_at", null),
    fromHrms(supabase, "employees")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("employment_status", ["resigned", "terminated"])
      .gte("date_of_leaving", monthStart)
      .is("deleted_at", null),
    // Head counts only — avoid downloading every attendance row for org-wide KPIs.
    attendanceStatusCount("present"),
    attendanceStatusCount("absent"),
    attendanceStatusCount("late"),
    attendanceStatusCount("half_day"),
    attendanceStatusCount("on_leave"),
    fromHrms(supabase, "recruitment_jobs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("job_status", "open")
      .is("deleted_at", null),
    fromHrms(supabase, "payrolls")
      .select("total_net, total_gross")
      .eq("organization_id", organizationId)
      .eq("payroll_month", payrollMonthDate)
      .is("deleted_at", null)
      .maybeSingle(),
    syncPromise.then(() =>
      fromHrms(supabase, "executive_approval_requests")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("request_status", CEO_PENDING_APPROVAL_STATUSES)
        .is("deleted_at", null),
    ),
    listHolidays(supabase, organizationId, { year: now.getFullYear() }).catch((error) => {
      console.error("[ceo-dashboard] holidays query failed", error);
      return { data: [] as Awaited<ReturnType<typeof listHolidays>>["data"] };
    }),
  ]);

  if (activeEmployeesRes.error) throw new Error(activeEmployeesRes.error.message);
  if (exitingRes.error) {
    console.error("[ceo-dashboard] exiting count failed", exitingRes.error.message);
  }
  for (const [label, result] of [
    ["present", presentTodayRes],
    ["absent", absentTodayRes],
    ["late", lateTodayRes],
    ["half_day", halfDayTodayRes],
    ["on_leave", onLeaveTodayRes],
  ] as const) {
    if (result.error) {
      console.error(`[ceo-dashboard] attendance ${label} count failed`, result.error.message);
    }
  }
  if (openJobsRes.error) {
    console.error("[ceo-dashboard] open jobs failed", openJobsRes.error.message);
  }
  if (payrollRes.error) {
    console.error("[ceo-dashboard] payroll failed", payrollRes.error.message);
  }
  if (pendingApprovalsRes.error) {
    console.error("[ceo-dashboard] approvals count failed", pendingApprovalsRes.error.message);
  }

  const totalEmployees = activeEmployeesRes.count ?? 0;
  const employeesExiting = exitingRes.count ?? 0;
  const openPositions = openJobsRes.count ?? 0;
  const payrollCost = Number(payrollRes.data?.total_net ?? payrollRes.data?.total_gross ?? 0);
  const pendingApprovals = pendingApprovalsRes.count ?? 0;

  const attendance = {
    presentToday: presentTodayRes.count ?? 0,
    absentToday: absentTodayRes.count ?? 0,
    lateToday: lateTodayRes.count ?? 0,
    halfDayToday: halfDayTodayRes.count ?? 0,
    onLeaveToday: onLeaveTodayRes.count ?? 0,
  };

  const presentCount =
    attendance.presentToday + attendance.lateToday + attendance.halfDayToday;
  const attendancePercent =
    totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 1000) / 10 : 0;
  const attritionBase = totalEmployees + employeesExiting;
  const attritionRate =
    attritionBase > 0 ? Math.round((employeesExiting / attritionBase) * 1000) / 10 : 0;

  const holidayItems: CeoDashboardData["upcomingHolidays"] = (holidaysResult.data ?? [])
    .filter((holiday) => holiday.holidayDate >= today)
    .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate))
    .map((holiday) => ({
      id: `holiday-${holiday.id}`,
      type: "holiday" as const,
      title: holiday.name,
      subtitle: holiday.isOptional ? "Optional holiday" : "Company holiday",
      date: holiday.holidayDate,
    }));

  if (process.env.NODE_ENV === "development") {
    console.info("[perf]", {
      area: "ceo",
      label: "getCeoDashboardData",
      atMs: Math.round(performance.now() - startedAt),
      note: "attendance KPIs via head counts; domain sync still blocks before KPIs",
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
      recruitmentPipeline: 0,
      pendingApprovals,
      pendingLeaveApprovals: leaveApprovalQueue.length,
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
      candidates: 0,
      interviewsToday: 0,
      offersPending: 0,
      hiringThisMonth: 0,
      timeToHireDays: 0,
      funnel: [],
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
          ? Math.round((attendance.presentToday / totalEmployees) * 1000) / 10
          : 0,
      absentPercent:
        totalEmployees > 0
          ? Math.round((attendance.absentToday / totalEmployees) * 1000) / 10
          : 0,
      latePercent:
        totalEmployees > 0
          ? Math.round((attendance.lateToday / totalEmployees) * 1000) / 10
          : 0,
      workFromHome: 0,
      officeAttendance: presentCount,
      presentToday: attendance.presentToday,
      absentToday: attendance.absentToday,
      lateToday: attendance.lateToday,
      onLeaveToday: attendance.onLeaveToday,
    },
    upcomingHolidays: holidayItems,
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
