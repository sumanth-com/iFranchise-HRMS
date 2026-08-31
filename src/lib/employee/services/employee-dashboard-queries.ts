import { addDays, format, isWithinInterval } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { canManageDashboardAnnouncements } from "@/lib/dashboard/dashboard-announcement-permissions";
import { listPublishedDashboardAnnouncements } from "@/lib/dashboard/services/dashboard-announcement-queries";
import { canUpdateOwnCheckout } from "@/lib/attendance/self-checkout-permissions";
import { LEAVE_BALANCE_CARD_CODES } from "@/lib/leave/constants";
import { ensureEmployeeMonthlyLeaveAccruals } from "@/lib/leave/services/leave-monthly-accrual";
import { getCurrentBalanceYear } from "@/lib/leave/services/leave-utils";
import { roundLeaveDays } from "@/lib/leave/services/leave-usage";
import { getSelfTodayAttendance } from "@/lib/manager/services/manager-self-attendance-service";
import { unwrapRelation } from "@/lib/reports/services/reports-utils";
import type { UserProfile } from "@/types/auth";
import type {
  EmployeeDashboardData,
  EmployeeGreeting,
  EmployeeUpcomingEvent,
} from "@/types/employee-dashboard";
import type { ManagerTodayAttendance } from "@/types/manager-self-attendance";

/** Match Leave page cards: Casual + Earned available balance only. */
const DASHBOARD_LEAVE_BALANCE_CODES = new Set<string>(LEAVE_BALANCE_CARD_CODES);

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

  // Apply due monthly CL/EL accruals so the KPI matches the Leave page.
  await ensureEmployeeMonthlyLeaveAccruals(supabase, employeeId, { balanceYear });

  const [balancesResult, pendingResult] = await Promise.all([
    supabase
      .schema("hrms")
      .from("leave_balances")
      .select("balance_days, leave_types:leave_type_id (code)")
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

  // Casual + Earned remaining only (monthly accrual types — exclude SL/PL/LOP/OH).
  const totalBalanceDays = (balancesResult.data ?? []).reduce((sum, row) => {
    const leaveType = unwrapRelation(
      row.leave_types as { code: string } | { code: string }[] | null,
    );
    const code = leaveType?.code;
    if (!code || !DASHBOARD_LEAVE_BALANCE_CODES.has(code)) return sum;
    return sum + Math.max(0, Number(row.balance_days ?? 0));
  }, 0);

  return {
    totalBalanceDays: roundLeaveDays(totalBalanceDays),
    pendingCount: pendingResult.count ?? 0,
  };
}

function parseLocalDate(ymd: string): Date {
  const [year, month, day] = ymd.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function nextOccurrence(monthDay: string, from: Date): Date | null {
  const [mm, dd] = monthDay.split("-").map(Number);
  if (!mm || !dd) return null;
  const thisYear = new Date(from.getFullYear(), mm - 1, dd);
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (thisYear >= fromDay) return thisYear;
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

const ACTIVE_EMPLOYMENT = ["active", "probation", "on_leave"] as const;

export async function loadUpcomingCelebrations(
  supabase: AuthSupabaseClient,
  organizationId: string,
  today: string,
): Promise<EmployeeUpcomingEvent[]> {
  const todayDate = parseLocalDate(today);
  const windowEnd = format(addDays(todayDate, 7), "yyyy-MM-dd");
  const events: EmployeeUpcomingEvent[] = [];

  const holidaysResult = await supabase
    .schema("hrms")
    .from("holidays")
    .select("id, name, holiday_date, is_optional, holiday_type")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .gte("holiday_date", today)
    .lte("holiday_date", windowEnd)
    .order("holiday_date")
    .limit(8);

  if (holidaysResult.error) {
    console.error("[celebrations] holidays query failed", holidaysResult.error.message);
  } else {
    for (const holiday of holidaysResult.data ?? []) {
      const rawType = (holiday as { holiday_type?: string | null }).holiday_type;
      const formattedType = rawType
        ? rawType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : null;
      const subtitle = holiday.is_optional
        ? "Optional Holiday"
        : formattedType || "Company Holiday";

      events.push({
        id: `holiday-${holiday.id}`,
        type: "holiday",
        title: holiday.name,
        subtitle,
        date: holiday.holiday_date,
      });
    }
  }

  // Birthdays: employees + profiles as separate queries so a join/RLS quirk
  // cannot drop the whole celebrations panel (or hide DOBs for executives).
  try {
    const employeesResult = await supabase
      .schema("hrms")
      .from("employees")
      .select("id, employee_code, first_name, last_name, employment_status")
      .eq("organization_id", organizationId)
      .in("employment_status", [...ACTIVE_EMPLOYMENT])
      .is("deleted_at", null);

    if (employeesResult.error) throw new Error(employeesResult.error.message);

    const employees = employeesResult.data ?? [];
    const employeeIds = employees.map((row) => row.id as string);
    const employeeById = new Map(employees.map((row) => [row.id as string, row]));

    if (employeeIds.length > 0) {
      const profilesResult = await supabase
        .schema("hrms")
        .from("employee_profiles")
        .select("employee_id, date_of_birth, profile_image_storage_path")
        .in("employee_id", employeeIds)
        .is("deleted_at", null)
        .not("date_of_birth", "is", null);

      if (profilesResult.error) throw new Error(profilesResult.error.message);

      for (const row of profilesResult.data ?? []) {
        const employeeId = row.employee_id as string;
        const employee = employeeById.get(employeeId);
        if (!employee) continue;

        const dob = row.date_of_birth as string | null | undefined;
        const bday = upcomingWithinDays(dob, todayDate, 7);
        if (!bday) continue;

        const firstName = (employee.first_name as string | null) ?? "";
        const lastName = (employee.last_name as string | null) ?? "";
        const fullName = `${firstName} ${lastName}`.trim() || "Team member";

        events.push({
          id: `birthday-${employeeId}`,
          type: "birthday",
          title: fullName,
          subtitle: "Birthday",
          date: format(bday, "yyyy-MM-dd"),
          profileImagePath: (row.profile_image_storage_path as string | null) ?? null,
          firstName,
          lastName,
        });
      }
    }
  } catch (error) {
    console.error("[celebrations] birthdays query failed", error);
  }

  const celebrationEvents = [...events];
  celebrationEvents.sort((a, b) => {
    const typeRank = (type: EmployeeUpcomingEvent["type"]) =>
      type === "birthday" ? 0 : type === "holiday" ? 1 : 2;
    const aIsToday = a.date === today;
    const bIsToday = b.date === today;
    if (aIsToday && !bIsToday) return -1;
    if (!aIsToday && bIsToday) return 1;
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return typeRank(a.type) - typeRank(b.type);
  });

  const announcements = await listPublishedDashboardAnnouncements(
    supabase,
    organizationId,
  ).catch((error) => {
    console.error("[celebrations] announcements query failed", error);
    return [];
  });

  const importantAnnouncementEvents: EmployeeUpcomingEvent[] = [];
  const normalAnnouncementEvents: EmployeeUpcomingEvent[] = [];

  for (const announcement of announcements) {
    const slide: EmployeeUpcomingEvent = {
      id: `announcement-${announcement.id}`,
      type: "announcement",
      title: announcement.title,
      subtitle: announcement.priority === "important" ? "Important" : "Announcement",
      date: (announcement.publishedAt ?? announcement.updatedAt).slice(0, 10) || today,
      message: announcement.message,
      priority: announcement.priority,
      imageUrl: announcement.imageUrl,
      iconKey: announcement.iconKey,
    };
    if (announcement.priority === "important") {
      importantAnnouncementEvents.push(slide);
    } else {
      normalAnnouncementEvents.push(slide);
    }
  }

  // Important announcements first, then birthdays/holidays, then normal notices.
  return [
    ...importantAnnouncementEvents,
    ...celebrationEvents,
    ...normalAnnouncementEvents,
  ];
}

export async function getEmployeeDashboardData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<EmployeeDashboardData> {
  const today = getTodayDateString();
  const employeeId = profile.employee.id;
  const organizationId = profile.employee.organizationId;
  const greeting = greetingFromProfile(profile);

  const [todayPanel, leave, upcomingHolidays] = await Promise.all([
    safe(() => getSelfTodayAttendance(supabase, profile), buildFallbackToday(today)),
    safe(() => loadLeaveKpis(supabase, employeeId), {
      totalBalanceDays: 0,
      pendingCount: 0,
    }),
    safe(() => loadUpcomingCelebrations(supabase, organizationId, today), []),
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
    referenceDate: today,
    upcomingHolidays,
    canManageAnnouncements: canManageDashboardAnnouncements(profile.permissionCodes),
    canUpdateCheckout: canUpdateOwnCheckout(profile),
  };
}
