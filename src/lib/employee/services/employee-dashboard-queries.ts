import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { EMPLOYEE_STORAGE_BUCKETS } from "@/lib/employees/constants";
import { createSignedStorageUrl } from "@/lib/storage/signed-url";
import { getEmployeeLeaveBalanceSnapshot } from "@/lib/leave/services/leave-queries";
import { getManagerProfilePageData } from "@/lib/manager/services/manager-self-attendance-service";
import { listHolidays } from "@/lib/organization/services/org-queries";
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

async function loadGreeting(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<EmployeeGreeting> {
  const employeeId = profile.employee.id;

  const [employeeResult, profileResult] = await Promise.all([
    supabase
      .schema("hrms")
      .from("employees")
      .select(
        `
          employee_code,
          first_name,
          last_name,
          departments:department_id (name),
          designations:designation_id (title)
        `,
      )
      .eq("id", employeeId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .schema("hrms")
      .from("employee_profiles")
      .select("profile_image_storage_path")
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  const employee = employeeResult.data;
  const firstName = employee?.first_name ?? "there";
  const lastName = employee?.last_name ?? "";
  const fullName = `${firstName} ${lastName}`.trim();

  const department = employee?.departments as { name: string } | { name: string }[] | null;
  const designation = employee?.designations as { title: string } | { title: string }[] | null;
  const departmentName = Array.isArray(department)
    ? department[0]?.name ?? null
    : department?.name ?? null;
  const designationTitle = Array.isArray(designation)
    ? designation[0]?.title ?? null
    : designation?.title ?? null;

  let avatarUrl: string | null = null;
  const imagePath = profileResult.data?.profile_image_storage_path ?? null;
  if (imagePath) {
    avatarUrl = await createSignedStorageUrl(
      supabase,
      EMPLOYEE_STORAGE_BUCKETS.profileImages,
      imagePath,
    );
  }

  return {
    employeeId,
    firstName,
    lastName,
    fullName: fullName || firstName,
    employeeCode: employee?.employee_code ?? profile.employee.employeeCode,
    designation: designationTitle,
    departmentName,
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

export async function getEmployeeDashboardData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<EmployeeDashboardData> {
  const today = getTodayDateString();
  const employeeId = profile.employee.id;
  const organizationId = profile.employee.organizationId;
  const currentYear = new Date().getFullYear();

  const [greeting, attendance, leave, holidays] = await Promise.all([
    safe(() => loadGreeting(supabase, profile), {
      employeeId,
      firstName: "there",
      lastName: "",
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
  ]);

  const todayPanel = attendance?.today ?? buildFallbackToday(today);

  const upcomingHolidays: EmployeeUpcomingEvent[] = holidays.data
    .filter((holiday) => holiday.holidayDate >= today)
    .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate))
    .map((holiday) => ({
      id: `holiday-${holiday.id}`,
      type: "holiday" as const,
      title: holiday.name,
      subtitle: holiday.isOptional ? "Optional holiday" : "Company holiday",
      date: holiday.holidayDate,
    }));

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
  };
}
