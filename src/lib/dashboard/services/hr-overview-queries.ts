import { cache } from "react";
import { addDays, format, isWithinInterval, parseISO, differenceInYears } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getAttendanceSummary } from "@/lib/attendance/services/attendance-queries";
import { absentTodayIncludingLeave } from "@/lib/attendance/attendance-presence";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { DASHBOARD_ACTION_LINKS } from "@/lib/dashboard/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { getLeaveSummary } from "@/lib/leave/services/leave-queries";
import { ORGANIZATION_ROUTES } from "@/lib/organization/constants";
import { listHolidays } from "@/lib/organization/services/org-queries";
import { getPayrollMonthDate } from "@/lib/payroll/services/payroll-utils";
import { getOnboardingDashboardStats } from "@/lib/onboarding/services/onboarding-queries";
import { formatEmployeeName, fromHrms } from "@/lib/reports/services/reports-utils";
import type { UserProfile } from "@/types/auth";
import type { HrDashboardData } from "@/types/dashboard";

const ACTIVE_EMPLOYMENT_STATUSES = ["active", "probation", "on_leave"];

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

const EMPTY_CHARTS: HrDashboardData["charts"] = {
  headcountByDepartment: [],
  attendanceTrend7Days: [],
  monthlyHiring: [],
  monthlyAttrition: [],
  leaveDistribution: [],
  genderDistribution: [],
  employmentTypeDistribution: [],
};

/**
 * Lean loader for HR Overview / Today's Pulse.
 * Only fetches widgets the page renders (avoids heavy analytics payloads).
 */
export const getHrDashboardData = cache(async function getHrDashboardData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<HrDashboardData> {
  const organizationId = profile.employee.organizationId;
  const today = getTodayDateString();
  const todayDate = parseISO(today);
  const eventHorizon = addDays(todayDate, 30);
  const payrollMonth = todayDate.getMonth() + 1;
  const payrollYear = todayDate.getFullYear();
  const payrollMonthDate = getPayrollMonthDate(payrollMonth, payrollYear);

  // DATE columns cannot use PostgREST `like` (`~~`). Keep org/status-scoped
  // fetches and filter month-day windows in JS via upcomingWithinDays.

  const [
    attendance,
    leave,
    holidays,
    headcountRes,
    probationCountRes,
    anniversaryEmployeesRes,
    birthdayProfilesRes,
    payrollRes,
    interviewsTodayRes,
    onboardingStats,
  ] = await Promise.all([
    getAttendanceSummary(supabase, profile),
    getLeaveSummary(supabase, profile, undefined, undefined, {
      excludeHrApplicants: true,
      skipBalanceUtilization: true,
    }),
    listHolidays(supabase, organizationId, { year: todayDate.getFullYear() }),
    fromHrms(supabase, "employees")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("employment_status", ACTIVE_EMPLOYMENT_STATUSES)
      .is("deleted_at", null),
    fromHrms(supabase, "employees")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("employment_status", "probation")
      .is("deleted_at", null),
    fromHrms(supabase, "employees")
      .select("id, employee_code, first_name, last_name, employment_status, date_of_joining")
      .eq("organization_id", organizationId)
      .in("employment_status", ACTIVE_EMPLOYMENT_STATUSES)
      .is("deleted_at", null)
      .not("date_of_joining", "is", null),
    fromHrms(supabase, "employee_profiles")
      .select(
        `employee_id, date_of_birth,
         employees:employee_id!inner(
           id, employee_code, first_name, last_name, organization_id, employment_status
         )`,
      )
      .eq("employees.organization_id", organizationId)
      .in("employees.employment_status", ACTIVE_EMPLOYMENT_STATUSES)
      .is("deleted_at", null)
      .not("date_of_birth", "is", null),
    fromHrms(supabase, "payrolls")
      .select("id, payroll_status")
      .eq("organization_id", organizationId)
      .eq("payroll_month", payrollMonthDate)
      .is("deleted_at", null)
      .maybeSingle(),
    fromHrms(supabase, "recruitment_interviews")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("interview_date", today)
      .is("deleted_at", null),
    getOnboardingDashboardStats(supabase, organizationId),
  ]);

  if (headcountRes.error) throw new Error(headcountRes.error.message);
  if (probationCountRes.error) throw new Error(probationCountRes.error.message);
  if (anniversaryEmployeesRes.error) throw new Error(anniversaryEmployeesRes.error.message);
  if (birthdayProfilesRes.error) throw new Error(birthdayProfilesRes.error.message);
  if (payrollRes.error) throw new Error(payrollRes.error.message);
  if (interviewsTodayRes.error) throw new Error(interviewsTodayRes.error.message);

  const totalEmployees = headcountRes.count ?? 0;
  const probationEndingSoon = probationCountRes.count ?? 0;

  const upcomingBirthdays = [];
  for (const row of birthdayProfilesRes.data ?? []) {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    if (!employee) continue;
    const dob = row.date_of_birth as string | null | undefined;
    const bday = upcomingWithinDays(dob, todayDate, 7);
    if (!bday) continue;
    upcomingBirthdays.push({
      id: `bday-${employee.id}`,
      name: formatEmployeeName(employee.first_name, employee.last_name),
      date: format(bday, "yyyy-MM-dd"),
      subtitle: employee.employee_code,
      href: employeeHref(employee),
    });
  }

  const upcomingAnniversaries = [];
  for (const e of anniversaryEmployeesRes.data ?? []) {
    const doj = e.date_of_joining as string | null | undefined;
    const ann = upcomingWithinDays(doj, todayDate, 30);
    if (ann && doj) {
      const years = differenceInYears(ann, parseISO(doj));
      if (years >= 1) {
        upcomingAnniversaries.push({
          id: `ann-${e.id}`,
          name: formatEmployeeName(e.first_name, e.last_name),
          date: format(ann, "yyyy-MM-dd"),
          subtitle: `${years} year${years === 1 ? "" : "s"}`,
          href: employeeHref(e),
        });
      }
    }
  }

  upcomingBirthdays.sort((a, b) => a.date.localeCompare(b.date));
  upcomingAnniversaries.sort((a, b) => a.date.localeCompare(b.date));

  const presentCount =
    attendance.presentToday + attendance.lateToday + attendance.halfDayToday;
  const payrollStatus = payrollRes.data?.payroll_status as string | undefined;
  const payrollDue = !payrollStatus || payrollStatus === "draft" ? 1 : 0;
  const interviewsToday = interviewsTodayRes.count ?? 0;
  const onLeaveToday = leave.employeesOnLeaveToday;
  const onboardingReadyCount = onboardingStats.readyForInvitation ?? 0;

  const upcomingHolidays = holidays.data
    .filter((h) => h.holidayDate >= today && h.holidayDate <= format(eventHorizon, "yyyy-MM-dd"))
    .slice(0, 6)
    .map((h) => ({
      id: h.id,
      primary: h.name,
      secondary: h.holidayType.replaceAll("_", " "),
      meta: h.holidayDate,
      href: ORGANIZATION_ROUTES.holidays,
    }));

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      totalEmployees,
      presentToday: presentCount,
      absentToday: absentTodayIncludingLeave(attendance),
      pendingLeaveApprovals: leave.pendingRequests,
    },
    todayPulse: {
      // Status-accurate counts (match KPI filter links; no double-counting).
      presentToday: attendance.presentToday,
      absentToday: absentTodayIncludingLeave(attendance),
      lateToday: attendance.lateToday,
      halfDayToday: attendance.halfDayToday,
      pendingApprovals: leave.pendingRequests,
      exitRequests: 0,
      upcomingHolidays,
    },
    secondary: {
      attendancePercent:
        totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 1000) / 10 : 0,
      leaveUtilizationPercent: leave.balanceUtilizationPercent ?? 0,
      payrollStatus: payrollStatus ?? "Not started",
      upcomingBirthdaysCount: upcomingBirthdays.length,
      upcomingAnniversariesCount: upcomingAnniversaries.length,
      probationEndingSoon,
      documentsExpiring: 0,
      assetsPendingReturn: 0,
      interviewsToday,
      birthdaysToday: upcomingBirthdays.filter((event) => event.date === today).length,
      exitClearancePending: 0,
    },
    charts: EMPTY_CHARTS,
    activities: [],
    tasks: [
      {
        id: "payroll-due",
        label: "Payroll Due This Month",
        count: payrollDue,
        href: DASHBOARD_ACTION_LINKS.payrollDuePeriod(payrollMonth, payrollYear),
        urgency: "low",
      },
      {
        id: "interviews-today",
        label: "Interviews Today",
        count: interviewsToday,
        href: `${DASHBOARD_ACTION_LINKS.interviewsToday}?dateFrom=${today}&dateTo=${today}`,
        urgency: "low",
      },
      {
        id: "on-leave",
        label: "On Leave",
        count: onLeaveToday,
        href: DASHBOARD_ACTION_LINKS.onLeaveToday,
        urgency: "low",
      },
      {
        id: "onboarding-review",
        label: "Onboarding",
        count: onboardingReadyCount,
        href: DASHBOARD_ACTION_LINKS.onboardingReview,
        urgency: "low",
      },
    ],
    upcomingBirthdays: upcomingBirthdays.slice(0, 6),
    upcomingAnniversaries: upcomingAnniversaries.slice(0, 6),
    upcomingInterviews: [],
    upcomingHolidays,
    recentEmployees: [],
    recentLeaveRequests: [],
    recentRecruitment: [],
    recentPayrollRuns: [],
  };
});
