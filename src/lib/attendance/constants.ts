import type { AttendanceStatus, AttendanceDisplayStatus } from "@/types/attendance";

import { hubTeamListUrl } from "@/lib/dashboard/hub-paths";

/** Org-wide attendance tracking for HR (team tab in Attendance hub). */
export const ATTENDANCE_ROUTES = {
  list: "/dashboard/attendance",
  new: "/dashboard/attendance-management/new",
  settings: "/dashboard/attendance-management/settings",
  policy: "/dashboard/attendance-management/policy",
  detail: (id: string) => `/dashboard/attendance-management/${id}`,
  edit: (id: string) => `/dashboard/attendance-management/${id}/edit`,
} as const;

/** Personal / self-service attendance in the HR portal main nav. */
export const SELF_ATTENDANCE_ROUTES = {
  list: "/dashboard/attendance",
  team: "/dashboard/attendance/team",
  policy: "/dashboard/attendance/policy",
} as const;

export function attendanceTeamListUrl(
  searchParams?: Record<string, string | undefined>,
) {
  return hubTeamListUrl(SELF_ATTENDANCE_ROUTES.list, searchParams);
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  half_day: "Present",
  on_leave: "On Leave",
  holiday: "Holiday",
  week_off: "Weekend",
};

export const ATTENDANCE_DISPLAY_STATUS_LABELS: Record<AttendanceDisplayStatus, string> = {
  ...ATTENDANCE_STATUS_LABELS,
  upcoming: "—",
  on_request: "On Request",
};

export const ATTENDANCE_SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  biometric: "Biometric",
  mobile: "Mobile",
  web: "Web",
  import: "Import",
};

export const ATTENDANCE_SUMMARY_LABELS = {
  presentToday: "Present",
  absentToday: "Absent",
  lateToday: "Late",
  halfDayToday: "Present",
  totalEmployees: "Total Employees",
} as const;
