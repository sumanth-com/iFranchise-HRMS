import {
  addDays,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getAttendanceSummary } from "@/lib/attendance/services/attendance-queries";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import { getAssetsSummary } from "@/lib/assets/services/asset-queries";
import { ASSETS_ROUTES } from "@/lib/assets/constants";
import { buildDashboardPermissions } from "@/lib/dashboard/constants";
import { getDocumentsSummary } from "@/lib/documents/services/document-queries";
import { DOCUMENTS_ROUTES } from "@/lib/documents/constants";
import { getExitSummary } from "@/lib/exit/services/exit-queries";
import { EXIT_ROUTES } from "@/lib/exit/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { getLeaveSummary } from "@/lib/leave/services/leave-queries";
import { LEAVE_ROUTES } from "@/lib/leave/constants";
import { ORGANIZATION_ROUTES } from "@/lib/organization/constants";
import { listHolidays } from "@/lib/organization/services/org-queries";
import { getPayrollSummary } from "@/lib/payroll/services/payroll-queries";
import { PAYROLL_ROUTES, PAYROLL_STATUS_LABELS } from "@/lib/payroll/constants";
import { getPerformanceSummary } from "@/lib/performance/services/performance-queries";
import { PERFORMANCE_ROUTES } from "@/lib/performance/constants";
import { getRecruitmentSummary } from "@/lib/recruitment/services/recruitment-queries";
import { RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";
import { getAuditDashboardStats } from "@/lib/audit/services/audit-queries";
import { AUDIT_ROUTES, formatAuditModule } from "@/lib/audit/constants";
import {
  formatEmployeeName,
  fromHrms,
  unwrapRelation,
  type ReportRowLoose,
} from "@/lib/reports/services/reports-utils";
import type { UserProfile } from "@/types/auth";
import type {
  DashboardActivityItem,
  DashboardEventItem,
  DashboardKpis,
  DashboardLeaveRequest,
  DashboardListEmployee,
  DashboardPayrollRun,
  DashboardRecruitmentActivity,
  DashboardSecondaryMetrics,
  DashboardTaskItem,
  HrDashboardData,
} from "@/types/dashboard";

function emptyKpis(): DashboardKpis {
  return {
    totalEmployees: 0,
    presentToday: 0,
    onLeaveToday: 0,
    absentToday: 0,
    lateToday: 0,
    newJoinersThisMonth: 0,
    employeesExiting: 0,
    openRecruitments: 0,
    pendingApprovals: 0,
  };
}

function emptySecondary(): DashboardSecondaryMetrics {
  return {
    attendancePercent: 0,
    leaveUtilizationPercent: 0,
    payrollStatus: null,
    upcomingBirthdays: 0,
    upcomingAnniversaries: 0,
    probationEndingSoon: 0,
    documentsExpiring: 0,
    assetsPendingReturn: 0,
  };
}

function upcomingBirthdayDate(dob: string, today: Date): string | null {
  const [, month, day] = dob.split("-");
  if (!month || !day) return null;
  const year = today.getFullYear();
  let candidate = new Date(year, Number(month) - 1, Number(day));
  if (candidate < startOfDay(today)) {
    candidate = new Date(year + 1, Number(month) - 1, Number(day));
  }
  const diff = (candidate.getTime() - startOfDay(today).getTime()) / (1000 * 60 * 60 * 24);
  if (diff > 30) return null;
  return format(candidate, "yyyy-MM-dd");
}

function upcomingAnniversaryDate(joined: string, today: Date): string | null {
  const joinDate = new Date(joined);
  if (Number.isNaN(joinDate.getTime())) return null;
  const year = today.getFullYear();
  let candidate = new Date(year, joinDate.getMonth(), joinDate.getDate());
  if (candidate < startOfDay(today)) {
    candidate = new Date(year + 1, joinDate.getMonth(), joinDate.getDate());
  }
  const diff = (candidate.getTime() - startOfDay(today).getTime()) / (1000 * 60 * 60 * 24);
  if (diff > 30) return null;
  return format(candidate, "yyyy-MM-dd");
}

export async function getHrDashboard(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<HrDashboardData> {
  const organizationId = profile.employee.organizationId;
  const permissions = buildDashboardPermissions(profile.permissionCodes);
  const today = getTodayDateString();
  const todayDate = startOfDay(new Date());
  const monthStart = format(startOfMonth(todayDate), "yyyy-MM-dd");
  const monthEnd = format(
    new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0),
    "yyyy-MM-dd",
  );
  const sevenDaysAgo = format(subDays(todayDate, 6), "yyyy-MM-dd");
  const probationSoonEnd = format(addDays(todayDate, 30), "yyyy-MM-dd");
  const userName = profile.employee.firstName || profile.employee.email.split("@")[0];

  const kpis = emptyKpis();
  const secondary = emptySecondary();
  let activities: DashboardActivityItem[] = [];
  const tasks: DashboardTaskItem[] = [];
  let upcomingEvents: DashboardEventItem[] = [];
  let recentEmployees: DashboardListEmployee[] = [];
  let recentLeaveRequests: DashboardLeaveRequest[] = [];
  let recentRecruitment: DashboardRecruitmentActivity[] = [];
  let recentPayrollRuns: DashboardPayrollRun[] = [];

  const charts = {
    headcountByDepartment: [] as { label: string; value: number }[],
    attendanceTrend7Day: [] as { label: string; value: number }[],
    monthlyHiring: [] as { label: string; value: number }[],
    monthlyAttrition: [] as { label: string; value: number }[],
    leaveDistribution: [] as { label: string; value: number }[],
    genderDistribution: [] as { label: string; value: number }[],
    employmentTypeDistribution: [] as { label: string; value: number }[],
  };

  const fetches: Promise<void>[] = [];

  // Core workforce metrics (employees module or attendance)
  if (permissions.employees || permissions.attendance) {
    fetches.push(
      (async () => {
        const { data, error } = await fromHrms(supabase, "employees")
          .select(
            `id, employee_code, first_name, last_name, employment_status,
             date_of_joining, date_of_leaving, created_at, department_id, employment_type_id,
             departments:department_id(name),
             employment_types:employment_type_id(name),
             employee_profiles(gender)`,
          )
          .eq("organization_id", organizationId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(5000);

        if (error) throw new Error(error.message);

        const rows = (data ?? []) as ReportRowLoose[];
        const activeStatuses = new Set(["active", "probation", "on_leave"]);
        const activeRows = rows.filter((e) => activeStatuses.has(e.employment_status));

        kpis.totalEmployees = activeRows.length;
        kpis.newJoinersThisMonth = rows.filter(
          (e) =>
            e.date_of_joining &&
            e.date_of_joining >= monthStart &&
            e.date_of_joining <= monthEnd,
        ).length;
        kpis.employeesExiting = rows.filter(
          (e) =>
            e.date_of_leaving &&
            e.date_of_leaving >= monthStart &&
            e.date_of_leaving <= monthEnd &&
        ).length;

        const deptMap = new Map<string, number>();
        const genderMap = new Map<string, number>();
        const empTypeMap = new Map<string, number>();

        for (const e of activeRows) {
          const dept = unwrapRelation(e.departments)?.name ?? "Unassigned";
          deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);

          const profile = unwrapRelation(e.employee_profiles);
          const gender = (profile?.gender as string) || "Not specified";
          genderMap.set(gender, (genderMap.get(gender) ?? 0) + 1);

          const empType = unwrapRelation(e.employment_types)?.name ?? "Unassigned";
          empTypeMap.set(empType, (empTypeMap.get(empType) ?? 0) + 1);
        }

        charts.headcountByDepartment = Array.from(deptMap.entries())
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value);
        charts.genderDistribution = Array.from(genderMap.entries()).map(([label, value]) => ({
          label,
          value,
        }));
        charts.employmentTypeDistribution = Array.from(empTypeMap.entries()).map(
          ([label, value]) => ({ label, value }),
        );

        recentEmployees = rows.slice(0, 5).map((e) => ({
          id: e.id,
          employeeCode: e.employee_code ?? "—",
          name: formatEmployeeName(e.first_name, e.last_name),
          department: unwrapRelation(e.departments)?.name ?? "—",
          joinedAt: e.date_of_joining ?? e.created_at ?? "",
          href: EMPLOYEE_ROUTES.detail({
            id: e.id,
            employeeCode: e.employee_code,
            firstName: e.first_name,
            lastName: e.last_name,
          }),
        }));

        // Monthly hiring trend (last 6 months)
        const hiringMap = new Map<string, number>();
        for (let i = 5; i >= 0; i--) {
          hiringMap.set(format(subMonths(todayDate, i), "MMM yyyy"), 0);
        }
        for (const e of rows) {
          if (!e.date_of_joining) continue;
          const key = format(new Date(e.date_of_joining), "MMM yyyy");
          if (hiringMap.has(key)) hiringMap.set(key, (hiringMap.get(key) ?? 0) + 1);
        }
        charts.monthlyHiring = Array.from(hiringMap.entries()).map(([label, value]) => ({
          label,
          value,
        }));
      })(),
    );
  }

  // Birthdays & anniversaries from profiles
  if (permissions.employees) {
    fetches.push(
      (async () => {
        const { data, error } = await fromHrms(supabase, "employee_profiles")
          .select(
            `date_of_birth,
             employees!inner(id, first_name, last_name, employee_code, date_of_joining, organization_id, employment_status)`,
          )
          .eq("employees.organization_id", organizationId)
          .is("deleted_at", null)
          .not("date_of_birth", "is", null);

        if (error) throw new Error(error.message);

        const birthdayEvents: DashboardEventItem[] = [];
        const anniversaryEvents: DashboardEventItem[] = [];

        for (const row of (data ?? []) as ReportRowLoose[]) {
          const emp = unwrapRelation(row.employees);
          if (!emp || !["active", "probation", "on_leave"].includes(emp.employment_status)) {
            continue;
          }
          const name = formatEmployeeName(emp.first_name, emp.last_name);
          if (row.date_of_birth) {
            const eventDate = upcomingBirthdayDate(row.date_of_birth, todayDate);
            if (eventDate) {
              birthdayEvents.push({
                id: `bday-${emp.id}`,
                title: name,
                date: eventDate,
                type: "birthday",
                subtitle: emp.employee_code,
                href: EMPLOYEE_ROUTES.list,
              });
            }
          }
          if (emp.date_of_joining) {
            const eventDate = upcomingAnniversaryDate(emp.date_of_joining, todayDate);
            if (eventDate) {
              const years =
                todayDate.getFullYear() - new Date(emp.date_of_joining).getFullYear();
              anniversaryEvents.push({
                id: `anniv-${emp.id}`,
                title: name,
                date: eventDate,
                type: "anniversary",
                subtitle: `${years} year${years === 1 ? "" : "s"}`,
                href: EMPLOYEE_ROUTES.list,
              });
            }
          }
        }

        secondary.upcomingBirthdays = birthdayEvents.length;
        secondary.upcomingAnniversaries = anniversaryEvents.length;
        upcomingEvents.push(...birthdayEvents, ...anniversaryEvents);
      })(),
    );

    // Probation ending soon
    fetches.push(
      (async () => {
        const { data, error } = await fromHrms(supabase, "salary_structures")
          .select(
            `components,
             employees!inner(id, first_name, last_name, employment_status, organization_id)`,
          )
          .eq("employees.organization_id", organizationId)
          .eq("employees.employment_status", "probation")
          .is("deleted_at", null)
          .is("effective_to", null);

        if (error) throw new Error(error.message);

        let count = 0;
        for (const row of (data ?? []) as ReportRowLoose[]) {
          const components = (row.components ?? {}) as Record<string, unknown>;
          const endDate = components.probation_end_date;
          if (typeof endDate === "string" && endDate >= today && endDate <= probationSoonEnd) {
            count += 1;
          }
        }
        secondary.probationEndingSoon = count;
      })(),
    );
  }

  if (permissions.attendance) {
    fetches.push(
      (async () => {
        const summary = await getAttendanceSummary(supabase, profile, today);
        kpis.presentToday = summary.presentToday + summary.halfDayToday;
        kpis.absentToday = summary.absentToday;
        kpis.lateToday = summary.lateToday;
        kpis.onLeaveToday = summary.onLeaveToday;
        if (!permissions.employees) {
          kpis.totalEmployees = summary.totalEmployees;
        }
        const marked =
          summary.presentToday +
          summary.absentToday +
          summary.lateToday +
          summary.halfDayToday +
          summary.onLeaveToday;
        secondary.attendancePercent =
          summary.totalEmployees > 0
            ? Math.round(
                ((summary.presentToday + summary.lateToday + summary.halfDayToday) /
                  summary.totalEmployees) *
                  100,
              )
            : 0;

        const { data, error } = await fromHrms(supabase, "attendance")
          .select("attendance_date, attendance_status")
          .eq("organization_id", organizationId)
          .is("deleted_at", null)
          .gte("attendance_date", sevenDaysAgo)
          .lte("attendance_date", today);

        if (error) throw new Error(error.message);

        const dayMap = new Map<string, number>();
        for (let i = 6; i >= 0; i--) {
          dayMap.set(format(subDays(todayDate, i), "yyyy-MM-dd"), 0);
        }
        for (const row of (data ?? []) as ReportRowLoose[]) {
          const key = String(row.attendance_date);
          if (!dayMap.has(key)) continue;
          if (["present", "late", "half_day"].includes(row.attendance_status)) {
            dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
          }
        }
        charts.attendanceTrend7Day = Array.from(dayMap.entries()).map(([date, value]) => ({
          label: format(new Date(date), "EEE"),
          value,
        }));

        if (marked === 0 && summary.totalEmployees > 0) {
          tasks.push({
            id: "attendance-mark",
            title: "Mark today's attendance",
            subtitle: `${summary.totalEmployees} employees pending`,
            priority: "high",
            href: ATTENDANCE_ROUTES.list,
          });
        }
      })(),
    );
  }

  if (permissions.leave) {
    fetches.push(
      (async () => {
        const summary = await getLeaveSummary(supabase, profile);
        if (!permissions.attendance) {
          kpis.onLeaveToday = summary.employeesOnLeaveToday;
        }
        secondary.leaveUtilizationPercent = summary.balanceUtilizationPercent;
        kpis.pendingApprovals += summary.pendingRequests;

        if (summary.pendingRequests > 0) {
          tasks.push({
            id: "leave-approvals",
            title: `Approve ${summary.pendingRequests} leave request${summary.pendingRequests === 1 ? "" : "s"}`,
            priority: "high",
            href: `${LEAVE_ROUTES.list}?status=pending`,
          });
        }

        const { data, error } = await fromHrms(supabase, "leave_requests")
          .select(
            `id, start_date, end_date, total_days, leave_status, created_at,
             employees!inner(first_name, last_name, organization_id),
             leave_types:leave_type_id(name)`,
          )
          .eq("employees.organization_id", organizationId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) throw new Error(error.message);

        recentLeaveRequests = ((data ?? []) as ReportRowLoose[]).map((row) => {
          const emp = unwrapRelation(row.employees);
          const type = unwrapRelation(row.leave_types);
          return {
            id: row.id,
            employeeName: formatEmployeeName(emp?.first_name, emp?.last_name),
            leaveType: type?.name ?? "Leave",
            days: Number(row.total_days ?? 0),
            status: row.leave_status,
            startDate: row.start_date,
            href: LEAVE_ROUTES.detail(row.id),
          };
        });

        const { data: leaveDist, error: leaveDistError } = await fromHrms(
          supabase,
          "leave_requests",
        )
          .select(
            `total_days, leave_types:leave_type_id(name),
             employees!inner(organization_id)`,
          )
          .eq("employees.organization_id", organizationId)
          .eq("leave_status", "approved")
          .gte("start_date", format(subMonths(todayDate, 5), "yyyy-MM-01"))
          .is("deleted_at", null);

        if (leaveDistError) throw new Error(leaveDistError.message);

        const leaveMap = new Map<string, number>();
        for (const row of (leaveDist ?? []) as ReportRowLoose[]) {
          const type = unwrapRelation(row.leave_types)?.name ?? "Other";
          leaveMap.set(type, (leaveMap.get(type) ?? 0) + Number(row.total_days ?? 0));
        }
        charts.leaveDistribution = Array.from(leaveMap.entries()).map(([label, value]) => ({
          label,
          value,
        }));
      })(),
    );
  }

  if (permissions.payroll) {
    fetches.push(
      (async () => {
        const summary = await getPayrollSummary(supabase, profile);
        const currentMonth = summary.monthlyOverview[new Date().getMonth()];
        secondary.payrollStatus = currentMonth?.status
          ? PAYROLL_STATUS_LABELS[currentMonth.status as keyof typeof PAYROLL_STATUS_LABELS] ??
            currentMonth.status
          : "Not started";

        if (summary.pendingPayroll > 0) {
          tasks.push({
            id: "payroll-pending",
            title: `${summary.pendingPayroll} payroll run${summary.pendingPayroll === 1 ? "" : "s"} pending`,
            subtitle: "Review and process payroll",
            priority: "high",
            href: PAYROLL_ROUTES.history,
          });
        }

        const nextMonth = addDays(
          new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
          1,
        );
        if (
          currentMonth?.status &&
          !["paid", "approved"].includes(currentMonth.status) &&
          todayDate.getDate() >= 25
        ) {
          tasks.push({
            id: "payroll-due",
            title: "Payroll due soon",
            subtitle: format(nextMonth, "MMM d, yyyy"),
            priority: "critical",
            href: PAYROLL_ROUTES.run,
          });
        }

        const { data, error } = await fromHrms(supabase, "payrolls")
          .select("id, payroll_month, payroll_status, total_net, processed_at")
          .eq("organization_id", organizationId)
          .is("deleted_at", null)
          .order("payroll_month", { ascending: false })
          .limit(5);

        if (error) throw new Error(error.message);

        recentPayrollRuns = ((data ?? []) as ReportRowLoose[]).map((row) => ({
          id: row.id,
          month: format(new Date(row.payroll_month), "MMM yyyy"),
          status: row.payroll_status,
          net: Number(row.total_net ?? 0),
          processedAt: row.processed_at ?? null,
          href: PAYROLL_ROUTES.detail(row.id),
        }));
      })(),
    );
  }

  if (permissions.performance) {
    fetches.push(
      (async () => {
        const summary = await getPerformanceSummary(supabase, profile);
        kpis.pendingApprovals += summary.promotionsPending;
        if (summary.pendingReviews > 0) {
          tasks.push({
            id: "reviews-pending",
            title: `${summary.pendingReviews} performance review${summary.pendingReviews === 1 ? "" : "s"} pending`,
            priority: "medium",
            href: PERFORMANCE_ROUTES.reviews,
          });
        }
      })(),
    );
  }

  if (permissions.recruitment) {
    fetches.push(
      (async () => {
        const summary = await getRecruitmentSummary(supabase, profile);
        kpis.openRecruitments = summary.openPositions;

        for (const interview of summary.upcomingInterviews.slice(0, 3)) {
          upcomingEvents.push({
            id: interview.id,
            title: interview.candidateName,
            date: interview.interviewDate,
            type: "interview",
            subtitle: `${interview.roundName ?? "Interview"} · ${interview.interviewTime ?? ""}`,
            href: RECRUITMENT_ROUTES.interviews,
          });
          if (interview.interviewDate === today) {
            tasks.push({
              id: `interview-${interview.id}`,
              title: `Interview at ${interview.interviewTime ?? "scheduled time"}`,
              subtitle: interview.candidateName,
              priority: "high",
              href: RECRUITMENT_ROUTES.interviews,
            });
          }
        }

        recentRecruitment = summary.recentActivity.slice(0, 5).map((item) => ({
          id: item.id,
          title: item.title,
          candidateName: item.candidateName,
          createdAt: item.createdAt,
          href: RECRUITMENT_ROUTES.candidates,
        }));
      })(),
    );
  }

  if (permissions.documents) {
    fetches.push(
      (async () => {
        const summary = await getDocumentsSummary(supabase, profile);
        secondary.documentsExpiring = summary.expiringSoon;
        if (summary.expiringSoon > 0) {
          tasks.push({
            id: "docs-expiring",
            title: `${summary.expiringSoon} document${summary.expiringSoon === 1 ? "" : "s"} expiring`,
            subtitle: "Within 30 days",
            priority: "medium",
            href: DOCUMENTS_ROUTES.expiring,
          });
        }
      })(),
    );
  }

  if (permissions.assets) {
    fetches.push(
      (async () => {
        await getAssetsSummary(supabase, profile);
      })(),
    );
  }

  if (permissions.exit) {
    fetches.push(
      (async () => {
        const summary = await getExitSummary(supabase, profile);
        kpis.pendingApprovals += summary.pendingClearance;
        secondary.assetsPendingReturn = summary.assetsPendingReturn;

        if (summary.pendingClearance > 0) {
          tasks.push({
            id: "exit-clearance",
            title: "Exit clearance pending",
            subtitle: `${summary.pendingClearance} resignation${summary.pendingClearance === 1 ? "" : "s"}`,
            priority: "high",
            href: EXIT_ROUTES.clearance,
          });
        }

        charts.monthlyAttrition = summary.monthlyAttrition.map((m) => ({
          label: m.month,
          value: m.count,
        }));
      })(),
    );
  }

  if (permissions.organization) {
    fetches.push(
      (async () => {
        const holidays = await listHolidays(supabase, organizationId, {
          page: 1,
          pageSize: 20,
          year: todayDate.getFullYear(),
        });
        for (const h of holidays.data) {
          if (h.holidayDate >= today && h.holidayDate <= format(addDays(todayDate, 60), "yyyy-MM-dd")) {
            upcomingEvents.push({
              id: h.id,
              title: h.name,
              date: h.holidayDate,
              type: "holiday",
              subtitle: h.holidayType,
              href: ORGANIZATION_ROUTES.holidays,
            });
          }
        }
      })(),
    );
  }

  if (permissions.audit) {
    fetches.push(
      (async () => {
        const stats = await getAuditDashboardStats(supabase, profile);
        activities = stats.recentChanges.map((item) => ({
          id: item.id,
          title: item.description ?? item.action,
          subtitle: `${formatAuditModule(item.module)} · ${item.userName ?? "System"}`,
          occurredAt: item.occurredAt,
          module: item.module,
          href: AUDIT_ROUTES.timeline,
        }));
      })(),
    );
  }

  await Promise.all(fetches);

  upcomingEvents.sort((a, b) => (a.date > b.date ? 1 : -1));

  return {
    userName,
    permissions,
    kpis,
    secondary,
    activities,
    tasks: tasks.slice(0, 8),
    charts,
    upcomingEvents: upcomingEvents.slice(0, 12),
    recentEmployees,
    recentLeaveRequests,
    recentRecruitment,
    recentPayrollRuns,
  };
}
