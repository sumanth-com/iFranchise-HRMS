import { format, parseISO } from "date-fns";

import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { buildEmployeeRouteRef } from "@/lib/employees/routing";
import { resolveEmployeeFromRouteRef } from "@/lib/employees/services/employee-route-resolver";
import { getMonthDateRange } from "@/lib/leave/services/leave-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { EmployeeAttendanceCardSnapshot } from "@/types/employee-attendance-card";

function countByStatus(
  rows: { attendance_status: string }[],
  status: string,
) {
  return rows.filter((row) => row.attendance_status === status).length;
}

export async function getEmployeeAttendanceCardSnapshot(
  supabase: AuthSupabaseClient,
  viewer: UserProfile,
  employeeRef: string,
): Promise<{ snapshot: EmployeeAttendanceCardSnapshot; canonicalRef: string } | null> {
  const organizationId = viewer.employee.organizationId;

  // Prefer the viewer's client for identity resolution; fall back to admin for
  // cross-colleague scans when RLS limits employee directory reads.
  let resolved = await resolveEmployeeFromRouteRef(
    supabase,
    organizationId,
    employeeRef,
  );

  const admin = createAdminClient();
  if (!resolved) {
    resolved = await resolveEmployeeFromRouteRef(
      admin as unknown as AuthSupabaseClient,
      organizationId,
      employeeRef,
    );
  }

  if (!resolved) return null;

  const canonicalRef = buildEmployeeRouteRef(resolved);
  const today = getTodayDateString();
  const todayDate = parseISO(today);
  const month = todayDate.getMonth() + 1;
  const year = todayDate.getFullYear();
  const { start, end } = getMonthDateRange(month, year);

  const [employeeResult, attendanceResult, leaveResult, performanceResult] =
    await Promise.all([
      admin
        .schema("hrms")
        .from("employees")
        .select(
          `id, employee_code, first_name, last_name,
           designations:designation_id(title),
           departments:department_id(name)`,
        )
        .eq("id", resolved.id)
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .maybeSingle(),
      admin
        .schema("hrms")
        .from("attendance")
        .select("attendance_status, work_hours")
        .eq("employee_id", resolved.id)
        .gte("attendance_date", start)
        .lte("attendance_date", end)
        .lte("attendance_date", today)
        .is("deleted_at", null),
      admin
        .schema("hrms")
        .from("leave_requests")
        .select("id, total_days, start_date, end_date, leave_status")
        .eq("employee_id", resolved.id)
        .eq("leave_status", "approved")
        .lte("start_date", end)
        .gte("end_date", start)
        .is("deleted_at", null),
      admin
        .schema("hrms")
        .from("performance_reviews")
        .select("overall_rating")
        .eq("employee_id", resolved.id)
        .not("overall_rating", "is", null)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (employeeResult.error) throw new Error(employeeResult.error.message);
  if (!employeeResult.data) return null;
  if (attendanceResult.error) throw new Error(attendanceResult.error.message);
  if (leaveResult.error) throw new Error(leaveResult.error.message);

  const employee = employeeResult.data;
  const designation = Array.isArray(employee.designations)
    ? employee.designations[0]
    : employee.designations;
  const department = Array.isArray(employee.departments)
    ? employee.departments[0]
    : employee.departments;

  const attendanceRows = attendanceResult.data ?? [];
  const present = countByStatus(attendanceRows, "present");
  const late = countByStatus(attendanceRows, "late");
  const absent = countByStatus(attendanceRows, "absent");
  const halfDay = countByStatus(attendanceRows, "half_day");

  const leaveRows = leaveResult.data ?? [];
  const leaveDays = leaveRows.reduce(
    (sum, row) => sum + Number(row.total_days ?? 0),
    0,
  );

  const workedHours = attendanceRows
    .filter((row) => ["present", "late", "half_day"].includes(row.attendance_status))
    .map((row) => Number(row.work_hours ?? 0));
  const averageWorkingHours =
    workedHours.length > 0
      ? Math.round(
          (workedHours.reduce((sum, hours) => sum + hours, 0) / workedHours.length) *
            100,
        ) / 100
      : 0;

  const ratingRaw = performanceResult.data?.overall_rating;
  const performanceRating =
    ratingRaw == null || Number.isNaN(Number(ratingRaw))
      ? null
      : Math.round(Number(ratingRaw) * 10) / 10;

  const firstName = employee.first_name as string;
  const lastName = employee.last_name as string;

  return {
    canonicalRef,
    snapshot: {
      employeeId: employee.id as string,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      employeeCode: employee.employee_code as string,
      designation: (designation as { title?: string } | null)?.title ?? null,
      departmentName: (department as { name?: string } | null)?.name ?? null,
      month,
      year,
      monthLabel: format(todayDate, "MMMM yyyy"),
      present,
      late,
      absent,
      leaveDays: Math.round(leaveDays * 10) / 10,
      halfDay,
      workingDays: present + late + halfDay + absent,
      averageWorkingHours,
      performanceRating,
      hasTakenLeave: leaveRows.length > 0,
    },
  };
}
