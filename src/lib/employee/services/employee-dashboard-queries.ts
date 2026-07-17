import { differenceInCalendarDays, format, parseISO } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { getEmployeeById } from "@/lib/employees/services/employee-detail";
import { getEmployeeLeaveBalanceSnapshot } from "@/lib/leave/services/leave-queries";
import { getManagerProfilePageData } from "@/lib/manager/services/manager-self-attendance-service";
import { listHolidays } from "@/lib/organization/services/org-queries";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserProfile } from "@/types/auth";
import type {
  EmployeeDashboardData,
  EmployeeGreeting,
  EmployeeUpcomingEvent,
} from "@/types/employee-dashboard";
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

/** Returns the next annual occurrence (this year or next) of a birth/joining date. */
function nextAnnualOccurrence(source: string | null, today: string): string | null {
  if (!source || source.length < 10) return null;
  try {
    const src = parseISO(source);
    const [ty, tm, td] = today.split("-").map(Number);
    const todayDate = new Date(ty, tm - 1, td);
    let candidate = new Date(ty, src.getMonth(), src.getDate());
    if (candidate < todayDate) {
      candidate = new Date(ty + 1, src.getMonth(), src.getDate());
    }
    return format(candidate, "yyyy-MM-dd");
  } catch {
    return null;
  }
}

async function loadGreeting(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<EmployeeGreeting> {
  const employee = await getEmployeeById(supabase, profile.employee.id);

  const firstName = employee?.firstName ?? "there";
  const lastName = employee?.lastName ?? "";
  const fullName = `${firstName} ${lastName}`.trim();

  let avatarUrl: string | null = null;
  const imagePath = employee?.profile?.profileImageStoragePath ?? null;
  if (imagePath) {
    const { createSignedStorageUrl } = await import(
      "@/lib/employees/services/employee-mutations"
    );
    const { EMPLOYEE_STORAGE_BUCKETS } = await import("@/lib/employees/constants");
    avatarUrl = await createSignedStorageUrl(
      supabase,
      EMPLOYEE_STORAGE_BUCKETS.profileImages,
      imagePath,
    );
  }

  return {
    employeeId: profile.employee.id,
    firstName,
    fullName: fullName || firstName,
    employeeCode: employee?.employeeCode ?? profile.employee.employeeCode,
    designation: employee?.designationTitle ?? null,
    departmentName: employee?.departmentName ?? null,
    avatarUrl,
  };
}

async function loadLeaveSnapshot(
  supabase: AuthSupabaseClient,
  employeeId: string,
): Promise<{ totalBalanceDays: number; pendingCount: number }> {
  const balances = await getEmployeeLeaveBalanceSnapshot(supabase, employeeId);
  const totalBalanceDays = balances.reduce((sum, row) => sum + row.balanceDays, 0);

  const { count, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employeeId)
    .eq("leave_status", "pending")
    .is("deleted_at", null);
  if (error) throw new Error(error.message);

  return {
    totalBalanceDays: Math.round(totalBalanceDays * 100) / 100,
    pendingCount: count ?? 0,
  };
}

/**
 * Company birthdays celebrated in the next ~45 days. Uses the service-role client so a
 * standard employee can see the shared celebration board without gaining read access to
 * any other sensitive profile field (only display name + the day/month is exposed).
 */
async function loadCompanyBirthdays(
  organizationId: string,
  today: string,
): Promise<EmployeeUpcomingEvent[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("hrms")
    .from("employee_profiles")
    .select(
      "date_of_birth, employees:employee_id!inner(id, first_name, last_name, organization_id, employment_status, deleted_at)",
    )
    .eq("employees.organization_id", organizationId)
    .not("date_of_birth", "is", null)
    .limit(3000);
  if (error) throw new Error(error.message);

  const events: EmployeeUpcomingEvent[] = [];
  for (const row of (data ?? []) as Array<{
    date_of_birth: string | null;
    employees:
      | {
          id: string;
          first_name: string | null;
          last_name: string | null;
          employment_status: string | null;
          deleted_at: string | null;
        }
      | Array<{
          id: string;
          first_name: string | null;
          last_name: string | null;
          employment_status: string | null;
          deleted_at: string | null;
        }>;
  }>) {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    if (!employee || employee.deleted_at) continue;
    if (employee.employment_status && employee.employment_status === "terminated") continue;

    const next = nextAnnualOccurrence(row.date_of_birth, today);
    if (!next) continue;
    if (differenceInCalendarDays(parseISO(next), parseISO(today)) > 45) continue;

    const name = `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim() || "Team member";
    events.push({
      id: `birthday-${employee.id}`,
      type: "birthday",
      title: name,
      subtitle: next === today ? "Birthday today" : "Birthday",
      date: next,
    });
  }

  return events;
}

export async function getEmployeeDashboardData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<EmployeeDashboardData> {
  const today = getTodayDateString();
  const employeeId = profile.employee.id;
  const organizationId = profile.employee.organizationId;
  const currentYear = new Date().getFullYear();

  const [greeting, attendance, leave, holidays, birthdays] = await Promise.all([
    safe(() => loadGreeting(supabase, profile), {
      employeeId,
      firstName: "there",
      fullName: "there",
      employeeCode: profile.employee.employeeCode,
      designation: null,
      departmentName: null,
      avatarUrl: null,
    }),
    safe(
      () => getManagerProfilePageData(supabase, profile, { page: 1, pageSize: 31 }),
      null,
    ),
    safe(() => loadLeaveSnapshot(supabase, employeeId), {
      totalBalanceDays: 0,
      pendingCount: 0,
    }),
    safe(() => listHolidays(supabase, organizationId, { year: currentYear }), {
      data: [],
      total: 0,
      page: 1,
      year: currentYear,
    }),
    safe(() => loadCompanyBirthdays(organizationId, today), [] as EmployeeUpcomingEvent[]),
  ]);

  const todayPanel = attendance?.today ?? buildFallbackToday(today);

  const holidayEvents: EmployeeUpcomingEvent[] = holidays.data
    .filter((holiday) => holiday.holidayDate >= today)
    .map((holiday) => ({
      id: `holiday-${holiday.id}`,
      type: "holiday" as const,
      title: holiday.name,
      subtitle: holiday.isOptional ? "Optional holiday" : "Company holiday",
      date: holiday.holidayDate,
    }));

  const upcomingEvents = [...holidayEvents, ...birthdays]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

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
    upcomingEvents,
  };
}
