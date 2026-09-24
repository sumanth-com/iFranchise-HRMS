import { revalidatePath } from "next/cache";

import { ATTENDANCE_ROUTES, SELF_ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import { ACCOUNTANT_ROUTES } from "@/lib/accountant/constants";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { revalidateCeoDashboardHome } from "@/lib/ceo/revalidate-ceo-dashboard";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";

/** HR Team Attendance list / self-team hubs only. */
export function revalidateHrTeamAttendanceListPaths() {
  revalidatePath(ATTENDANCE_ROUTES.list);
  revalidatePath(SELF_ATTENDANCE_ROUTES.list);
  revalidatePath(SELF_ATTENDANCE_ROUTES.team);
}

/**
 * Personal attendance + dashboard surfaces that read `hrms.attendance`.
 * Intentionally narrow — no location layouts, reports, or unrelated modules.
 */
export function revalidateEmployeeFacingAttendancePaths() {
  revalidatePath(EMPLOYEE_ROUTES.home);
  revalidatePath(EMPLOYEE_ROUTES.attendance);
  revalidatePath(ACCOUNTANT_ROUTES.home);
  revalidatePath(ACCOUNTANT_ROUTES.attendance);
  revalidatePath(MANAGER_ROUTES.home);
  revalidatePath(MANAGER_ROUTES.attendance);
  revalidatePath(CEO_ROUTES.attendance);
  revalidateCeoDashboardHome();
  revalidatePath(SYSTEM_ADMIN_ROUTES.home);
  revalidatePath(SYSTEM_ADMIN_ROUTES.attendance);
}

/**
 * After a single attendance record mutation (HR edit, manual status, self punch).
 * Team list + employee-facing personal attendance/dashboard only.
 */
export function revalidateSelfAttendancePaths() {
  revalidateHrTeamAttendanceListPaths();
  revalidateEmployeeFacingAttendancePaths();
}
