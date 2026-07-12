import {
  addDays,
  format,
  isWithinInterval,
  parseISO,
  subDays,
  subMonths,
  startOfMonth,
  differenceInYears,
} from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getAttendanceSummary } from "@/lib/attendance/services/attendance-queries";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { ASSETS_ROUTES } from "@/lib/assets/constants";
import { DOCUMENTS_ROUTES } from "@/lib/documents/constants";
import { getDocumentsSummary, getExpiringSummary } from "@/lib/documents/services/document-queries";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { EXIT_ROUTES } from "@/lib/exit/constants";
import { getExitSummary } from "@/lib/exit/services/exit-queries";
import { LEAVE_ROUTES } from "@/lib/leave/constants";
import { getLeaveSummary } from "@/lib/leave/services/leave-queries";
import { ORGANIZATION_ROUTES } from "@/lib/organization/constants";
import { listHolidays } from "@/lib/organization/services/org-queries";
import { PAYROLL_ROUTES, PAYROLL_STATUS_LABELS } from "@/lib/payroll/constants";
import { getPayrollSummary } from "@/lib/payroll/services/payroll-queries";
import { RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";
import {
  getHiringAnalytics,
  getRecruitmentSummary,
} from "@/lib/recruitment/services/recruitment-queries";
import {
  formatEmployeeName,
  fromHrms,
  unwrapRelation,
} from "@/lib/reports/services/reports-utils";
import { stripIdsFromText } from "@/lib/common/display-text";
import type { UserProfile } from "@/types/auth";
import type {
  DashboardActivityItem,
  DashboardChartItem,
  DashboardListItem,
  DashboardPersonEvent,
  DashboardTaskItem,
  HrDashboardData,
} from "@/types/dashboard";
import type { PayrollStatus } from "@/types/payroll";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

const ACTIVE_STATUSES = new Set(["active", "probation", "on_leave"]);

function employeeHref(row: {
  employee_code?: string;
  first_name?: string;
  last_name?: string;
}) {
  if (!row.employee_code || !row.first_name || !row.last_name) {
    return EMPLOYEE_ROUTES.list;
  }
  return EMPLOYEE_ROUTES.detail({
    employeeCode: row.employee_code,
    firstName: row.first_name,
    lastName: row.last_name,
  });
}

function nextOccurrence(monthDay: string, from: Date): Date | null {
  // monthDay = MM-DD
  const [mm, dd] = monthDay.split("-").map(Number);
  if (!mm || !dd) return null;
  const thisYear = new Date(from.getFullYear(), mm - 1, dd);
  if (thisYear >= new Date(from.getFullYear(), from.getMonth(), from.getDate())) {
    return thisYear;
  }
  return new Date(from.getFullYear() + 1, mm - 1, dd);
}

function upcomingWithinDays(
  dateValue: string | null | undefined,
  from: Date,
  days: number,
): Date | null {
  if (!dateValue || dateValue.length < 10) return null;
  const monthDay = dateValue.slice(5, 10);
  const next = nextOccurrence(monthDay, from);
  if (!next) return null;
  const end = addDays(from, days);
  if (isWithinInterval(next, { start: from, end })) return next;
  return null;
}

function chartMaxSafe(items: DashboardChartItem[]): DashboardChartItem[] {
  return items.filter((i) => i.label);
}

function moduleHref(module: string | null): string | null {
  switch (module) {
    case "employees":
      return EMPLOYEE_ROUTES.list;
    case "attendance":
      return "/dashboard/attendance";
    case "leave":
      return LEAVE_ROUTES.list;
    case "payroll":
      return PAYROLL_ROUTES.dashboard;
    case "recruitment":
      return RECRUITMENT_ROUTES.dashboard;
    case "assets":
      return ASSETS_ROUTES.dashboard;
    case "exit":
      return EXIT_ROUTES.dashboard;
    case "documents":
      return DOCUMENTS_ROUTES.dashboard;
    default:
      return null;
  }
}

function humanizeActivityTitle(action: string | null | undefined): string {
  const cleaned = stripIdsFromText(String(action ?? "update").replaceAll("_", " "));
  if (!cleaned) return "Update";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function humanizeActivityDescription(
  description: string | null | undefined,
  module: string | null | undefined,
  tableName: string | null | undefined,
): string {
  const cleaned = stripIdsFromText(description);
  if (cleaned) return cleaned;

  const fallback = stripIdsFromText(
    [module, tableName?.replaceAll("_", " ")].filter(Boolean).join(" · "),
  );
  return fallback || "System activity";
}

export async function getHrDashboardData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<HrDashboardData> {
  const organizationId = profile.employee.organizationId;
  const today = getTodayDateString();
  const todayDate = parseISO(today);
  const monthStart = format(startOfMonth(todayDate), "yyyy-MM-dd");
  const sevenDaysAgo = format(subDays(todayDate, 6), "yyyy-MM-dd");
  const eventHorizon = addDays(todayDate, 30);

  const [
    attendance,
    leave,
    payroll,
    recruitment,
    hiring,
    documents,
    expiring,
    exitSummary,
    holidays,
    employeesRes,
    profilesRes,
    attendanceTrendRes,
    leaveTypesRes,
    recentEmployeesRes,
    recentLeaveRes,
    recentJobsRes,
    recentPayrollRes,
    auditRes,
    salaryMetaRes,
  ] = await Promise.all([
    getAttendanceSummary(supabase, profile),
    getLeaveSummary(supabase, profile),
    getPayrollSummary(supabase, profile),
    getRecruitmentSummary(supabase, profile),
    getHiringAnalytics(supabase, profile),
    getDocumentsSummary(supabase, profile),
    getExpiringSummary(supabase, profile),
    getExitSummary(supabase, profile),
    listHolidays(supabase, organizationId, {
      year: todayDate.getFullYear(),
    }),
    fromHrms(supabase, "employees")
      .select(
        `id, employee_code, first_name, last_name, email, employment_status, date_of_joining, date_of_leaving,
         department_id, employment_type_id,
         departments:department_id(name),
         employment_types:employment_type_id(name)`,
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .limit(5000),
    fromHrms(supabase, "employee_profiles")
      .select("employee_id, date_of_birth, gender, employees:employee_id!inner(organization_id)")
      .eq("employees.organization_id", organizationId)
      .is("deleted_at", null)
      .limit(5000),
    fromHrms(supabase, "attendance")
      .select("attendance_date, attendance_status")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .gte("attendance_date", sevenDaysAgo)
      .lte("attendance_date", today),
    fromHrms(supabase, "leave_requests")
      .select("leave_type_id, total_days, leave_status, leave_types:leave_type_id(name)")
      .eq("organization_id", organizationId)
      .eq("leave_status", "approved")
      .is("deleted_at", null)
      .gte("start_date", format(subMonths(todayDate, 11), "yyyy-MM-01")),
    fromHrms(supabase, "employees")
      .select("id, employee_code, first_name, last_name, date_of_joining, employment_status, departments:department_id(name)")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(6),
    fromHrms(supabase, "leave_requests")
      .select(
        `id, leave_status, start_date, end_date, total_days, created_at,
         employees:employee_id(employee_code, first_name, last_name),
         leave_types:leave_type_id(name)`,
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(6),
    fromHrms(supabase, "recruitment_job_openings")
      .select("id, title, job_status, open_positions, created_at, departments:department_id(name)")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(6),
    fromHrms(supabase, "payrolls")
      .select("id, payroll_month, payroll_status, total_net, created_at")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(6),
    fromHrms(supabase, "audit_logs")
      .select("id, occurred_at, module, action, description, table_name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("occurred_at", { ascending: false })
      .limit(12),
    fromHrms(supabase, "salary_structures")
      .select("employee_id, components, employees:employee_id!inner(organization_id)")
      .eq("employees.organization_id", organizationId)
      .is("deleted_at", null)
      .eq("status", "active")
      .limit(5000),
  ]);

  if (employeesRes.error) throw new Error(employeesRes.error.message);

  const empRows = (employeesRes.data ?? []) as LooseRow[];
  const activeEmployees = empRows.filter((e) => ACTIVE_STATUSES.has(e.employment_status));
  const totalEmployees = activeEmployees.length;

  const profileByEmployee = new Map<string, LooseRow>();
  for (const p of (profilesRes.data ?? []) as LooseRow[]) {
    profileByEmployee.set(p.employee_id, p);
  }

  const probationEndByEmployee = new Map<string, string>();
  for (const s of (salaryMetaRes.data ?? []) as LooseRow[]) {
    const meta = s.components as Record<string, unknown> | null;
    const end = typeof meta?.probation_end_date === "string" ? meta.probation_end_date : null;
    if (end && s.employee_id) probationEndByEmployee.set(s.employee_id, end);
  }

  // Department headcount
  const deptMap = new Map<string, number>();
  for (const e of activeEmployees) {
    const dept = unwrapRelation(e.departments)?.name ?? "Unassigned";
    deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);
  }

  // Gender
  const genderMap = new Map<string, number>();
  for (const e of activeEmployees) {
    const gender = profileByEmployee.get(e.id)?.gender ?? "unspecified";
    const label =
      gender === "male"
        ? "Male"
        : gender === "female"
          ? "Female"
          : gender === "other"
            ? "Other"
            : "Unspecified";
    genderMap.set(label, (genderMap.get(label) ?? 0) + 1);
  }

  // Employment type
  const typeMap = new Map<string, number>();
  for (const e of activeEmployees) {
    const typeName = unwrapRelation(e.employment_types)?.name ?? "Unassigned";
    typeMap.set(typeName, (typeMap.get(typeName) ?? 0) + 1);
  }

  // Leave distribution
  const leaveDistMap = new Map<string, number>();
  for (const row of (leaveTypesRes.data ?? []) as LooseRow[]) {
    const name = unwrapRelation(row.leave_types)?.name ?? "Other";
    leaveDistMap.set(name, (leaveDistMap.get(name) ?? 0) + Number(row.total_days ?? 0));
  }

  // Attendance 7-day trend
  const dayKeys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    dayKeys.push(format(subDays(todayDate, i), "yyyy-MM-dd"));
  }
  const presentByDay = new Map<string, number>(dayKeys.map((k) => [k, 0]));
  for (const row of (attendanceTrendRes.data ?? []) as LooseRow[]) {
    const d = String(row.attendance_date);
    if (!presentByDay.has(d)) continue;
    if (["present", "late", "half_day"].includes(row.attendance_status)) {
      presentByDay.set(d, (presentByDay.get(d) ?? 0) + 1);
    }
  }

  // Birthdays & anniversaries (next 30 days)
  const upcomingBirthdays: DashboardPersonEvent[] = [];
  const upcomingAnniversaries: DashboardPersonEvent[] = [];
  let probationEndingSoon = 0;

  for (const e of activeEmployees) {
    const href = employeeHref(e);
    const name = formatEmployeeName(e.first_name, e.last_name);
    const dob = profileByEmployee.get(e.id)?.date_of_birth as string | null | undefined;
    const bday = upcomingWithinDays(dob, todayDate, 30);
    if (bday) {
      upcomingBirthdays.push({
        id: `bday-${e.id}`,
        name,
        date: format(bday, "yyyy-MM-dd"),
        subtitle: e.employee_code,
        href,
      });
    }

    const doj = e.date_of_joining as string | null | undefined;
    const ann = upcomingWithinDays(doj, todayDate, 30);
    if (ann && doj) {
      const years = differenceInYears(ann, parseISO(doj));
      if (years >= 1) {
        upcomingAnniversaries.push({
          id: `ann-${e.id}`,
          name,
          date: format(ann, "yyyy-MM-dd"),
          subtitle: `${years} year${years === 1 ? "" : "s"}`,
          href,
        });
      }
    }

    const probationEnd = probationEndByEmployee.get(e.id);
    if (
      e.employment_status === "probation" ||
      (probationEnd &&
        probationEnd >= today &&
        probationEnd <= format(eventHorizon, "yyyy-MM-dd"))
    ) {
      if (
        probationEnd &&
        probationEnd >= today &&
        probationEnd <= format(eventHorizon, "yyyy-MM-dd")
      ) {
        probationEndingSoon += 1;
      } else if (e.employment_status === "probation" && !probationEnd) {
        probationEndingSoon += 1;
      }
    }
  }

  upcomingBirthdays.sort((a, b) => a.date.localeCompare(b.date));
  upcomingAnniversaries.sort((a, b) => a.date.localeCompare(b.date));

  const newJoinersThisMonth = activeEmployees.filter(
    (e) => e.date_of_joining && e.date_of_joining >= monthStart && e.date_of_joining <= today,
  ).length;

  const presentCount =
    attendance.presentToday + attendance.lateToday + attendance.halfDayToday;
  const attendancePercent =
    totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 1000) / 10 : 0;

  const currentPayroll = payroll.monthlyOverview.find(
    (m) => m.month === format(todayDate, "yyyy-MM"),
  );
  const payrollStatus = currentPayroll?.status
    ? PAYROLL_STATUS_LABELS[currentPayroll.status as PayrollStatus] ?? currentPayroll.status
    : payroll.pendingPayroll > 0
      ? "Pending"
      : "Not started";

  const pendingApprovals =
    leave.pendingRequests +
    (recruitment.offersPending ?? 0) +
    (exitSummary.pendingResignations ?? 0);

  const tasks: DashboardTaskItem[] = [];
  if (leave.pendingRequests > 0) {
    tasks.push({
      id: "leave-approvals",
      label: `Approve ${leave.pendingRequests} leave request${leave.pendingRequests === 1 ? "" : "s"}`,
      count: leave.pendingRequests,
      href: LEAVE_ROUTES.list,
      urgency: "high",
    });
  }
  for (const interview of recruitment.upcomingInterviews.slice(0, 2)) {
    const timeLabel = interview.interviewTime
      ? ` at ${interview.interviewTime.slice(0, 5)}`
      : "";
    tasks.push({
      id: `interview-${interview.id}`,
      label: `Interview: ${interview.candidateName}${timeLabel}`,
      count: null,
      href: RECRUITMENT_ROUTES.interviews,
      urgency: "medium",
    });
  }
  if (!currentPayroll?.status || currentPayroll.status === "draft") {
    tasks.push({
      id: "payroll-due",
      label: "Payroll due this month",
      count: null,
      href: PAYROLL_ROUTES.run,
      urgency: "high",
    });
  }
  if (expiring.next7Days > 0 || documents.expiringSoon > 0) {
    const count = expiring.next7Days || documents.expiringSoon;
    tasks.push({
      id: "docs-expiring",
      label: `${count} document${count === 1 ? "" : "s"} expiring soon`,
      count,
      href: DOCUMENTS_ROUTES.expiring,
      urgency: "medium",
    });
  }
  if (exitSummary.pendingClearance > 0) {
    tasks.push({
      id: "exit-clearance",
      label: "Exit clearance pending",
      count: exitSummary.pendingClearance,
      href: EXIT_ROUTES.clearance,
      urgency: "high",
    });
  }
  if (exitSummary.assetsPendingReturn > 0) {
    tasks.push({
      id: "assets-return",
      label: "Assets pending return",
      count: exitSummary.assetsPendingReturn,
      href: EXIT_ROUTES.assetReturn,
      urgency: "medium",
    });
  }

  const activities: DashboardActivityItem[] = ((auditRes.data ?? []) as LooseRow[]).map(
    (row) => ({
      id: row.id,
      title: humanizeActivityTitle(row.action),
      description: humanizeActivityDescription(
        row.description,
        row.module,
        row.table_name,
      ),
      module: row.module ?? "system",
      occurredAt: row.occurred_at,
      href: moduleHref(row.module),
    }),
  );

  // Fallback activities from module recent feeds when audit is empty/restricted
  if (activities.length === 0) {
    for (const e of (recentEmployeesRes.data ?? []).slice(0, 3) as LooseRow[]) {
      activities.push({
        id: `emp-${e.id}`,
        title: "Employee Added",
        description: formatEmployeeName(e.first_name, e.last_name),
        module: "employees",
        occurredAt: e.date_of_joining
          ? `${e.date_of_joining}T00:00:00.000Z`
          : new Date().toISOString(),
        href: employeeHref(e),
      });
    }
    for (const item of recruitment.recentActivity.slice(0, 3)) {
      activities.push({
        id: item.id,
        title: stripIdsFromText(item.title) || "Recruitment update",
        description:
          stripIdsFromText(item.description ?? item.eventType) || "Recruitment activity",
        module: "recruitment",
        occurredAt: item.createdAt,
        href: RECRUITMENT_ROUTES.dashboard,
      });
    }
  }

  const upcomingHolidays: DashboardListItem[] = holidays.data
    .filter((h) => h.holidayDate >= today && h.holidayDate <= format(eventHorizon, "yyyy-MM-dd"))
    .slice(0, 6)
    .map((h) => ({
      id: h.id,
      primary: h.name,
      secondary: h.holidayType.replaceAll("_", " "),
      meta: h.holidayDate,
      href: ORGANIZATION_ROUTES.holidays,
    }));

  const upcomingInterviews: DashboardListItem[] = recruitment.upcomingInterviews
    .slice(0, 6)
    .map((i) => ({
      id: i.id,
      primary: i.candidateName,
      secondary: i.jobTitle || i.roundName,
      meta: `${i.interviewDate}${i.interviewTime ? ` · ${i.interviewTime.slice(0, 5)}` : ""}`,
      href: RECRUITMENT_ROUTES.interviews,
    }));

  const recentEmployees: DashboardListItem[] = ((recentEmployeesRes.data ?? []) as LooseRow[]).map(
    (e) => ({
      id: e.id,
      primary: formatEmployeeName(e.first_name, e.last_name),
      secondary: unwrapRelation(e.departments)?.name ?? e.employee_code,
      meta: e.date_of_joining ?? "—",
      href: employeeHref(e),
    }),
  );

  const recentLeaveRequests: DashboardListItem[] = ((recentLeaveRes.data ?? []) as LooseRow[]).map(
    (row) => {
      const emp = unwrapRelation(row.employees);
      return {
        id: row.id,
        primary: formatEmployeeName(emp?.first_name, emp?.last_name),
        secondary: unwrapRelation(row.leave_types)?.name ?? "Leave",
        meta: `${row.leave_status} · ${row.total_days ?? 0}d`,
        href: LEAVE_ROUTES.detail(row.id),
      };
    },
  );

  const recentRecruitment: DashboardListItem[] = ((recentJobsRes.data ?? []) as LooseRow[]).map(
    (row) => ({
      id: row.id,
      primary: row.title,
      secondary: unwrapRelation(row.departments)?.name ?? "Recruitment",
      meta: `${row.job_status} · ${row.open_positions ?? 0} open`,
      href: RECRUITMENT_ROUTES.jobs,
    }),
  );

  const recentPayrollRuns: DashboardListItem[] = ((recentPayrollRes.data ?? []) as LooseRow[]).map(
    (row) => {
      const monthDate = String(row.payroll_month ?? "").slice(0, 10);
      const label = monthDate
        ? format(parseISO(monthDate), "MMM yyyy")
        : "Payroll";
      return {
        id: row.id,
        primary: label,
        secondary:
          PAYROLL_STATUS_LABELS[row.payroll_status as PayrollStatus] ?? row.payroll_status,
        meta:
          row.total_net != null
            ? `₹${Number(row.total_net).toLocaleString("en-IN")}`
            : "—",
        href: PAYROLL_ROUTES.detail(row.id),
      };
    },
  );

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      totalEmployees,
      presentToday: presentCount,
      onLeaveToday: attendance.onLeaveToday || leave.employeesOnLeaveToday || 0,
      absentToday: attendance.absentToday,
      lateToday: attendance.lateToday,
      newJoinersThisMonth,
      employeesExiting: exitSummary.leavingThisMonth || exitSummary.noticePeriod || 0,
      openRecruitments: recruitment.openPositions ?? 0,
      pendingApprovals,
    },
    secondary: {
      attendancePercent,
      leaveUtilizationPercent: leave.balanceUtilizationPercent ?? 0,
      payrollStatus,
      upcomingBirthdaysCount: upcomingBirthdays.length,
      upcomingAnniversariesCount: upcomingAnniversaries.length,
      probationEndingSoon,
      documentsExpiring: documents.expiringSoon || expiring.next30Days || 0,
      assetsPendingReturn: exitSummary.assetsPendingReturn || 0,
    },
    charts: {
      headcountByDepartment: chartMaxSafe(
        Array.from(deptMap.entries())
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value),
      ),
      attendanceTrend7Days: dayKeys.map((d) => ({
        label: format(parseISO(d), "dd MMM"),
        value: presentByDay.get(d) ?? 0,
      })),
      monthlyHiring: hiring.monthlyHiring.map((m) => ({
        label: m.month,
        value: m.count,
      })),
      monthlyAttrition: exitSummary.monthlyAttrition.map((m) => ({
        label: m.month,
        value: m.count,
      })),
      leaveDistribution: chartMaxSafe(
        Array.from(leaveDistMap.entries())
          .map(([label, value]) => ({ label, value: Math.round(value * 10) / 10 }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8),
      ),
      genderDistribution: chartMaxSafe(
        Array.from(genderMap.entries()).map(([label, value]) => ({ label, value })),
      ),
      employmentTypeDistribution: chartMaxSafe(
        Array.from(typeMap.entries()).map(([label, value]) => ({ label, value })),
      ),
    },
    activities: activities.slice(0, 10),
    tasks: tasks.slice(0, 8),
    upcomingBirthdays: upcomingBirthdays.slice(0, 6),
    upcomingAnniversaries: upcomingAnniversaries.slice(0, 6),
    upcomingInterviews,
    upcomingHolidays,
    recentEmployees,
    recentLeaveRequests,
    recentRecruitment,
    recentPayrollRuns,
  };
}
