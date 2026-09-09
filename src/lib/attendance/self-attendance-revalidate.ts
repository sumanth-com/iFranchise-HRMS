import { revalidatePath } from "next/cache";

import { ATTENDANCE_ROUTES, SELF_ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import { HR_PORTAL_HOME } from "@/lib/auth/portal-paths";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";

export function revalidateSelfAttendancePaths() {
  revalidatePath(HR_PORTAL_HOME);
  revalidatePath(ATTENDANCE_ROUTES.list);
  revalidatePath(SELF_ATTENDANCE_ROUTES.list);
  revalidatePath(SELF_ATTENDANCE_ROUTES.team);
  revalidatePath(EMPLOYEE_ROUTES.home);
  revalidatePath(EMPLOYEE_ROUTES.attendance);
  revalidatePath(MANAGER_ROUTES.home);
  revalidatePath(MANAGER_ROUTES.attendance);
  revalidatePath(MANAGER_ROUTES.attendanceTeam);
  revalidatePath(MANAGER_ROUTES.reports);
  revalidatePath(MANAGER_ROUTES.notificationsCenter);
  revalidatePath("/manager/profile");
  revalidatePath(CEO_ROUTES.attendance);
  revalidatePath(SYSTEM_ADMIN_ROUTES.home);
  revalidatePath(SYSTEM_ADMIN_ROUTES.attendance);
  revalidatePath("/employee/attendance/location", "layout");
  revalidatePath("/manager/attendance/location", "layout");
  revalidatePath("/dashboard/attendance/location", "layout");
  revalidatePath("/ceo/attendance/location", "layout");
}
