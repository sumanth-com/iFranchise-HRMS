import type { AttendanceStatus } from "@/types/attendance";

/** Org-wide attendance tracking for HR (Administration). */
export const ATTENDANCE_ROUTES = {
  list: "/dashboard/attendance-management",
  new: "/dashboard/attendance-management/new",
  settings: "/dashboard/attendance-management/settings",
  detail: (id: string) => `/dashboard/attendance-management/${id}`,
  edit: (id: string) => `/dashboard/attendance-management/${id}/edit`,
} as const;

/** Personal / self-service attendance in the HR portal main nav. */
export const SELF_ATTENDANCE_ROUTES = {
  list: "/dashboard/attendance",
} as const;

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  half_day: "Half Day",
  on_leave: "On Leave",
  holiday: "Holiday",
  week_off: "Weekend",
};

export const ATTENDANCE_SUMMARY_LABELS = {
  presentToday: "Present Today",
  absentToday: "Absent Today",
  lateToday: "Late Today",
  halfDayToday: "Half Day",
  onLeaveToday: "On Leave",
  totalEmployees: "Total Employees",
} as const;
