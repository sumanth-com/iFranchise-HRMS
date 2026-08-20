import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { getCurrentBalanceYear } from "@/lib/leave/services/leave-utils";
import { getEmployeeLeaveBalanceSnapshot } from "@/lib/leave/services/leave-queries";
import { getSelfTodayAttendance } from "@/lib/manager/services/manager-self-attendance-service";
import type { UserProfile } from "@/types/auth";
import type {
  EmployeeDashboardData,
  EmployeeGreeting,
  EmployeeUpcomingEvent,
} from "@/types/employee-dashboard";
import type { LeaveEmployeeBalanceSnapshot } from "@/types/leave";
import type { ManagerTodayAttendance } from "@/types/manager-self-attendance";

/** Runs a widget query but never lets one failing panel break the whole dashboard. */
async function safe<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error("[employee-dashboard] widget query failed", error);
    return fallback;
  }
}

function buildFallbackToday(today: string): ManagerTodayAttendance {
  return {
    attendanceId: null,
    attendanceDate: today,
    punchState: "not_checked_in",
    attendanceStatus: null,
    checkInAt: null,
    checkOutAt: null,
    workHours: 0,
    overtimeHours: 0,
    lateMinutes: 0,
    isLocked: false,
    lockMessage: null,
    workingDurationLabel: "0h 00m",
  };
}

function greetingFromProfile(profile: UserProfile): EmployeeGreeting {
  const firstName = profile.employee.firstName || "there";
  const lastName = profile.employee.lastName ?? "";
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    employeeId: profile.employee.id,
    firstName,
    lastName,
    fullName: fullName || firstName,
    employeeCode: profile.employee.employeeCode,
    designation: null,
    departmentName: null,
    avatarUrl: null,
  };
}

async function loadLeaveKpis(
  supabase: AuthSupabaseClient,
  employeeId: string,
): Promise<{ totalBalanceDays: number; pendingCount: number }> {
  const balanceYear = getCurrentBalanceYear();

  const [balancesResult, pendingResult] = await Promise.all([
    supabase
      .schema("hrms")
      .from("leave_balances")
      .select("balance_days")
      .eq("employee_id", employeeId)
      .eq("balance_year", balanceYear)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("leave_requests")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", employeeId)
      .eq("leave_status", "pending")
      .is("deleted_at", null),
  ]);

  if (balancesResult.error) throw new Error(balancesResult.error.message);
  if (pendingResult.error) throw new Error(pendingResult.error.message);

  const totalBalanceDays = (balancesResult.data ?? []).reduce((sum, row) => {
    return sum + Number(row.balance_days ?? 0);
  }, 0);

  return {
    totalBalanceDays: Math.round(totalBalanceDays * 100) / 100,
    pendingCount: pendingResult.count ?? 0,
  };
}

async function loadUpcomingHolidays(
  supabase: AuthSupabaseClient,
  organizationId: string,
  today: string,
): Promise<EmployeeUpcomingEvent[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("holidays")
    .select("id, name, holiday_date, is_optional")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .gte("holiday_date", today)
    .order("holiday_date")
    .limit(8);

  if (error) throw new Error(error.message);

  return (data ?? []).map((holiday) => ({
    id: `holiday-${holiday.id}`,
    type: "holiday" as const,
    title: holiday.name,
    subtitle: holiday.is_optional ? "Optional holiday" : "Company holiday",
    date: holiday.holiday_date,
  }));
}

export async function getEmployeeDashboardData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<EmployeeDashboardData> {
  const today = getTodayDateString();
  const employeeId = profile.employee.id;
  const organizationId = profile.employee.organizationId;
  const greeting = greetingFromProfile(profile);

  const [todayPanel, leave, leaveBalances, upcomingHolidays] = await Promise.all([
    safe(() => getSelfTodayAttendance(supabase, profile), buildFallbackToday(today)),
    safe(() => loadLeaveKpis(supabase, employeeId), {
      totalBalanceDays: 0,
      pendingCount: 0,
    }),
    safe(
      () => getEmployeeLeaveBalanceSnapshot(supabase, employeeId, getCurrentBalanceYear()),
      [] as LeaveEmployeeBalanceSnapshot[],
    ),
    safe(() => loadUpcomingHolidays(supabase, organizationId, today), []),
  ]);

  return {
    greeting,
    today: todayPanel,
    kpis: {
      attendanceStatus: todayPanel.attendanceStatus,
      attendancePunchState: todayPanel.punchState,
      workingHours: todayPanel.workHours,
      leaveBalanceDays: leave.totalBalanceDays,
      pendingLeaveRequests: leave.pendingCount,
    },
    leaveBalances,
    referenceDate: today,
    upcomingHolidays,
  };
}
