import type { AttendanceStatus } from "@/types/attendance";

export const ATTENDANCE_ROUTES = {
  list: "/dashboard/attendance",
  new: "/dashboard/attendance/new",
  detail: (id: string) => `/dashboard/attendance/${id}`,
  edit: (id: string) => `/dashboard/attendance/${id}/edit`,
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
